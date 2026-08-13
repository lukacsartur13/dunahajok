"""
PXL — semantic zoning.

Turns the cleaned instance into the named, separately-addressable objects the
configurator needs. Every rule here is geometric and stated in hull-local
millimetres; none of them is a hand-painted selection, so re-running the
pipeline on a revised STL produces the same zones without a human in the loop.

The zone names are the contract. `src/webgl/scenes/pxl/pxlModel.ts` matches on
them, `PXL_MODEL_MAP.md` documents them, and the exporter writes them as glTF
node *and* mesh names. Renaming one is a breaking change to the configurator.
"""

from __future__ import annotations

import numpy as np

from pxl_source import Part, clip_faces, crease_patches, face_normals, outward_faces

# ── Zone identifiers ─────────────────────────────────────────────────────────
# Grouped exactly as they are grouped in the exported hierarchy.

HULL_PRIMARY = "hull_primary"
HULL_LOWER = "hull_lower"
HULL_ACCENT = "hull_accent"
TRANSOM_BLACK = "transom_black"
DECK_MAIN = "deck_main"
DECK_TRIM = "deck_trim"
CONSOLE_BODY = "console_body"
CONSOLE_TRIM = "console_trim"
HELM_WHEEL = "helm_wheel"
RAILS = "rails"
MOTOR = "motor"
MOTOR_TRIM = "motor_trim"
ACCESSORY_COVER = "accessory_cockpit_cover"

#: Forward edge of the black stern moulding, as a plane in hull-local
#: millimetres: x = STERN_PANEL_X0 + STERN_PANEL_RAKE·z.
#:
#: Measured off the reference water renders, where the edge is a straight line
#: raking aft as it descends: it passes 804 mm forward of the transom at the
#: sheer and 420 mm forward at the waterline. The same break appears, in the
#: same place, under all six hull colours — it is a moulding boundary, not a
#: paint choice, which is why it is worth cutting the mesh along it.
STERN_PANEL_X0 = 290.0
STERN_PANEL_RAKE = 0.62

#: A crease patch counts as gunwale capping if it sits this close to the sheer
#: line and faces outward. The cap is the black band carrying the cognac inlay
#: that runs the full length in every render; it arrives from the source as its
#: own pair of patches, so this only has to be loose enough to find them.
CAP_NEAR_SHEER = 0.16

#: Below this fraction of hull depth an unclaimed outward patch is part of the
#: black bottom rather than the painted topsides. The chine sits at roughly
#: 0.45 depth amidships, so there is a wide margin.
BOTTOM_MAX_DEPTH = 0.22


def _sheer_profile(tris: np.ndarray, loa: float, bins: int = 64) -> np.ndarray:
    """Highest point of the shell at each station. The sheer line, sampled."""
    z = tris.mean(1)[:, 2]
    x = tris.mean(1)[:, 0]
    idx = np.clip((x / loa * bins).astype(int), 0, bins - 1)
    prof = np.zeros(bins)
    np.maximum.at(prof, idx, z)
    # Fill any empty station from its neighbours so the profile is monotonic
    # in coverage rather than dropping to zero where the mesh is sparse.
    for i in range(1, bins):
        if prof[i] == 0:
            prof[i] = prof[i - 1]
    for i in range(bins - 2, -1, -1):
        if prof[i] == 0:
            prof[i] = prof[i + 1]
    return prof


def split_hull(part: Part, loa: float, depth: float
               ) -> tuple[np.ndarray, np.ndarray, dict[str, np.ndarray]]:
    """Split the welded hull shell into its five semantic surfaces.

    Returns (points, faces, zone → face-mask). Both arrays are re-issued rather
    than reused: cutting the stern moulding adds vertices and triangles.

    The hull arrives from SketchUp as ONE object: topsides, bottom, transom,
    gunwale capping and the black stern moulding are a single welded skin.
    Everything the configurator can address separately has to be recovered from
    the geometry, and the order below is chosen so that each rule only ever
    claims what it can be certain of:

      1. cut the mesh along the forward edge of the black stern moulding — the
         one boundary that is a designed straight line rather than a crease;
      2. the crease partition separates the bottom from the topsides at the
         chine, and finds the gunwale capping as its own pair of patches: both
         are edges the designer drew, so both come out clean;
      3. the transom is what faces aft at the stern;
      4. of what remains, an athwartships ray test separates the painted
         topsides from the shell's inward-facing side.
    """
    # 1 ── the designed paint break, cut through the triangles it crosses.
    points, faces, forward = clip_faces(
        part.points, part.faces,
        (1.0, 0.0, -STERN_PANEL_RAKE, -STERN_PANEL_X0),
    )
    tris = points[faces]
    normals, _ = face_normals(tris)
    centre = tris.mean(1)

    # 2 ── crease patches.
    patches = crease_patches(faces, normals)
    ids, counts = np.unique(patches, return_counts=True)
    ranked = ids[np.argsort(-counts)]
    biggest = sorted(ranked[:2], key=lambda p: centre[patches == p, 2].mean())
    bottom, topside = int(biggest[0]), int(biggest[1])

    prof = _sheer_profile(tris, loa)
    bins = prof.size
    station = np.clip((centre[:, 0] / loa * bins).astype(int), 0, bins - 1)
    below_sheer = prof[station] - centre[:, 2]

    zone = np.full(faces.shape[0], DECK_MAIN, dtype=object)
    outer = outward_faces(tris)

    zone[patches == bottom] = HULL_LOWER
    zone[(patches == topside) & outer] = HULL_PRIMARY

    # Unclaimed patches — spray rails, the keel strip, small mouldings — go
    # wherever their own geometry says, whole patch at a time so that no patch
    # is ever cut by a threshold.
    for pid, count in zip(ids, counts):
        if int(pid) in (bottom, topside):
            continue
        m = patches == pid
        if not outer[m].mean() > 0.5:
            continue
        zone[m] = (HULL_LOWER if centre[m, 2].mean() < BOTTOM_MAX_DEPTH * depth
                   else HULL_PRIMARY)

    # 3 ── the gunwale capping: outward patches lying against the sheer line.
    for pid in ids:
        m = patches == pid
        if outer[m].mean() > 0.5 and below_sheer[m].mean() < CAP_NEAR_SHEER * depth:
            zone[m] = HULL_ACCENT

    # 4 ── the transom, and the black stern moulding it is continuous with.
    transom = (centre[:, 0] < 0.05 * loa) & (np.abs(normals[:, 0]) > 0.55)
    zone[transom & (zone != DECK_MAIN)] = TRANSOM_BLACK
    zone[~forward & (zone == HULL_PRIMARY)] = TRANSOM_BLACK

    return points, faces, {z: zone == z for z in np.unique(zone)}


#: Loose parts map straight onto zones — they arrived as separate objects and
#: the reference renders confirm each one is a single material.
PART_ZONE = {
    "deck_liner": DECK_MAIN,
    "console_body": CONSOLE_BODY,
    "console_top": CONSOLE_TRIM,
    # A flat panel at sole level under the console — its base plate, not part
    # of the console body — so it belongs with the deck mouldings.
    "console_face": DECK_TRIM,
    "bow_panel": DECK_TRIM,
    "wheel": HELM_WHEEL,
    "rail_fwd": RAILS,
    "rail_aft": RAILS,
    "motor": MOTOR,
    "motor_bracket": MOTOR_TRIM,
    "cockpit_cover": ACCESSORY_COVER,
}

#: The hull arrives as a zero-thickness open shell — there is no inner skin
#: below the sheer, and the moulded liner does not quite reach the gunwale — so
#: these zones would show daylight through the boat under backface culling.
#: This is a limitation of the source, recorded in PXL_MODEL_MAP.md, not a
#: rendering preference: giving the hull thickness would mean inventing
#: geometry the yard has not drawn.
OPEN_SHELL_ZONES = {
    HULL_PRIMARY, HULL_LOWER, HULL_ACCENT, TRANSOM_BLACK, DECK_MAIN, DECK_TRIM,
    ACCESSORY_COVER,
}

#: Drawn order of the exported nodes, and the grouping in the glTF hierarchy.
GROUPS: list[tuple[str, list[str]]] = [
    ("HULL", [HULL_PRIMARY, HULL_LOWER, HULL_ACCENT]),
    ("TRANSOM", [TRANSOM_BLACK]),
    ("DECK", [DECK_MAIN, DECK_TRIM]),
    ("CONSOLE", [CONSOLE_BODY, CONSOLE_TRIM, HELM_WHEEL]),
    ("METAL", [RAILS]),
    ("PROPULSION", [MOTOR, MOTOR_TRIM]),
    ("OPTIONAL", [ACCESSORY_COVER]),
]

#: One material per zone, addressed by name from the runtime. Values are the
#: *neutral* delivery state: the reference sage hull, black structures that
#: keep their form, cognac rails. The configurator overrides base colour and
#: the paint parameters at runtime; it never swaps the material object.
#:
#: baseColor is linear-sRGB as glTF requires; roughness/metallic/clearcoat are
#: chosen from what the renders show, not from a preset library. The hull is a
#: sprayed marine finish — deep, but nothing like an automotive mirror, so
#: clearcoat is light and roughness stays off zero.
MATERIALS: dict[str, dict] = {
    HULL_PRIMARY: dict(base=(0.223, 0.278, 0.263), rough=0.26, metal=0.0,
                       clearcoat=0.55, clearcoatRough=0.12),
    HULL_LOWER: dict(base=(0.017, 0.018, 0.019), rough=0.42, metal=0.0,
                     clearcoat=0.18, clearcoatRough=0.30),
    HULL_ACCENT: dict(base=(0.026, 0.027, 0.029), rough=0.34, metal=0.0,
                      clearcoat=0.30, clearcoatRough=0.20),
    TRANSOM_BLACK: dict(base=(0.021, 0.022, 0.024), rough=0.38, metal=0.0,
                        clearcoat=0.25, clearcoatRough=0.24),
    DECK_MAIN: dict(base=(0.052, 0.054, 0.056), rough=0.72, metal=0.0),
    DECK_TRIM: dict(base=(0.223, 0.278, 0.263), rough=0.30, metal=0.0,
                    clearcoat=0.40, clearcoatRough=0.16),
    CONSOLE_BODY: dict(base=(0.030, 0.033, 0.041), rough=0.30, metal=0.0,
                       clearcoat=0.45, clearcoatRough=0.14),
    CONSOLE_TRIM: dict(base=(0.040, 0.043, 0.050), rough=0.44, metal=0.0),
    HELM_WHEEL: dict(base=(0.020, 0.020, 0.022), rough=0.48, metal=0.0),
    RAILS: dict(base=(0.412, 0.145, 0.036), rough=0.46, metal=0.0),
    MOTOR: dict(base=(0.024, 0.025, 0.026), rough=0.36, metal=0.0,
                clearcoat=0.30, clearcoatRough=0.18),
    MOTOR_TRIM: dict(base=(0.055, 0.056, 0.058), rough=0.50, metal=0.35),
    ACCESSORY_COVER: dict(base=(0.075, 0.079, 0.077), rough=0.78, metal=0.0),
}
