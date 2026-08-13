"""
PXL — source STL reader, cleanup and semantic partition.

Shared by `analyse_stl.py` (reporting) and `build_pxl.py` (production export),
so the numbers in the report and the numbers in the asset can never disagree.

WHAT THE SOURCE ACTUALLY IS
---------------------------
`assets/source/pxl/PXL-3D.stl` is a binary STL written by SketchUp. It is not
one boat: it is a *working scene* containing four placed copies of the same
vessel, a fifth cluster of construction/reference geometry, a stray fragment,
and — in every copy — a seated mannequin. The four vessels are byte-identical
in shape (same triangle count, same surface area, same bounding box); they
differ only by translation.

So step one is not conversion. It is choosing one instance and throwing the
scene away. `INSTANCE_HULL_ROOT` names the hull shell of the cleanest copy —
the one whose 15 loose parts are exactly the vessel, with no duplicated consoles
or spare wheels lying alongside it.

UNITS
-----
Millimetres, established from three independent measurements rather than
assumed:

  * hull length 5253.2, beam 2094.3 — a 5.25 m × 2.09 m open boat,
  * the mannequin is 1458.2 tall — a seated adult,
  * the steering wheel is 371.3 across — a 370 mm helm wheel.

Read as metres the boat would be five kilometres long; as centimetres, 52 m.
Millimetres is the only reading in which all three objects are the size of the
things they depict. Everything downstream divides by 1000, once, here.
"""

from __future__ import annotations

import struct
from collections import defaultdict
from dataclasses import dataclass, field

import numpy as np

# ── Source facts, measured (see module docstring and PHASE_2_5_REPORT.md) ────

MM_PER_M = 1000.0

#: Union-find root of the hull shell of the instance we ship. Stable for a
#: given source file; `analyse_stl.py` prints it for every instance found.
INSTANCE_HULL_ROOT = 23670

#: Triangle count of the mannequin. It is a rigid duplicate in every instance,
#: so its size identifies it more reliably than its position does.
FIGURE_TRIS = 1464

#: Components further than this from the chosen hull's centre belong to another
#: copy of the boat. Instances are ~9 m apart; the boat itself is ~5.8 m long.
INSTANCE_RADIUS_MM = 3500.0

#: Dihedral angle above which an edge is a design crease rather than
#: tessellation of a curved surface. The PXL's chines, panel breaks and deck
#: boundaries are all far sharper than this; the hull's own curvature is
#: tessellated at roughly 3–8° per edge, so there is a wide margin either side.
CREASE_DEG = 26.0

#: Weld tolerance, source units. SketchUp writes coincident vertices exactly,
#: so this only has to absorb float32 print/parse noise.
WELD_TOL = 4  # decimal places

#: Faces smaller than this are tessellation debris — slivers left where the
#: modeller trimmed one surface against another. They carry no silhouette.
SLIVER_AREA_MM2 = 0.5

#: Visual waterline, measured off the reference water renders. See
#: `waterline.md` in the report: freeboard/LOA reads 0.167 at amidships across
#: all six colour studies, which on a 5253.2 mm hull with a 1095.6 mm sheer
#: puts the surface 220.6 mm above the lowest point of the keel.
WATERLINE_ABOVE_KEEL_MM = 220.6


# ── Reading ──────────────────────────────────────────────────────────────────

def read_binary_stl(path) -> np.ndarray:
    """Return (n, 3, 3) float64 triangle corners in source units."""
    with open(path, "rb") as fh:
        fh.read(80)
        (count,) = struct.unpack("<I", fh.read(4))
        raw = np.frombuffer(fh.read(count * 50), dtype=np.uint8)
    if raw.size != count * 50:
        raise ValueError(f"truncated STL: {raw.size} bytes for {count} triangles")
    rec = raw.reshape(count, 50)
    return rec[:, 12:48].copy().view(np.float32).reshape(count, 3, 3).astype(np.float64)


def stl_header(path) -> str:
    with open(path, "rb") as fh:
        return fh.read(80).decode("ascii", "replace").strip()


# ── Topology ─────────────────────────────────────────────────────────────────

class Welded:
    """Vertex-welded triangle soup with union-find connectivity."""

    def __init__(self, tris: np.ndarray, tol: int = WELD_TOL):
        flat = tris.reshape(-1, 3)
        self.points, inv = np.unique(np.round(flat, tol), axis=0, return_inverse=True)
        self.faces = inv.reshape(-1, 3)
        self.tris = tris
        self._parent = np.arange(self.points.shape[0])
        for tri in self.faces:
            self._union(tri[0], tri[1])
            self._union(tri[1], tri[2])
        self.vertex_root = np.array(
            [self._find(i) for i in range(self.points.shape[0])]
        )
        self.face_root = self.vertex_root[self.faces[:, 0]]

    def _find(self, a: int) -> int:
        p = self._parent
        while p[a] != a:
            p[a] = p[p[a]]
            a = p[a]
        return a

    def _union(self, a: int, b: int) -> None:
        ra, rb = self._find(a), self._find(b)
        if ra != rb:
            self._parent[rb] = ra


def face_normals(tris: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Unit geometric normals and areas. Degenerates get a zero normal."""
    cross = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
    length = np.linalg.norm(cross, axis=1, keepdims=True)
    normals = np.divide(cross, length, out=np.zeros_like(cross), where=length > 1e-12)
    return normals, 0.5 * length[:, 0]


def edge_map(faces: np.ndarray) -> dict[tuple[int, int], list[int]]:
    edges: dict[tuple[int, int], list[int]] = defaultdict(list)
    for i, tri in enumerate(faces):
        for a, b in ((tri[0], tri[1]), (tri[1], tri[2]), (tri[2], tri[0])):
            edges[(a, b) if a < b else (b, a)].append(i)
    return edges


def crease_patches(faces: np.ndarray, normals: np.ndarray,
                   angle_deg: float = CREASE_DEG) -> np.ndarray:
    """Flood-fill faces across soft edges only.

    The result is the model's own surface topology as the designer drew it:
    one patch per smoothly-continuous surface, bounded by the chines, panel
    breaks and deck edges that define the PXL's shape. Splitting materials
    along these boundaries is what keeps a hard chine hard — the alternative,
    slicing by a world-space plane, cuts across the tessellation and leaves a
    ragged colour break that no amount of shading can hide.
    """
    limit = np.cos(np.deg2rad(angle_deg))
    parent = np.arange(faces.shape[0])

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for shared in edge_map(faces).values():
        if len(shared) != 2:
            continue                      # boundary or non-manifold: always a seam
        a, b = shared
        if abs(float(normals[a] @ normals[b])) >= limit:
            ra, rb = find(a), find(b)
            if ra != rb:
                parent[rb] = ra
    return np.array([find(i) for i in range(faces.shape[0])])


# ── Instance extraction ──────────────────────────────────────────────────────

@dataclass
class Part:
    """One loose component of the chosen instance, in hull-local millimetres."""
    root: int
    points: np.ndarray                    # (v, 3) welded, hull-local mm
    faces: np.ndarray                     # (n, 3) indices into `points`
    label: str = ""
    meta: dict = field(default_factory=dict)

    @property
    def tris(self) -> np.ndarray:
        return self.points[self.faces]

    @property
    def count(self) -> int:
        return self.faces.shape[0]


@dataclass
class Instance:
    """One PXL, lifted out of the SketchUp scene and put on its own origin."""
    parts: list[Part]
    loa: float
    beam: float
    depth: float
    origin: np.ndarray                    # source-space point mapped to (0,0,0)
    dropped: dict[str, int] = field(default_factory=dict)

    def part(self, label: str) -> Part | None:
        for p in self.parts:
            if p.label == label:
                return p
        return None


#: Loose parts of the chosen instance, identified by triangle count. Every one
#: was confirmed by rendering it alone against the rest of the boat — see
#: PXL_MODEL_MAP.md. Counts are unique within the instance, and identical
#: across all four copies, so they are a stable key.
LOOSE_PARTS: dict[int, str] = {
    41043: "hull",            # one welded shell: topsides, bottom, deck, transom
    3129: "wheel",
    1630: "cockpit_cover",    # flush panel over the cockpit; not in any render
    468: "motor",
    439: "console_top",       # control box on the console head
    252: "console_body",
    223: "deck_liner",        # sole, inner side panels, fore and aft decks
    38: "motor_bracket",
    21: "rail_fwd",
    20: "rail_aft",
    9: "console_face",
    4: "bow_panel",
    1464: "__figure",         # seated mannequin — scale reference, not product
}


def extract_instance(tris: np.ndarray, hull_root: int = INSTANCE_HULL_ROOT) -> Instance:
    """Pull one vessel out of the scene, drop the mannequin and the debris.

    Returns geometry in a hull-local frame that is still Z-up millimetres —
    the same axes SketchUp wrote, only re-origined so that x=0 is the aftmost
    point of the hull, y=0 is the centreline and z=0 is the lowest point of the
    keel. Orientation and units are converted once, at export.
    """
    w = Welded(tris)
    sizes: dict[int, int] = defaultdict(int)
    for root in w.face_root:
        sizes[int(root)] += 1
    if hull_root not in sizes:
        raise SystemExit(
            f"hull root {hull_root} not present; run analyse_stl.py to list instances"
        )

    hull_pts = w.tris[w.face_root == hull_root].reshape(-1, 3)
    lo, hi = hull_pts.min(0), hull_pts.max(0)
    centre = (lo + hi) / 2
    origin = np.array([lo[0], (lo[1] + hi[1]) / 2, lo[2]])

    parts: list[Part] = []
    dropped: dict[str, int] = defaultdict(int)
    for root, count in sizes.items():
        member = w.face_root == root
        pts = w.tris[member].reshape(-1, 3)
        here = (pts.min(0) + pts.max(0)) / 2
        if np.linalg.norm(here[:2] - centre[:2]) > INSTANCE_RADIUS_MM:
            continue                                        # another copy
        label = LOOSE_PARTS.get(count)
        if label == "__figure":
            dropped["mannequin"] += count
            continue
        if label is None:
            dropped["unidentified debris"] += count
            continue
        faces = w.faces[member]
        used, local = np.unique(faces, return_inverse=True)
        parts.append(Part(
            root=int(root),
            points=w.points[used] - origin,
            faces=local.reshape(faces.shape).astype(np.int64),
            label=label,
        ))

    parts.sort(key=lambda p: -p.count)
    return Instance(
        parts=parts,
        loa=float(hi[0] - lo[0]),
        beam=float(hi[1] - lo[1]),
        depth=float(hi[2] - lo[2]),
        origin=origin,
        dropped=dict(dropped),
    )


# ── Cleanup ──────────────────────────────────────────────────────────────────

def clean(part: Part) -> dict[str, int]:
    """Remove what is provably not geometry, and nothing else.

    Deliberately conservative. Duplicate and zero-area triangles cannot
    contribute a pixel; slivers under half a square millimetre cannot
    contribute a *visible* one on a 5 m boat. Everything else — including every
    triangle that makes the hull's compound curvature — is left exactly as the
    designer drew it. There is no remeshing pass anywhere in this pipeline; a
    voxel or quad remesh would round the chines that the whole design reads on.
    """
    _, area = face_normals(part.tris)
    removed = {"degenerate": 0, "duplicate": 0, "sliver": 0}

    keep = area > 1e-9
    removed["degenerate"] = int((~keep).sum())

    key = np.sort(part.faces, axis=1)
    _, first = np.unique(key, axis=0, return_index=True)
    dup = np.ones(part.count, bool)
    dup[first] = False
    removed["duplicate"] = int((dup & keep).sum())
    keep &= ~dup

    sliver = (area < SLIVER_AREA_MM2) & keep
    removed["sliver"] = int(sliver.sum())
    keep &= ~sliver

    part.faces = part.faces[keep]
    return removed


# ── Inside / outside ─────────────────────────────────────────────────────────

def clip_faces(points: np.ndarray, faces: np.ndarray,
               plane: tuple[float, float, float, float]
               ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Cut a triangle set along a plane, splitting the triangles it crosses.

    Returns (points, faces, positive) where `positive` marks the faces on the
    plane's +ve side. New vertices are appended for the crossing points, so the
    two halves stay perfectly welded along the cut.

    This exists for exactly one boundary — the forward edge of the black stern
    moulding — and it exists because that edge is a *straight line* on a real
    product. Classifying whole triangles either side of it would leave a 25 mm
    zigzag along a 5.25 m boat: small in the model, and about two pixels of
    visible stair-stepping in a product shot, on the one edge of the paint
    scheme a viewer's eye follows.
    """
    a, b, c, d = plane
    normal = np.array([a, b, c], float)
    dist = points @ normal + d

    out_points = [points]
    cache: dict[tuple[int, int], int] = {}
    next_index = points.shape[0]
    new_faces: list[list[int]] = []
    positive: list[bool] = []

    def cut(i: int, j: int) -> int:
        nonlocal next_index
        key = (i, j) if i < j else (j, i)
        hit = cache.get(key)
        if hit is not None:
            return hit
        t = dist[i] / (dist[i] - dist[j])
        out_points.append((points[i] + (points[j] - points[i]) * t)[None, :])
        cache[key] = next_index
        next_index += 1
        return cache[key]

    for tri in faces:
        s = dist[tri]
        if np.all(s >= 0) or np.all(s <= 0):
            new_faces.append(list(tri))
            positive.append(bool(s.sum() >= 0))
            continue
        # One vertex is alone on its side; fan the other two around the cut.
        lone = int(np.argmax([np.sign(s[k]) != np.sign(s[(k + 1) % 3]) and
                              np.sign(s[k]) != np.sign(s[(k + 2) % 3])
                              for k in range(3)]))
        p, q, r = tri[lone], tri[(lone + 1) % 3], tri[(lone + 2) % 3]
        m, n = cut(p, q), cut(p, r)
        side = bool(s[lone] >= 0)
        new_faces.append([p, m, n])
        positive.append(side)
        new_faces.append([m, q, r])
        positive.append(not side)
        new_faces.append([m, r, n])
        positive.append(not side)

    return (np.vstack(out_points),
            np.asarray(new_faces, np.int64),
            np.asarray(positive, bool))


def outward_faces(tris: np.ndarray, cells: int = 96) -> np.ndarray:
    """True for faces on the *outside* of the hull shell.

    The hull arrives as a single welded skin that wraps over the sheer and
    comes back down the inside of the boat, so "topsides" and "cockpit lining"
    are the same connected surface. They are separated here by shooting a ray
    athwartships from each face and counting what it passes through: a face
    with clear water outboard of it is on the outside, a face with the topsides
    still to come is on the inside.

    Athwartships rather than along the face normal because the ray then reduces
    to a point-in-triangle test in the (x, z) plane plus one comparison in y —
    exact, and answerable for every face at once. The surfaces this test cannot
    see — the bottom, and the transom, whose outboard direction is not ±y — are
    assigned from the crease partition instead, before this is consulted.
    """
    n = tris.shape[0]
    centre = tris.mean(1)
    lo = tris.reshape(-1, 3).min(0)
    hi = tris.reshape(-1, 3).max(0)
    span = np.maximum(hi - lo, 1e-6)

    def bucket(px: np.ndarray, pz: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        return (
            np.clip(((px - lo[0]) / span[0] * cells).astype(int), 0, cells - 1),
            np.clip(((pz - lo[2]) / span[2] * cells).astype(int), 0, cells - 1),
        )

    # Bucket every triangle into all (x, z) cells its bounding box touches, so
    # a query only ever tests triangles that could possibly be above it.
    tlo, thi = tris.min(1), tris.max(1)
    ix0, iz0 = bucket(tlo[:, 0], tlo[:, 2])
    ix1, iz1 = bucket(thi[:, 0], thi[:, 2])
    grid: dict[tuple[int, int], list[int]] = defaultdict(list)
    for i in range(n):
        for cx in range(ix0[i], ix1[i] + 1):
            for cz in range(iz0[i], iz1[i] + 1):
                grid[(cx, cz)].append(i)

    qx, qz = bucket(centre[:, 0], centre[:, 2])
    queries: dict[tuple[int, int], list[int]] = defaultdict(list)
    for i in range(n):
        queries[(qx[i], qz[i])].append(i)

    ax, az, ay = tris[:, 0, 0], tris[:, 0, 2], tris[:, 0, 1]
    bx, bz, by = tris[:, 1, 0], tris[:, 1, 2], tris[:, 1, 1]
    cxx, czz, cyy = tris[:, 2, 0], tris[:, 2, 2], tris[:, 2, 1]
    det = (bz - czz) * (ax - cxx) + (cxx - bx) * (az - czz)

    outward = np.ones(n, bool)
    for cell, qs in queries.items():
        cands = grid.get(cell)
        if not cands:
            continue
        q = np.asarray(qs)
        c = np.asarray(cands)
        px = centre[q, 0][:, None]
        pz = centre[q, 2][:, None]
        py = centre[q, 1][:, None]
        d = det[c][None, :]
        safe = np.abs(d) > 1e-12
        d = np.where(safe, d, 1.0)
        w0 = ((bz[c] - czz[c]) * (px - cxx[c]) + (cxx[c] - bx[c]) * (pz - czz[c])) / d
        w1 = ((czz[c] - az[c]) * (px - cxx[c]) + (ax[c] - cxx[c]) * (pz - czz[c])) / d
        w2 = 1.0 - w0 - w1
        inside = safe & (w0 >= -1e-9) & (w1 >= -1e-9) & (w2 >= -1e-9)
        inside &= q[:, None] != c[None, :]
        hit_y = w0 * ay[c] + w1 * by[c] + w2 * cyy[c]
        # Outboard is +y to starboard and −y to port; 0.5 mm of slack keeps a
        # face from detecting the surface it is itself part of.
        beyond = np.where(py >= 0, hit_y > py + 0.5, hit_y < py - 0.5)
        outward[q] = ~(inside & beyond).any(axis=1)
    return outward
