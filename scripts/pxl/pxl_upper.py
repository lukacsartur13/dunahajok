"""
PXL — the authored upper boat.  PHASE 4.3.

Imported by `pxl_blender.py`. Everything in this module BUILDS geometry; nothing
in it loads, classifies or exports. The split is the same one Phase 4.2 drew
between recovering the STL and correcting it, moved one stage further along:
`pxl_blender` owns the delivered hull, this file owns everything standing on it.

── WHY THE UPPER BOAT IS AUTHORED AND THE HULL IS NOT ──────────────────────

Phase 4.2 measured the delivered hull against the side plate and it agreed:
depth within 2.6%, keel deviation 45 mm, the dark band's edge at 72.1% of local
depth against the drawing's 71.4%. That is designer geometry and replacing it
with a reconstruction would make the boat less accurate, not more.

Above the sheer the same comparison gives the opposite answer. The STL's console
is a low faceted wedge with a 2,198-triangle wheel floating in front of it; the
plates show a compact console carrying a wrapped screen with the wheel mounted
on its aft face. The STL's `rails` zone is forty triangles of unswept polyline —
in profile it draws as an orange stick projecting from the outboard, which is
what §6 of the 4.3 brief reads as a tiller. Its upholstery is the deck moulding
lifted 35 mm. None of that is recoverable by relabelling faces, which is what
Phase 4.2 could do and why Phase 4.2 stopped where it did.

── EVERY DIMENSION HERE IS MEASURED, AND THE MEASUREMENT IS NAMED ──────────

`scripts/pxl/measure-upper.mjs` reads the July side plate through the same
calibration `reference-qa.mjs` uses for the hull — 345.1 px/m, transom at column
699, sheer maximum at row 796 — and writes `assets/derived/pxl/PXL.upper.json`.
The constants in `SPEC` below quote it. Where a number could not be measured
because the plate is a profile and the quantity is athwartships, it comes from
the cockpit three-quarter and says so.

── THE ONE PLACE THE SOURCES DISAGREE ──────────────────────────────────────

The console's STATION. The July side plate puts it 0.47–0.55 of LOA forward of
the transom; the August views sheet puts it at 0.25–0.35, and the delivered STL
at 0.240–0.317. Two of the three agree, the colour studies are consistent with
them, and the seating layout in the cockpit three-quarter only works at the
after station — so the console is built where the model already has it.

Its SIZE is not in dispute and that is what makes this safe: the July plate's
console measures 0.351 m fore-aft above the deck and the STL's 0.405 m overall.
The two sources draw the same console in two places, so the profile measured
from one transfers to the other.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import bmesh
import bpy
import numpy as np
from mathutils import Vector

# ─────────────────────────────────────────────────────────────────────────────
# The measured specification
# ─────────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Spec:
    """Every authored dimension, in model metres. Blender frame: X fore, Y
    starboard, Z up; waterline z = 0; transom x = −2.6266; stem x = +2.627."""

    # ── Console ──────────────────────────────────────────────────────────
    #: Fore-aft faces. The station is the model's own (PXL_CONSOLE_STATION
    #: `model`, 0.240–0.317 LOA from the transom); the 0.43 m length is the
    #: July plate's 0.351 m above-deck footprint plus the skirt below it.
    console_x: tuple[float, float] = (-1.410, -0.980)
    #: Half-width at the base and at the dash. The console tapers upward —
    #: cockpit three-quarter, where its sides visibly lean in.
    console_half: tuple[float, float] = (0.272, 0.239)
    #: Offset to starboard. The driver sits to port of it in both
    #: three-quarter references; the plate cannot see this at all.
    console_y: float = 0.132
    #: Dash top above the LOCAL SHEER, aft and forward.
    #:
    #: MEASURED: the plate's dash runs z 1.009 at x −0.503 to z 1.091 at
    #: x −0.222, against a deck line of 0.879 and 0.892 at those two stations —
    #: so +0.130 aft and +0.199 forward. The dash rakes UP toward the bow, which
    #: is the opposite of the STL's console and is most of why the delivered one
    #: reads as a wedge: its tallest face is the one the driver looks at.
    #:
    #: EVERY HEIGHT IN THIS BLOCK IS AGAINST ONE FITTED DECK LINE, not against
    #: whatever the deck happened to be under the span being measured. The first
    #: pass took each landmark's height against its own span's mean deck and the
    #: three spans disagreed by 23 mm, which is a fifth of the dash's whole
    #: standing height.
    dash_above_sheer: tuple[float, float] = (0.130, 0.199)
    #: Where the dark shell gives way to the pale aft panel, as a height above
    #: the sheer. Below this the console is the moulding the driver faces;
    #: above it, structural dark. Cockpit three-quarter.
    console_dark_from: float = -0.075

    # ── Windscreen ───────────────────────────────────────────────────────
    #: Top of the front face above the local sheer.
    #:
    #: MEASURED: apex z 1.377 at x −0.250, deck line 0.891 → +0.486. Over the
    #: dash's own forward height that is a front face 0.287 m tall.
    screen_top_front: float = 0.486
    #: Top of the wing where it dies into the dash, above the local sheer.
    #: MEASURED: z 1.143 at x −0.503, deck line 0.879 → +0.264. The wing loses
    #: 0.222 m over the console's length, which is the sweep the front face's
    #: rake must not be confused with.
    screen_top_aft: float = 0.264
    #: Rake of the front face, aft-going-up, degrees.
    #:
    #: MEASURED OFF THE POST, NOT OFF THE APEX. The apex of a wrapped screen is
    #: not above its own foot — the top edge sweeps — so reading the rake from
    #: the apex's station gives 19°, which is the sweep and the rake added
    #: together. The forward post itself falls 21 plate pixels over 130.
    screen_rake: float = 9.2
    #: Glazing thickness and the surround's section. Plexi at this size is
    #: 8–10 mm; the drawing's frame is a slim dark cap over the top edge.
    screen_glass: float = 0.009
    screen_cap: float = 0.024
    #: Plan radius of the front face's corners, metres. From the colour
    #: studies, where the tower's corners are generously radiused.
    screen_corner: float = 0.085
    #: How far the screen's footprint is inboard of the console's own sides.
    screen_inset: float = 0.022

    # ── Steering wheel ───────────────────────────────────────────────────
    #: Diameter. MEASURED: 0.235 m of visible profile at a 22° tilt → 0.253 m;
    #: rounded to a size a wheel is actually made in.
    wheel_diameter: float = 0.280
    #: Tilt from vertical, top aft. The plate's wheel leans; a wheel mounted
    #: square to a raked dash has to.
    wheel_tilt: float = 22.0
    #: Hub height above the local sheer. MEASURED: the rim's apex is z 1.091 at
    #: x −0.610 against a deck line of 0.874 → +0.217, and half a tilted wheel
    #: is 0.130 m of that, so the hub sits at +0.087.
    wheel_above_sheer: float = 0.087
    #: How far the hub stands aft of the console's aft face.
    wheel_standoff: float = 0.105
    wheel_rim: float = 0.017

    # ── Seating ──────────────────────────────────────────────────────────
    #: Cushion thickness.
    #:
    #: §26 IS WHAT SETTLES THIS, AND IT NEARLY WENT WRONG. The plate's human is
    #: SEATED — its lowest visible point is z 0.670 and its head z 1.488, which
    #: is 0.818 m of seated height — so the drawn seat top is z 0.670 and the
    #: first pass simply used it: 0.670 over a moulded platform at 0.570 gives a
    #: 0.100 m cushion.
    #:
    #: That double-counts the sheer difference. The plate's deck line at the
    #: figure's station is 0.87, so the drawn seat is 0.14–0.20 m BELOW the deck
    #: — and the model's own platform is 0.146 m below its own sheer at the same
    #: station. The two agree already. The platform IS the drawn seat height, and
    #: the cushion is what stands on top of it, which the cockpit three-quarter
    #: shows as a visible edge rather than as a step.
    #:
    #: The moulded platform the side cushions and the bench sit on. From the
    #: interior probe, which finds it at z 0.57 from x −2.28 to +1.45.
    platform_z: float = 0.570
    #: 75 mm is a marine squab. The dark moulded face below it — the step down to
    #: the sole — is the base the reference shows, and it is `cockpit_sole`.
    cushion_thickness: float = 0.075
    cushion_radius: float = 0.022
    #: Crown at the centre of a cushion's top. Premium marine cushions are
    #: nearly flat; this is the difference between "upholstered" and "sofa".
    cushion_crown: float = 0.007
    #: Gap between a cushion's inboard edge and the hard moulding it sits in.
    cushion_gap: float = 0.028

    #: Driver's bench. Station from the DELIVERED MOULDING, which turns out to
    #: agree with the cockpit three-quarter's 0.13 of LOA: the interior probe
    #: finds the raised platform running the full beam from x −2.15 to −1.70 and
    #: only the side platforms forward of that. A bench belongs on the full-width
    #: part and nowhere else.
    bench_x: tuple[float, float] = (-2.130, -1.720)
    bench_half: float = 0.560
    #: Backrest, above the LOCAL SHEER. MEASURED: the plate's orange block tops
    #: at z 1.024 at x −1.35 against a deck line of 0.839 → +0.185. Its 0.090 m
    #: of visible fore-aft run is the block's own thickness; the rest is behind
    #: the human.
    backrest_above_sheer: float = 0.185
    backrest_thickness: float = 0.105

    # ── The cockpit floor ────────────────────────────────────────  4.7.2
    #
    # §1–§3, §9, §29. THE LONG RAISED STRUCTURE BESIDE THE COCKPIT IS THE
    # DELIVERED STL'S OWN SIDE PLATFORM, and it has been in every phase of this
    # model. `_stack` on the 4.7.1 export, at x 0.0:
    #
    #     (0, 0.60)   cockpit_sole @ 0.570 ^      hull_lower @ 0.003 v
    #     (0, 0.70)   cockpit_sole @ 0.570 ^      hull_lower @ 0.059 v
    #     (0, 0.30)   cockpit_sole @ 0.366 ^      hull_lower @ −0.104 v
    #
    # A shelf 0.19 m above the sole, about 0.32 m wide, running both sides from
    # the bench to the bow, with NOTHING UNDER IT. Phase 4.7 is what made it
    # look like furniture: it moved every up-facing interior surface below
    # z 0.62 into `cockpit_sole`, so a band that had read as part of the moulded
    # shell for four phases turned graphite and became a long black bench.
    #
    # §29 rules out the obvious repair by name — "Do not paint it black. Do not
    # rename it. Do not turn it into liner. Delete it." — and §3 says what takes
    # its place: "the cockpit floor should continue naturally into the area it
    # occupied … one large continuous dark cockpit floor".
    #
    # WHAT IS KEPT, AND WHY. The platform survives forward of x 0.000, because
    # that is where the traced cushions start and it is what carries them: §11
    # permits a support "local to the cushion footprint" and forbids extending
    # one aft into the cockpit. It also survives abaft x −1.700, because that is
    # the full-beam platform the driver's bench stands on and §5 keeps the rear
    # seat. What goes is the 1.70 m between them, which is the cockpit.

    #: The window the delivered side platform is deleted in. Both ends are
    #: structural: the aft one is the bench's own platform, the forward one is
    #: the forward cushions' aft station.
    platform_void_x: tuple[float, float] = (-1.750, 2.400)
    #: The band of the deleted moulding, by height. Takes the platform's top at
    #: 0.570 and the step face down to the sole; leaves the coaming above it,
    #: which is the hard liner §10 wants between the gunwale and the floor.
    platform_void_z: tuple[float, float] = (0.300, 0.900)
    #: The sole's own height. The delivered moulding is flat here to within a
    #: few millimetres over the whole cockpit.
    sole_z: float = 0.377
    #: THE DECK. One number, because the deck is one level.
    #:
    #: The delivered interior has two: a sole at 0.377 down the middle and a
    #: raised side platform at 0.570 outboard of it, with a step between. Both
    #: are deleted over the whole cockpit and this is what replaces them —
    #: a single flat panel from abaft the console to the stem, running out to
    #: the hull's own side, which at this height is very nearly vertical and
    #: therefore meets it square.
    deck_z: float = 0.372

    # ── The forward padded architecture ────────────────────────  4.7
    #
    # TWO SYMMETRICAL SIDE CUSHIONS. §1–§18 of the upholstery correction, and a
    # rewrite of Phase 4.6's forward padding rather than an adjustment to it.
    #
    # WHAT PHASE 4.6 BUILT, AND WHY IT IS GONE. `pad_splits`, `pad_cross_x` and
    # `pad_overhang` described ONE object: a starboard lounge that swept across
    # the centreline as the hull narrowed and was cut into three pieces with
    # 55 mm gaps between them. §1 deletes all three ideas by name — no three
    # independent panels, no separate wedge at the nose, no transverse slab —
    # and §7 says what the third piece actually was: the JOINING LINE where the
    # port and starboard upholstery meet at the bow, read as a cushion edge.
    #
    # WHAT THE REFERENCE SHOWS, re-read off `.qa/ref46/ref-cockpit3q.png` at 4×
    # with the two sides looked at separately rather than as one sweep:
    #
    #   • a long padded element down the PORT inner side, on a dark moulded base
    #   • the same element, mirrored, down the STARBOARD inner side
    #   • both follow the narrowing hull, turn inboard, and become slightly
    #     FULLER just before they meet
    #   • they meet on the centreline; the only division there is a fine seam
    #   • the centre of the cockpit stays open, and its floor stays dark
    #
    # §14 SETTLES THE SYMMETRY QUESTION IN THE OPPOSITE DIRECTION TO 4.6. That
    # phase read the port side forward of the console as bare and built one
    # lounge; §14 requires the mirror — "the two primary side upholstery
    # elements are intentionally symmetrical" — and §2 allows an exception only
    # where the reference clearly proves otherwise. The one crop that shows both
    # sides shows the port element obliquely and at a steep angle, which is not
    # proof, so the instruction governs. Recorded here rather than argued in a
    # report: this is a deliberate departure from what 4.6 concluded.

    #: Where the forward padded run starts and where it stops. TRACED — 4.7.1.
    #:
    #: §4: "This is the biggest Phase 4.7 error. The two forward upholstered
    #: pieces must NOT begin near the stern." They began at −0.780, which is
    #: 0.20 m forward of the console's forward face, and that number came from
    #: reading a crop rather than from measuring one.
    #:
    #: `scripts/pxl/upholstery-trace.mjs` measures it. The plate's cognac is
    #: classified, opened to drop the rails and the cleats, labelled, and
    #: unprojected through a camera SOLVED against the plate's own silhouette
    #: — 87.8% overlap at azimuth 18.3°, elevation 34.9°. The forward region
    #: comes back at model x 0.009 → 2.047, and the station histogram is
    #: unambiguous about the aft end: 219 pixels at x −0.10 against 2,130 at
    #: x 0.00. The padding starts amidships.
    #:
    #: That leaves 1.70 m of open dark cockpit between the backrest at x −1.72
    #: and the cushions' aft end, which is §4's "substantial visual gap".
    forward_pad_x: tuple[float, float] = (0.000, 2.050)

    #: How far the cushions run PAST the inner wall's face, so that they are
    #: fitted to it rather than parked near it.
    #:
    #: 6 mm INTO the wall, not a gap off it. Every phase up to here held the
    #: padding off the liner by an inset — 62 mm, then 40 — on the reasoning
    #: that §11's hierarchy needs the hard structure visible somewhere. It is
    #: visible: the wall stands 0.21 m above the cushion's own top and runs the
    #: whole perimeter. What the inset actually produced was a dark slot between
    #: the leather and the wall, growing from 87 mm amidships to 0.31 m at the
    #: bow, and upholstery in a boat is built INTO its liner.
    #:
    #: The 6 mm is an overlap rather than a butt joint for the usual reason: two
    #: surfaces meeting exactly on a measured edge show daylight at a grazing
    #: angle, and a cushion is compressible anyway.
    pad_tuck: float = 0.006

    #: §7 — THE SIDE BAND'S WIDTH, one side, model metres.
    #:
    #: The runs down the sides are a constant-width band against the inner wall,
    #: so this is what is authored and the inboard edge follows from it. It
    #: narrows a little toward the bow because the wall converges faster than
    #: the leather should, and because the panel in the middle takes over there.
    pad_band: tuple[tuple[float, float], ...] = (
        (0.000, 0.340),
        (1.250, 0.320),
        (2.050, 0.250),
    )

    # THE OUTBOARD EDGE IS NO LONGER AUTHORED. It was a traced table for two
    # phases; it is now the inner wall itself, station by station, out of
    # `interior_edge` — the same measurement the wall is built from, so the
    # cushion and the thing it is fitted to cannot disagree by construction.
    # See `pad_tuck`.

    #: §B — THE SEATING PLANE, AUTHORED AND LEVEL.
    #:
    #: "The bow gets narrower and the hull gets higher. The seat does not get
    #: higher." Phase 4.7.1 took each station's base height by raycast, so the
    #: cushions sat on whatever was under them — and forward of x 1.33 what is
    #: under them is the forward liner, whose flat climbed from 0.570 to 0.83
    #: over its run. The cushions climbed with it: `_probe47` puts their top at
    #: 0.645 amidships and 0.893 at the stem, a 0.25 m ramp, which from the side
    #: reads as upholstery pointing at the sky.
    #:
    #: The base is now this number at every station, and the liner underneath is
    #: what changed to suit it rather than the other way round. One authored
    #: elevation, and the whole cushion is 75 mm above it.
    cushion_base_z: float = 0.500
    #: THE NOSE. Where the cockpit ends and the bow's own top deck begins — the
    #: same station the leather ends at, so the seat, the wall that closes in
    #: front of it and the deck that carries over the top are one joint.
    nose_x: float = 2.050
    #: Its section, AS A FRACTION OF THE LOCAL HALF-WIDTH rather than in metres.
    #:
    #: How far the centreline sits below the capping's inner edge, over how wide
    #: the deck is at that station. The distinction is the whole reason the nose
    #: shaded as several surfaces: held at a fixed 22 mm, the section is gentle
    #: at the junction where the deck is 0.32 m across and a 48° V by the time
    #: the bow has closed to 0.02 m — so the curvature ran away toward the stem,
    #: the auto-smooth angle split the normals where it did, and the light broke
    #: the deck into facets.
    #:
    #: Tied to the width, every station is the same shape at a different size.
    #: The surface is a ruled sweep of one section, its curvature is constant
    #: along it, and it flattens out on its own as the bow comes to a point.
    #:
    #: 0.07 gives the same 22 mm at the junction, which is what the reference
    #: draws there.
    nose_sag: float = 0.07
    #: What the section thins to by the stem, against the capping's own 46 mm.
    #: Tapered rather than stepped, so the underside runs on from the side
    #: strips' without a ledge at the junction.
    nose_thickness: float = 0.032
    #: THE ROLL ALONG THE TOP OF THE INNER WALL, both sides and round the nose.
    #:
    #: The wall was a flat plate from the deck to the capping's underside, so
    #: the interior's top edge was a knife edge on each side and the deck met it
    #: at a corner. 55 mm of radius turns it into a rolled coaming: the face
    #: goes up, curves outboard and tucks under the capping, and the nose deck
    #: arrives on the same curve rather than on a lip.
    liner_roll: float = 0.055

    #: The plinth under each cushion, from the deck up to the base above. Local
    #: to the cushion's own footprint — it is furniture, not deck.
    plinth_z: float = 0.500

    #: §16 — THE SEAM, as the only division at the bow. The total gap between
    #: the two cushions' inboard faces on the centreline.
    #:
    #: 16 mm, and the number is the whole of it. A gap that reads as a real
    #: upholstery joining line has to be narrower than the 22 mm fillet on each
    #: cushion's own top edge, so that what the eye meets is two rolled edges
    #: nearly touching rather than a slot with a floor to it. §16 rules out a
    #: 20–50 mm gap by name.
    bow_seam: float = 0.0
    #: THE TWO SEPARATORS, AND WHERE THEY GO.
    #:
    #: The design draws three panels — a run down each side and one across the
    #: nose — with a seam at each of the two joints between them, and nothing
    #: down the centreline. Every phase to here had that the other way round:
    #: one seam on the centreline and no joint at the knuckle, which is the
    #: drawing's two lines drawn as one in the wrong place.
    #:
    #: So `bow_seam` goes to zero — the two halves of the nose panel touch and
    #: weld into one piece — and the division moves to the station the sides
    #: turn at, where the drawing puts it.
    pad_knuckle_x: float = 1.250
    #: Where the leather panel in the middle of the bow starts.
    #:
    #: It fills the wedge of deck the two side runs leave between them, from
    #: this station forward to where they finish — a tapering panel, widest at
    #: its aft edge and narrowing with the sides as they converge. Its aft edge
    #: is a straight athwartships line, which is what the mark-up draws.
    nose_pad_x: float = 1.400
    #: And where that seam reaches the wall.
    #:
    #: ONE STRAIGHT DIAGONAL EACH SIDE, not a tee. The boundary between a side
    #: run and the middle panel used to be an L — a fore-and-aft line along the
    #: side's own inner edge, meeting an athwartships line between the two. The
    #: design draws a single line each side, running from the inner edge at
    #: `nose_pad_x` outboard and forward to the wall here. Forward of it the
    #: leather is one panel from wall to wall; abaft it, two runs.
    nose_seam_x: float = 1.880
    #: Its width. A construction seam between two upholstered panels, not a gap:
    #: narrower than the 22 mm fillet on each edge, so what the eye meets is two
    #: rolled edges nearly touching.
    pad_seam: float = 0.016

    #: Where the hard moulded lip under the cushions' inboard edge runs. Both
    #: sides, and much less of it than in 4.7.
    #:
    #: The traced inboard edge sits very nearly on the delivered platform's own
    #: step — 0.505 at x 0.0 against a sole edge of about 0.51 — so for most of
    #: the run there is nothing to carry: the cushion lies on the moulding the
    #: yard drew. `build_forward_base` skips any station where the lip would be
    #: under 30 mm wide, which is most of them, and what survives is the short
    #: piece around x 0.9–1.16 where the sole's forward end is ragged.
    forward_base_x: tuple[float, float] = (0.000, 1.160)

    # ── The forward liner ────────────────────────────────────────────  4.6
    #
    # §7, §8, §9, §43. Phase 4.4 deleted the flat panel that closed the bow and
    # left the interior ending at x 1.47 — `_probe44` finds six triangles of
    # near-vertical moulding at x 1.135→1.494 spanning z 0.570→0.873 and nothing
    # at all forward of them. That is §8's "large vertical panel closing off the
    # forward interior like the end wall of a box", and it is what the deletion
    # left behind rather than something the deletion missed.
    #
    # WHAT REPLACES IT IS NOT THE OLD PANEL. The 4.3 element was 2.07 m² of flat
    # up-facing surface at a CONSTANT z 0.570 spanning the full beam — a lid.
    # This is a moulding that RISES and NARROWS: its centre climbs 0.28 m over
    # its run while its flat width falls to nothing, so the section turns from a
    # deck into a cove and the interior tapers into the stem instead of being
    # capped off. §9's progression — cockpit → forward interior → narrowing bow
    # → bow termination — is those two curves.

    #: Where the forward liner runs.
    #:
    #: PULLED BACK 140 mm IN 4.7, TO CLOSE A HOLE. `_probe47` drops rays through
    #: the 4.6 production model and finds, at x 1.36 → 1.48, that what a camera
    #: directly overhead meets across most of the beam is `hull_primary` at
    #: z 0.04 — the INSIDE OF THE BOTTOM OF THE BOAT. The bow-panel deletion in
    #: `split_interior` takes interior faces from x 1.410 (and reaches back to
    #: about 1.35 through their vertices) while this liner began at 1.470, and
    #: nothing was ever built across the difference.
    #:
    #: Phase 4.6 could not see it because its crossing pad lay over it. Two
    #: symmetrical side cushions leave the centre open, which is the point of
    #: them, so the hole would have been the first thing visible in the plan
    #: view §17 makes the acceptance view. Starting at 1.330 overlaps what the
    #: deletion leaves and the gap cannot reopen.
    forward_liner_x: tuple[float, float] = (1.290, 2.300)
    #: How far below the local sheer the liner's outboard edge meets the hull.
    #: The capping's own section is 46 mm with an 11 mm fall, so 70 mm always
    #: lands under it rather than through it.
    forward_liner_under_sheer: float = 0.070
    #: And how far below THAT the liner's centreline finishes at the forward
    #: end. A cove that closes exactly on its own outboard edge has no bottom;
    #: 45 mm of it is what keeps the section reading as a moulding.
    forward_liner_close: float = 0.045
    forward_liner_stations: int = 40

    #: THE COVE, AND WHY IT IS SCHEDULED RATHER THAN DECAYED. 4.7.
    #:
    #: Phase 4.6 closed the flat with `(1 − smoothstep(t/0.94)) ** 0.62`, which
    #: is a curve chosen to look right rather than to serve anything. It has the
    #: flat down to 0.21 m at x 2.00 while the cushions there want to reach
    #: 0.28 m — so their outboard edges sat on the rising cove, `_pad_seat`
    #: walked them inboard, and the padding thinned out exactly where §10 says
    #: it should be fullest.
    #:
    #: So the cove is a WIDTH now, held at a coaming's worth until the last
    #: quarter of the run and then opened to the full section. The flat is
    #: whatever is left, which is a real sole under the padding for as long as
    #: there is padding, and nothing at all by the stem.
    forward_cove_hold: float = 0.030
    #: The station the cove starts opening, as a fraction of the liner's run.
    #: 0.74 of 1.330 → 2.300 is x 2.048, which is 50 mm forward of where the
    #: cushions end.
    forward_cove_open: float = 0.74

    # ── Rails ────────────────────────────────────────────────────────────
    #: MEASURED: the plate's cockpit rail runs x −2.056 → −0.256 and the bow
    #: pair x +2.215 → +2.555. Both are read from the same orange sweep.
    rail_cockpit_x: tuple[float, float] = (-2.056, -0.256)
    rail_bow_x: tuple[float, float] = (2.215, 2.555)
    #: Tube diameter. MEASURED: 9.1 plate pixels of section.
    rail_diameter: float = 0.027
    #: Height of the tube's CENTRE above the local sheer.
    #:
    #: The plate reads the underside 65 mm clear of the capping's top edge and
    #: the top 91 mm; both are measured against a deck band the drawing shows
    #: almost edge-on, so the datum inside that band is uncertain by about
    #: 30 mm. Against the fitted deck line the tube's own centre reads +0.058,
    #: which is inside that range and puts the gap where the three-quarter views
    #: put it — roughly the tube's own diameter of daylight underneath.
    rail_above_sheer: float = 0.058
    #: Inboard of the deck edge, so the rail stands on the deck rather than
    #: over the water.
    rail_inboard: float = 0.052
    rail_stanchion_pitch: float = 0.62
    rail_stanchion: float = 0.019

    # ── Transom ──────────────────────────────────────────────────────────
    #: The aft deck pad, abaft the bench, on the 0.73 m shelf the probe finds
    #: between the transom and the bench platform. Stern three-quarter.
    aft_pad_x: tuple[float, float] = (-2.545, -2.290)

    # ── Gunwale capping ──────────────────────────────────────────────  4.4
    #
    # §4, §5, §6, §7, §9 of the Phase 4.4 brief, and the largest single change
    # this phase makes.
    #
    # WHAT WAS THERE BEFORE, MEASURED. `hull_accent` — the zone `pxlModel` has
    # called "Gunwale capping" since Phase Four — carries 1.34 m² of surface,
    # and `scripts/pxl/_probe44.mjs` reports how much of it faces upward:
    #
    #     hull_accent, forward of x 1.45:  UP 0.000 m²   SIDE 0.228 m²
    #
    # Zero. It is a 74 mm band of the hull's own SIDE below the sheer, painted
    # a different colour. That is why §4 reads "the current top edge of the
    # boat still reads too thin when viewed from above": from above it has no
    # thickness at all, because there is no top surface anywhere on it. A band
    # on a vertical wall is not a capping, whatever it is named.
    #
    # WHAT THE REFERENCE SHOWS. The cockpit three-quarter has a substantial
    # continuous teal top surface running port → bow → starboard, wide enough
    # that the bow cleat sits ON it with room either side and the grab rails
    # stand on it rather than over the water. It carries the hull's colour, not
    # the interior's (§10), and the orange rails are separate objects standing
    # on it (§11).

    #: Half-width of the capping's top surface, by station. Read off the
    #: cockpit three-quarter against the local half-beam, which the model
    #: already agrees with to 1%: ~15% of half-beam amidships, opening out
    #: toward the bow as §7 requires ("slightly broader / more substantial").
    #: Metres, interpolated linearly between stations.
    gunwale_width: tuple[tuple[float, float], ...] = (
        (-2.630, 0.108),
        (-2.200, 0.118),
        (-1.500, 0.132),
        (-0.500, 0.150),
        (0.500, 0.168),
        (1.200, 0.188),
        (1.700, 0.215),
        (2.000, 0.250),
    )

    #: Where the widening stops being a widening and becomes a convergence.
    #:
    #: §7's diagram, as two numbers. Abaft `gunwale_taper_x` the capping is a
    #: pair of side forms with an open cockpit between them. Forward of it the
    #: inner edge is drawn in toward the centreline, and at
    #: `gunwale_converge_x` it reaches it — port and starboard become one bow
    #: structure, built out of the two side forms rather than out of a panel
    #: dropped between them.
    #:
    #: THE STATION IS THE POINT OF THE WHOLE CORRECTION. Phase 4.3 closed the
    #: bow at x 1.431 with 2.07 m² of flat up-facing liner — 1.18 m of foredeck,
    #: 22% of LOA. This closes it at x 2.330, which leaves 0.30 m between the
    #: convergence and the stem: a bow termination rather than a deck. §3 —
    #: "there should NOT be a giant polygon closing the front of the cockpit."
    gunwale_taper_x: float = 2.000
    gunwale_converge_x: float = 2.330

    #: Section. §9 asks for something that is neither paper thin nor a
    #: rectangular block.
    #:
    #: 46 mm is measured: on the August side view at 349 px/m the capping's own
    #: outer edge reads 10 px ≈ 29 mm of flat face, and the chamfer accounts
    #: for the rest. Below it the plate shows 12 px ≈ 34 mm of the dark sheer
    #: band, which is what fixes the capping's thickness rather than leaving it
    #: to taste — thicker and it swallows the band, thinner and it disappears.
    gunwale_thickness: float = 0.046
    #: Chamfers. Outer smaller than inner: the outer edge is a moulding radius,
    #: the inner one is the edge a person puts a hand over.
    gunwale_chamfer_out: float = 0.010
    gunwale_chamfer_in: float = 0.014
    #: Fall from the outer edge to the inner edge, so the top surface sheds
    #: water inboard and catches a highlight along its length instead of
    #: reading as a flat grey ribbon under the studio light.
    gunwale_fall: float = 0.011
    #: Stations along the length. 200 is enough that the 15 mm steps in the
    #: delivered triangulation are averaged out by the profile smoother rather
    #: than sampled.
    gunwale_stations: int = 200

    # ── Aft boarding platform ────────────────────────────────────────  4.4
    #
    # §20–§24. OPTIONAL EQUIPMENT: the geometry is exported and the
    # configurator owns its visibility, so nothing here decides whether a
    # customer sees it.
    #
    # MEASURED OFF THE AUGUST SIDE VIEW, which is the delivered reference §21
    # names and the only one that shows the platform orthographically. Grid
    # readings at 349 px/m against a sheer at plate row 398:
    #
    #     platform slab, top edge      row 581  →  0.524 m below the sheer
    #     platform slab, bottom edge   row 618  →  0.630 m below the sheer
    #     aft end of the slab          col 436  →  0.504 m abaft the transom
    #
    # The July plate does not show it at all, which is itself worth recording:
    # the platform is an option in the delivered material, not standard fit.

    #: Top of the walking surface, and how far it stands aft of the transom.
    #: The transom is at x −2.6266 and the sheer there is z 0.703, so a top at
    #: 0.179 is the plate's 0.524 m below the sheer, and the slab's underside
    #: lands 73 mm clear of the static waterline.
    platform_top_z: float = 0.179
    platform_aft: float = 0.504
    #: Teak, then structure. The reference reads as a wood tread on a dark
    #: frame, so it is built that way — §23 requires the wood be its own
    #: material and §22 requires the support be real rather than implied.
    platform_teak: float = 0.028
    platform_frame: float = 0.078
    #: Half-width at the transom and at the aft edge. The platform follows the
    #: transom's own taper rather than being a rectangle stuck on the back.
    platform_half: tuple[float, float] = (0.905, 0.845)
    #: The motor well. §29: the aft platform must be designed AROUND the
    #: propulsion installation, for every drive and through the steering range.
    #:
    #: TAPERED, AND THE TAPER IS THE WHOLE DESIGN. The first version cut a
    #: parallel-sided notch at the widest figure the clearance needed — ±0.460 —
    #: and it looked exactly like what it was: two teak pads either side of an
    #: engine, with 0.92 m of nothing between them. The reference shows one
    #: continuous tread.
    #:
    #: A swivelling drive does not need a parallel notch. Its parts sweep
    #: sideways in proportion to how far ABAFT the steering axis they are, so
    #: the clearance a platform has to give grows with distance aft and is
    #: nearly nothing at the transom. `platformClearance` in `pxlCatalog`
    #: reports the reach of every part inside the platform's height band, at
    #: 30° of lock, at both ends of where it overlaps the structure:
    #:
    #:                    at the transom     at the aft edge
    #:     compact            0.155              0.333   propeller disc
    #:     standard           0.228              0.406   cowling, lower corner
    #:     large              0.255              0.433   the same, hung lower
    #:     electric           0.126              0.276   the leg
    #:
    #: So the notch is 0.280 at the transom and 0.470 aft — a V that follows the
    #: engine's own swing envelope, clearing the worst case by 25 mm at both
    #: ends. The tread is then 625 mm wide a side where a person steps aboard
    #: and narrows only where the engine actually needs the room.
    platform_well_forward: float = 0.280
    platform_well_aft: float = 0.470
    #: The cross-member joining the two bearers under the transom, and the
    #: reason the platform reads as one structure rather than two brackets.
    #: Every drive's cowling starts at least 95 mm abaft the transom plane and
    #: swings further aft as it turns, so the first 110 mm is always free.
    platform_beam_length: float = 0.110
    #: Plank pitch on the tread. Real teak decking is laid in strakes with a
    #: caulking line between them; one flat quad with a wood colour on it is
    #: the thing §23 warns against.
    platform_plank: float = 0.092
    platform_seam: float = 0.008


SPEC = Spec()


# ─────────────────────────────────────────────────────────────────────────────
# Surveying the delivered hull
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class Hull:
    """What the authored parts need to know about the boat they attach to.

    EVERY AUTHORED PART IS POSITIONED AGAINST THIS, never against a remembered
    coordinate. A cushion's outboard edge is where the liner actually is at that
    station; a rail's height is above the sheer the hull actually has there. It
    is the same discipline `pxlDecals` uses at runtime and it buys the same
    thing: re-export the hull and everything standing on it follows.
    """

    objects: list[bpy.types.Object]
    profile: np.ndarray
    x0: float
    dx: float
    #: The OUTER SKIN alone, when the caller knows which objects those are.
    #:
    #: PHASE 4.4. `inner_y` fires outboard from the centreline and takes the
    #: first hit, which is the right question for a cushion — it wants the
    #: nearest thing to starboard, whatever that is. It is the WRONG question
    #: for the gunwale, and measurably so: fired at the sheer it returns the
    #: liner's coaming rather than the hull, and the first capping built on it
    #: came out with its outer edge at y 0.984 against a hull skin at 1.047.
    #: A 63 mm ledge running the length of the boat.
    skin: list[bpy.types.Object] = field(default_factory=list)
    #: PHASE 4.6 — measurements that must be taken BEFORE the parts they
    #: position are added to `objects`.
    #:
    #: `Hull` answers questions by raycast against whatever is currently in
    #: `objects`, and the forward architecture is built in three stages that each
    #: add to it. The lounge's base is measured off the sole; the pads are then
    #: measured off the same sole — except that by then the base is standing on
    #: it, so `sole_edge` stops at the base's own face and hands back a
    #: half-width 0.15 m smaller. The base came out 0.17 m wider than the
    #: cushions it carries, and nothing about either measurement was wrong.
    #:
    #: So the plan is taken once, on the boat as it was before any of it was
    #: built, and both stages read the cache.
    cache: dict = field(default_factory=dict, repr=False)
    _dg: object = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self._dg = bpy.context.evaluated_depsgraph_get()

    def outer_y(self, x: float, z: float, start: float = 2.4) -> float | None:
        """Half-beam of the hull's OUTER skin at a station and height.

        Fired inboard from outside the beam against `skin` only, so the answer
        is the boat's own edge and nothing that happens to be standing inside
        it. Falls back to `inner_y` where no skin was supplied.
        """
        if not self.skin:
            return self.inner_y(x, z)
        best = None
        for ob in self.skin:
            hit, loc, *_ = ob.ray_cast(
                Vector((x, start, z)), Vector((0.0, -1.0, 0.0)),
                distance=start * 2, depsgraph=self._dg)
            if hit and (best is None or loc.y > best):
                best = loc.y
        return best

    def sheer(self, x: float) -> float:
        """Height of the deck edge at a station."""
        i = int(np.clip((x - self.x0) / self.dx, 0, self.profile.size - 1))
        return float(self.profile[i])

    def inner_y(self, x: float, z: float, limit: float = 1.4) -> float | None:
        """Half-beam of the hull's inner face at a station and height.

        Fired from the centreline outboard, so the first hit is the inside of
        the shell. Returns None where the ray leaves the boat — forward of the
        stem, or above the sheer.
        """
        best = None
        for ob in self.objects:
            hit, loc, *_ = ob.ray_cast(
                Vector((x, 0.0, z)), Vector((0.0, 1.0, 0.0)), distance=limit,
                depsgraph=self._dg)
            if hit and (best is None or loc.y < best):
                best = loc.y
        return best

    def surface_z(self, x: float, y: float, from_z: float = 1.9) -> float | None:
        """Height of the first up-facing surface below a point.

        Used to find the moulded platform the cushions sit on, and to tell it
        from the sole 0.19 m below it.
        """
        best = None
        for ob in self.objects:
            hit, loc, nor, *_ = ob.ray_cast(
                Vector((x, y, from_z)), Vector((0.0, 0.0, -1.0)),
                depsgraph=self._dg)
            if hit and nor.z > 0.5 and (best is None or loc.z > best):
                best = loc.z
        return best


def survey(objects: list[bpy.types.Object], stations: int = 160) -> Hull:
    """Take the sheer profile off the delivered shell.

    A WINDOWED MAXIMUM, NOT A BINNED ONE, and the difference is not academic at
    the stern. This hull is tessellated wildly unevenly — the aft deck is a
    handful of very large facets — so binning vertices by station leaves bins
    whose highest vertex belongs to a facet that is 0.05 m lower than the
    surface passing overhead. Reading the sheer that way put the transom at
    z 0.683 while a ray fired down at the same station hit deck at 0.730, and
    every part anchored to `sheer + offset` inherited the error.

    A window of ±0.12 m always contains at least one edge of whatever facet
    spans the station, so the profile follows the surface rather than the
    triangulation.
    """
    pts = np.vstack([np.array([v.co[:] for v in ob.data.vertices])
                     for ob in objects if len(ob.data.vertices)])
    x0, x1 = float(pts[:, 0].min()), float(pts[:, 0].max())
    dx = (x1 - x0) / (stations - 1)
    xs = pts[:, 0]
    zs = pts[:, 2]
    order = np.argsort(xs)
    xs, zs = xs[order], zs[order]
    prof = np.empty(stations)
    for i in range(stations):
        x = x0 + dx * i
        lo = np.searchsorted(xs, x - 0.12)
        hi = np.searchsorted(xs, x + 0.12)
        if hi <= lo:
            prof[i] = prof[i - 1] if i else float(zs.max())
        else:
            prof[i] = float(zs[lo:hi].max())
    # Median then mean, both narrow. The median sheds a single stray vertex;
    # the mean takes the stair out of the windowed maximum.
    med = prof.copy()
    for i in range(stations):
        lo, hi = max(0, i - 2), min(stations, i + 3)
        med[i] = float(np.median(prof[lo:hi]))
    smooth = med.copy()
    for i in range(stations):
        lo, hi = max(0, i - 3), min(stations, i + 4)
        smooth[i] = float(np.mean(med[lo:hi]))
    return Hull(objects=objects, profile=smooth, x0=x0, dx=dx)


# ─────────────────────────────────────────────────────────────────────────────
# Mesh primitives
# ─────────────────────────────────────────────────────────────────────────────


def mesh_from(name: str, verts, faces) -> bpy.types.Object:
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [list(f) for f in faces])
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def weld(ob: bpy.types.Object, dist: float = 1e-4) -> bpy.types.Object:
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    return ob


def join(name: str, parts: list[bpy.types.Object]) -> bpy.types.Object | None:
    """Join a list of objects into one named object, dropping empties."""
    parts = [p for p in parts if p is not None and len(p.data.polygons)]
    if not parts:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    out = parts[0]
    out.name = name
    out.data.name = name
    return out


def loft(rings: list[list[Vector]], close_ring: bool = False,
         cap_first: bool = True, cap_last: bool = True):
    """Bridge a sequence of equal-length rings into a tube or a slab.

    The single most-used primitive in this file. A cushion is a loft of section
    profiles along the boat; a rail is a loft of circles along a path; the
    screen is a loft of two-point rings along its plan curve.
    """
    n = len(rings[0])
    verts: list[Vector] = []
    faces: list[list[int]] = []
    for ring in rings:
        verts.extend(ring)
    last = n - 1 if not close_ring else n
    for r in range(len(rings) - 1):
        a = r * n
        b = (r + 1) * n
        for i in range(last):
            j = (i + 1) % n
            faces.append([a + i, a + j, b + j, b + i])
    if cap_first and n > 2:
        faces.append(list(range(n - 1, -1, -1)))
    if cap_last and n > 2:
        base = (len(rings) - 1) * n
        faces.append([base + i for i in range(n)])
    return verts, faces


def circle(centre: Vector, right: Vector, up: Vector, radius: float,
           segments: int = 10) -> list[Vector]:
    return [centre + right * (radius * math.cos(2 * math.pi * i / segments))
                   + up * (radius * math.sin(2 * math.pi * i / segments))
            for i in range(segments)]


def frame_along(path: list[Vector]) -> list[tuple[Vector, Vector]]:
    """A stable (right, up) frame at each point of a path.

    Parallel transport rather than a fresh cross product per point: a tube
    swept with independently-derived frames twists wherever the path's tangent
    passes near the reference axis, and the rail's own path does exactly that
    where it bends down onto the deck.
    """
    out: list[tuple[Vector, Vector]] = []
    ref = Vector((0, 0, 1))
    prev_up = None
    for i, p in enumerate(path):
        a = path[max(0, i - 1)]
        b = path[min(len(path) - 1, i + 1)]
        t = (b - a)
        if t.length < 1e-9:
            t = Vector((1, 0, 0))
        t.normalize()
        if prev_up is None:
            up = ref - t * ref.dot(t)
            if up.length < 1e-6:
                up = Vector((0, 1, 0)) - t * Vector((0, 1, 0)).dot(t)
        else:
            up = prev_up - t * prev_up.dot(t)
        up.normalize()
        right = t.cross(up)
        right.normalize()
        out.append((right, up))
        prev_up = up
    return out


def tube(name: str, path: list[Vector], radius: float,
         segments: int = 10) -> bpy.types.Object | None:
    if len(path) < 2:
        return None
    frames = frame_along(path)
    rings = [circle(p, r, u, radius, segments) for p, (r, u) in zip(path, frames)]
    verts, faces = loft(rings, close_ring=True)
    return weld(mesh_from(name, verts, faces))


def bevel_object(ob: bpy.types.Object, width: float, segments: int = 2,
                 angle_deg: float = 28.0) -> bpy.types.Object:
    """Soften every hard edge on an object.

    §11 — "no razor-sharp 90° box edges", and "do not over-round". An angle
    limit does both: an edge the modelling made because two facets meet at 90°
    is rounded, and an edge inside a lofted surface is left alone.
    """
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    edges = [e for e in bm.edges
             if len(e.link_faces) == 2
             and e.calc_face_angle(0.0) > math.radians(angle_deg)]
    if edges:
        bmesh.ops.bevel(bm, geom=edges, offset=width, segments=segments,
                        profile=0.62, affect="EDGES", clamp_overlap=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    return ob


# ─────────────────────────────────────────────────────────────────────────────
# Cushions
# ─────────────────────────────────────────────────────────────────────────────


def cushion_section(y_in: float, y_out: float, z_base: float,
                    thickness: float, radius: float, crown: float,
                    arc: int = 4) -> list[Vector]:
    """One athwartships section through an upholstered pad.

    §11's four requirements, as a closed outline: finite thickness (the side
    walls are real), softened edges (the top corners are filleted), a subtle
    crown (the top rises `crown` at mid-width), and no razor-sharp box edge
    anywhere on it.

    Returned in the (y, z) plane; the caller places it at a station.
    """
    x = 0.0
    r = min(radius, abs(y_out - y_in) * 0.4, thickness * 0.6)
    top = z_base + thickness
    pts: list[Vector] = []

    lo, hi = (y_in, y_out) if y_in < y_out else (y_out, y_in)
    pts.append(Vector((x, lo, z_base)))
    pts.append(Vector((x, lo, top - r)))
    for i in range(1, arc + 1):
        a = (i / (arc + 1)) * (math.pi / 2)
        pts.append(Vector((x, lo + r - r * math.cos(a), top - r + r * math.sin(a))))
    pts.append(Vector((x, lo + r, top)))
    # The crown. One point at mid-width, which is all a 7 mm rise needs — a
    # crowned top with more resolution than that reads as a bolster.
    pts.append(Vector((x, (lo + hi) / 2, top + crown)))
    pts.append(Vector((x, hi - r, top)))
    for i in range(arc, 0, -1):
        a = (i / (arc + 1)) * (math.pi / 2)
        pts.append(Vector((x, hi - r + r * math.cos(a), top - r + r * math.sin(a))))
    pts.append(Vector((x, hi, top - r)))
    pts.append(Vector((x, hi, z_base)))
    return pts


def cushion(name: str, stations: list[tuple[float, float, float, float]],
            thickness: float, radius: float, crown: float
            ) -> bpy.types.Object | None:
    """A pad, from a list of (x, y_inboard, y_outboard, z_base) stations.

    LOFTED RATHER THAN EXTRUDED, and that is what makes it a cushion instead of
    a lifted deck. An extrusion of a flat outline gives four vertical walls and
    a flat top; a loft of the section above gives a pad whose thickness, edge
    radius and crown are the same at every station and whose PLAN follows
    whatever the moulding underneath it does — including tapering to nothing at
    the bow, which is §10's requirement and the one a box cannot meet.
    """
    rings = []
    for x, y_in, y_out, z_base in stations:
        if abs(y_out - y_in) < 0.012:
            continue
        sec = cushion_section(y_in, y_out, z_base, thickness, radius, crown)
        rings.append([Vector((x, p.y, p.z)) for p in sec])
    if len(rings) < 2:
        return None
    verts, faces = loft(rings, close_ring=True)
    ob = weld(mesh_from(name, verts, faces))
    return ob


def sole_edge(hull: Hull, x: float, sole_z: float = 0.377,
              tolerance: float = 0.075) -> float | None:
    """Half-width of the cockpit sole at a station, or None where there is none.

    The step from the sole up to the raised platform is what a side cushion's
    inboard edge follows, so this is the one measurement the seating plan is
    built on. Scanned from the centreline outward and stopped at the first
    surface that is no longer sole — which is the step.
    """
    last = None
    for j in range(70):
        y = 0.020 + j * 0.014
        z = hull.surface_z(x, y)
        if z is None:
            break
        if abs(z - sole_z) <= tolerance:
            last = y
        elif last is not None:
            break
    return last


def coaming_edge(hull: Hull, x: float, platform_z: float = 0.57) -> float | None:
    """Half-beam of the hull's inner face just above the platform."""
    y = hull.inner_y(x, platform_z + 0.035)
    return abs(y) if y is not None else None


def seating_plan(hull: Hull, x0: float, x1: float, steps: int = 40,
                 platform_z: float = 0.57
                 ) -> list[tuple[float, float, float]]:
    """The side cushions' plan: (x, inboard, outboard) half-widths, one side.

    §10 — "the shape should follow the actual interior geometry". Both edges are
    measured off the delivered moulding: outboard is the coaming, inboard is the
    step down to the sole.

    MEASURED ON ONE SIDE AND MIRRORED, and that is not laziness. The ray fan is
    a discrete scan, so port and starboard disagree by a scan step wherever the
    step face is oblique — which drew as a cushion 0.21 m wider to starboard
    than to port on a boat that is symmetrical. Measuring once removes the
    disagreement instead of averaging it.

    FORWARD OF THE SOLE the platform runs right across the boat and there is no
    inboard edge to find. There the cushion converges linearly to the centreline,
    which is what makes the chevron the cockpit three-quarter shows.
    """
    raw = []
    for i in range(steps + 1):
        x = x0 + (x1 - x0) * i / steps
        raw.append((x, sole_edge(hull, x), coaming_edge(hull, x, platform_z)))

    with_sole = [i for i, (_, si, _) in enumerate(raw) if si is not None]
    if not with_sole:
        return []
    last = with_sole[-1]
    base = raw[last][1]

    plan = []
    for i, (x, si, co) in enumerate(raw):
        if co is None:
            continue
        if si is not None:
            inboard = si + SPEC.cushion_gap
        elif i > last:
            # SMOOTHSTEP, NOT LINEAR. A straight run-off leaves a corner at the
            # station the sole ends, and a lofted cushion draws that corner as a
            # crease across its own inboard edge — visible from directly above,
            # which is where anyone checks a cockpit layout.
            t = (i - last) / max(1, len(raw) - 1 - last)
            e = t * t * (3 - 2 * t)
            inboard = (base + SPEC.cushion_gap) * (1.0 - e)
        else:
            continue
        plan.append([x, inboard, co - 0.040])

    # SMOOTHED, for the same reason the rail path is. Both edges come from a
    # discrete ray fan over a triangulated moulding, so each carries a 14 mm
    # scan quantum and the odd facet-sized jump — which a lofted cushion turns
    # into a visible notch in its own inboard edge. Three passes of a five-point
    # mean; the ends are pinned so the run still starts and finishes where it
    # was measured to.
    for _ in range(6):
        prev = [row[:] for row in plan]
        for i in range(1, len(plan) - 1):
            lo, hi = max(0, i - 3), min(len(prev), i + 4)
            plan[i][1] = sum(r[1] for r in prev[lo:hi]) / (hi - lo)
            plan[i][2] = sum(r[2] for r in prev[lo:hi]) / (hi - lo)

    # The tip is allowed to run down to 30 mm. A cushion that stops the moment
    # it is narrower than a hand drew as a blunt end 0.12 m short of the stem,
    # with pale moulding forward of it — the chevron has to actually close.
    return [(x, i, o) for x, i, o in plan if o - i >= 0.030]


# ─────────────────────────────────────────────────────────────────────────────
# The forward liner — PHASE 4.6 §7, §8, §9, §43
# ─────────────────────────────────────────────────────────────────────────────


def _smoothstep(t: float) -> float:
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def _spline_table(table, x: float) -> float:
    """Catmull-Rom through an ascending (station, value) table.

    §14 AND §15, AS AN INTERPOLATOR. "Do not use a long rectangle + angular
    wedge + point formula … avoid obvious polygonal corners unless the
    reference visibly has them." A traced table read at 0.1 m intervals and
    interpolated LINEARLY has a corner at every one of its own rows, and a
    lofted cushion draws each of them as a crease down its edge — which is
    what made Phase 4.7.1's plan look mechanical at the shoulder and at the
    turn into the bow.

    Catmull-Rom passes through every measured point, so nothing is smoothed
    away, and arrives at each with the slope of its neighbours, so nothing is
    cornered either. The ends are clamped by duplicating the terminal rows,
    which is what keeps the aft end square — §15 asks for a clean aft end, and
    that is the one corner the reference does have.
    """
    n = len(table)
    if n == 1 or x <= table[0][0]:
        return table[0][1]
    if x >= table[-1][0]:
        return table[-1][1]
    i = 0
    while i < n - 2 and x > table[i + 1][0]:
        i += 1
    x0, y0 = table[i]
    x1, y1 = table[i + 1]
    t = (x - x0) / max(1e-9, x1 - x0)
    ym = table[max(0, i - 1)][1]
    yp = table[min(n - 1, i + 2)][1]
    m0 = (y1 - ym) * 0.5
    m1 = (yp - y0) * 0.5
    t2, t3 = t * t, t * t * t
    return ((2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0
            + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1)


def _liner_section(x: float, y_flat: float, z_flat: float,
                   y_edge: float, z_edge: float, cove: int = 6
                   ) -> list[Vector]:
    """One athwartships section through the forward liner, port to starboard.

    Two parts, and the proportion between them is what makes the bow taper:

      FLAT   the moulded sole, from −`y_flat` to +`y_flat` at `z_flat`, with the
             same slight crown a cushion gets so it sheds water and catches a
             highlight rather than reading as a grey plane
      COVE   from the flat's edge up and outboard to (`y_edge`, `z_edge`), where
             the liner meets the hull just under the capping

    At the aft end `y_flat` is the delivered platform's own half-width and the
    cove is a coaming. By the forward end `y_flat` has gone to zero and the
    section is cove all the way across — which is a bow, not a deck.
    """
    pts: list[Vector] = []
    dz = z_edge - z_flat

    def cove_points(sign: int) -> list[Vector]:
        out = []
        for i in range(1, cove + 1):
            t = i / cove
            # Quarter-cosine: leaves the flat tangentially, arrives at the hull
            # steeply. A straight ramp puts a crease along the whole length of
            # the boat exactly where the light grazes it.
            y = y_flat + (y_edge - y_flat) * t
            z = z_flat + dz * (1.0 - math.cos(t * math.pi / 2))
            out.append(Vector((x, sign * y, z)))
        return out

    pts.extend(reversed(cove_points(-1)))
    pts.append(Vector((x, -y_flat, z_flat)))
    # THE CROWN IS ALWAYS EMITTED — 4.7, and the reason is the material split
    # rather than the shape. It used to be skipped once the flat had closed,
    # which made the section's point count vary by station and forced the loft
    # to pad ragged rings with duplicates inserted at the middle. The flat is
    # now separated out of the finished mesh as `forward_sole` — see
    # `build_forward_liner` — and that separation is a test against a per-
    # station flat half-width, which needs the flat to be the same three points
    # in every ring. At y_flat 0 the three coincide and `weld` removes the
    # degenerate quads.
    pts.append(Vector((x, 0.0, z_flat + 0.006 * min(1.0, y_flat / 0.10))))
    pts.append(Vector((x, y_flat, z_flat)))
    pts.extend(cove_points(1))
    return pts


def interior_edge(hull: Hull, x: float) -> tuple[float, float] | None:
    """Where the inside of the boat ends at a station: (half-width, height).

    NOT A RAYCAST, AND THE FIRST VERSION OF THE FORWARD LINER WAS, WHICH IS HOW
    THIS FUNCTION CAME TO EXIST. `inner_y` fired at `sheer(x) − 0.070` returns
    the first surface outboard of the centreline at that height, and near the
    bow that is the wrong surface: the sheer profile is a smoothed windowed
    maximum, so a station whose real deck edge is 30 mm lower than the smoothed
    one has the ray passing over the deck and picking up the inside of the OUTER
    skin instead — 0.89 rather than 0.75. A liner built to that reading burst
    through the topsides in a lobe half a metre across, which is exactly what
    `.qa/p46a-blob.png` shows.

    The capping already knows the answer. `gunwale_plan` returns the moulding's
    outer and inner half-widths at any station, authored rather than sampled, and
    the inner one IS the edge of the opening — including forward of the taper,
    where it draws in to nothing and makes the bow. Reading it here means the
    liner and the capping cannot disagree, at any station, ever.
    """
    plan = gunwale_plan(hull, x)
    if plan is None:
        return None
    _, inner = plan
    # The capping's own underside: its top falls `gunwale_fall` inboard and its
    # section is `gunwale_thickness`, so this is the plane the liner tucks under.
    z = hull.sheer(x) - SPEC.gunwale_fall - SPEC.gunwale_thickness
    return inner, z


def split_by_face(ob: bpy.types.Object, name_keep: str, name_take: str,
                  take) -> tuple[bpy.types.Object | None, bpy.types.Object | None]:
    """Cut a finished object in two by a per-face test, without moving a vertex.

    AFTER THE MODIFIERS, NOT BEFORE, and that is the whole reason this exists
    rather than two lofts. `solidify` and `bevel_object` both work on an
    object's own boundary: two strips built separately and then thickened get a
    rim each along the edge they share, and `bevel_object` rounds every rim it
    finds — so a 6 mm bevel on two 16 mm shells opens a 12 mm crack down the
    length of the join. Building one shell and separating its faces afterwards
    cannot open a crack, because there is no boundary there to round.

    `take` is called with the face's centroid and its normal. Vertices are
    shared by both halves; each half keeps only the ones it uses.
    """
    me = ob.data
    verts = [v.co.copy() for v in me.vertices]
    groups: dict[bool, list[list[int]]] = {True: [], False: []}
    for poly in me.polygons:
        idx = list(poly.vertices)
        centre = Vector((0.0, 0.0, 0.0))
        for i in idx:
            centre += verts[i]
        centre /= len(idx)
        groups[bool(take(centre, poly.normal))].append(idx)

    def build(name: str, faces: list[list[int]]) -> bpy.types.Object | None:
        if not faces:
            return None
        remap: dict[int, int] = {}
        pts: list[Vector] = []
        out: list[list[int]] = []
        for f in faces:
            row = []
            for i in f:
                j = remap.get(i)
                if j is None:
                    j = len(pts)
                    remap[i] = j
                    pts.append(verts[i])
                row.append(j)
            out.append(row)
        return mesh_from(name, pts, out)

    kept = build(name_keep, groups[False])
    taken = build(name_take, groups[True])
    bpy.data.objects.remove(ob, do_unlink=True)
    return kept, taken


def build_cockpit_floor(hull: Hull, steps: int = 150) -> dict[str, bpy.types.Object | None]:
    """THE DECK AND THE INNER WALL, built from one station list.

    One flat deck at one height, and a wall standing on its edge that rises to
    meet the gunwale capping exactly, all the way round. The section closes:

        OUTER HULL SKIN          the boat's own side
        GUNWALE CAPPING          spanning the two, on top
        INNER LINER              this wall, vertical, from the capping down
        DECK                     this panel, flat, meeting the wall at 90°

    THE TWO ARE BUILT TOGETHER BECAUSE THEY HAVE TO AGREE. The deck's outboard
    edge and the wall's foot are the same number at every station, and the
    wall's head is `interior_edge` — the capping's OWN authored inner half-width
    and its OWN underside height, out of `gunwale_plan`. So the wall cannot miss
    the capping and the deck cannot miss the wall: there is one measurement and
    three parts read it.

    Forward of the capping's convergence the inner half-width goes to zero, so
    the wall closes on the centreline and takes the deck with it. Nothing
    decides the bow's shape but the capping the boat already has.

    Returns the deck (graphite, with the rest of the sole) and the wall (the
    hard liner, in the hull's own tone) separately, because they are two
    materials and §12 says the wall is not upholstery and not floor.
    """
    x0, x1 = SPEC.platform_void_x
    z = SPEC.deck_z
    stations: list[tuple[float, float, float]] = []

    for i in range(steps + 1):
        x = x0 + (x1 - x0) * i / steps
        edge = interior_edge(hull, x)
        if edge is None:
            continue
        y, top = edge
        if y < 0.02 or top <= z + 0.05:
            continue
        stations.append((x, y, top))

    if len(stations) < 6:
        print("    deck: no stations, skipped", flush=True)
        return {"deck": None, "liner": None}

    for _ in range(3):
        prev = list(stations)
        for i in range(1, len(stations) - 1):
            lo, hi = max(0, i - 2), min(len(prev), i + 3)
            stations[i] = (stations[i][0],
                           sum(r[1] for r in prev[lo:hi]) / (hi - lo),
                           sum(r[2] for r in prev[lo:hi]) / (hi - lo))

    # ── the deck ────────────────────────────────────────────────────────
    # 10 mm PAST the wall's foot, so the wall covers the joint rather than
    # butting onto it and leaving a hairline at a grazing angle.
    on_deck = [r for r in stations if r[0] <= SPEC.forward_pad_x[1] + 1e-6]
    deck_parts = [weld(mesh_from("deck", *loft(
        [[Vector((x, -(y + 0.010), z)), Vector((x, y + 0.010, z))]
         for x, y, _t in on_deck],
        close_ring=False, cap_first=False, cap_last=False)))]
    x, y, _t = stations[0]
    deck_parts.append(mesh_from("deck_end", [
        Vector((x, y, z)), Vector((x, -y, z)),
        Vector((x, -y, SPEC.platform_z)), Vector((x, y, SPEC.platform_z)),
    ], [[0, 1, 2, 3]]))
    deck = join("cockpit_floor", deck_parts)

    # ── the wall ────────────────────────────────────────────────────────
    # Vertical, foot on the deck, head on the capping's underside. One ring of
    # two points per station per side; the loft is the wall.
    def wall_section(y: float, top: float, arc: int = 5) -> list[Vector]:
        """One section through the inner wall: a face, then a rolled top.

        Up from the deck, then a quarter round turning OUTBOARD into the
        capping's underside. Rolling outboard rather than inboard is what keeps
        it out of the cockpit — the radius lives in the space under the
        moulding, where there is nothing else — and it is what makes the top of
        the wall a coaming a hand goes over instead of an edge.
        """
        r = min(SPEC.liner_roll, max(0.0, (top - z) * 0.45))
        out = [Vector((0.0, y, z)), Vector((0.0, y, top - r))]
        for i in range(1, arc + 1):
            a = (i / arc) * (math.pi / 2)
            out.append(Vector((0.0, y + r * math.sin(a), top - r + r * math.cos(a))))
        return out

    wall_parts = []
    for sign in (1.0, -1.0):
        rings = []
        for x, y, t in stations:
            sec = wall_section(y, t)
            rings.append([Vector((x, sign * p.y, p.z)) for p in sec])
        if sign < 0:
            rings = [list(reversed(r)) for r in rings]
        wall_parts.append(weld(mesh_from("cockpit_liner", *loft(
            rings, close_ring=False, cap_first=False, cap_last=False))))

    # ── the nose ────────────────────────────────────────────────────────
    # THE WALL COMES IN AND CLOSES ON THE SEAT. It used to run on past the
    # cushions to the stem, leaving a wedge of bare deck in front of them with
    # the two sides of the capping standing over it — a trough, and the thing
    # that made the nose read as unfinished.
    #
    # So the interior ends where the leather does: a transverse wall across the
    # cushions' own forward station, and a small closing deck from there to the
    # convergence at the capping's own underside height. Both are liner. What
    # is forward of the seat is bow structure, not cockpit.
    nose = [(x, y, t) for x, y, t in stations if x >= SPEC.nose_x]
    if len(nose) >= 2:
        # THE WALL ONLY. The deck over it belongs to the capping and is built
        # there — see `build_gunwale` — so what is left here is the face that
        # closes in front of the seat, and its head is the deck's own section
        # evaluated at this station so the two meet on one line.
        # AND THE SAME ROLL CARRIES ROUND IT. The closing wall used to be a
        # flat plate whose head was the deck's section — correct, and a corner
        # on both sides where it met the rolled side walls. Its top is rolled
        # too now, forward into the deck's underside rather than outboard, so
        # the coaming runs unbroken from one side, round the nose, and back up
        # the other.
        x_n, y_n, t_n = nose[0]
        head = nose_profile(x_n, y_n, t_n + SPEC.gunwale_thickness
                            - SPEC.gunwale_fall, 0.0)
        rings_n = []
        for pt in head:
            r = min(SPEC.liner_roll, max(0.0, (pt.z - z) * 0.45))
            sec = [Vector((x_n, pt.y, z)), Vector((x_n, pt.y, pt.z - r))]
            for i in range(1, 6):
                ang = (i / 5) * (math.pi / 2)
                sec.append(Vector((x_n + r * math.sin(ang), pt.y,
                                   pt.z - r + r * math.cos(ang))))
            rings_n.append(sec)
        verts_n: list[Vector] = []
        faces_n: list[list[int]] = []
        w = len(rings_n[0])
        for r in range(len(rings_n) - 1):
            base_n = len(verts_n)
            verts_n.extend(rings_n[r] + rings_n[r + 1])
            for k in range(w - 1):
                faces_n.append([base_n + k, base_n + w + k,
                                base_n + w + k + 1, base_n + k + 1])
        wall_parts.append(weld(mesh_from("cockpit_liner_nose", verts_n, faces_n)))

    liner = join("cockpit_liner", wall_parts)

    mid = stations[len(stations) // 2]
    print(f"    deck: {len(stations)} stations x {stations[0][0]:.2f}.."
          f"{stations[-1][0]:.2f}  one level at z {z:.3f}  "
          f"{2 * mid[1]:.2f} m across amidships", flush=True)
    print(f"    liner: vertical wall z {z:.3f}→{mid[2]:.3f} at the capping's own "
          f"inner edge, both sides, closing at x {stations[-1][0]:.2f}", flush=True)
    return {"deck": deck, "liner": liner}


def _mirrored(rings: list[list[Vector]]) -> list[list[Vector]]:
    """The same rings on the other side of the boat, wound the same way.

    Negating y alone would leave every face pointing into the object, so the
    points within each ring are reversed as well — which is a mirror rather
    than a rotation, and is what §14's "geometrically symmetrical" means when
    it reaches geometry.
    """
    return [[Vector((p.x, -p.y, p.z)) for p in reversed(r)] for r in rings]


def forward_pad_plan(hull: Hull, steps: int = 120
                     ) -> list[tuple[float, float, float]]:
    """One side's plan: (x, inboard, outboard) as POSITIVE half-widths.

    BOTH EDGES ARE TRACED — 4.7.1, §7 and §28. This is the whole of the
    correction and it is a change of KIND, not of numbers.

    Phase 4.7 authored a width and derived everything from it: `outboard` was
    the coaming less an inset at every station, `inboard` was `outboard −
    pad_width(x)`, and the station the two sides met fell out of the arithmetic
    at x 1.908. Every one of those was a mathematical invention of a shape that
    the reference already contains, and §7 rules the method out before it rules
    out any particular answer: "Do not invent the plan shape mathematically."

    So the INBOARD edge comes from `pad_inboard`, a table measured off the
    delivered cockpit three-quarter by `scripts/pxl/upholstery-trace.mjs`, and
    it is the edge that decides how much leather there is and where the two
    sides meet. The OUTBOARD edge is not authored at all any more: it is the
    inner wall, station by station, out of the same `interior_edge` the wall
    itself is built from. The cushions are fitted to the liner rather than
    placed near it, and the two cannot disagree by construction.

    ONE SIDE, MIRRORED. `_mirrored` supplies the other, for the reason
    `seating_plan` gives: the ray fan is discrete and port and starboard
    disagree by a scan step wherever the surface under it is oblique.
    """
    if "forward_pad_plan" in hull.cache:
        return hull.cache["forward_pad_plan"]

    x0, x1 = SPEC.forward_pad_x
    half = SPEC.bow_seam / 2

    raw: list[list[float]] = []
    for i in range(steps + 1):
        x = x0 + (x1 - x0) * i / steps
        # THE CLAMP. `coaming_edge` fires at platform height, which forward of
        # the bow's rise is well below the liner the cushion sits on — so on
        # its own it hands back a half-beam wider than the opening. The
        # capping's inner edge bounds it.
        limit = coaming_edge(hull, x, SPEC.platform_z)
        edge = interior_edge(hull, x)
        if edge is not None:
            limit = edge[0] if limit is None else min(limit, edge[0])
        if limit is None:
            continue
        out = limit + SPEC.pad_tuck
        # THE INNER EDGE IS THE OUTER EDGE, OFFSET. It was an authored position
        # — two straight lines with a knuckle between them — while the outer
        # edge followed the wall, so the band's width wandered and the two edges
        # ran at different angles. Taking the inner edge as `outboard − band`
        # makes them parallel by construction: whatever the wall does, the
        # leather does, and the band is the one number that decides how much of
        # it there is.
        inb = max(half, out - _lerp_table(SPEC.pad_band, x))
        raw.append([x, inb, out])

    if len(raw) < 6:
        return []

    # SMOOTHED, and only lightly. The tables are already smooth — they are
    # read off a picture at 0.1 m intervals and interpolated — so this is
    # against the clamp, which follows a discrete ray fan over a triangulated
    # moulding and carries its 14 mm quantum into whichever stations it binds
    # at. Three passes of a five-point mean; the ends are pinned.
    # THE OUTBOARD EDGE ONLY. It follows the hull through a discrete ray fan and
    # carries its scan quantum; the inboard edge is two authored straight lines
    # and smoothing it would round the knuckle back off.
    for _ in range(3):
        prev = [row[:] for row in raw]
        for i in range(1, len(raw) - 1):
            lo, hi = max(0, i - 2), min(len(prev), i + 3)
            raw[i][2] = sum(r[2] for r in prev[lo:hi]) / (hi - lo)

    out = [(x, i, o) for x, i, o in raw if o - i >= 0.045]
    hull.cache["forward_pad_plan"] = out
    return out


def pad_meeting_x(plan: list[tuple[float, float, float]]) -> float | None:
    """The station the two cushions first touch, read back off the plan.

    Reported rather than assumed: §21 asks whether they meet at the bow
    centreline, and the honest way to answer it is to find the answer in the
    geometry that was built rather than in the number that was intended.
    """
    tol = SPEC.bow_seam / 2 + 0.001
    for x, inboard, _out in plan:
        if inboard <= tol:
            return x
    return None


def build_forward_base(hull: Hull) -> bpy.types.Object | None:
    """The plinth under each cushion — local to its own footprint.

    The deck is one level and the cushions are furniture standing on it, so
    what carries them is a box the size of the cushion and nothing more: it does
    not extend aft into the cockpit, it does not run outboard to the hull, and
    it is not deck. In the reference this is the dark face under the cognac.

    It goes into `cockpit_sole`, which is the graphite the deck and every step
    face in this interior have worn since Phase 4.3.
    """
    plan = forward_pad_plan(hull)
    if len(plan) < 6:
        print("    plinth: no plan, skipped", flush=True)
        return None

    top = SPEC.plinth_z
    z = SPEC.deck_z
    rings: list[list[Vector]] = []
    for x, inboard, out in plan:
        if out - inboard < 0.045:
            continue
        # A slight inboard lean on the visible face. Every moulded seat base has
        # one — it is what lets the part come out of the tool — and it is also
        # what stops the face reading as a wall dropped onto the deck.
        rings.append([
            Vector((x, inboard + 0.016, z)),
            Vector((x, inboard, top)),
            Vector((x, out, top)),
            Vector((x, out, z)),
        ])
    if len(rings) < 3:
        return None

    parts: list[bpy.types.Object] = []
    for name, rs in (("plinth_starboard", rings),
                     ("plinth_port", _mirrored(rings))):
        verts, faces = loft(rs, close_ring=True)
        parts.append(bevel_object(weld(mesh_from(name, verts, faces)),
                                  0.008, 2, 50.0))
    print(f"    plinth: 2 x {len(rings)} stations x {rings[0][0].x:.2f}.."
          f"{rings[-1][0].x:.2f}  z {z:.3f}→{top:.3f}", flush=True)
    return join("forward_base", parts)


def _pad_seat(hull: Hull, x: float, inboard: float, outboard: float
              ) -> tuple[float, float, float]:
    """Trim one station's cushion to a piece of surface it can actually lie on.

    A `cushion` section has ONE base height across its whole width, and near
    the bow the surface under it does not: the forward liner's cove climbs to
    the capping, so an outboard edge placed against it sits on a slope well
    above the inboard one, and the liner then comes up through the middle of
    the cushion.

    So the outboard edge is walked inboard until the surface under it is within
    `tolerance` of the surface under the cushion's middle, and the base is the
    highest of the samples rather than the middle one — a cushion resting a
    little proud of a dished sole is right, and one buried in it is not.

    IT BINDS FAR LESS OFTEN IN 4.7 THAN IT DID IN 4.6, and that is deliberate:
    `forward_cove_hold` keeps a real flat under the padding for the whole run,
    so this is a guard rather than the thing that decides the cushions' width.
    """
    tolerance = 0.045
    # THREE SAMPLES, HIGHEST WINS, rather than one at the middle. One sample is
    # one facet's answer, and a cushion whose middle happens to fall over a
    # hatch recess or the last 30 mm of the sole would drop the whole station to
    # the bottom of it. The cushion is meant to lie on the moulding, so the
    # moulding is the highest thing the ray finds under it.
    samples = [hull.surface_z(x, inboard + (outboard - inboard) * f)
               for f in (0.32, 0.50, 0.68)]
    found = [s for s in samples if s is not None]
    if not found:
        return inboard, outboard, SPEC.platform_z
    mid = max(found)

    highest = mid
    for _ in range(14):
        edge = hull.surface_z(x, outboard)
        if edge is None or edge - mid <= tolerance:
            if edge is not None:
                highest = max(highest, edge)
            break
        outboard -= 0.020
        if outboard - inboard < 0.045:
            break
    return inboard, outboard, highest


def build_forward_cushions(hull: Hull) -> list[bpy.types.Object]:
    """The two side cushions — §2, §4, §14, §15.

    ONE MESH PER SIDE. §4 requires each side to read as one continuous
    upholstered form rather than as separate blocks, so there is no seam
    anywhere in the fore-and-aft run: `pad_splits` and `pad_seam` are gone, and
    the only division in the whole forward architecture is the 16 mm the two
    cushions leave between them on the centreline.

    Each station's base height is taken by raycast, so the cushions sit on the
    forward liner where there is forward liner, on the base where there is
    base, and on the delivered moulding where there is neither — without any of
    the three being named here. `build_forward_liner` and `build_forward_base`
    both have to have run first, and `pxl_blender` runs them first for exactly
    this reason.
    """
    plan = forward_pad_plan(hull)
    if len(plan) < 6:
        print("    forward cushions: no plan, skipped", flush=True)
        return []

    stations: list[tuple[float, float, float, float]] = []
    for x, inb, out in plan:
        # THE BASE IS AUTHORED, NOT RAYCAST — 4.7.2 §B, and this one line is the
        # whole of that correction. `_pad_seat` still runs, because its other
        # job is to keep the outboard edge off anything that has risen under
        # it, but its height is discarded: a seat is at a seat's height.
        # NOTHING TO TRIM AGAINST ANY MORE. `_pad_seat` walked the outboard
        # edge inboard wherever the surface under it had risen, which is what
        # the forward liner's climbing cove used to do to it. The deck is one
        # flat plane and the plinth follows the cushion exactly, so the plan is
        # the plan.
        if out - inb < 0.045:
            continue
        stations.append((x, inb, out, SPEC.cushion_base_z))
    if len(stations) < 3:
        print("    forward cushions: no stations, skipped", flush=True)
        return []

    # THREE PANELS, TWO SEAMS. A run down each side, and one across the nose —
    # which is built as two lofted halves that touch on the centreline forward
    # of where the plan closes, so they weld into a single connected piece.
    # The seams are the gap at `pad_knuckle_x`, which is where the drawing puts
    # them and where the sides turn.
    # THE DIAGONAL. Between `nose_pad_x` and `nose_seam_x` it runs from the
    # side run's own inner edge out to the wall; the side run's inner edge
    # follows it up and the run closes on itself there, and the middle panel's
    # outer edge follows the same line down. One line, read twice, so the two
    # panels cannot part company along it.
    half_seam = SPEC.pad_seam / 2
    xa, xb = SPEC.nose_pad_x, max(SPEC.nose_seam_x, SPEC.nose_pad_x + 0.05)
    at_a = next((r for r in stations if r[0] >= xa), stations[-1])

    def diagonal(x: float) -> float:
        t = min(1.0, max(0.0, (x - xa) / (xb - xa)))
        wall = _lerp_table([(r[0], r[2]) for r in stations], x)
        return at_a[1] + (wall - at_a[1]) * t

    side = []
    for x, inb, out, z in stations:
        if x > xb:
            break
        lo = inb if x <= xa else diagonal(x) + half_seam
        if out - lo < 0.030:
            break
        side.append((x, lo, out, z))

    cushions: list[bpy.types.Object] = []
    for name, sign in (("forward_cushion_starboard", 1.0),
                       ("forward_cushion_port", -1.0)):
        ob = cushion(name, [(x, sign * i, sign * o, z) for x, i, o, z in side],
                     SPEC.cushion_thickness, SPEC.cushion_radius,
                     SPEC.cushion_crown)
        if ob:
            cushions.append(bevel_object(ob, 0.010, 2, 55.0))

    # ── THE PANEL IN THE MIDDLE ─────────────────────────────────────────
    # One piece filling the wedge the two side runs leave between them at the
    # bow, from `nose_pad_x` forward to where they finish. Its outboard edges
    # are the sides' own inboard edges less half a seam, so the two joints are
    # the same 16 mm construction line the rest of the upholstery uses and the
    # three panels cannot drift apart: the sides decide where it ends.
    middle = [(x, min(diagonal(x), out) - half_seam, z)
              for x, _i, out, z in stations
              if x >= xa and min(diagonal(x), out) - half_seam > 0.030]
    if len(middle) >= 3:
        ob = cushion("forward_cushion_nose",
                     [(x, -y, y, z) for x, y, z in middle],
                     SPEC.cushion_thickness, SPEC.cushion_radius,
                     SPEC.cushion_crown)
        if ob:
            cushions.append(bevel_object(ob, 0.010, 2, 55.0))
            print(f"    nose panel: x {middle[0][0]:.2f}..{middle[-1][0]:.2f}  "
                  f"half-width {middle[0][1]:.3f}→{middle[-1][1]:.3f}", flush=True)

    meet = pad_meeting_x(plan)
    widths = [o - i for _x, i, o, _z in side]
    print(f"    forward cushions: {len(cushions)} x {len(stations)} stations  "
          f"x {stations[0][0]:.2f}..{stations[-1][0]:.2f}  "
          f"inboard {stations[0][1]:.3f}→{stations[-1][1]:.3f}  "
          f"outboard {stations[0][2]:.3f}→{stations[-1][2]:.3f}  "
          f"width {min(widths):.3f}..{max(widths):.3f}  "
          f"meet x {'none' if meet is None else format(meet, '.3f')}", flush=True)
    return cushions


# ─────────────────────────────────────────────────────────────────────────────
# The console
# ─────────────────────────────────────────────────────────────────────────────


def _console_plan(steps: int = 6) -> list[tuple[float, float]]:
    """The console's footprint, as (x, y) going anticlockwise from aft-port.

    A rounded rectangle narrowing forward, which is what both three-quarter
    references show: the aft face is the widest part and the forward face is
    pulled in, so the sides read as leaning rather than as a slab.
    """
    xa, xf = SPEC.console_x
    ha = SPEC.console_half[0]
    hf = SPEC.console_half[0] * 0.90
    r = 0.055
    cy = SPEC.console_y
    pts: list[tuple[float, float]] = []

    def arc(cx, cyy, rx, ry, a0, a1):
        for i in range(steps + 1):
            a = a0 + (a1 - a0) * i / steps
            pts.append((cx + rx * math.cos(a), cyy + ry * math.sin(a)))

    # aft-port → forward-port → forward-starboard → aft-starboard
    arc(xa + r, cy - ha + r, r, r, math.pi, math.pi * 1.5)
    pts.append((xa + r, cy - ha))
    arc(xf - r, cy - hf + r, r, r, math.pi * 1.5, math.pi * 2)
    arc(xf - r, cy + hf - r, r, r, 0, math.pi * 0.5)
    pts.append((xa + r, cy + ha))
    arc(xa + r, cy + ha - r, r, r, math.pi * 0.5, math.pi)
    # Deduplicate the seam the arcs leave.
    clean = [pts[0]]
    for p in pts[1:]:
        if (p[0] - clean[-1][0]) ** 2 + (p[1] - clean[-1][1]) ** 2 > 1e-8:
            clean.append(p)
    return clean


def _dash_z(hull: Hull, x: float) -> float:
    """The dash plane at a station: the sheer plus a rake that lifts forward."""
    xa, xf = SPEC.console_x
    t = (x - xa) / (xf - xa)
    lift = SPEC.dash_above_sheer[0] + (SPEC.dash_above_sheer[1]
                                       - SPEC.dash_above_sheer[0]) * t
    return hull.sheer(x) + lift


def build_console(hull: Hull, sole_z: float) -> dict[str, bpy.types.Object]:
    """The helm console, in two materials.

    ── WHAT WAS WRONG WITH THE OLD ONE ──────────────────────────────────
    §4 of the brief: too tall, too monolithic, too solid, too wedge-like,
    visually heavy. All five are the same defect measured five ways — the STL's
    console is a single closed wedge whose top rakes DOWN toward the bow, so the
    tallest thing on the boat is its aft face and it presents that face to the
    camera in every cockpit view.

    The plate's console rakes the other way: 0.105 m above the sheer at the aft
    face and 0.185 m at the forward one. That single sign change is most of the
    perceptual difference, because it turns a wall the driver looks at into a
    dash the driver looks over.

    ── THE TWO MATERIALS ────────────────────────────────────────────────
    The aft face is a pale panel in the hull's own tone — clear in the cockpit
    three-quarter, and the pale triangle at the tower's base in the colour
    studies is the same part seen from the other side. Everything else is
    structural dark. So the split is not decorative: `console_body` is the
    moulding the driver faces and `console_detail` is the shell around it.
    """
    plan = _console_plan()
    n = len(plan)
    xa, xf = SPEC.console_x

    # The shell: a prism from the sole to the raked dash, tapering inward as it
    # rises. Two rings is enough — the taper is linear and the corner radius
    # already carries the shape.
    def ring(t: float) -> list[Vector]:
        """t = 0 at the sole, 1 at the dash."""
        out = []
        scale = 1.0 + (SPEC.console_half[1] / SPEC.console_half[0] - 1.0) * t
        for x, y in plan:
            cx = (xa + xf) / 2
            sx = cx + (x - cx) * (1.0 + (0.94 - 1.0) * t)
            sy = SPEC.console_y + (y - SPEC.console_y) * scale
            z = sole_z + (_dash_z(hull, sx) - sole_z) * t
            out.append(Vector((sx, sy, z)))
        return out

    rings = [ring(t) for t in (0.0, 0.28, 0.55, 0.80, 1.0)]
    verts, faces = loft(rings, close_ring=True, cap_first=True, cap_last=True)
    shell = weld(mesh_from("console_shell", verts, faces))
    bevel_object(shell, 0.012, segments=2, angle_deg=32.0)

    # The aft panel. A separate skin standing 6 mm proud of the shell's own aft
    # face, so it reads as a fitted panel rather than as a painted rectangle —
    # and so the two materials never z-fight.
    ha = SPEC.console_half[0]
    hb = SPEC.console_half[1]
    cy = SPEC.console_y
    inset = 0.042
    z_lo = sole_z + 0.055
    z_hi = _dash_z(hull, xa) - 0.032
    px = xa - 0.004
    # THE PANEL HAS TO TAPER WITH THE SHELL. The console leans inward as it
    # rises, so a panel with parallel sides is wider than the shell at the top
    # and stands out past it — which drew as a pale flange on the port quarter.
    panel = mesh_from("console_panel", [
        (px, cy - ha + inset, z_lo), (px, cy + ha - inset, z_lo),
        (px, cy + hb - inset, z_hi), (px, cy - hb + inset, z_hi),
    ], [[0, 1, 2, 3]])
    # Given a real section, so the panel has an edge to catch light on.
    bm = bmesh.new()
    bm.from_mesh(panel.data)
    res = bmesh.ops.extrude_face_region(bm, geom=list(bm.faces))
    moved = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=moved, vec=Vector((-0.014, 0, 0)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(panel.data)
    bm.free()
    bevel_object(panel, 0.008, segments=2, angle_deg=40.0)

    return {"detail": shell, "body": panel}


# ─────────────────────────────────────────────────────────────────────────────
# The windscreen
# ─────────────────────────────────────────────────────────────────────────────


def _screen_plan(steps: int = 11) -> list[tuple[float, float, float]]:
    """The screen's footprint, as (x, y, wrap) from the port wing round to the
    starboard one. `wrap` is 0 on the front face and 1 at a wing's aft end, and
    is what the top edge's sweep is driven by.

    THIS IS THE PART THAT MAKES IT A WRAPAROUND. A flat plane across the
    console — which is what the runtime screen was — has no side return, so it
    disappears edge-on and reads as a decal from three-quarters. The drawing's
    screen turns the corner: a front face with generously radiused corners and
    two wings sweeping aft and down along the console's sides.
    """
    xa, xf = SPEC.console_x
    cy = SPEC.console_y
    half = SPEC.console_half[1] - SPEC.screen_inset
    front = xf - SPEC.screen_inset
    r = min(SPEC.screen_corner, half * 0.8)
    pts: list[tuple[float, float, float]] = []

    # Port wing, aft end → the start of the corner.
    pts.append((xa + 0.010, cy - half, 1.0))
    pts.append((front - r, cy - half, 0.34))
    # The corner, port → centre.
    for i in range(1, steps):
        a = (i / steps) * (math.pi / 2)
        pts.append((front - r + r * math.sin(a), cy - half + r - r * math.cos(a),
                    0.34 * (1.0 - i / steps)))
    pts.append((front, cy, 0.0))
    # Mirror to starboard.
    for i in range(steps - 1, 0, -1):
        a = (i / steps) * (math.pi / 2)
        pts.append((front - r + r * math.sin(a), cy + half - r + r * math.cos(a),
                    0.34 * (1.0 - i / steps)))
    pts.append((front - r, cy + half, 0.34))
    pts.append((xa + 0.010, cy + half, 1.0))
    return pts


def _screen_rings(hull: Hull) -> list[list[Vector]]:
    """Four-point sections through the glazing, along the plan curve.

    Each is a rectangle in the vertical plane: bottom-inboard, bottom-outboard,
    top-outboard, top-inboard — so the glass has a real 9 mm section that shows
    at every grazing angle, which is what §8 means by "thickness where visually
    important".
    """
    rake = math.tan(math.radians(SPEC.screen_rake))
    half = SPEC.screen_glass / 2
    rings: list[list[Vector]] = []
    plan = _screen_plan()
    for i, (x, y, wrap) in enumerate(plan):
        sheer = hull.sheer(x)
        base = _dash_z(hull, x) - 0.012
        # The top sweeps from the front face's height down to the wing's.
        e = wrap * wrap * (3 - 2 * wrap)            # smoothstep, so no crease
        top = sheer + SPEC.screen_top_front + (SPEC.screen_top_aft
                                               - SPEC.screen_top_front) * e
        height = max(top - base, 0.02)
        # The section's own normal in plan: outward from the console's centre.
        a = plan[max(0, i - 1)]
        b = plan[min(len(plan) - 1, i + 1)]
        t = Vector((b[0] - a[0], b[1] - a[1], 0.0))
        if t.length < 1e-9:
            t = Vector((1, 0, 0))
        t.normalize()
        nrm = Vector((t.y, -t.x, 0.0))
        # The rake carries the top aft along the boat, not along the section.
        shift = Vector((-rake * height, 0.0, 0.0))
        p_lo = Vector((x, y, base))
        p_hi = Vector((x, y, top)) + shift
        rings.append([
            p_lo - nrm * half, p_lo + nrm * half,
            p_hi + nrm * half, p_hi - nrm * half,
        ])
    return rings


def build_screen(hull: Hull) -> dict[str, bpy.types.Object]:
    """The wrapped plexi, and the dark cap along its top edge.

    §7 requires genuine 3D geometry with a front face, a side return, a
    wrap/rake, an upper profile and a mounting relationship to the console. All
    five come out of one loft: the plan curve is the wrap, the section is the
    thickness, the swept top is the upper profile, the rake tilts it, and the
    base rides the dash plane so it cannot detach from the console.
    """
    rings = _screen_rings(hull)
    verts, faces = loft(rings, close_ring=True, cap_first=True, cap_last=True)
    glass = weld(mesh_from("windshield", verts, faces))

    # The cap. A slim tube run along the top edge — the drawing's dark surround,
    # which is most of what makes glazing read as glazing rather than as a hole.
    path = [(r[2] + r[3]) / 2 for r in rings]
    cap = tube("windshield_cap", path, SPEC.screen_cap / 2, segments=10)
    # And the two aft posts, closing the wings.
    posts = []
    for r in (rings[0], rings[-1]):
        foot = (r[0] + r[1]) / 2
        head = (r[2] + r[3]) / 2
        posts.append(tube("windshield_post", [foot, head], SPEC.screen_cap / 2, 8))
    surround = join("windshield_frame", [cap] + posts)
    return {"glass": glass, "frame": surround}


# ─────────────────────────────────────────────────────────────────────────────
# The steering wheel
# ─────────────────────────────────────────────────────────────────────────────


def build_wheel(hull: Hull) -> bpy.types.Object:
    """A three-spoke wheel on a stalk, mounted on the console's aft face.

    §5 — integrated, positioned from the reference, correctly sized, at a
    believable angle, reachable from the seat. The last of those is the one the
    old asset failed hardest: its wheel was a 2,198-triangle ring standing in
    free air above the console's crest, so it read as a prop rather than as a
    control. This one grows out of the panel the driver faces, at the height the
    plate puts its hub, tilted the way a wheel on a raked dash has to be.

    REACH IS CHECKED RATHER THAN ASSUMED: the bench's forward face is at
    x −1.735 and the hub lands at x −1.515, so the rim's nearest point is
    roughly 0.35 m from a seated driver's chest — arms bent, which is what the
    cockpit three-quarter draws.
    """
    xa = SPEC.console_x[0]
    hub = Vector((xa - SPEC.wheel_standoff, SPEC.console_y,
                  hull.sheer(xa) + SPEC.wheel_above_sheer))
    tilt = math.radians(SPEC.wheel_tilt)
    # The wheel's own axis: fore-aft, tipped back by the tilt.
    axis = Vector((-math.cos(tilt), 0.0, math.sin(tilt))).normalized()
    up = Vector((math.sin(tilt), 0.0, math.cos(tilt))).normalized()
    right = up.cross(axis).normalized()

    radius = SPEC.wheel_diameter / 2 - SPEC.wheel_rim / 2
    parts: list[bpy.types.Object] = []

    ring_path = [hub + right * (radius * math.cos(2 * math.pi * i / 28))
                 + up * (radius * math.sin(2 * math.pi * i / 28))
                 for i in range(28)]
    ring_path.append(ring_path[0])
    parts.append(tube("wheel_rim", ring_path, SPEC.wheel_rim, segments=10))

    for i in range(3):
        a = math.pi / 2 + i * 2 * math.pi / 3
        tip = hub + right * (radius * 0.93 * math.cos(a)) + up * (radius * 0.93 * math.sin(a))
        parts.append(tube(f"wheel_spoke_{i}", [hub, tip], 0.0125, segments=6))

    parts.append(tube("wheel_hub", [hub - axis * 0.020, hub + axis * 0.028],
                      0.030, segments=12))
    # The stalk, back into the panel. It ends INSIDE the console rather than at
    # its face, so no gap can open between the two at any camera angle.
    parts.append(tube("wheel_stalk",
                      [hub - axis * 0.010,
                       Vector((xa + 0.045, SPEC.console_y, hub.z - 0.028))],
                      0.021, segments=8))
    return join("helm_wheel", parts)


# ─────────────────────────────────────────────────────────────────────────────
# The gunwale capping                                              PHASE 4.4
# ─────────────────────────────────────────────────────────────────────────────
#
# §5 asks for one coherent designed form running PORT → BOW → STARBOARD, and
# permits the topology to stay modular internally so long as it reads as
# continuous. It is built as two side strips that meet on the centreline, which
# is the one construction that gets §7 for free rather than by special case:
#
#   ABAFT THE TAPER   the strips are separated by the cockpit opening
#   THROUGH IT        the opening narrows as the strips widen
#   AT CONVERGENCE    both inner edges reach y = 0, the strips touch, and the
#                     weld makes them one surface
#
# So the bow is closed by the two side forms arriving at the same place, which
# is what §39 means by "solve the shape correctly through the actual
# architecture of the boat". Nothing is dropped in between them; there is no
# panel to delete next phase.


def _lerp_table(table, x: float) -> float:
    """Linear interpolation through an ascending (station, value) table."""
    if x <= table[0][0]:
        return table[0][1]
    if x >= table[-1][0]:
        return table[-1][1]
    for i in range(1, len(table)):
        if x <= table[i][0]:
            x0, v0 = table[i - 1]
            x1, v1 = table[i]
            return v0 + (v1 - v0) * (x - x0) / (x1 - x0)
    return table[-1][1]


def _deck_edge(hull: Hull, x: float) -> float | None:
    """Half-beam of the hull's OUTER deck edge at a station.

    Fired a little below the sheer rather than at it, because a ray aimed
    exactly along the top edge of an open shell hits nothing about half the
    time. Four heights are tried before giving up so the stem — where the
    shell is nearly vertical and the sheer profile is a smoothed estimate —
    still answers.

    Against `Hull.skin` rather than `Hull.objects`: the capping's outer edge is
    the boat's outer edge, and asking the general question returns the coaming.
    """
    z = hull.sheer(x)
    for drop in (0.020, 0.045, 0.080, 0.130):
        y = hull.outer_y(x, z - drop)
        if y is not None and y > 0.02:
            return float(y)
    return None


def gunwale_plan(hull: Hull, x: float) -> tuple[float, float] | None:
    """The capping's outer and inner half-widths at a station.

    Returns `(outer, inner)`; `inner` is 0 forward of the convergence, which is
    what makes the two sides one form there.
    """
    outer = _deck_edge(hull, x)
    if outer is None:
        return None
    width = _lerp_table(SPEC.gunwale_width, x)

    if x > SPEC.gunwale_taper_x:
        # Squared rather than smoothstepped, on purpose. Smoothstep spends half
        # its travel in the first third and closes the cockpit at x 2.13, which
        # puts 0.50 m of solid deck forward of the seating — visibly a foredeck
        # again, just a smaller one. t² holds the opening to x ≈ 2.25 and then
        # shuts it quickly, which is the shape the cockpit three-quarter draws.
        span = SPEC.gunwale_converge_x - SPEC.gunwale_taper_x
        t = min(1.0, (x - SPEC.gunwale_taper_x) / span)
        width = width + (outer - width) * (t * t)
    return outer, max(outer - width, 0.0)


def nose_profile(x: float, half: float, edge_z: float, slope: float,
                 n: int = 11) -> list[Vector]:
    """One section across the bow's top deck: two lobes and a crease.

    Not a flat panel and not a dome. Each half rises to its own soft crown at
    mid-width and falls to a shallow valley on the centreline, which is what the
    delivered bow draws — two rounded parts meeting in the middle. `u` runs 0 at
    the centreline to 1 at the capping's inner edge.

    A CUBIC HERMITE, AND THE END SLOPES ARE THE POINT OF IT. A power curve
    reaches the capping's inner edge with a slope of its own, so however smooth
    each surface is on its own the two meet in a corner and the light finds it.
    This one is told what slope to arrive at — `slope`, in metres of z per metre
    of y, taken off the capping's own falling top — and it leaves the centreline
    level. Both connections are then tangent, which is what makes the deck read
    as the moulding carrying on rather than as a panel let into it.

    Tangency at the edge also lets the section be shallower for the same visual
    roundness, which is what thins the nose.

    ONE FUNCTION, TWO CALLERS, and that is the point of it being here rather
    than nested: `build_gunwale` sweeps it to make the deck and
    `build_cockpit_floor` evaluates it once to shape the wall's head, so the
    wall cannot arrive anywhere but on the deck's own underside.
    """
    sag = SPEC.nose_sag * half
    m1 = slope * half                      # the edge's slope, in t rather than y
    out = []
    for i in range(-n, n + 1):
        t = abs(i) / n
        t2, t3 = t * t, t * t * t
        z = ((2 * t3 - 3 * t2 + 1) * (edge_z - sag)
             + (-2 * t3 + 3 * t2) * edge_z
             + (t3 - t2) * m1)
        out.append(Vector((x, half * (i / n), z)))
    return out


def _gunwale_ring(outer: float, inner: float, z_top: float,
                  side: int, chamfer_in: float | None = None) -> list[Vector]:
    """One side's section, six points anticlockwise from the outer face.

    §9's cross section. Outer face, outer chamfer, the falling top surface,
    inner chamfer, inner face, underside — a moulding rather than a slab, and
    every edge on it is a real chamfer rather than a shading trick.
    """
    t = SPEC.gunwale_thickness
    co = SPEC.gunwale_chamfer_out
    z_in = z_top - SPEC.gunwale_fall
    yo, yi = outer, inner
    # Degenerate sections would appear where the width exceeds the half-beam;
    # the plan clamps `inner` at 0, so the only guard needed is on the chamfers.
    span = max(yo - yi, 0.0)
    co = min(co, span * 0.4)
    # THE INNER CHAMFER FADES OUT AS THE OPENING CLOSES, and that is what makes
    # the nose one part instead of two.
    #
    # It is the edge a hand goes over, so it exists wherever there is a cockpit
    # beside it — but forward of the convergence there is no cockpit, and a
    # 14 mm chamfer held all the way to the stem drops the top surface 14 mm
    # below itself on each side of the centreline. The two halves then meet in a
    # 28 mm groove running aft from the tip, which is exactly what "two parts
    # colliding" looks like from above. Tied to the opening's own half-width, it
    # is full at 7 mm of opening and gone at nothing, and the two tops meet
    # flush.
    ci = min(SPEC.gunwale_chamfer_in if chamfer_in is None else chamfer_in,
             span * 0.4, max(0.0, yi) * 2.0)
    return [
        Vector((0.0, side * yo, z_top - co - 0.0001)),   # outer face, top of it
        Vector((0.0, side * (yo - co), z_top)),          # onto the top surface
        Vector((0.0, side * (yi + ci), z_in)),           # across, falling
        Vector((0.0, side * yi, z_in - ci)),             # inner chamfer
        Vector((0.0, side * yi, z_in - t)),              # inner face
        Vector((0.0, side * yo, z_top - t)),             # underside, outboard
    ]


def build_gunwale(hull: Hull) -> bpy.types.Object | None:
    """The continuous capping. §5, §6, §7, §9.

    Both sides are swept over the SAME station list, so the two inner edges
    arrive at the centreline at the same x and weld into one bow form. The
    inner vertical face is emitted only where there is an opening for it to
    face into — forward of the convergence the strips are solid and a face on
    the centreline would be an interior wall inside a closed volume.
    """
    x_stern = -2.626
    x_bow = 2.627
    n = SPEC.gunwale_stations

    stations: list[tuple[float, float, float, float]] = []
    for i in range(n + 1):
        x = x_stern + (x_bow - x_stern) * (i / n)
        plan = gunwale_plan(hull, x)
        if plan is None:
            continue
        outer, inner = plan
        stations.append((x, outer, inner, hull.sheer(x)))

    # TRIMMED AT THE STEM. `_deck_edge` fires a ray at the sheer and the last
    # station or two are past the point where the shell still has one to find,
    # so the smoothing below drags a stale half-width forward and the capping
    # ends in a thin spike sticking out beyond the hull. Anything under 30 mm
    # of half-beam is not a deck edge.
    while len(stations) > 4 and stations[-1][1] < 0.030:
        stations.pop()

    if len(stations) < 4:
        return None

    # SMOOTHED, for the same reason `_rail_path` is: the outer edge is a
    # raycast against a hull triangulated in facets up to 0.4 m across, so the
    # raw readings carry a step every few stations. A 0.16 m wide surface swept
    # along a stepped edge draws every step as a crease under the studio light.
    for _ in range(4):
        prev = list(stations)
        for i in range(1, len(stations) - 1):
            lo, hi = max(0, i - 2), min(len(prev), i + 3)
            window = prev[lo:hi]
            x, outer, inner, z = stations[i]
            stations[i] = (
                x,
                sum(p[1] for p in window) / len(window),
                sum(p[2] for p in window) / len(window),
                sum(p[3] for p in window) / len(window),
            )

    verts: list[Vector] = []
    faces: list[list[int]] = []
    eps = 1e-4

    # WHERE THE CAPPING STOPS BEING TWO SIDES. Aft of the nose there is a
    # cockpit between them and they are two forms; forward of it there is one
    # deck and it is one form, swept below as a single closed section. The two
    # meet on the junction ring, which both build, so their vertices are shared
    # and there is one joint on the whole boat rather than a seam per part.
    cut = next((i for i, st in enumerate(stations) if st[0] >= SPEC.nose_x),
               len(stations))
    aft = stations[:min(cut + 1, len(stations))]

    for side in (1, -1):
        base = len(verts)
        rings = []
        for x, outer, inner, z in aft:
            # NO INNER CHAMFER UNDER THE NOSE DECK. The deck below continues
            # this surface across, so the 14 mm chamfer would be a step down
            # into it — and the deck's own edge is authored at `inner` exactly,
            # so the two share vertices only if the chamfer is not there.
            ring = _gunwale_ring(outer, inner, z, side,
                                 chamfer_in=0.0 if x >= SPEC.nose_x else None)
            for p in ring:
                p.x = x
            rings.append(ring)
        for ring in rings:
            verts.extend(ring)

        for r in range(len(rings) - 1):
            a = base + r * 6
            b = base + (r + 1) * 6
            # AND NOT UNDER THE NOSE DECK. The inner face is the 46 mm drop
            # from the capping's top to whatever is beside it, and beside it
            # forward of `nose_x` is the bow's own deck at the same height — so
            # emitting it there put a ledge round the nose and made the deck
            # read as a panel recessed into the capping rather than part of it.
            open_here = ((aft[r][2] > eps) or (aft[r + 1][2] > eps)) \
                and aft[r][0] < SPEC.nose_x
            for k in range(6):
                # k == 3 is the inner vertical face: it exists only where the
                # cockpit is open beside it.
                if k == 3 and not open_here:
                    continue
                j = (k + 1) % 6
                quad = [a + k, a + j, b + j, b + k]
                if side > 0:
                    faces.append(quad)
                else:
                    faces.append(quad[::-1])

        # BOTH ENDS ARE CAPPED, AND DROPPING THE STEM CAP IS NOT THE FIX FOR
        # THE NOSE. It was tried: forward of the convergence the two sides'
        # rings share their centreline points, so `weld` does fuse them and the
        # back-to-back section faces do go — but it also leaves the shell open,
        # and `recalc_face_normals` on an open shell flipped the whole capping
        # inward. The symptom was two hundred metres away: `build_bow_fitting`
        # fires a ray at the capping and accepts a hit only if the surface
        # faces up, so the bow cleats stopped being placed and the model
        # validator lost a node. The nose is fixed by the trim above instead.
        first = [base + k for k in range(6)]
        faces.append(first if side > 0 else first[::-1])
        # No cap at the forward end of a side strip: the nose form below picks
        # the section up there and carries it across.
        if cut >= len(stations):
            last = [base + (len(rings) - 1) * 6 + k for k in range(6)]
            faces.append(last[::-1] if side > 0 else last)

    # ── THE NOSE: ONE POLISHED FORM, NOT PARTS MERGED ───────────────────
    #
    # A single closed section swept from the junction to the stem — port outer
    # face, over the top, across the deck, down the starboard side, and back
    # along the underside. One loft, one surface, nothing inside it to seam.
    #
    # THE EARLIER VERSIONS WERE ASSEMBLIES AND LOOKED LIKE ONE. First a deck
    # object joined to the capping afterwards, which cannot share vertices
    # because it has its own station list; then the same deck swept on the
    # capping's stations, which shares them but is still a separate strip
    # butted onto two side strips, so the bow read as three surfaces meeting
    # along two lines. This is one ring. The only joint on the bow is the
    # junction ring itself, and both halves build it from the same numbers.
    nose = stations[cut:]
    if len(nose) >= 2:
        x_a = nose[0][0]
        span = max(1e-6, nose[-1][0] - x_a)
        base = len(verts)
        width = 0
        for x, outer, inner, z in nose:
            co = min(SPEC.gunwale_chamfer_out, max(outer - inner, 0.0) * 0.4)
            z_in = z - SPEC.gunwale_fall
            # THE SLOPE THE DECK HAS TO ARRIVE AT: the capping's own top,
            # falling `gunwale_fall` from its outer chamfer to its inner edge.
            # Handing it to the section is what rounds the connection instead of
            # leaving a corner there.
            run = max(0.040, outer - co - inner)
            deck = nose_profile(x, inner, z_in, SPEC.gunwale_fall / run)
            # AND THE SECTION THINS TOWARD THE STEM. Tapered from the capping's
            # 46 mm at the junction to `nose_thickness`, so the underside runs
            # on from the side strips' without a ledge and the nose itself is
            # the lighter form the reference draws.
            thick = SPEC.gunwale_thickness + (
                SPEC.nose_thickness - SPEC.gunwale_thickness
            ) * _smoothstep((x - x_a) / span)
            ring = ([Vector((x, -outer, z - co - 0.0001)),
                     Vector((x, -(outer - co), z))]
                    + deck
                    + [Vector((x, outer - co, z)),
                       Vector((x, outer, z - co - 0.0001)),
                       Vector((x, outer, z - thick)),
                       Vector((x, -outer, z - thick))])
            width = len(ring)
            verts.extend(ring)
        for r in range(len(nose) - 1):
            a = base + r * width
            b = base + (r + 1) * width
            for k in range(width):
                j = (k + 1) % width
                faces.append([a + k, a + j, b + j, b + k])
        # The junction section, closing the forward form against the two side
        # strips, and the stem section, closing its point.
        faces.append([base + k for k in range(width)][::-1])
        faces.append([base + (len(nose) - 1) * width + k for k in range(width)])

    ob = weld(mesh_from("gunwale_capping", verts, faces), dist=2e-4)
    return ob


# ─────────────────────────────────────────────────────────────────────────────
# The aft boarding platform                                        PHASE 4.4
# ─────────────────────────────────────────────────────────────────────────────


def _platform_half(hull: Hull, t: float) -> float:
    """Half-width at a fraction of the way aft from the transom."""
    a, b = SPEC.platform_half
    return a + (b - a) * t


def build_platform(hull: Hull) -> dict[str, bpy.types.Object | None]:
    """The optional aft boarding platform: frame, then tread. §20–§24, §29.

    THE SILHOUETTE §22 ASKS FOR, in three parts:

        TRANSOM  →  SUPPORT / FRAME EXTENSION  →  WOOD / TEAK STEP

    The frame is a real box section carried aft off the transom on two
    longitudinal bearers, not a slab with a dark colour on it. The tread is
    laid in planks with caulking seams between them, so the wood reads as
    decking at the orbit distance the configurator actually uses.

    THE MOTOR WELL IS PART OF THE STRUCTURE, NOT A HOLE CUT IN IT. §29 requires
    the platform be designed around the propulsion installation for every
    drive; a well between two bearers is how a boat does that, and it means the
    clearance is a dimension in `SPEC` that the configurator tests can assert
    rather than something that happens to work for the drive that was fitted
    when the geometry was authored.
    """
    # THE FORWARD FACE IS BURIED IN THE HULL, NOT BUTTED TO IT.
    #
    # `scripts/pxl/_aft.mjs` walks the shell's aft-most station by height: at
    # the platform's own z 0.073 → 0.179 the hull ends at x −2.609, which is
    # 18 mm FORWARD of the transom plane the mount is authored on. A platform
    # starting at −2.6266 therefore stood 18 mm off the boat, and at the stern
    # quarter that drew as a dark seam between the two — the platform read as
    # something parked behind the hull rather than carried by it.
    #
    # 50 mm of overlap puts every forward face inside the shell, which is
    # invisible from outside (the hull is a zero-thickness surface drawn
    # double-sided) and cannot open a gap at any camera angle.
    x0 = -2.6266 + 0.050
    x1 = -2.6266 - SPEC.platform_aft
    z_top = SPEC.platform_top_z
    z_teak = z_top - SPEC.platform_teak
    z_bot = z_teak - SPEC.platform_frame

    def slab(name, xa, xb, ya, yb, za, zb):
        verts = [
            (xa, ya, za), (xb, ya, za), (xb, yb, za), (xa, yb, za),
            (xa, ya, zb), (xb, ya, zb), (xb, yb, zb), (xa, yb, zb),
        ]
        faces = [
            [0, 3, 2, 1], [4, 5, 6, 7],
            [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
        ]
        return mesh_from(name, verts, faces)

    frame_parts: list[bpy.types.Object] = []
    teak_parts: list[bpy.types.Object] = []

    #: The tread and the bearer are both trapezoids in plan, so they are built
    #: from the same four corners — inboard and outboard, forward and aft.
    def wing(t: float) -> tuple[float, float]:
        """Inner and outer half-widths a fraction `t` of the way aft."""
        inner = SPEC.platform_well_forward + (
            SPEC.platform_well_aft - SPEC.platform_well_forward) * t
        return inner, _platform_half(hull, t)

    def trapezoid(name, za, zb, side, inset_fwd=0.0):
        in_f, out_f = wing(0.0)
        in_a, out_a = wing(1.0)
        in_f += inset_fwd
        in_a += inset_fwd
        p = [
            (x0, side * in_f), (x1, side * in_a),
            (x1, side * out_a), (x0, side * out_f),
        ]
        verts = [(x, y, za) for x, y in p] + [(x, y, zb) for x, y in p]
        faces = [
            [0, 3, 2, 1], [4, 5, 6, 7],
            [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
        ]
        if side < 0:                       # keep the winding outward-facing
            faces = [f[::-1] for f in faces]
        return mesh_from(name, verts, faces)

    for side in (1, -1):
        # ── Frame. The bearer under the tread, following the same trapezoid so
        #    the structure is visible under the wood rather than implied by it.
        frame_parts.append(trapezoid("platform_bearer", z_bot, z_teak, side))

        # ── The knee. The reference shows the support meeting the transom as a
        #    bracket rather than as a butt joint, and without it the platform
        #    reads as a shelf glued to the back of the boat.
        in_f, _ = wing(0.0)
        knee_y = side * (in_f + 0.075)
        frame_parts.append(slab(
            "platform_knee", x0, -2.6266 - 0.210,
            min(knee_y, side * in_f), max(knee_y, side * in_f),
            z_teak, z_teak + 0.145))

        # ── Teak. Planks with seams, running fore-and-aft. Cut to the same
        #    trapezoid: the inboard plank is a wedge, which is what a real
        #    notched tread looks like and what a rectangle cannot be.
        in_f, out_f = wing(0.0)
        in_a, out_a = wing(1.0)
        lo, hi = min(in_f, in_a), max(out_f, out_a)
        pitch = SPEC.platform_plank
        count = max(2, int(round((hi - lo) / pitch)))
        pitch = (hi - lo) / count
        for k in range(count):
            ya = lo + pitch * k + SPEC.platform_seam / 2
            yb = lo + pitch * (k + 1) - SPEC.platform_seam / 2
            # Clip each plank to the trapezoid, station by station, so the
            # notch's edge is a real diagonal rather than a staircase.
            fwd_a, fwd_b = max(ya, in_f), min(yb, out_f)
            aft_a, aft_b = max(ya, in_a), min(yb, out_a)
            # A plank that falls entirely inside the notch at one end is
            # COLLAPSED onto that end's edge rather than mirrored across it.
            # Sorting the pair instead — which is what the first version did —
            # turns an empty span into a span running back INTO the well, and
            # the notch's aft edge measured 0.365 m against a declared 0.470.
            # `npm run model` caught it; the fix is that a plank which has run
            # out of trapezoid becomes a triangle, which is also the diagonal
            # the notch is supposed to have.
            if fwd_b < fwd_a:
                fwd_a = fwd_b = in_f
            if aft_b < aft_a:
                aft_a = aft_b = in_a
            if (fwd_b - fwd_a) + (aft_b - aft_a) < 1e-4:
                continue
            p = [
                (x0, side * fwd_a), (x1, side * aft_a),
                (x1, side * aft_b), (x0, side * fwd_b),
            ]
            verts = [(x, y, z_teak) for x, y in p] + [(x, y, z_top) for x, y in p]
            faces = [
                [0, 3, 2, 1], [4, 5, 6, 7],
                [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
            ]
            if side < 0:
                faces = [f[::-1] for f in faces]
            teak_parts.append(mesh_from("platform_plank", verts, faces))

    # ── The cross-member. What makes the two bearers one platform.
    #
    #    §22's silhouette is TRANSOM → SUPPORT → STEP, and until this existed
    #    the support was two brackets with the engine between them: from the
    #    stern quarter the tread read as a pair of separate pads rather than as
    #    one structure. It runs the full beam under the transom, in the 110 mm
    #    every drive leaves clear (see `platform_beam_length`), and the tread
    #    runs over it — so the notch begins abaft the boarding edge rather than
    #    at it.
    beam_half = _platform_half(hull, 0.0)
    frame_parts.append(slab(
        "platform_beam", x0, -2.6266 - SPEC.platform_beam_length,
        -beam_half, beam_half, z_bot, z_teak))
    in_f, _ = wing(0.0)
    pitch = SPEC.platform_plank
    count = max(2, int(round((2 * in_f) / pitch)))
    pitch = (2 * in_f) / count
    for k in range(count):
        ya = -in_f + pitch * k + SPEC.platform_seam / 2
        yb = -in_f + pitch * (k + 1) - SPEC.platform_seam / 2
        teak_parts.append(slab(
            "platform_plank", x0, -2.6266 - SPEC.platform_beam_length,
            ya, yb, z_teak, z_top))

    frame = join("platform_frame", frame_parts)
    teak = join("platform_deck", teak_parts)
    if frame:
        bevel_object(frame, 0.006, segments=1)
    if teak:
        bevel_object(teak, 0.003, segments=1)
    return {"frame": frame, "teak": teak}


# ─────────────────────────────────────────────────────────────────────────────
# The rails
# ─────────────────────────────────────────────────────────────────────────────


def _gunwale_top(gunwale, x: float, y: float) -> float | None:
    """Height of the capping's top surface under a point. PHASE 4.4 §12.

    §12 requires the rails be re-measured against the new upper structure
    rather than inheriting Phase 4.3's transforms, and a raycast against the
    object itself is the only way to be sure: the capping's top falls inboard
    by `gunwale_fall`, so "the sheer" and "the surface the rail stands on" are
    11 mm apart at the inner edge and 0 mm apart at the outer one.
    """
    if gunwale is None:
        return None
    dg = bpy.context.evaluated_depsgraph_get()
    hit, loc, nor, *_ = gunwale.ray_cast(
        Vector((x, y, 2.0)), Vector((0.0, 0.0, -1.0)), depsgraph=dg)
    if hit and nor.z > 0.4:
        return float(loc.z)
    return None


def _rail_path(hull: Hull, x0: float, x1: float, side: int,
               steps: int = 30, gunwale=None) -> list[Vector]:
    """A rail's centreline: along the capping, inboard of its outer edge, with
    a down-bend onto the capping at each end.

    §16 of the 4.3 brief — height, start and end, bends, relation to the bow
    and the gunwale, thickness. The path is taken FROM THE HULL at every
    station, so it follows the real sheer rather than a straight line between
    two remembered points, which is what the delivered forty-triangle `rails`
    zone was.

    PHASE 4.4 §12 — IT NOW STANDS ON THE CAPPING RATHER THAN OVER THE SHEER.
    The datum was `hull.sheer(x) + rail_above_sheer`, which was correct while
    the gunwale had no top surface and is wrong now that it has one: the same
    number would bury the stanchion feet 46 mm inside the new moulding. The
    height is raycast against the capping itself and the fallback is the sheer
    less the capping's own thickness, so a rail can never float and can never
    intersect.
    """
    pts: list[Vector] = []
    drop = 0.055
    for i in range(steps + 1):
        t = i / steps
        x = x0 + (x1 - x0) * t
        plan = gunwale_plan(hull, x)
        if plan is None:
            y_edge = hull.inner_y(x, hull.sheer(x) - 0.12) or 0.55
            outer = abs(y_edge)
        else:
            outer = plan[0]
        y = side * max(outer - SPEC.rail_inboard, 0.05)
        deck = _gunwale_top(gunwale, x, y)
        if deck is None:
            deck = hull.sheer(x) - SPEC.gunwale_fall * 0.5
        z = deck + SPEC.rail_above_sheer
        # The ends turn down onto the deck over the last 6% of the run.
        if t < 0.06:
            z -= drop * (1 - t / 0.06) ** 2
        elif t > 0.94:
            z -= drop * ((t - 0.94) / 0.06) ** 2
        pts.append(Vector((x, y, z)))
    # SMOOTHED, because the sheer it follows is a measurement. Three passes of a
    # five-point mean over y and z: the hull's own triangulation puts a 15 mm
    # step into the profile every metre or so, and a 27 mm tube swept along it
    # draws every one of those steps as a visible kink. The x stays exactly
    # where it was, so the run still starts and ends at the measured stations.
    for _ in range(3):
        prev = [p.copy() for p in pts]
        for i in range(1, len(pts) - 1):
            lo, hi = max(0, i - 2), min(len(prev), i + 3)
            window = prev[lo:hi]
            pts[i].y = sum(p.y for p in window) / len(window)
            pts[i].z = sum(p.z for p in window) / len(window)
    return pts


def build_rails(hull: Hull, gunwale=None) -> bpy.types.Object | None:
    """Both pairs — the cockpit rails and the bow rails — as real tube.

    THE OLD ONE IS THE "TILLER". §6 of the 4.3 brief reports a tiller-like
    handle projecting from the outboard and asks for its removal. There is no
    tiller in the propulsion proxies and never was; what the side view shows is
    THIS zone — forty triangles of unswept polyline sitting above the transom,
    which in profile draws as a straight orange stick beside the engine.
    Rebuilding the rails is what removes it, and Phase 4.4 §19 asks that the
    correction be preserved: it is, by construction, because there is nothing
    in this function that could draw one.

    PHASE 4.4 §12, §13. Two things move. The whole path now stands on the
    capping (see `_rail_path`), and the BOW pair's forward end is re-terminated
    against it: the cockpit three-quarter shows both bow rails running level
    and then breaking sharply down and inboard onto the capping in a single
    kinked foot, which is what `bow_kick` draws. §13 — they complement the
    thickened bow form rather than replacing it, so the run stops 0.072 m short
    of the convergence and the bow structure carries on past it.
    """
    parts: list[bpy.types.Object] = []
    # THE BOW PAIR RUNS THE FULL MEASURED LENGTH, and the first version did not.
    #
    # It was clamped to `gunwale_converge_x − 0.072`, on the reasoning that
    # forward of the convergence the two cappings have become one form and a
    # rail there would be running down the middle of the bow. That reasoning was
    # wrong twice. The rails are inboard of the OUTER edge, not of the inner
    # one, so they follow the sheer whether or not there is a cockpit beside
    # them; and the capping at x 2.555 is still 0.25 m of half-beam, which is
    # plenty to stand a 27 mm tube on.
    #
    # `npm run landmarks` is what said so: the clamp put the forward end at
    # x 2.271 against the plate's 2.555 and the row went from MATCHED to PARTIAL
    # at −5.4% of LOA. §13 asks that the rails COMPLEMENT the thickened bow form
    # rather than replace it — running them onto it is complementing it;
    # stopping them short of it is neither.
    runs = ((SPEC.rail_cockpit_x, False), (SPEC.rail_bow_x, True))
    for (x0, x1), is_bow in runs:
        for side in (1, -1):
            path = _rail_path(hull, x0, x1, side, gunwale=gunwale)
            if is_bow:
                # §13's termination: the last two stations are pulled inboard
                # as well as down, which is the kink the reference draws. Done
                # on the finished path so the smoothing above cannot round it
                # back out — the sharpness is the recognisable part.
                for k, pull in ((1, 0.020), (0, 0.052)):
                    p = path[len(path) - 1 - k]
                    p.y -= side * pull
            parts.append(tube("rail", path, SPEC.rail_diameter / 2, segments=10))
            # Stanchions. Short square posts down to the capping, which is what
            # gives the rail its gap and stops it reading as a painted line.
            span = abs(x1 - x0)
            count = max(2, int(round(span / SPEC.rail_stanchion_pitch)))
            for k in range(count + 1):
                t = 0.06 + 0.88 * (k / count)
                p = path[min(len(path) - 1, int(round(t * (len(path) - 1))))]
                # The foot sinks 30 mm INTO the capping rather than stopping on
                # it, so no gap can open between post and moulding at any
                # camera angle — the same seat the wheel's stalk takes.
                deck = _gunwale_top(gunwale, p.x, p.y)
                if deck is None:
                    deck = hull.sheer(p.x) - SPEC.gunwale_fall * 0.5
                foot = Vector((p.x, p.y, deck - 0.030))
                parts.append(tube("stanchion", [foot, p], SPEC.rail_stanchion / 2, 6))
    return join("rails", parts)


# ─────────────────────────────────────────────────────────────────────────────
# Seating
# ─────────────────────────────────────────────────────────────────────────────


def build_seating(hull: Hull) -> dict[str, bpy.types.Object]:
    """Every upholstered surface.

    §1–§18 of the 4.7 upholstery correction. Four parts, each measured
    somewhere different:

      SIDE CUSHIONS   two of them, port and starboard, symmetrical: one long
                      continuous form down each inner side, following the hull
                      forward, broadening a little, and meeting on the
                      centreline at the bow with a 16 mm seam between them.
                      A rewrite of 4.6's single three-piece crossing run rather
                      than a change to it — see `build_forward_cushions`
      BENCH           on the full-width platform the interior probe finds at
                      x −2.13 → −1.72, which is also 0.13 of LOA from the
                      transom — the station the cockpit three-quarter shows
      BACKREST        the plate's own orange block, +0.185 above the local sheer
      AFT PAD         the 0.73 m shelf between the bench and the transom

    NOTHING HERE IS A BOX. Every part is the same lofted section — real
    thickness, filleted top corners, a 7 mm crown — swept along a plan the hull
    was asked for. §10 rules out a generic rectangle and §11 rules out a razor
    edge, and a section sweep cannot produce either.
    """
    pads: list[bpy.types.Object] = []

    def base_at(x: float, y: float, fallback: float) -> float:
        z = hull.surface_z(x, abs(y))
        return z if z is not None else fallback

    # ── The forward padded architecture ──────────────────────────────────
    # PHASE 4.7 §1–§18. Two symmetrical side cushions, one mesh each, replacing
    # Phase 4.6's single starboard-to-port run cut into three pieces.
    #
    # Aft of x −0.780 the boat gets what the references show it having: the
    # hull's own colour on the side decks with `coaming_inlay` on them and
    # nothing else. The upholstery starts forward of the console, on both
    # sides, and finishes 0.23 m short of where the capping converges.
    pads.extend(build_forward_cushions(hull))

    # ── The driver's bench ───────────────────────────────────────────────
    # ON THE FLAT, AND ONLY ON THE FLAT. The bench's forward end was first
    # authored at x −1.72 and the raycast under it found the sole, not the
    # platform — so the cushion ramped 0.20 m down into the cockpit floor over
    # its last two stations. The base height is now taken once, at the aft
    # station, and held: a bench is flat.
    bx0, bx1 = SPEC.bench_x
    bench_z = base_at(bx0 + 0.06, 0.28, SPEC.platform_z)
    bench_stations = []
    for i in range(11):
        x = bx0 + (bx1 - bx0) * i / 10
        y_edge = hull.inner_y(x, bench_z + 0.05)
        half = min(SPEC.bench_half,
                   (abs(y_edge) - 0.055) if y_edge else SPEC.bench_half)
        bench_stations.append((x, -half, half, bench_z))
    bench = cushion("bench", bench_stations, SPEC.cushion_thickness,
                    SPEC.cushion_radius, SPEC.cushion_crown)
    if bench:
        pads.append(bevel_object(bench, 0.010, 2, 55.0))

    # ── The backrest ─────────────────────────────────────────────────────
    # A cushion lying on its side: the same section, the same edge radius and
    # the same crown, rotated so its thickness runs fore-and-aft. A backrest IS
    # a cushion, and building it as a different kind of object is exactly how it
    # ends up looking like a bulkhead standing on a seat.
    #
    # ITS FOOT IS THE SEAT, NOT THE MOULDING BEHIND IT. Abaft the bench the
    # delivered liner steps UP to an aft deck at z 0.74 — above the seat — so a
    # foot taken by raycast started the backrest 0.10 m above the cushion and
    # left it 0.19 m tall. It is fitted against that step, which is what a
    # backrest in this position is.
    back_x = bx0 - SPEC.backrest_thickness / 2
    foot = bench_z + SPEC.cushion_thickness - 0.020
    back_top = hull.sheer(back_x) + SPEC.backrest_above_sheer
    rings = []
    for i in range(9):
        t = i / 8
        z = foot + (back_top - foot) * t
        y_edge = hull.inner_y(back_x, max(z, foot + 0.02))
        half = min(SPEC.bench_half * 0.94,
                   (abs(y_edge) - 0.060) if y_edge else SPEC.bench_half * 0.94)
        # A slight recline. Every seat has one, and without it the backrest
        # reads as a wall rather than as something anybody leans on.
        x = back_x - 0.050 * t
        sec = cushion_section(-half, half, x, SPEC.backrest_thickness,
                              SPEC.cushion_radius, SPEC.cushion_crown * 0.6)
        rings.append([Vector((p.z, p.y, z)) for p in sec])
    if len(rings) >= 2:
        verts, faces = loft(rings, close_ring=True)
        pads.append(bevel_object(weld(mesh_from("backrest", verts, faces)),
                                 0.010, 2, 55.0))
    print(f"    bench z {bench_z:.3f} x {bx0:.2f}..{bx1:.2f} · "
          f"backrest {foot:.3f} → {back_top:.3f}", flush=True)

    # ── NO AFT DECK PAD, AND THAT IS A DECISION ──────────────────────────
    # The stern three-quarter carries an orange band right at the transom, and
    # a first pass built a pad for it. Two things argued against keeping it.
    # The band in the drawing sits at the level of the black moulding, OUTSIDE
    # the cockpit — it reads as a boarding pad on the motor well rather than as
    # seating. And the delivered liner has no flat shelf to put one on: rays
    # dropped between x −2.55 and −2.29 come back at 0.57, the bench's own
    # level, so the pad landed under the aft deck instead of on it.
    #
    # §13 says not to invent a luxury interior the references do not show. One
    # ambiguous band is not enough to build from, so it is left out and listed
    # in the report's remaining mismatches instead of guessed at.

    return {"upholstery": join("upholstery_primary", pads)}
