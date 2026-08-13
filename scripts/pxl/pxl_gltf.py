"""
PXL — normals, orientation and glTF 2.0 binary export.

Written by hand rather than through a DCC exporter for one reason: the node
names, the mesh names and the material names in the output *are* the
configurator's API. A round trip through a general-purpose exporter is a round
trip through its naming, its material translation and its idea of what a
"smooth" normal is, and each of those is a place the contract can drift without
anyone noticing until a colour swatch stops working.

The output is an uncompressed, float32, single-buffer GLB. Compression is a
separate, reversible step — `compress-pxl.mjs` — so this file stays the
readable source of truth.
"""

from __future__ import annotations

import json
import struct
from collections import defaultdict

import numpy as np

from pxl_source import crease_patches, face_normals

#: Shading crease angle. Slightly above the 26° used to find design edges, so
#: that a boundary the partition treats as a real crease is also a boundary the
#: shading treats as one, with margin for the tessellation either side of it.
#: Below this the hull shades as one continuous surface — which is the whole
#: point: the topsides are a compound curve carrying a moving highlight, and
#: faceting them would read as a cheap model instantly.
SHADING_ANGLE_DEG = 32.0

GL_FLOAT = 5126
GL_UNSIGNED_INT = 5125
GL_UNSIGNED_SHORT = 5123
ARRAY_BUFFER = 34962
ELEMENT_ARRAY_BUFFER = 34963


# ── Orientation ──────────────────────────────────────────────────────────────

def orient(points: np.ndarray, faces: np.ndarray, outward: bool,
           reference: np.ndarray) -> np.ndarray:
    """Make the winding consistent, then point it the way the camera looks from.

    STL carries a per-facet normal but no reliable winding — 61 182 of this
    file's 201 155 facets disagree with their own vertex order — so the surface
    has to be re-oriented from scratch or every second triangle is backfacing.

    Two passes. First the winding is propagated across shared edges, which
    makes each connected shell internally consistent but leaves its global
    sense arbitrary. Then the shell is turned the right way out by an
    area-weighted vote: exterior surfaces should face away from the reference
    point inside the vessel, interior linings should face towards it.
    """
    n = faces.shape[0]
    out = faces.copy()

    edge_faces: dict[tuple[int, int], list[int]] = defaultdict(list)
    for i, t in enumerate(faces):
        for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            edge_faces[(a, b) if a < b else (b, a)].append(i)

    neighbours: list[list[int]] = [[] for _ in range(n)]
    for shared in edge_faces.values():
        if len(shared) == 2:
            a, b = shared
            neighbours[a].append(b)
            neighbours[b].append(a)

    def directed(tri: np.ndarray) -> set[tuple[int, int]]:
        return {(tri[0], tri[1]), (tri[1], tri[2]), (tri[2], tri[0])}

    seen = np.zeros(n, bool)
    groups: list[list[int]] = []
    for seed in range(n):
        if seen[seed]:
            continue
        seen[seed] = True
        stack = [seed]
        group = [seed]
        while stack:
            cur = stack.pop()
            for nb in neighbours[cur]:
                if seen[nb]:
                    continue
                seen[nb] = True
                # Neighbours agree when the edge they share runs in opposite
                # directions in each. If it runs the same way, one is inside out.
                if directed(out[cur]) & directed(out[nb]):
                    out[nb] = out[nb][::-1]
                stack.append(nb)
                group.append(nb)
        groups.append(group)

    want = 1.0 if outward else -1.0
    for group in groups:
        idx = np.asarray(group)
        # Re-derive normals from the *corrected* winding, not the source order.
        corrected = points[out[idx]]
        normals, area = face_normals(corrected)
        centre = corrected.mean(1)
        vote = float((area * np.einsum("ij,ij->i", normals, centre - reference)).sum())
        if vote * want < 0:
            out[idx] = out[idx][:, ::-1]
    return out


# ── Split normals ────────────────────────────────────────────────────────────

def build_mesh(points: np.ndarray, faces: np.ndarray,
               angle_deg: float = SHADING_ANGLE_DEG
               ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return (positions, normals, indices) with angle-based split normals.

    A vertex gets one normal per *smooth patch* it touches. Inside a patch the
    normals are area-weighted averages, so the hull's compound curvature shades
    continuously; across a patch boundary — a chine, a panel break, the deck
    edge — the vertex is duplicated and each side keeps its own flat normal, so
    the edge stays a hard edge under a moving light.
    """
    tris = points[faces]
    normals, area = face_normals(tris)
    patches = crease_patches(faces, normals, angle_deg)

    corner_key: dict[tuple[int, int], int] = {}
    positions: list[np.ndarray] = []
    accum: list[np.ndarray] = []
    indices = np.empty(faces.shape[0] * 3, np.uint32)

    for f in range(faces.shape[0]):
        p = int(patches[f])
        for c in range(3):
            v = int(faces[f, c])
            key = (v, p)
            slot = corner_key.get(key)
            if slot is None:
                slot = len(positions)
                corner_key[key] = slot
                positions.append(tris[f, c])
                accum.append(np.zeros(3))
            accum[slot] += normals[f] * area[f]
            indices[f * 3 + c] = slot

    pos = np.asarray(positions, np.float64)
    nrm = np.asarray(accum, np.float64)
    length = np.linalg.norm(nrm, axis=1, keepdims=True)
    nrm = np.divide(nrm, length, out=np.zeros_like(nrm), where=length > 1e-12)
    # A vertex whose contributions cancelled exactly (a zero-area fan) would
    # otherwise ship a NaN-free but meaningless zero normal; give it the
    # nearest face normal instead so nothing renders black.
    dead = length[:, 0] <= 1e-12
    if dead.any():
        for f in range(faces.shape[0]):
            for c in range(3):
                slot = indices[f * 3 + c]
                if dead[slot]:
                    nrm[slot] = normals[f]
                    dead[slot] = False
    return pos, nrm, indices


# ── GLB writing ──────────────────────────────────────────────────────────────

class GlbBuilder:
    def __init__(self, generator: str):
        self.bin = bytearray()
        self.views: list[dict] = []
        self.accessors: list[dict] = []
        self.meshes: list[dict] = []
        self.nodes: list[dict] = []
        self.materials: list[dict] = []
        self.generator = generator

    def _view(self, data: bytes, target: int | None, stride: int | None) -> int:
        while len(self.bin) % 4:
            self.bin.append(0)
        offset = len(self.bin)
        self.bin.extend(data)
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if target is not None:
            view["target"] = target
        if stride is not None:
            view["byteStride"] = stride
        self.views.append(view)
        return len(self.views) - 1

    def attribute(self, values: np.ndarray, normalise_minmax: bool) -> int:
        data = np.ascontiguousarray(values, np.float32)
        view = self._view(data.tobytes(), ARRAY_BUFFER, 12)
        acc = {
            "bufferView": view,
            "componentType": GL_FLOAT,
            "count": int(data.shape[0]),
            "type": "VEC3",
        }
        if normalise_minmax:
            acc["min"] = [float(v) for v in data.min(0)]
            acc["max"] = [float(v) for v in data.max(0)]
        self.accessors.append(acc)
        return len(self.accessors) - 1

    def indices(self, values: np.ndarray) -> int:
        wide = int(values.max()) > 65535
        dtype = np.uint32 if wide else np.uint16
        data = np.ascontiguousarray(values, dtype)
        view = self._view(data.tobytes(), ELEMENT_ARRAY_BUFFER, None)
        self.accessors.append({
            "bufferView": view,
            "componentType": GL_UNSIGNED_INT if wide else GL_UNSIGNED_SHORT,
            "count": int(data.size),
            "type": "SCALAR",
        })
        return len(self.accessors) - 1

    def material(self, name: str, spec: dict, double_sided: bool = False) -> int:
        pbr = {
            "baseColorFactor": [*spec["base"], 1.0],
            "metallicFactor": float(spec.get("metal", 0.0)),
            "roughnessFactor": float(spec["rough"]),
        }
        mat = {"name": name, "pbrMetallicRoughness": pbr, "doubleSided": double_sided}
        if "clearcoat" in spec:
            mat["extensions"] = {
                "KHR_materials_clearcoat": {
                    "clearcoatFactor": float(spec["clearcoat"]),
                    "clearcoatRoughnessFactor": float(spec.get("clearcoatRough", 0.1)),
                }
            }
        self.materials.append(mat)
        return len(self.materials) - 1

    def mesh(self, name: str, pos: np.ndarray, nrm: np.ndarray,
             idx: np.ndarray, material: int) -> int:
        self.meshes.append({
            "name": name,
            "primitives": [{
                "attributes": {
                    "POSITION": self.attribute(pos, True),
                    "NORMAL": self.attribute(nrm, False),
                },
                "indices": self.indices(idx),
                "material": material,
                "mode": 4,
            }],
        })
        return len(self.meshes) - 1

    def node(self, name: str, mesh: int | None = None,
             children: list[int] | None = None) -> int:
        node: dict = {"name": name}
        if mesh is not None:
            node["mesh"] = mesh
        if children:
            node["children"] = children
        self.nodes.append(node)
        return len(self.nodes) - 1

    def write(self, path, root: int, extras: dict) -> int:
        used = {"KHR_materials_clearcoat"} if any(
            "extensions" in m for m in self.materials) else set()
        gltf = {
            "asset": {"version": "2.0", "generator": self.generator, "extras": extras},
            "scene": 0,
            "scenes": [{"name": "PXL", "nodes": [root]}],
            "nodes": self.nodes,
            "meshes": self.meshes,
            "materials": self.materials,
            "accessors": self.accessors,
            "bufferViews": self.views,
            "buffers": [{"byteLength": len(self.bin)}],
        }
        if used:
            gltf["extensionsUsed"] = sorted(used)

        js = json.dumps(gltf, separators=(",", ":")).encode("utf8")
        js += b" " * (-len(js) % 4)
        binary = bytes(self.bin)
        binary += b"\0" * (-len(binary) % 4)
        total = 12 + 8 + len(js) + 8 + len(binary)
        with open(path, "wb") as fh:
            fh.write(struct.pack("<III", 0x46546C67, 2, total))
            fh.write(struct.pack("<II", len(js), 0x4E4F534A))
            fh.write(js)
            fh.write(struct.pack("<II", len(binary), 0x004E4942))
            fh.write(binary)
        return total
