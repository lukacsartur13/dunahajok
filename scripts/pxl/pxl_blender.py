"""
PXL — Blender geometry stage.  PHASE 4.3.

    blender -b --python scripts/pxl/pxl_blender.py
    npm run pxl:blender

Reads the archival master `assets/derived/pxl/PXL.source.glb` — the honest STL
recovery, which this stage never edits — and writes the production asset
`assets/derived/pxl/PXL.production.glb`, which `compress-pxl.mjs` then optimises
into `public/models/PXL.glb`.

── WHAT CHANGED IN 4.3, AND WHY IT IS A DIFFERENT KIND OF CHANGE ───────────

Phase 4.2 was a PARTITION fix. It never created or destroyed a surface: it
welded the delivered shell back together, moved faces between zones where a
measurement said the assignment was wrong, and authored two small parts. Its
own report says so, and its own report is also where the limit shows — §M1,
"the console is still the superseded revision… unchangeable without geometry
nobody has supplied".

That was true of the console as a REPLACEMENT and false of the console as a
RECONSTRUCTION, which is what §4 of the 4.3 brief asks for. The plates carry
enough to measure one: the dash's height above the sheer at both ends, the
screen's apex, the rake of its forward post, the wheel's hub. So this phase
DELETES the STL's upper architecture and rebuilds it — see `pxl_upper.py`,
which owns every authored part and every dimension.

    KEPT, UNTOUCHED     hull_primary · hull_lower · hull_accent · transom_black
                        and all four of Phase 4.2's corrections to them
    KEPT, RENAMED       deck_liner → interior_hard_liner
                        deck_sole  → cockpit_sole
    DELETED             console_body · console_trim · helm_wheel · rails
                        (the STL's, all four rebuilt from the plates)
    DELETED             interior_pads — the deck moulding lifted 35 mm, which
                        is what drew as a flat orange stripe round the cockpit.
                        Its faces go back to the liner they were cut from and
                        real cushions stand on them.
    AUTHORED            console_body · console_detail · windshield · helm_wheel
                        rails · upholstery_primary · seat_base
                        and, from 4.2, coaming_inlay · bow_fitting

── THE HULL IS STILL NEVER REGENERATED ─────────────────────────────────────

Everything below the sheer is the delivered surface with Phase 4.2's four
corrections on it, and `npm run reference` returns the same silhouette numbers
to four decimals. §1 of the brief says to preserve what measures well, and the
hull measures well: depth within 2.6%, keel deviation 45 mm, the dark band's
edge at 72.1% of local depth against the drawing's 71.4%.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

import pxl_upper as U                                          # noqa: E402

SOURCE = ROOT / "assets" / "derived" / "pxl" / "PXL.source.glb"
OUT_GLB = ROOT / "assets" / "derived" / "pxl" / "PXL.production.glb"
OUT_BLEND = ROOT / "assets" / "blender" / "PXL.blend"

# ── Zone names ──────────────────────────────────────────────────────────────
# The contract with `src/webgl/scenes/pxl/pxlModel.ts`. Renaming one here is a
# breaking change to the configurator; `npm run model` fails loudly if a name
# the runtime addresses stops being exported.
#
# THREE NAMES CHANGED IN 4.3 and §14 of the brief permits it explicitly —
# "do not keep old material-role assumptions merely for backward compatibility
# if they are now incorrect". `deck_liner` was never a deck, `deck_sole` was
# never named after the thing it is, and `interior_pads` was a moulding.

HULL_PRIMARY = "hull_primary"
HULL_LOWER = "hull_lower"
HULL_ACCENT = "hull_accent"
TRANSOM_BLACK = "transom_black"
INTERIOR_LINER = "interior_hard_liner"
COCKPIT_SOLE = "cockpit_sole"
UPHOLSTERY = "upholstery_primary"
#: NEW IN 4.9. The driver's squab, and the only upholstery that is not part of
#: `upholstery_primary`. It is the same leather in the same role and it is a
#: separate NODE because it is a lid: `build_seat_base` leaves an aperture under
#: it and the runtime turns this object about its own origin, which `main` moves
#: to the hinge so nothing downstream has to know where the seat is.
SEAT_LID = "seat_lid"
#: NEW IN 4.9. The three forward squabs, each the lid of the locker under it.
#: Same leather, same role, same channel as `upholstery_primary`; separate
#: nodes because a rotation applies to a node.
CUSHION_LIDS = {
    "starboard": "cushion_lid_starboard",
    "port": "cushion_lid_port",
    "nose": "cushion_lid_nose",
}
COAMING_INLAY = "coaming_inlay"
BOW_FITTING = "bow_fitting"
CONSOLE_BODY = "console_body"
CONSOLE_DETAIL = "console_detail"
WINDSHIELD = "windshield"
HELM_WHEEL = "helm_wheel"
RAILS = "rails"
MOTOR = "motor"
MOTOR_TRIM = "motor_trim"
ACCESSORY_COVER = "accessory_cockpit_cover"

#: NEW IN 4.4. The capping, as a real moulding with a real top surface.
#:
#: It does NOT replace `hull_accent`, and the distinction is §11's. `hull_accent`
#: is the dark band on the hull's SIDE below the sheer — the ground the Duna
#: script is projected onto — and it stays exactly where it is. This is the
#: horizontal moulding that caps the hull, which the boat did not have.
GUNWALE = "gunwale_capping"

#: NEW IN 4.4. The optional aft boarding platform, in its two materials.
#: §32 — separate semantic roles, so neither can be reached by the interior
#: colour and the teak cannot be reached by the exterior one.
PLATFORM_FRAME = "platform_frame"
PLATFORM_DECK = "platform_deck"
#: NEW IN 4.9. The raked stern moulding the July side plate draws and the STL
#: does not — PXL_REFERENCE_QA.md's one PARTIAL row, built at last. It ships
#: with the boarding platform because it lands ON the platform: see
#: `pxl_upper.build_stern_spoiler`.
STERN_SPOILER = "stern_spoiler"
#: NEW IN 4.9. Cockpit audio, as two zones rather than one: the grille is a
#: moulding and the ring is a light, and a night configuration has to be able to
#: light the second without the first glowing. Both optional.
SPEAKER_GRILLE = "speaker_grille"
SPEAKER_LIGHT = "speaker_light"
#: NEW IN 4.9. The optional cool box forward of the console: shell, lining and
#: lid. Three zones because they are three material questions — see
#: `pxl_upper.build_cool_box`.
COOL_BOX = "cool_box"
COOL_BOX_LINER = "cool_box_liner"
COOL_BOX_LID = "cool_box_lid"
#: NEW IN 4.10. The optional bimini over the helm. Two zones, because there are
#: two materials: canvas and tube. The frame takes the grab rails' channel — it
#: is the same tube on the same boat — and the canvas takes none, because black
#: is what the client's reference shows and nothing configures it yet.
BIMINI_CANOPY = "bimini_canopy"
#: NEW IN 4.10.18. The frame is FIVE nodes, not one, because the fold is a rigid
#: rotation per member and three's unit of rigid motion is a node: what turns
#: aft, what turns forward, the middle bow that only rises, the brace between
#: them, and the deck fittings, which are bolted down and never move.
BIMINI_FRAME = "bimini_frame"
BIMINI_AFT = "bimini_aft"
BIMINI_FWD = "bimini_fwd"
BIMINI_MID = "bimini_mid"
BIMINI_BRACE = "bimini_brace"
#: NEW IN 4.10.22. The after straps, as their own node: they unhook the moment
#: the top is struck, and a mesh cannot hide half of itself.
BIMINI_STRAP = "bimini_strap"
#: NEW IN 4.10.9. The struck top, gathered into its cover boot. A zone of its
#: own because it is the OTHER state of the canvas, not the same object moved:
#: cloth collapses and a mesh does not.
BIMINI_BOOT = "bimini_boot"

#: NEW IN 4.4. A LABEL WITH NO OBJECT BEHIND IT. Faces routed here are dropped
#: on the floor by `split_by_zone`; it is how §2's deletion is expressed inside
#: a pipeline whose only vocabulary is "which zone does this face belong to".
BOW_VOID = "__deleted_bow_panel"
#: PHASE 4.7.2 §1–§3, §29. The delivered raised side platform, which every
#: phase of this model has carried and which 4.7 turned graphite. Same
#: mechanism as `BOW_VOID`: a bin `split_by_zone` never builds an object
#: for, so the faces leave the model rather than being recoloured or
#: renamed. See `pxl_upper.SPEC.platform_void_x` for what is kept and why.
SIDE_VOID = "__deleted_side_platform"
#: PHASE 4.9. THE DELIVERED STRUCTURE UNDER THE DECK, WHICH NOTHING HAS BEEN
#: ABLE TO SEE SINCE 4.7.2 EXCEPT WHERE IT COMES OUT THROUGH THE HULL.
#:
#: The STL recovery carries a second floor low in the boat: a flat slab at
#: z 0.107–0.15 and the short walls that stand on it, 100 triangles of sole and
#: 184 of liner, running from the transom to x 1.08. It was the bilge under the
#: delivered interior. Phase 4.7.2 replaced the delivered interior with one deck
#: at `SPEC.deck_z` = 0.372, and from that point the slab was 200 mm below a
#: floor that covers it from the transom to the forward pads — invisible, and
#: kept only because no rule mentioned it.
#:
#: EXCEPT THAT IT IS NOT ENTIRELY INSIDE THE BOAT. Its outboard edge reaches
#: |y| 1.025 where the hull's own skin at that height is 0.975, so it stands
#: 50 mm PROUD of the topsides. Bow-on it draws as a small hard-edged flange
#: coming out of the side around x 1.0; from below and ahead its ragged
#: protruding edge throws a comb of shadow teeth down the hull bottom, which is
#: the "hatching" under the chine.
#:
#: So the same bin as the two above: a label `split_by_zone` builds no object
#: for. Not lowered, not tucked in, not recoloured — there is no floor under the
#: floor, and a boat that has one is carrying it for nothing.
UNDER_VOID = "__deleted_under_deck"

#: Zones welded into one skin in the source and re-cut here.
SHELL_ZONES = [HULL_PRIMARY, HULL_LOWER, HULL_ACCENT, TRANSOM_BLACK,
               "deck_main", "deck_trim"]

#: What the STL delivered above the sheer, and what this phase replaces. Every
#: one of them was measured against the plates and lost — see `pxl_upper`.
SUPERSEDED = ["console_body", "console_trim", "helm_wheel", "rails"]

GROUPS: list[tuple[str, list[str]]] = [
    ("HULL", [HULL_PRIMARY, HULL_LOWER, HULL_ACCENT]),
    ("TRANSOM", [TRANSOM_BLACK]),
    ("GUNWALE", [GUNWALE]),
    ("DECK", [INTERIOR_LINER, COCKPIT_SOLE]),
    ("INTERIOR", [UPHOLSTERY, SEAT_LID, *CUSHION_LIDS.values(), COAMING_INLAY]),
    ("CONSOLE", [CONSOLE_BODY, CONSOLE_DETAIL, WINDSHIELD, HELM_WHEEL]),
    ("METAL", [RAILS, BOW_FITTING]),
    ("PROPULSION", [MOTOR, MOTOR_TRIM]),
    ("OPTIONAL", [ACCESSORY_COVER, PLATFORM_FRAME, PLATFORM_DECK, STERN_SPOILER,
                  SPEAKER_GRILLE, SPEAKER_LIGHT,
                  COOL_BOX, COOL_BOX_LINER, COOL_BOX_LID,
                  BIMINI_CANOPY, BIMINI_FRAME, BIMINI_BOOT,
                  BIMINI_AFT, BIMINI_FWD, BIMINI_MID, BIMINI_BRACE,
                  BIMINI_STRAP]),
]

# ── Measured constants (unchanged from Phase 4.2 unless noted) ──────────────

UP_FACING = 0.60
SOLE_MAX_Z = 0.47
PLATFORM_MAX_Z = 0.66
SPECKLE_MAX_AREA = 0.020
CAP_TERMINUS_X = 2.02
CAP_BAND_DEPTH = 0.074
WELD_DIST = 2e-4

#: NEW IN 4.3. The step face between the sole and the raised platform.
#:
#: The cockpit three-quarter shows it dark — the same graphite as the sole, not
#: the sage of the liner — and it is a real, separately-visible surface roughly
#: 0.19 m tall running the length of the cockpit. Phase 4.2 put it in the liner
#: because the liner was everything that was not an up-facing surface, which is
#: a definition rather than an observation.
STEP_MAX_Z = 0.60
STEP_VERTICAL = 0.55

#: NEW IN 4.7 — THE TOP OF THE RAISED SIDE PLATFORM, AND THE HIGHEST SURFACE A
#: PERSON STANDS ON.
#:
#: The interior material correction: "where there are NO upholstered pads the
#: visible floor / sole should be very dark grey or near-black", and "the
#: centre/open walking area should remain dark". Up to 4.6 `sole` stopped at
#: SOLE_MAX_Z, which is the cockpit floor at z 0.377 and nothing else — so the
#: raised side platforms at 0.570, which are the rest of the floor, stayed in
#: `interior_hard_liner` and wore the HULL's colour. Two symmetrical cushions
#: leave a good deal of that platform exposed either side of them, and the plan
#: view of the 4.6 boat shows how much: everything forward of x 1.15 is teal.
#:
#: 0.62 clears the platform at 0.570 and stays well under the aft deck shelf at
#: 0.73, which `aft_deck` claims for the stern moulding, and well under the
#: coaming — which is NOT floor, is not walked on, and keeps the hull's colour
#: because §11's hierarchy needs the hard liner to be visible somewhere.
PLATFORM_MAX_Z = 0.62

#: NEW IN 4.3. The aft deck shelf, which belongs to the stern moulding. Measured
#: from the interior probe: the liner steps up to z ≈ 0.73 abaft x −2.15 and
#: carries round to the transom.
AFT_DECK_MIN_Z = 0.56
#: MOVED IN 4.9, FROM −2.10, AND IT IS NOW THE SAME NUMBER AS THE VOID'S OWN
#: AFT END rather than an independent one 50 mm forward of it.
#:
#: They used to disagree, and 50 mm of overlap is all it took: `build_seat_base`
#: puts its aft rim at z 0.570 from −2.150 to −2.100, and this rule was handing
#: the delivered surface at that same height and that same station to the stern
#: moulding instead of deleting it. Two coplanar faces, one authored and one
#: delivered, both at 0.570 — which draws as a bright band flickering across the
#: back of the locker mouth, and which is the kind of defect that only appears
#: once somebody opens the seat and looks in.
#:
#: Written as the void's own number so the two cannot drift apart again: from
#: here forward is authored interior, abaft it is the stern moulding, and there
#: is exactly one station where that changes.
AFT_DECK_MAX_X = U.SPEC.platform_void_x[0]

#: NEW IN 4.9. The height below which delivered interior is bilge — see
#: `UNDER_VOID`.
#:
#: PICKED IN A GAP, NOT AT A BOUNDARY. On the 4.8 production file the two
#: interior zones between them have nothing at all between z 0.30 and z 0.35:
#: the under-deck slab and its walls finish at 0.30 and the next surface up is
#: the deck at 0.372. So the cut can be anywhere in 50 mm of empty height and
#: cannot take a face somebody meant to keep, whichever way the recovery's
#: numbers drift. It is also `SPEC.platform_void_z[0]`, which is the same
#: statement made by Phase 4.7.2 about the delivered platform: below this the
#: delivered interior is structure, not surface.
UNDER_DECK_MAX_Z = 0.300

#: NEW IN 4.4, §2. THE LARGE BOW ELEMENT, AND THE RULE THAT DELETES IT.
#:
#: `scripts/pxl/_probe44.mjs` on the 4.3 production file:
#:
#:     interior_hard_liner, forward of x 1.45
#:       42 triangles · 2.479 m² · 2.072 m² of it UP-FACING
#:       x 1.431 → 2.611 · y ±0.838 · z 0.570 → 0.873
#:
#: Two square metres of flat up-facing surface spanning the full beam and 22%
#: of the waterline length, in forty-two triangles. That is the "large light /
#: white polygonal element currently filling the bow" §2 names, and §2 is
#: explicit that it is to be DELETED rather than shrunk, recoloured, thinned or
#: hidden in some configurations.
#:
#: So these faces are labelled into a bin that `split_by_zone` never builds an
#: object for. They are not moved to another zone, because a zone is a thing
#: that gets exported; they leave the model.
#:
#: The station is the capping's own convergence (`SPEC.gunwale_converge_x`),
#: less a small overlap so the new moulding's underside always has liner behind
#: it and no daylight opens between the two at a grazing angle. §3 — nothing
#: replaces the deleted panel: what closes the bow forward of the convergence
#: is the capping arriving there from both sides.
#: The station is where the delivered side platforms STOP being side platforms.
#: `pxl_upper.SPEC.side_cushion_x` runs the cushions to x 1.470 because that is
#: where the interior probe finds the raised moulding ending; the probe above
#: finds the flat panel starting at x 1.431. They are the same edge, and abaft
#: it the up-facing moulding is a real seat base carrying real cushions. So the
#: cut is at the cushions' own forward end: everything the boat uses is kept,
#: everything that only closed the bow goes.
#: PULLED BACK 80 mm IN 4.7, WITH `forward_liner_x`. The two numbers are one
#: number: this rule deletes the delivered moulding forward of `BOW_DECK_MIN_X
#: − 0.060` and `build_forward_liner` builds the replacement from
#: `SPEC.forward_liner_x[0]`, so anything between them is a hole in the floor.
#: There was one — `_probe47` finds the inside of the bottom of the boat
#: directly under a camera at x 1.36 → 1.48 — and 4.6 could not see it because
#: its crossing pad lay over it. 1.390 − 0.060 is 1.330, which is exactly where
#: the new liner starts.
BOW_DECK_MIN_Z = 0.50
BOW_DECK_MIN_X = 1.350

# ── Materials ───────────────────────────────────────────────────────────────
# DELIVERY STATE ONLY. The configurator overrides base colour and the paint
# parameters at runtime and never swaps the material object, so these are what
# the boat looks like before anyone chooses anything. Linear-sRGB, as glTF
# requires.
#
# §25 — THE DARK FAMILIES ARE NO LONGER ONE GREY. Five of them, and each is a
# different material on a real boat: painted moulding on the transom, structural
# black on the capping, a textured deck covering on the sole, a satin shell on
# the console and a dark seat base. They differ in roughness before they differ
# in colour, which is how they read apart under one light.

MATERIALS: dict[str, dict] = {
    HULL_PRIMARY: dict(base=(0.223, 0.278, 0.263), rough=0.22, metal=0.0),
    HULL_LOWER: dict(base=(0.016, 0.017, 0.018), rough=0.40, metal=0.0),
    HULL_ACCENT: dict(base=(0.024, 0.025, 0.027), rough=0.30, metal=0.0),
    TRANSOM_BLACK: dict(base=(0.019, 0.020, 0.022), rough=0.35, metal=0.0),
    INTERIOR_LINER: dict(base=(0.223, 0.278, 0.263), rough=0.32, metal=0.0),
    COCKPIT_SOLE: dict(base=(0.010, 0.010, 0.011), rough=0.90, metal=0.0),
    UPHOLSTERY: dict(base=(0.196, 0.079, 0.030), rough=0.62, metal=0.0),
    # The squab is the same leather as the rest of the upholstery, to the
    # decimal. It is a separate object because it moves, not because it is a
    # different material, and the day those two numbers differ is the day the
    # seat reads as a lid dropped on from another boat.
    SEAT_LID: dict(base=(0.196, 0.079, 0.030), rough=0.62, metal=0.0),
    **{name: dict(base=(0.196, 0.079, 0.030), rough=0.62, metal=0.0)
       for name in CUSHION_LIDS.values()},
    COAMING_INLAY: dict(base=(0.412, 0.145, 0.036), rough=0.44, metal=0.0),
    BOW_FITTING: dict(base=(0.412, 0.145, 0.036), rough=0.40, metal=0.0),
    CONSOLE_BODY: dict(base=(0.223, 0.278, 0.263), rough=0.28, metal=0.0),
    CONSOLE_DETAIL: dict(base=(0.021, 0.023, 0.026), rough=0.28, metal=0.0),
    WINDSHIELD: dict(base=(0.055, 0.070, 0.090), rough=0.06, metal=0.0),
    HELM_WHEEL: dict(base=(0.026, 0.027, 0.029), rough=0.42, metal=0.0),
    RAILS: dict(base=(0.412, 0.145, 0.036), rough=0.38, metal=0.0),

    # §10, §32 — THE CAPPING IS NOT UPHOLSTERY AND NOT A SEPARATE COLOUR.
    #
    # Every reference shows it in the hull's own tone: teal in the teal studies,
    # pale in the pale ones. So its delivery colour is `hull_primary`'s exactly
    # — and it is a different MATERIAL carrying a different ROLE, which is what
    # §10 and §32 actually ask for. The runtime binds it to the exterior
    # channel and never to `interiorPrimary`, so choosing Cognac cannot reach
    # it. Slightly rougher than the topsides: it is a walked-on horizontal
    # moulding, not a polished vertical panel.
    GUNWALE: dict(base=(0.223, 0.278, 0.263), rough=0.30, metal=0.0),

    # §22, §23 — the platform's two materials, and they are two for a reason.
    # The frame is structural black in the reference; the tread is wood. A
    # single material with a wood colour would let the exterior sweep repaint
    # the whole assembly the first time anybody bound it to a channel.
    # `_sample.mjs` on the reference frame beneath the tread: #232323 / #333434.
    PLATFORM_FRAME: dict(base=(0.017, 0.017, 0.018), rough=0.44, metal=0.0),
    # Marine teak. `_sample.mjs` walks the reference tread from its shadowed
    # inboard end to its lit outboard one — #744520, #985927, #9f5e2c, #b0753f
    # — and the lit sample is the surface's own colour: sRGB #b0753f, linear
    # (0.434, 0.178, 0.050). Rough, because oiled teak is not a varnished sole.
    PLATFORM_DECK: dict(base=(0.434, 0.178, 0.050), rough=0.68, metal=0.0),
    # The spoiler is the stern moulding, so it is the stern moulding's black to
    # the decimal. The plate draws one continuous black shape at this station
    # and the two halves of it wearing different blacks would be worse than not
    # building the second half at all.
    STERN_SPOILER: dict(base=(0.019, 0.020, 0.022), rough=0.35, metal=0.0),
    # A moulded marine grille: dark grey, matte, and no clearcoat. It is the one
    # part of this boat that is meant to look like a bought component rather
    # than a sprayed moulding.
    SPEAKER_GRILLE: dict(base=(0.045, 0.047, 0.052), rough=0.62, metal=0.0),
    # The ring's UNLIT colour. What it does when it is lit is a runtime finish —
    # see `PXL_SPEAKER_LIGHT_FINISHES` — because being lit is a configuration,
    # not a material the exporter should be deciding.
    SPEAKER_LIGHT: dict(base=(0.030, 0.032, 0.038), rough=0.30, metal=0.0),
    # The console's own dark, on the shell and the lid: the box stands directly
    # in front of the console and the two are one helm station.
    COOL_BOX: dict(base=(0.021, 0.023, 0.026), rough=0.30, metal=0.0),
    COOL_BOX_LID: dict(base=(0.021, 0.023, 0.026), rough=0.30, metal=0.0),
    # And white inside, which is the whole of what makes it read as insulated
    # rather than as one more graphite locker. Matte: a cool box liner is a
    # moulded polymer, not a gelcoat.
    COOL_BOX_LINER: dict(base=(0.742, 0.755, 0.760), rough=0.72, metal=0.0),
    # §4.10 — the bimini. Canvas first: acrylic duck, black, and ROUGH. The one
    # way to draw fabric wrong here is to let it take a highlight; at 0.90 it
    # returns the sky as a wash and nothing as a reflection, which is what the
    # client's reference shows and what separates it from a moulded hardtop.
    BIMINI_CANOPY: dict(base=(0.014, 0.014, 0.016), rough=0.90, metal=0.0),
    # And the frame is the grab rails' tube, to the decimal, because it is the
    # grab rails' tube. The runtime binds both to `railings`, so choosing a rail
    # finish moves them together — which is the reason they share a delivery
    # colour rather than a coincidence that has to be maintained.
    BIMINI_FRAME: dict(base=(0.412, 0.145, 0.036), rough=0.38, metal=0.0),
    # The four moving frame nodes are the same tube as the fittings they stand
    # on, to the decimal. They are separate nodes because they MOVE separately,
    # not because they are different metal.
    BIMINI_AFT: dict(base=(0.412, 0.145, 0.036), rough=0.38, metal=0.0),
    BIMINI_FWD: dict(base=(0.412, 0.145, 0.036), rough=0.38, metal=0.0),
    BIMINI_MID: dict(base=(0.412, 0.145, 0.036), rough=0.38, metal=0.0),
    BIMINI_BRACE: dict(base=(0.412, 0.145, 0.036), rough=0.38, metal=0.0),
    # The boot is the same cloth as the canopy, to the decimal — it IS the
    # canopy, rolled — and a second black here would read as a different
    # material the moment both are seen in one session.
    BIMINI_BOOT: dict(base=(0.014, 0.014, 0.016), rough=0.90, metal=0.0),
    # Webbing: the canopy's own cloth.
    BIMINI_STRAP: dict(base=(0.014, 0.014, 0.016), rough=0.90, metal=0.0),
}


def log(msg: str) -> None:
    print(f"  {msg}", flush=True)


def face_centres(bm: bmesh.types.BMesh) -> np.ndarray:
    return np.array([f.calc_center_median()[:] for f in bm.faces])


def face_normals(bm: bmesh.types.BMesh) -> np.ndarray:
    return np.array([f.normal[:] for f in bm.faces])


def sheer_profile(pts: np.ndarray, bins: int = 96) -> tuple[np.ndarray, float, float]:
    """Highest point of the shell at each fore-aft station."""
    x0, x1 = float(pts[:, 0].min()), float(pts[:, 0].max())
    dx = (x1 - x0) / bins
    idx = np.clip(((pts[:, 0] - x0) / dx).astype(int), 0, bins - 1)
    prof = np.full(bins, -np.inf)
    np.maximum.at(prof, idx, pts[:, 2])
    for i in range(1, bins):
        if not np.isfinite(prof[i]):
            prof[i] = prof[i - 1]
    for i in range(bins - 2, -1, -1):
        if not np.isfinite(prof[i]):
            prof[i] = prof[i + 1]
    return prof, x0, dx


# ── 1 · Load ────────────────────────────────────────────────────────────────

def purge_orphans() -> None:
    """Drop mesh datablocks nothing points at any more.

    Joining and deleting leaves the old meshes in `bpy.data`, and Blender then
    hands the NEXT mesh with that name a `.001` suffix — which the glTF exporter
    writes as the primitive's name. It is cosmetic today, because the runtime
    matches on node names and those stay clean, and it is a trap tomorrow for
    anyone who believes `pxlModel`'s "node AND material name" contract.
    """
    for block in list(bpy.data.meshes):
        if block.users == 0:
            bpy.data.meshes.remove(block)


def load_source() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    for ob in list(bpy.data.objects):
        if ob.type == "EMPTY":
            bpy.data.objects.remove(ob, do_unlink=True)
    log(f"source   {SOURCE.name}  "
        f"{sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH'):,} faces")


def drop_superseded() -> None:
    """Delete the STL's upper architecture.

    §1 of the brief: preserve the hull, treat everything above it as a candidate
    for reconstruction. These four are not candidates — each was measured
    against the plates and each lost:

      console_body / console_trim   a wedge raking the wrong way, 573 triangles
      helm_wheel                    2,198 triangles of ring standing in free air
      rails                         40 triangles of unswept polyline, which in
                                    profile draws as the orange stick beside the
                                    outboard that §6 reads as a tiller

    Deleting rather than hiding, because a hidden mesh is still 2,811 triangles
    of transfer and still a name the configurator can bind to by mistake.
    """
    dropped = []
    for name in SUPERSEDED:
        ob = bpy.data.objects.get(name)
        if ob is None:
            continue
        dropped.append(f"{name} {len(ob.data.polygons):,}f")
        bpy.data.objects.remove(ob, do_unlink=True)
    log(f"drop     superseded STL upper: {' · '.join(dropped) or 'none present'}")


def weld_shell() -> tuple[bpy.types.Object, list[str]]:
    """Join the shell zones back into one skin, carrying zone as an attribute."""
    labels = [z for z in SHELL_ZONES if z in bpy.data.objects]
    for i, name in enumerate(labels):
        ob = bpy.data.objects[name]
        attr = ob.data.attributes.new("zone", "INT", "FACE")
        attr.data.foreach_set("value", [i] * len(ob.data.polygons))

    bpy.ops.object.select_all(action="DESELECT")
    target = bpy.data.objects[labels[0]]
    for name in labels:
        bpy.data.objects[name].select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.join()
    target.name = "shell"
    target.data.name = "shell"

    bm = bmesh.new()
    bm.from_mesh(target.data)
    before = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=WELD_DIST)
    bm.to_mesh(target.data)
    bm.free()
    log(f"weld     {len(labels)} zones → one shell, "
        f"{before - len(target.data.vertices)} duplicate vertices merged, "
        f"{len(target.data.polygons):,} faces")
    return target, labels


# ── 2 · Phase 4.2's corrections, unchanged ──────────────────────────────────

def read_zones(ob: bpy.types.Object) -> np.ndarray:
    n = len(ob.data.polygons)
    buf = np.empty(n, dtype=np.int32)
    ob.data.attributes["zone"].data.foreach_get("value", buf)
    return buf


def write_zones(ob: bpy.types.Object, zones: np.ndarray) -> None:
    ob.data.attributes["zone"].data.foreach_set("value", zones.astype(np.int32).tolist())


def upright_interior_normals(shell, zones, labels) -> int:
    """Turn the inverted foredeck faces the right way up. Phase 4.2 §G2."""
    src = {labels.index(n) for n in ("deck_main", "deck_trim") if n in labels}
    bm = bmesh.new()
    bm.from_mesh(shell.data)
    bm.faces.ensure_lookup_table()
    flipped = 0
    for f in bm.faces:
        if zones[f.index] in src and f.normal.z < -0.85:
            f.normal_flip()
            flipped += 1
    if flipped:
        bm.to_mesh(shell.data)
    bm.free()
    log(f"normals  {flipped:,} inverted deck faces turned upright")
    return flipped


def split_interior(zones, labels, centres, normals, bm) -> np.ndarray:
    """Break the interior into the surfaces it physically has.

    TWO IN 4.3, NOT THREE. Phase 4.2 cut a third — `interior_pads`, the
    up-facing band at platform level — and then lifted it 35 mm to stand in for
    cushions. §12 of this brief is that the result reads as "a thin orange
    decorative stripe" rather than as seating, and it does: the band is 4.9 m²
    of flat moulding with 90° edges wearing the cockpit colour.

    So the platform goes back into the liner it was cut from and real cushions
    are built on top of it. What IS separated here is the step face between the
    sole and the platform, which the references show dark and which Phase 4.2
    had no rule for.
    """
    src = {labels.index(n) for n in ("deck_main", "deck_trim") if n in labels}
    mine = np.isin(zones, list(src))
    up = normals[:, 2] > UP_FACING
    vertical = np.abs(normals[:, 2]) < STEP_VERTICAL
    z = centres[:, 2]

    # PHASE 4.7 — EVERY UP-FACING INTERIOR SURFACE BELOW THE COAMING IS FLOOR.
    # It used to be `z < SOLE_MAX_Z`, which is the cockpit sole at 0.377 and
    # nothing else; the raised side platforms at 0.570 are the rest of the
    # floor and were reaching the boat in the hull's colour. See
    # PLATFORM_MAX_Z. The step face between the two levels was already dark and
    # is unchanged.
    # §4.9 — THE BILGE. Everything below the deck, deleted before anything else
    # is decided, because every rule below it was written for surfaces a person
    # can see and none of these is one. See UNDER_VOID for what it is and for
    # where it was coming out through the hull.
    under = mine & (z < UNDER_DECK_MAX_Z)

    sole = mine & up & (z < PLATFORM_MAX_Z) & ~under
    step = mine & vertical & (z >= SOLE_MAX_Z - 0.09) & (z < STEP_MAX_Z)
    # §19 — THE AFT DECK IS PART OF THE STERN MOULDING, NOT OF THE LINER.
    # Abaft the bench the liner steps up to a shelf at z ≈ 0.73 that carries
    # round to the transom, and every reference shows that whole area in the
    # black moulding rather than in the hull's own colour. Phase 4.2 left it
    # pale, which drew as a large light wedge behind the driver — the single
    # most conspicuous thing wrong with the stern three-quarter.
    # Every interior surface abaft the bench and above the platform, not just
    # the up-facing ones: the shelf has sides and a coaming, and leaving those
    # pale put a light wedge either side of the dark deck rather than removing
    # it. The whole aft moulding is one part in every reference.
    aft_deck = mine & (z >= AFT_DECK_MIN_Z) & (centres[:, 0] < AFT_DECK_MAX_X)

    # §2 — THE LARGE BOW ELEMENT. Up-facing interior forward of the capping's
    # convergence, above the platform. See BOW_DECK_MIN_Z for the measurement
    # this rule was written against and for why the faces are deleted rather
    # than relabelled.
    #
    # PHASE 4.6 §8 — AND THE WALL THE DELETION LEFT BEHIND. `up` is dropped, so
    # the rule now takes every interior face forward of the station rather than
    # only the flat ones. It has to: `_probe44` on the 4.4 production file finds
    # exactly six triangles of `interior_hard_liner` forward of x 1.30, at
    # x 1.135→1.494 spanning z 0.570→0.873, and they are near-vertical. That is
    # the cut edge of the panel §2 removed, standing across the boat — §8's
    # "large vertical panel closing off the forward interior like the end wall
    # of a box". Deleting a lid and keeping its rim is not a bow.
    #
    # The station is pulled back 60 mm to catch faces whose centroid sits just
    # abaft the cut, and it is safe to do that because `build_forward_liner`
    # now starts at 1.470 and covers everything the widened rule takes.
    bow_x = BOW_DECK_MIN_X
    bow_deck = mine & (z >= BOW_DECK_MIN_Z) & (centres[:, 0] >= bow_x - 0.060)

    # §1–§3, §29 — THE LONG RAISED SIDE PLATFORM, DELETED.
    #
    # Not recoloured, not converted to liner, not shortened: the faces go into
    # a bin nothing builds an object for. It is kept forward of the cushions'
    # aft station because that is what carries them (§11 allows a support local
    # to the cushion footprint) and abaft the bench's own station because that
    # is what the driver's seat stands on (§5). What leaves is the 1.70 m
    # between them, which is the cockpit — and `build_cockpit_floor` continues
    # the sole through the space it occupied.
    #
    # 4.9 — AND `~aft_deck`, WHICH IS LOAD-BEARING NOW. The window used to stop
    # at x −1.750 and could not reach the stern shelf; it runs to −2.150 from
    # 4.9 on, so 50 mm of it lies abaft `AFT_DECK_MAX_X` and this bin is
    # assigned AFTER `aft_deck` and would quietly delete that overlap. The
    # stern moulding wins the argument wherever the two rules meet.
    vx0, vx1 = U.SPEC.platform_void_x
    vz0, vz1 = U.SPEC.platform_void_z
    side_void = (mine & (centres[:, 0] >= vx0) & (centres[:, 0] < vx1)
                 & (z >= vz0) & (z < vz1) & ~aft_deck)

    liner = mine & ~sole & ~step & ~aft_deck & ~bow_deck & ~side_void & ~under

    zones[liner] = labels.index(INTERIOR_LINER)
    zones[sole | step] = labels.index(COCKPIT_SOLE)
    zones[aft_deck] = labels.index(TRANSOM_BLACK)
    zones[bow_deck] = labels.index(BOW_VOID)
    zones[side_void] = labels.index(SIDE_VOID)
    # LAST, so it wins outright. `step`, `aft_deck` and `bow_deck` all have
    # their own height floors well above the deck and cannot reach down here,
    # but a rule that deletes structure should not depend on the other rules
    # staying where they are.
    zones[under] = labels.index(UNDER_VOID)
    area = np.array([f.calc_area() for f in bm.faces])
    log(f"interior split  {mine.sum():,} faces, {area[mine].sum():.2f} m² → "
        f"sole {int(sole.sum()):,}f/{area[sole].sum():.2f} m² · "
        f"step {int(step.sum()):,}f/{area[step].sum():.2f} m² · "
        f"aft deck {int(aft_deck.sum()):,}f/{area[aft_deck].sum():.2f} m² · "
        f"liner {int(liner.sum()):,}f/{area[liner].sum():.2f} m²")
    log(f"§2 bow    {int(bow_deck.sum()):,} faces / {area[bow_deck].sum():.3f} m² "
        f"of up-facing bow panel forward of x {bow_x:.3f} DELETED")
    log(f"§1 side   {int(side_void.sum()):,} faces / {area[side_void].sum():.3f} m² "
        f"of raised side platform, x {vx0:.2f}..{vx1:.2f}, z {vz0:.2f}..{vz1:.2f} "
        f"DELETED")
    log(f"4.9 bilge {int(under.sum()):,} faces / {area[under].sum():.3f} m² of "
        f"delivered structure below z {UNDER_DECK_MAX_Z:.2f} DELETED")
    return zones


def _forward_of(g, x: float) -> bool:
    if isinstance(g, bmesh.types.BMVert):
        return g.co.x >= x
    return any(v.co.x >= x for v in g.verts)


def cut_bow_capping_edge(ob: bpy.types.Object) -> float:
    """Cut the shell along the capping's lower edge at the bow. Phase 4.2 §G4."""
    pts = np.array([v.co[:] for v in ob.data.vertices])
    prof, x0, dx = sheer_profile(pts)
    bins = prof.size
    i0 = int(np.clip((CAP_TERMINUS_X - x0) / dx, 0, bins - 1))
    z_cut = float(np.median(prof[i0:])) - CAP_BAND_DEPTH

    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    geom = [g for g in (list(bm.verts) + list(bm.edges) + list(bm.faces))
            if _forward_of(g, CAP_TERMINUS_X - 0.02)]
    if not geom:
        bm.free()
        return z_cut
    before = len(bm.faces)
    bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-5,
                           plane_co=Vector((0, 0, z_cut)),
                           plane_no=Vector((0, 0, 1)),
                           clear_inner=False, clear_outer=False)
    bm.to_mesh(ob.data)
    bm.free()
    log(f"cut      capping edge at z {z_cut:.3f} forward of x {CAP_TERMINUS_X}, "
        f"{before:,} → {len(ob.data.polygons):,} faces")
    return z_cut


def extend_capping(zones, labels, centres, normals, z_cut) -> np.ndarray:
    """Carry the gunwale capping forward to the stem. Phase 4.2 §G5."""
    outward = np.abs(normals[:, 1]) > 0.25
    take = ((zones == labels.index(HULL_PRIMARY)) & outward
            & (centres[:, 0] >= CAP_TERMINUS_X) & (centres[:, 2] >= z_cut))
    zones[take] = labels.index(HULL_ACCENT)
    log(f"capping  band {CAP_BAND_DEPTH * 1000:.0f} mm below sheer; "
        f"{int(take.sum()):,} faces added forward of x {CAP_TERMINUS_X}")
    return zones


#: PHASE 4.6 §19 – §24, §45. THE LOWER-HULL PAINT DIVISION, TRACED.
#:
#: WHAT WAS WRONG, MEASURED RATHER THAN ASSERTED. The delivered STL's own
#: material split was carried unchanged from Phase 4.2, which checked it once —
#: "the dark band's edge at 72.1% of local depth against the drawing's 71.4%" —
#: and never checked it again. One number at one station. Sampled along the
#: boat, the outward-facing boundary between `hull_lower` and `hull_primary`
#: runs (model metres, starboard skin):
#:
#:     x  −2.50  −1.00   0.00   0.75   1.50   2.00   2.25
#:     z   0.015  0.021  0.105  0.172  0.276  0.336  0.333
#:
#: It climbs 0.32 m from stern to bow, because a constant fraction of local
#: depth on a hull whose sheer rises IS a line that climbs with the sheer. That
#: is §19's "generic hull-lower masking" and §45 fails it by name.
#:
#: WHAT THE DRAWING ACTUALLY DRAWS. `pxl-side-20240719.jpg`, traced by column
#: scan rather than by eye. The classifier is chroma, not luminance: the teal
#: topsides carry 20–30 levels of it and the black bottom carries under 8, so
#: "where does max(r,g,b) − min(r,g,b) collapse" finds the boundary through the
#: gloss highlights that defeat a brightness threshold. At 345.1 px/m with the
#: transom at column 699, converted to the model's own frame:
#:
#:     stern     z 0.176      nearly level
#:     midship   z 0.140      falling gently, 36 mm over 2.6 m
#:     x +0.78   z 0.092      THE KNUCKLE STARTS
#:     x +0.87   z 0.032      and it has fallen 0.11 m in 90 mm
#:     forward   z 0.032      dead level, until the keel rises to meet it
#:
#: So the real line is nearly HORIZONTAL, falls very slightly forward, breaks
#: sharply at 60% of the way to the bow and then runs level until the hull's own
#: rise closes the band out near x 2.1. §20's "specific height, slope, rise/fall,
#: angular breaks" is that knuckle: it is the whole character of the graphic, and
#: it is the one feature a depth-fraction rule can never produce.
PAINT_LINE: tuple[tuple[float, float], ...] = (
    (-2.700, 0.178),
    (-2.000, 0.159),
    (-1.000, 0.150),
    (0.000, 0.140),
    (0.500, 0.133),
    (0.780, 0.092),
    (0.870, 0.032),
    (2.100, 0.032),
    (2.700, 0.032),
)


def paint_line_z(x: float) -> float:
    """The design line's height at a station, linearly between the traced rows."""
    table = PAINT_LINE
    if x <= table[0][0]:
        return table[0][1]
    for (x0, z0), (x1, z1) in zip(table, table[1:]):
        if x <= x1:
            return z0 + (z1 - z0) * (x - x0) / (x1 - x0)
    return table[-1][1]


def recut_paint_line(shell, labels) -> None:
    """Cut the hull along `PAINT_LINE` and re-label the two sides of it.

    §21 — "Do not assign the dark section based simply on existing connected
    mesh boundaries if those boundaries do not match the reference. If
    necessary: split the hull material region in Blender according to the design
    line. Do NOT change the underlying hull shape."

    Both halves of that are load-bearing, so this does exactly two things: it
    adds edges along a surface, and it changes which zone a face belongs to. No
    vertex moves. `npm run reference` returns the same silhouette it returned in
    4.1 afterwards, which is the check that the second half held.

    §22 — A REAL BOUNDARY RATHER THAN A SHADER GRADIENT. Classifying the
    existing triangles by centroid would give a boundary that zig-zags by
    whatever the triangulation happens to be — up to 0.15 m on this mesh, whose
    topside facets are large. So the mesh is CUT first: every edge that crosses
    the line is split at the crossing, every face that now carries two new
    vertices is split between them, and only then is anything re-labelled. The
    result is a boundary that follows the design line to within the straightness
    of one segment, which is what makes it read as an intentional graphic.
    """
    bm = bmesh.new()
    bm.from_mesh(shell.data)
    layer = bm.faces.layers.int.get("zone")
    if layer is None:
        log("paint line  no zone layer, skipped")
        return

    primary = labels.index(HULL_PRIMARY)
    lower = labels.index(HULL_LOWER)
    mine = {primary, lower}

    def side(v) -> float:
        return v.co.z - paint_line_z(v.co.x)

    # Only edges with hull paint on at least one side. Cutting the interior
    # moulding and the transom along the same surface would add several thousand
    # triangles to describe a line nobody can see there.
    crossing = []
    for e in bm.edges:
        if not any(f[layer] in mine for f in e.link_faces):
            continue
        a, b = e.verts
        if side(a) * side(b) < 0:
            crossing.append(e)

    fresh = set()
    for e in crossing:
        a, b = e.verts
        fa, fb = side(a), side(b)
        t = fa / (fa - fb)
        if not (1e-4 < t < 1 - 1e-4):
            continue
        _, v = bmesh.utils.edge_split(e, a, t)
        fresh.add(v)

    split = 0
    for face in list(bm.faces):
        if face[layer] not in mine:
            continue
        on_line = [v for v in face.verts if v in fresh]
        if len(on_line) != 2:
            continue
        try:
            bmesh.utils.face_split(face, on_line[0], on_line[1])
            split += 1
        except ValueError:
            # The two crossings landed on one edge — nothing to split.
            pass

    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])

    moved = 0
    for face in bm.faces:
        if face[layer] not in mine:
            continue
        centre = face.calc_center_median()
        want = lower if centre.z < paint_line_z(centre.x) else primary
        if face[layer] != want:
            face[layer] = want
            moved += 1

    bm.to_mesh(shell.data)
    bm.free()
    shell.data.update()
    log(f"paint    {len(crossing):,} edges cut · {split:,} faces split · "
        f"{moved:,} re-labelled — the traced design line, "
        f"z {PAINT_LINE[0][1]:.3f} at the transom → {PAINT_LINE[-1][1]:.3f} forward "
        f"of the knuckle at x {PAINT_LINE[5][0]:.2f}")


def despeckle(zones, labels, bm) -> np.ndarray:
    """Dissolve stray zone patches into their surroundings. Phase 4.2 §G1."""
    bm.faces.ensure_lookup_table()
    area = np.array([f.calc_area() for f in bm.faces])
    moved_total = 0
    for _ in range(6):
        seen = np.zeros(len(bm.faces), dtype=bool)
        moved = 0
        for seed in bm.faces:
            if seen[seed.index]:
                continue
            zone = zones[seed.index]
            patch, stack = [], [seed]
            seen[seed.index] = True
            while stack:
                f = stack.pop()
                patch.append(f.index)
                for e in f.edges:
                    for nf in e.link_faces:
                        if not seen[nf.index] and zones[nf.index] == zone:
                            seen[nf.index] = True
                            stack.append(nf)
            if area[patch].sum() > SPECKLE_MAX_AREA:
                continue
            ring: dict[int, int] = {}
            for fi in patch:
                for e in bm.faces[fi].edges:
                    for nf in e.link_faces:
                        if zones[nf.index] != zone:
                            ring[zones[nf.index]] = ring.get(zones[nf.index], 0) + 1
            if not ring:
                continue
            zones[patch] = max(ring.items(), key=lambda kv: kv[1])[0]
            moved += len(patch)
        moved_total += moved
        if moved == 0:
            break
    log(f"despeckle  {moved_total:,} faces in stray patches relabelled")
    return zones


# ── 3 · Parts carried over from Phase 4.2 ───────────────────────────────────

def build_coaming_inlay(cap, sheer):
    """The cognac line along the top of the capping. Phase 4.2 §G7."""
    HEIGHT, DROP, PROUD = 0.030, 0.010, 0.005
    bm = bmesh.new()
    bm.from_mesh(cap.data)
    bm.edges.ensure_lookup_table()
    prof, x0, dx = sheer
    bins = prof.size

    picked = []
    for e in bm.edges:
        if len(e.link_faces) != 1:
            continue
        a, b = e.verts[0].co, e.verts[1].co
        mid = (a + b) / 2
        i = int(np.clip((mid.x - x0) / dx, 0, bins - 1))
        if prof[i] - mid.z > 0.030:
            continue
        picked.append((e, e.link_faces[0].normal.copy()))

    verts: list[tuple[float, float, float]] = []
    faces: list[list[int]] = []
    for e, n in picked:
        out = Vector((0.0, n.y, 0.0))
        out.normalize()
        out *= PROUD
        base = len(verts)
        for v in (e.verts[0].co, e.verts[1].co):
            verts.append((v + out + Vector((0, 0, -DROP)))[:])
            verts.append((v + out + Vector((0, 0, -DROP - HEIGHT)))[:])
        faces.append([base, base + 2, base + 3, base + 1])
    bm.free()
    if not faces:
        log("inlay    no capping boundary found — not built")
        return None
    ob = U.weld(U.mesh_from(COAMING_INLAY, verts, faces))
    log(f"inlay    {len(ob.data.polygons)} faces on the capping's own top boundary")
    return ob


def build_bow_fitting(hull, decks, sheer):
    """The flush bow deck cleat, mirrored. Phase 4.2 §G8, re-seated in 4.4 §12.

    PHASE 4.4. The ray used to be aimed at a range of guessed half-beams and
    accepted a hit 0.03–0.16 m below the sheer, which is what the liner's bow
    panel measured. It is gone (§2), and the surface the reference actually
    puts these cleats on is the capping — whose top is 5–11 mm below the sheer,
    inside the old rule's dead band.

    So the placement is now derived rather than searched: the cleat is centred
    across the capping's own width at the station Phase 4.2 measured, and the
    height comes from a ray fired at that exact point. A cleat cannot land half
    over the edge, and cannot fail to be placed because the search grid missed
    a 0.16 m wide moulding.
    """
    LENGTH, WIDTH, PLATE, BAR = 0.190, 0.072, 0.010, 0.012
    APERTURE = 0.044
    depsgraph = bpy.context.evaluated_depsgraph_get()
    verts: list[tuple[float, float, float]] = []
    faces: list[list[int]] = []
    placed = 0

    for side in (1, -1):
        found = None
        for xs in (2.15, 2.05, 1.95, 1.85, 1.75):
            plan = U.gunwale_plan(hull, xs)
            if plan is None:
                continue
            outer, inner = plan
            if outer - inner < WIDTH + 0.030:
                continue
            y = side * (inner + outer) / 2
            for deck in decks:
                hit, loc, nor, *_ = deck.ray_cast(
                    Vector((xs, y, 1.8)), Vector((0, 0, -1)), depsgraph=depsgraph)
                if hit and nor.z > 0.7 and (found is None or loc.z > found[2]):
                    found = (xs, y, loc.z)
            if found:
                break
        if not found:
            continue
        x, y, z = found
        placed += 1

        def box(x0, x1, y0, y1, z0, z1):
            b = len(verts)
            verts.extend([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
                          (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)])
            faces.extend([[b, b + 1, b + 2, b + 3], [b + 4, b + 7, b + 6, b + 5],
                          [b, b + 4, b + 5, b + 1], [b + 1, b + 5, b + 6, b + 2],
                          [b + 2, b + 6, b + 7, b + 3], [b + 3, b + 7, b + 4, b]])

        hx, hy = LENGTH / 2, WIDTH / 2
        rail = (WIDTH - APERTURE) / 2
        box(x - hx, x + hx, y - hy, y - hy + rail, z, z + PLATE)
        box(x - hx, x + hx, y + hy - rail, y + hy, z, z + PLATE)
        box(x - hx, x - hx + 0.030, y - hy + rail, y + hy - rail, z, z + PLATE)
        box(x + hx - 0.030, x + hx, y - hy + rail, y + hy - rail, z, z + PLATE)
        box(x - 0.015, x + 0.015, y - hy + rail, y + hy - rail, z, z + PLATE)
        box(x - hx + 0.034, x - 0.019, y - hy + rail - 0.004, y + hy - rail + 0.004,
            z + PLATE, z + PLATE + BAR)
        box(x + 0.019, x + hx - 0.034, y - hy + rail - 0.004, y + hy - rail + 0.004,
            z + PLATE, z + PLATE + BAR)

    if not placed:
        log("bow fitting  ray missed the deck — not placed")
        return None
    ob = U.mesh_from(BOW_FITTING, verts, faces)
    log(f"bow fitting  {placed} flush cleats placed by deck raycast")
    return ob


# ── 4 · Split, shade, export ────────────────────────────────────────────────

def split_by_zone(shell, zones, labels) -> None:
    for idx, name in enumerate(labels):
        # §2. `BOW_VOID` is where the large bow panel goes, and the whole point
        # of it is that no object is ever created here — the faces are simply
        # never carried out of the shell before it is removed.
        if name in (BOW_VOID, SIDE_VOID, UNDER_VOID):
            continue
        keep = set(np.where(zones == idx)[0].tolist())
        if not keep:
            continue
        me = shell.data.copy()
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        bm = bmesh.new()
        bm.from_mesh(me)
        bm.faces.ensure_lookup_table()
        drop = [f for f in bm.faces if f.index not in keep]
        bmesh.ops.delete(bm, geom=drop, context="FACES")
        bm.to_mesh(me)
        bm.free()
        me.name = name
        if "zone" in me.attributes:
            me.attributes.remove(me.attributes["zone"])
    bpy.data.objects.remove(shell, do_unlink=True)


def hinge_on(ob: bpy.types.Object, point: Vector, direction: Vector) -> None:
    """Re-origin an object onto a hinge line, and align its local X to it.

    Afterwards the object stands exactly where it stood and `rotateX` on the
    exported node is a swing about `direction` through `point`. Two things move
    and cancel: the mesh goes into the hinge's own frame, and the object's
    transform puts that frame back where the world expects it.

    The other two axes are arbitrary — a rotation about X does not care what Y
    and Z are — so they are picked to be stable rather than meaningful, and
    world up is only abandoned when the hinge is very nearly vertical, which no
    lid on this boat is.
    """
    x = direction.normalized()
    up = Vector((0.0, 0.0, 1.0))
    if abs(x.dot(up)) > 0.95:
        up = Vector((1.0, 0.0, 0.0))
    y = up.cross(x).normalized()
    basis = Matrix((x, y, x.cross(y))).transposed().to_4x4()
    ob.data.transform(basis.inverted() @ Matrix.Translation(-point))
    ob.matrix_world = Matrix.Translation(point) @ basis


def lid_hinge(key: str, ob: bpy.types.Object) -> tuple[Vector, Vector]:
    """Where one lid's hinge line is, measured off the lid itself.

    MEASURED, NOT AUTHORED, and the difference matters for the side runs: their
    outboard edge is a traced curve, so a number typed here would be a fourth
    reading of it after `forward_pad_plan`, the cushion and the plinth. The
    bounding box and two end sections are enough to place a chord along the edge
    the lid actually has.

    The direction is chosen so that a POSITIVE turn lifts the squab. That is a
    right-hand rule about the returned vector and the reason each one below
    points the way it does rather than the way that reads naturally.
    """
    pts = [ob.matrix_world @ v.co for v in ob.data.vertices]
    # THE HINGE IS ON THE SQUAB'S TOP SURFACE, NOT ITS FOOT.
    #
    # A cushion is 75 mm thick, and a lid turned about the bottom of its hinge
    # edge swings that whole thickness the OTHER way: the top of the port squab
    # ended 73 mm outboard of where it started, which on a side run is 73 mm
    # outside the topsides — a tan wedge through the paint, one side, visible
    # from anywhere abeam. About the top edge the thickness sweeps inboard
    # instead, into the cockpit, where there is nothing to hit.
    #
    # It is also where a piano hinge actually goes on a locker lid.
    hi_z = max(p.z for p in pts)

    if key == "seat":
        # Athwartships, along the squab's own AFT edge, so it lifts forward and
        # up: a helm seat opens toward the driver rather than the transom.
        #
        # About −Y, because the lid lies FORWARD of its hinge and R(−Y, θ) takes
        # +X to +Z. About +Y it would take +X to −Z, which is the same swing
        # driven straight down through the deck.
        return (Vector((min(p.x for p in pts), 0.0, hi_z)),
                Vector((0.0, -1.0, 0.0)))

    if key == "nose":
        # THE OTHER WAY ROUND FROM THE SEAT, at the client's instruction: the
        # bow panel hinges on its FORWARD edge and opens aft, over the cockpit.
        # It is the better answer as well as the asked-for one — the foredeck it
        # used to open over is where the capping converges and the cleats are,
        # and a lid standing up there is a lid in front of the only part of the
        # bow anybody handles.
        #
        # Mirror of the seat in both terms: the hinge is at max x rather than
        # min, and the lid lies AFT of it, so it turns about +Y, which takes −X
        # to +Z.
        return (Vector((max(p.x for p in pts), 0.0, hi_z)),
                Vector((0.0, 1.0, 0.0)))

    # A side run. Its outboard edge, as the chord between the outermost point
    # at each end of the run — which is the line the real hinge would be
    # fastened along, and close enough to the traced curve over two metres that
    # the squab neither dives into the plinth nor lifts off it.
    sign = 1.0 if sum(p.y for p in pts) > 0 else -1.0
    x_lo, x_hi = min(p.x for p in pts), max(p.x for p in pts)
    band = 0.15 * (x_hi - x_lo)

    def edge(near: float) -> Vector:
        # Sampled at the TOP of the section, because the cushion's 22 mm edge
        # radius makes it widest at mid-height — and a line drawn through the
        # widest points would sit outboard of the top surface by that radius,
        # which is the same 20 mm through the paint in miniature.
        window = [p for p in pts if abs(p.x - near) <= band and p.z >= hi_z - 0.012]
        if not window:
            window = [p for p in pts if abs(p.x - near) <= band] or pts
        return max(window, key=lambda p: sign * p.y)

    a, b = edge(x_lo), edge(x_hi)
    line = (b - a)
    line.z = 0.0                       # a hinge is level; the edge's z is noise
    if line.length < 1e-6:
        line = Vector((1.0, 0.0, 0.0))
    # About −X to starboard and +X to port, so the squab lifts INBOARD-up in
    # both cases rather than mirroring into the hull on one of them.
    return (Vector((a.x, a.y, hi_z)), line.normalized() * -sign)


def shade(ob: bpy.types.Object, spec: dict) -> None:
    old = bpy.data.materials.get(ob.name)
    if old is not None:
        bpy.data.materials.remove(old)
    mat = bpy.data.materials.new(ob.name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    r, g, b = spec["base"]
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = spec["rough"]
    bsdf.inputs["Metallic"].default_value = spec["metal"]
    ob.data.materials.clear()
    ob.data.materials.append(mat)


#: NEW IN 4.9. The auto-smooth angle for the hull BOTTOM: no split, at all.
#:
#: WHAT THE BOTTOM ACTUALLY HAS ON IT. The delivered hull is not a plain vee.
#: Its dihedral histogram, per `scripts/pxl/_dihedral.mjs`, is a fair surface —
#: 10,488 of 13,454 edges under 15° — with moulded lines running through it:
#:
#:     ~40°   a spray rail, 74 mm of horizontal ledge at the waterline, y ±0.72
#:     ~24°   that rail's underside meeting the deadrise below it
#:     26–30° three running strakes on the deadrise, y ±0.24 / ±0.35 / ±0.44
#:
#: and all of them are modelled COARSELY: the recovery stations the bottom every
#: 94 mm and tessellates the deadrise as a fan of triangles from 1 to 145 cm².
#:
#: WHY ANY SPLIT AT ALL MAKES IT WORSE. Wherever `shade_auto_smooth` cuts one of
#: those creases it leaves the vertices on it carrying two normals, one averaged
#: over the faces ahead and one over the faces behind, and on a 94 mm station
#: those two tip about ±8° fore and aft. Read off the shipped file at 20°, the
#: normals down the rail's inner edge run +0.11, −0.06, +0.02, −0.08, +0.13 … in
#: x, on positions whose z climbs smoothly through 3 mm. Every station shades as
#: a stripe and the whole bottom reads as corduroy — which is the "hatching"
#: under the chine, and the reason the underside looked machined rather than
#: moulded. 33° did it at the rail, 20° did it at the rail and at all three
#: strakes, and 50° still beaded the rail.
#:
#: So the bottom is one smoothing group and the moulded lines are left to the
#: SILHOUETTE, which still has them, because nothing here moves a vertex. The
#: chine survives too, and for a better reason than an angle: the bottom and the
#: topsides are different objects, so their shared edge cannot be smoothed
#: across whatever either of them chooses.
#:
#: It is deliberately not applied to `hull_primary`, whose creases over 15° are
#: at the stem and want to stay there.
HULL_BOTTOM_SMOOTH_DEG = 180.0


def finish(ob: bpy.types.Object, angle_deg: float = 33.0,
           weighted: bool = False) -> None:
    """Shade the object smooth, splitting at `angle_deg`.

    `weighted` ADDITIONALLY REPLACES THE VERTEX NORMALS WITH AREA-WEIGHTED
    ONES. It is on for exactly one surface, the hull bottom, and it is the
    second half of a fix whose first half is `HULL_BOTTOM_SMOOTH_DEG` — read
    that first; it is what actually removed the corduroy.

    What this adds on top. Blender's ordinary smooth normal at a vertex is the
    average of the incident faces' normals weighted by their corner angle,
    which treats a 1 cm² sliver and the 145 cm² triangle beside it as equals.
    The delivered deadrise is a fan of exactly that mixture, so the angle
    average wanders where the tessellation is uneven rather than where the
    surface is. Area weighting hands the average to the large triangles, which
    are the ones describing the deadrise.

    ON ITS OWN IT FIXED NOTHING — it was tried first, against a bottom still
    split at 20°, and the shipped normals came back unchanged to three decimals.
    A split vertex carries one normal per smoothing group and no weighting
    inside a group can undo the split between them. It earns its place only now
    that the bottom is one group.
    """
    with bpy.context.temp_override(object=ob, selected_editable_objects=[ob]):
        bpy.ops.object.shade_auto_smooth(angle=math.radians(angle_deg))
        if not weighted:
            return
        modifier = ob.modifiers.new("weighted_normal", "WEIGHTED_NORMAL")
        modifier.mode = "FACE_AREA"
        modifier.weight = 100
        modifier.keep_sharp = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)


def name_mesh_data() -> None:
    """Give every mesh datablock its object's name.

    The exporter writes the MESH name as the glTF primitive's, and joining and
    renaming objects leaves the datablocks called whatever they were — so the
    file went out with a node `console_body` carrying a primitive
    `console_panel`, and three `.001` suffixes besides. Nothing reads those
    today; `pxlModel`'s contract says "node AND material name", and a file where
    two of the three disagree is a trap for whoever next believes it.
    """
    for ob in bpy.data.objects:
        if ob.type == "MESH":
            ob.data.name = ob.name


def group_and_export() -> None:
    name_mesh_data()
    for group, members in GROUPS:
        present = [bpy.data.objects[m] for m in members if m in bpy.data.objects]
        if not present:
            continue
        empty = bpy.data.objects.new(group, None)
        bpy.context.scene.collection.objects.link(empty)
        for ob in present:
            ob.parent = empty
    root = bpy.data.objects.new("PXL_ROOT", None)
    bpy.context.scene.collection.objects.link(root)
    for group, _ in GROUPS:
        if group in bpy.data.objects:
            bpy.data.objects[group].parent = root

    OUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT_GLB), export_format="GLB", export_apply=True,
        export_yup=True, export_normals=True, export_texcoords=False,
        export_materials="EXPORT", export_cameras=False, export_lights=False,
        export_extras=False,
    )
    log(f"export   {OUT_GLB.name}  {OUT_GLB.stat().st_size / 1e6:.2f} MB")


def save_blend() -> None:
    OUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND), copy=True)
    log(f"working  {OUT_BLEND.relative_to(ROOT)}  "
        f"{OUT_BLEND.stat().st_size / 1e6:.2f} MB")


# ── main ────────────────────────────────────────────────────────────────────

def main() -> int:
    if not SOURCE.exists():
        print(f"  source GLB missing: {SOURCE}", file=sys.stderr)
        return 1

    load_source()
    drop_superseded()
    purge_orphans()
    shell, labels = weld_shell()
    for name in (INTERIOR_LINER, COCKPIT_SOLE, BOW_VOID, SIDE_VOID, UNDER_VOID):
        labels.append(name)

    def survey_mesh():
        bm = bmesh.new()
        bm.from_mesh(shell.data)
        bm.faces.ensure_lookup_table()
        return bm, face_centres(bm), face_normals(bm)

    bm, centres, normals = survey_mesh()
    zones = read_zones(shell)
    zones = despeckle(zones, labels, bm)
    bm.free()
    upright_interior_normals(shell, zones, labels)
    bm, centres, normals = survey_mesh()
    zones = split_interior(zones, labels, centres, normals, bm)
    bm.free()
    write_zones(shell, zones)

    # §19–§24 — the lower-hull paint division, re-cut to the traced design line.
    # AFTER the interior split, because that owns which faces are hull at all,
    # and BEFORE the capping extension, because that reads face indices this
    # changes.
    recut_paint_line(shell, labels)

    z_cut = cut_bow_capping_edge(shell)
    bm, centres, normals = survey_mesh()
    zones = read_zones(shell)
    zones = extend_capping(zones, labels, centres, normals, z_cut)
    bm.free()

    sheer = sheer_profile(np.array([v.co[:] for v in shell.data.vertices]))
    counts = {labels[i]: int((zones == i).sum()) for i in range(len(labels))}
    log("zones    " + " · ".join(f"{k} {v:,}" for k, v in counts.items() if v))
    split_by_zone(shell, zones, labels)
    purge_orphans()

    # ── The authored upper boat ─────────────────────────────────────────
    hull_objects = [bpy.data.objects[n] for n in
                    (HULL_PRIMARY, HULL_ACCENT, HULL_LOWER, TRANSOM_BLACK,
                     INTERIOR_LINER, COCKPIT_SOLE) if n in bpy.data.objects]
    bpy.context.view_layer.update()
    hull = U.survey(hull_objects)
    # §5, §8 — the capping follows the REAL hull perimeter, so it is measured
    # against the outer skin and nothing else. See `Hull.skin`.
    hull.skin = [bpy.data.objects[n] for n in (HULL_PRIMARY, HULL_ACCENT)
                 if n in bpy.data.objects]
    log(f"hull     sheer {hull.sheer(-2.4):.3f} at the transom, "
        f"{hull.sheer(0.0):.3f} amidships, {hull.sheer(2.3):.3f} at the bow")

    console = U.build_console(hull, sole_z=0.377)
    console["detail"].name = CONSOLE_DETAIL
    console["body"].name = CONSOLE_BODY
    log(f"console  {len(console['detail'].data.polygons):,}f shell + "
        f"{len(console['body'].data.polygons):,}f aft panel, "
        f"dash {U.SPEC.dash_above_sheer[0] * 1000:.0f}→"
        f"{U.SPEC.dash_above_sheer[1] * 1000:.0f} mm above the sheer")

    screen = U.build_screen(hull)
    screen["glass"].name = WINDSHIELD
    log(f"screen   {len(screen['glass'].data.polygons):,}f glazing, "
        f"{U.SPEC.screen_glass * 1000:.0f} mm section, "
        f"{U.SPEC.screen_rake:.1f}° rake, wraps to the console's aft face")

    wheel = U.build_wheel(hull)
    wheel.name = HELM_WHEEL
    log(f"wheel    {len(wheel.data.polygons):,}f, "
        f"{U.SPEC.wheel_diameter * 1000:.0f} mm at {U.SPEC.wheel_tilt:.0f}°, "
        f"hub {U.SPEC.wheel_standoff * 1000:.0f} mm aft of the console")

    # ── §4–§9 · THE GUNWALE CAPPING ─────────────────────────────────────
    # Built before the rails, because §12 requires the rails be placed against
    # it by raycast rather than against the sheer they used to follow.
    gunwale = U.build_gunwale(hull)
    if gunwale:
        gunwale.name = GUNWALE
        gunwale.data.name = GUNWALE
        bpy.context.view_layer.update()
        plan_mid = U.gunwale_plan(hull, 0.0)
        plan_bow = U.gunwale_plan(hull, 2.0)
        log(f"gunwale  {len(gunwale.data.polygons):,}f continuous capping, "
            f"{U.SPEC.gunwale_thickness * 1000:.0f} mm section, "
            f"width {(plan_mid[0] - plan_mid[1]) * 1000:.0f} mm amidships → "
            f"{(plan_bow[0] - plan_bow[1]) * 1000:.0f} mm at x 2.0, "
            f"converging at x {U.SPEC.gunwale_converge_x}")

    rails = U.build_rails(hull, gunwale=gunwale)
    if rails:
        rails.name = RAILS
        log(f"rails    {len(rails.data.polygons):,}f swept tube, "
            f"{U.SPEC.rail_diameter * 1000:.0f} mm, both pairs, on the capping")

    # §4.10 — THE BIMINI, BUILT HERE for the same reason the rails are: its feet
    # are placed by raycast against the capping, and the capping is a live
    # object at this point in the run and a dead reference after the joins.
    bimini = U.build_bimini(hull, gunwale=gunwale)
    for key, name in (("canopy", BIMINI_CANOPY), ("frame", BIMINI_FRAME),
                      ("boot", BIMINI_BOOT), ("aft", BIMINI_AFT),
                      ("fwd", BIMINI_FWD), ("mid", BIMINI_MID),
                      ("brace", BIMINI_BRACE), ("strap", BIMINI_STRAP)):
        if bimini[key]:
            bimini[key].name = bimini[key].data.name = name
    if bimini["canopy"]:
        log(f"bimini   {len(bimini['canopy'].data.polygons):,}f of canvas over "
            f"{len(bimini['frame'].data.polygons) if bimini['frame'] else 0:,}f "
            f"of frame — three bows, two struts a side on one fitting, an "
            f"after brace, strapped at both ends, over the helm")
    # §4.10.18 — THE TWO TURNING NODES GO ON THE FITTING THEY STAND ON.
    #
    # Both struts a side already come down to it, so it is the line they and the
    # bow they carry rotate about. `hinge_on` puts each node's origin on it and
    # points local X along it; the runtime turns a node through an angle and
    # holds no coordinate, which is the contract the seat lids are on.
    #
    # The MIDDLE bow, the brace, the feet and the canvas are left unrotated. The
    # middle bow only rises, the brace is solved from the two ends it joins, the
    # feet are bolted down, and the canvas is swapped for the boot.
    if bimini["hinge"]:
        point, axis = bimini["hinge"]
        for key, sign in (("aft", 1.0), ("fwd", -1.0)):
            if bimini[key]:
                hinge_on(bimini[key], point, axis * sign)
        bpy.context.view_layer.update()
        log(f"bimini   hinged at ({point.x:.2f}, {point.z:.2f}) — aft and "
            f"forward turn, the middle bow rides, the feet stay")


    # ── §3 · THE COCKPIT FLOOR, CONTINUED ───────────────────────────────
    # First of the authored interior parts, because everything else in the
    # cockpit is positioned by raycast against what is there — and what is
    # there has just had 1.70 m of shelf taken out of it.
    interior = U.build_cockpit_floor(hull)
    floor, cockpit_liner = interior["deck"], interior["liner"]
    for part in (floor, cockpit_liner):
        if part:
            hull.objects.append(part)

    # §4.9 — THE SEAT BASE, BEFORE THE SEAT. It takes the deck's own station
    # list rather than re-deriving one, so its rim lands on the same line the
    # deck edge and the wall foot land on. It is moulding, so it joins the sole
    # a few lines below rather than becoming a zone of its own.
    seat_base = U.build_seat_base(hull, interior["stations"])
    if seat_base:
        hull.objects.append(seat_base)
        bpy.context.view_layer.update()
        log(f"seat base {len(seat_base.data.polygons):,}f closed plinth with a "
            f"locker in it, replacing the delivered shelf")
    if floor:
        bpy.context.view_layer.update()
        log(f"deck     {len(floor.data.polygons):,}f one level, plus "
            f"{len(cockpit_liner.data.polygons) if cockpit_liner else 0:,}f of inner "
            f"wall standing on it and meeting the capping's own underside")

    # NO FORWARD LINER. Phases 4.6 to 4.7.2 built a moulding from where the
    # delivered interior stops to the stem, with a flat that climbed and a cove
    # that closed. The deck is one level now and runs the whole length itself,
    # so there is nothing left for it to do: what closes the bow is the hull
    # arriving at its own centreline.
    forward_liner = forward_floor = None

    # §11 — the plinth under each cushion, before the cushions that stand on it.
    forward_base = U.build_forward_base(hull)
    if forward_base:
        hull.objects.append(forward_base)
        bpy.context.view_layer.update()
        log(f"plinth   {len(forward_base.data.polygons):,}f under the cushions' own "
            f"footprint, both sides, in the deck's graphite")

    # §4.9 — THE STERN SPOILER, BUILT HERE AND NOT LATER, because it measures
    # the hull's own wall by ray and the survey it fires against is only intact
    # until the deck, the plinths and the seat base are joined into
    # `cockpit_sole` and their sources removed. It depends on nothing built
    # after this line.
    cool = U.build_cool_box(hull)
    for key, name in (("box", COOL_BOX), ("liner", COOL_BOX_LINER),
                      ("lid", COOL_BOX_LID)):
        if cool[key]:
            cool[key].name = cool[key].data.name = name
    if cool["lid"]:
        # §4.9.1, at the client's word: hinged on its AFT edge, opening FORWARD.
        # The leaf lies forward of its hinge, so the turn that lifts it is the
        # one about -Y — the opposite hand to the version this replaced, and the
        # only thing that had to change besides which end of the box the hinge
        # line is measured at.
        pts = [cool["lid"].matrix_world @ v.co for v in cool["lid"].data.vertices]
        hinge_on(cool["lid"],
                 Vector((min(p.x for p in pts), 0.0, max(p.z for p in pts))),
                 Vector((0.0, -1.0, 0.0)))
    if cool["box"]:
        log(f"cool box {len(cool['box'].data.polygons):,}f shell + "
            f"{len(cool['liner'].data.polygons) if cool['liner'] else 0:,}f of "
            f"white lining + {len(cool['lid'].data.polygons) if cool['lid'] else 0:,}f "
            f"lid, hinged aft and opening forward, on the sole ahead of the "
            f"console")

    audio = U.build_speakers(hull)
    for key, name in (("grille", SPEAKER_GRILLE), ("light", SPEAKER_LIGHT)):
        if audio[key]:
            audio[key].name = audio[key].data.name = name
    if audio["grille"]:
        log(f"speakers {len(audio['grille'].data.polygons):,}f of grille + "
            f"{len(audio['light'].data.polygons) if audio['light'] else 0:,}f "
            f"of light ring, flush in the cockpit wall, both sides")

    spoiler = U.build_stern_spoiler(hull, [
        bpy.data.objects[n] for n in (TRANSOM_BLACK, HULL_PRIMARY, HULL_ACCENT)
        if n in bpy.data.objects])
    if spoiler:
        spoiler.name = spoiler.data.name = STERN_SPOILER
        log(f"spoiler  {len(spoiler.data.polygons):,}f of stern moulding "
            f"carried aft between the platform's edge and the hull's own wall "
            f"— the plate's 774 mm row, built")

    seating = U.build_seating(hull)
    if seating["upholstery"]:
        seating["upholstery"].name = UPHOLSTERY
        log(f"cushions {len(seating['upholstery'].data.polygons):,}f, "
            f"{U.SPEC.cushion_thickness * 1000:.0f} mm thick, "
            f"{U.SPEC.cushion_radius * 1000:.0f} mm edge, "
            f"{U.SPEC.cushion_crown * 1000:.0f} mm crown")

    # §4.9 — EVERY LID'S HINGE GOES INTO ITS OWN NODE TRANSFORM.
    #
    # The runtime opens a lid by turning the node about its LOCAL X, and knows
    # nothing else about it. Everything that decides which line that is — where
    # the hinge sits, which way it runs, which way is up from it — is settled
    # here, by `hinge_on`, out of the same numbers that built the box. Re-export
    # with the bench 100 mm aft or the side runs a hand wider and the runtime
    # needs no edit; nor does it have to reproduce Blender's axis conversion to
    # use a coordinate, because it never sees one.
    #
    # WHERE EACH LINE IS, AND WHY:
    #
    #   seat        its AFT bottom edge, running athwartships. A helm seat opens
    #               toward the driver, so the locker mouth faces the cockpit
    #               rather than the transom.
    #   side runs   their OUTBOARD edge, running fore-and-aft, which is where a
    #               long side locker is hinged on every boat that has one — the
    #               squab stands up against the topsides and leaves the whole
    #               opening clear.
    #   nose        its aft edge, opening forward over the foredeck, which is
    #               the only direction with nothing in the way.
    #
    # THE SIDE RUNS' LINE IS NOT PARALLEL TO ANYTHING. Their outboard edge
    # sweeps from 0.89 to 0.33 over two metres, so a hinge along the boat's own
    # X would have the forward half of the squab swinging DOWN through the
    # plinth. `hinge_on` takes the direction as an argument for exactly this:
    # the line is the chord of the edge it belongs to, and the node is rotated
    # onto it so that "local X" means that line and not the boat's.
    for key, name in (("seat", SEAT_LID), *CUSHION_LIDS.items()):
        lid = seating["lids"].get(key)
        if not lid:
            continue
        lid.name = lid.data.name = name
        point, direction = lid_hinge(key, lid)
        hinge_on(lid, point, direction)
        log(f"lid      {name} — {len(lid.data.polygons):,}f on a hinge at "
            f"({point.x:.2f}, {point.y:.2f}, {point.z:.2f}) along "
            f"({direction.x:.2f}, {direction.y:.2f}, {direction.z:.2f})")
    bpy.context.view_layer.update()

    # The cove IS the liner. It joins `interior_hard_liner` rather than
    # becoming a zone of its own, because the configurator's material roles are
    # semantic — the interior colour must not reach the hard liner — and a
    # second name for the same surface would be a second thing for a later
    # phase to forget about.
    liner_parts = [bpy.data.objects[INTERIOR_LINER]] if INTERIOR_LINER in bpy.data.objects else []
    liner_parts += [o for o in (forward_liner, cockpit_liner) if o]
    if len(liner_parts) > 1:
        U.join(INTERIOR_LINER, liner_parts)

    # And the forward floor and the cushions' base join the sole, whose
    # graphite they already wear. This is the geometric half of the interior
    # material correction: after it, every up-facing surface a person could
    # stand on between the transom and the stem is `cockpit_sole`.
    floor_parts = [bpy.data.objects[COCKPIT_SOLE]] if COCKPIT_SOLE in bpy.data.objects else []
    floor_parts += [o for o in (forward_floor, forward_base, floor, seat_base) if o]
    if len(floor_parts) > 1:
        U.join(COCKPIT_SOLE, floor_parts)

    # The dark shell absorbs the screen's surround: it is the same structural
    # black in every reference, and a separate material for a 24 mm cap is a
    # draw call spent on nothing.
    if screen["frame"]:
        U.join(CONSOLE_DETAIL, [bpy.data.objects[CONSOLE_DETAIL], screen["frame"]])

    cap = bpy.data.objects.get(HULL_ACCENT)
    if cap:
        build_coaming_inlay(cap, sheer)

    # §12 — the cleats move with everything else. They used to be raycast onto
    # the liner's bow panel, which is the object §2 deletes; the reference puts
    # them on the capping, which is also the only up-facing surface left at
    # that station.
    if gunwale:
        build_bow_fitting(hull, [gunwale], sheer)

    # ── §20–§24 · THE OPTIONAL AFT BOARDING PLATFORM ────────────────────
    platform = U.build_platform(hull)
    if platform["frame"]:
        platform["frame"].name = PLATFORM_FRAME
        platform["frame"].data.name = PLATFORM_FRAME
    if platform["teak"]:
        platform["teak"].name = PLATFORM_DECK
        platform["teak"].data.name = PLATFORM_DECK
    if platform["frame"] and platform["teak"]:
        log(f"platform {len(platform['frame'].data.polygons):,}f frame + "
            f"{len(platform['teak'].data.polygons):,}f teak, "
            f"{U.SPEC.platform_aft * 1000:.0f} mm aft of the transom, "
            f"tread at z {U.SPEC.platform_top_z:.3f}, "
            f"motor well ±{U.SPEC.platform_well_forward * 1000:.0f} → "
            f"±{U.SPEC.platform_well_aft * 1000:.0f} mm")

    purge_orphans()
    for name, spec in MATERIALS.items():
        ob = bpy.data.objects.get(name)
        if ob:
            shade(ob, spec)
            if name == HULL_LOWER:
                finish(ob, HULL_BOTTOM_SMOOTH_DEG, weighted=True)
            else:
                finish(ob, 46.0 if name == UPHOLSTERY else 33.0)

    total = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH")
    log(f"total    {total:,} faces across "
        f"{sum(1 for o in bpy.data.objects if o.type == 'MESH')} meshes")

    group_and_export()
    save_blend()
    return 0


if __name__ == "__main__":
    sys.exit(main())
