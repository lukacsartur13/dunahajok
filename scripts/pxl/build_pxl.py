"""
PXL — source STL to production glTF.

    python3 scripts/pxl/build_pxl.py            # build
    python3 scripts/pxl/build_pxl.py --preview  # …and write inspection renders

    SOURCE STL
      → instance extraction      one vessel out of a four-copy SketchUp scene
      → cleanup                  degenerates, exact duplicates, sub-mm slivers
      → crease partition         the designer's own hard edges, found not guessed
      → semantic zoning          thirteen named, separately-addressable objects
      → orientation              consistent winding, turned the right way out
      → split normals            smooth surfaces, hard chines
      → axis and unit conversion mm Z-up → metres Y-up, origin on the waterline
      → GLB                      uncompressed, float32, one buffer

The output at `assets/derived/pxl/PXL.source.glb` is the archival master and
the thing to re-run compression against. `scripts/pxl/compress-pxl.mjs` turns
it into `public/models/PXL.glb`.

Nothing in here is destructive: the STL is opened read-only and never written.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

from pxl_gltf import GlbBuilder, SHADING_ANGLE_DEG, build_mesh, orient      # noqa: E402
from pxl_source import (                                                    # noqa: E402
    CREASE_DEG, MM_PER_M, WATERLINE_ABOVE_KEEL_MM, clean, extract_instance,
    face_normals, read_binary_stl, stl_header,
)
from pxl_zones import (                                                     # noqa: E402
    ACCESSORY_COVER, DECK_MAIN, GROUPS, MATERIALS, OPEN_SHELL_ZONES,
    PART_ZONE, split_hull,
)

#: Components the model ships with, but that the default configuration hides.
#: The cockpit cover appears in no reference render; it is an option, not the
#: product, so it is exported and left switched off.
HIDDEN_BY_DEFAULT = {ACCESSORY_COVER}

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "source" / "pxl" / "PXL-3D.stl"
DERIVED = ROOT / "assets" / "derived" / "pxl"
OUT_GLB = DERIVED / "PXL.source.glb"
OUT_JSON = DERIVED / "PXL.analysis.json"

#: Zones whose visible face is the one pointing away from the inside of the
#: boat. `deck_main` is the only lining: it is seen from within the cockpit.
INTERIOR_ZONES = {DECK_MAIN}


def to_gltf_frame(points: np.ndarray, loa_mm: float, keel_to_wl_mm: float) -> np.ndarray:
    """Hull-local millimetres, Z-up → glTF metres, Y-up, origin on the waterline.

        x  aft→bow           →  +X   bow
        z  keel→sheer        →  +Y   up
        y  centreline→port   →  −Z

    A −90° rotation about X, which is a proper rotation, so winding — and
    therefore which side of every triangle faces out — survives untouched.

    The origin lands amidships on the visual waterline, which is what the rest
    of the site is written against: the water is the plane y = 0 in the same
    metres, the wake starts at x = −LOA/2, and the camera rig orbits a point
    that stays put when the boat is re-exported.
    """
    out = np.empty_like(points)
    out[:, 0] = (points[:, 0] - loa_mm / 2) / MM_PER_M
    out[:, 1] = (points[:, 2] - keel_to_wl_mm) / MM_PER_M
    out[:, 2] = -points[:, 1] / MM_PER_M
    return out


def rotate_normals(normals: np.ndarray) -> np.ndarray:
    out = np.empty_like(normals)
    out[:, 0] = normals[:, 0]
    out[:, 1] = normals[:, 2]
    out[:, 2] = -normals[:, 1]
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", action="store_true",
                    help="write zone inspection renders beside the GLB")
    args = ap.parse_args()

    if not SOURCE.exists():
        print(f"  source STL missing: {SOURCE}", file=sys.stderr)
        return 1
    DERIVED.mkdir(parents=True, exist_ok=True)

    started = time.time()
    tris = read_binary_stl(SOURCE)
    print(f"  source   {SOURCE.name}  {SOURCE.stat().st_size/1e6:.2f} MB  "
          f"{tris.shape[0]:,} triangles  [{stl_header(SOURCE)}]")

    inst = extract_instance(tris)
    print(f"  instance LOA {inst.loa:.1f} × beam {inst.beam:.1f} × "
          f"depth {inst.depth:.1f} mm  ({len(inst.parts)} parts)")
    for what, count in inst.dropped.items():
        print(f"           dropped {count:,} triangles — {what}")

    removed = {"degenerate": 0, "duplicate": 0, "sliver": 0}
    for part in inst.parts:
        for key, n in clean(part).items():
            removed[key] += n
    print("  cleanup  " + ", ".join(f"{v:,} {k}" for k, v in removed.items()))

    # ── zones ───────────────────────────────────────────────────────────────
    hull = inst.part("hull")
    if hull is None:
        print("  hull shell not found", file=sys.stderr)
        return 1

    zones: dict[str, tuple[np.ndarray, np.ndarray]] = {}

    def add(name: str, points: np.ndarray, faces: np.ndarray) -> None:
        if faces.shape[0] == 0:
            return
        if name in zones:
            p0, f0 = zones[name]
            faces = faces + p0.shape[0]
            points = np.vstack([p0, points])
            faces = np.vstack([f0, faces])
        zones[name] = (points, faces)

    hull_points, hull_faces, hull_zones = split_hull(hull, inst.loa, inst.depth)
    for name, mask in hull_zones.items():
        sel = hull_faces[mask]
        used, local = np.unique(sel, return_inverse=True)
        add(name, hull_points[used], local.reshape(sel.shape).astype(np.int64))

    for part in inst.parts:
        if part.label == "hull":
            continue
        zone = PART_ZONE.get(part.label)
        if zone is None:
            continue
        add(zone, part.points, part.faces)

    # ── export ──────────────────────────────────────────────────────────────
    keel_to_wl = WATERLINE_ABOVE_KEEL_MM
    reference = np.array([inst.loa * 0.5, 0.0, inst.depth * 0.62])

    glb = GlbBuilder("duna-boats scripts/pxl/build_pxl.py")
    report: dict = {
        "source": {
            "file": str(SOURCE.relative_to(ROOT)),
            "bytes": SOURCE.stat().st_size,
            "header": stl_header(SOURCE),
            "triangles": int(tris.shape[0]),
        },
        "instance": {
            "loaMm": round(inst.loa, 2),
            "beamMm": round(inst.beam, 2),
            "depthMm": round(inst.depth, 2),
            "parts": len(inst.parts),
            "dropped": inst.dropped,
        },
        "cleanup": removed,
        "creaseAngleDeg": CREASE_DEG,
        "shadingAngleDeg": SHADING_ANGLE_DEG,
        "waterlineAboveKeelMm": keel_to_wl,
        "zones": [],
    }

    group_nodes: list[int] = []
    total_tris = total_verts = 0
    preview: list[tuple[str, np.ndarray]] = []

    for group_name, members in GROUPS:
        children: list[int] = []
        for zone in members:
            if zone not in zones:
                continue
            points, faces = zones[zone]
            faces = orient(points, faces, zone not in INTERIOR_ZONES, reference)
            if args.preview and zone not in HIDDEN_BY_DEFAULT:
                preview.append((zone, points[faces]))
            pos, nrm, idx = build_mesh(points, faces)
            pos = to_gltf_frame(pos, inst.loa, keel_to_wl)
            nrm = rotate_normals(nrm)

            material = glb.material(zone, MATERIALS[zone],
                                    double_sided=zone in OPEN_SHELL_ZONES)
            mesh = glb.mesh(zone, pos, nrm, idx, material)
            children.append(glb.node(zone, mesh=mesh))

            lo, hi = pos.min(0), pos.max(0)
            report["zones"].append({
                "name": zone,
                "triangles": int(idx.size // 3),
                "vertices": int(pos.shape[0]),
                "material": zone,
                "sizeM": [round(float(v), 4) for v in (hi - lo)],
            })
            total_tris += idx.size // 3
            total_verts += pos.shape[0]
        if children:
            group_nodes.append(glb.node(group_name, children=children))

    root = glb.node("PXL_ROOT", children=group_nodes)
    extras = {
        "product": "Duna PXL",
        "units": "metres",
        "up": "+Y",
        "forward": "+X (bow)",
        "origin": "amidships on the visual waterline",
        "loaM": round(inst.loa / MM_PER_M, 4),
        "beamM": round(inst.beam / MM_PER_M, 4),
        "waterlineAboveKeelM": round(keel_to_wl / MM_PER_M, 4),
        "pipeline": "scripts/pxl/build_pxl.py",
    }
    size = glb.write(OUT_GLB, root, extras)

    report["export"] = {
        "file": str(OUT_GLB.relative_to(ROOT)),
        "bytes": size,
        "triangles": total_tris,
        "vertices": total_verts,
        "meshes": len(glb.meshes),
        "materials": len(glb.materials),
        "nodes": len(glb.nodes),
    }
    OUT_JSON.write_text(json.dumps(report, indent=2) + "\n")

    print(f"\n  {'zone':<26}{'tris':>9}{'verts':>9}")
    for z in report["zones"]:
        print(f"  {z['name']:<26}{z['triangles']:>9,}{z['vertices']:>9,}")
    print(f"  {'TOTAL':<26}{total_tris:>9,}{total_verts:>9,}")
    print(f"\n  wrote {OUT_GLB.relative_to(ROOT)}  {size/1e6:.2f} MB  "
          f"{len(glb.meshes)} meshes  {len(glb.materials)} materials  "
          f"({time.time()-started:.1f}s)")

    if args.preview:
        from pxl_preview import write_previews
        write_previews(preview, DERIVED)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
