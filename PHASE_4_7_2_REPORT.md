# PXL — PHASE 4.7.2

**The side bench deleted, and the seat levelled.**

Two corrections. The first is a geometry deletion and not a material change; the
second is a height. Neither is a refinement of Phase 4.7.1's cushions.

| | |
|---|---|
| Model | `assets/derived/pxl/PXL.production.glb` → `public/models/PXL.glb` |
| Faces | 59,006 authored · 0.53 MB transfer |
| Deleted | **33 faces / 2.177 m²** of raised side platform, x −1.70 → 0.00 |
| Replaced by | 122 faces of cockpit floor, **1.97 m across** at z 0.366 |
| Cushion top | z **0.6520** at the aft end and z **0.6520** at the bow — a rise of **−0.0 mm** |
| Was | 0.645 → 0.893, a 248 mm ramp |
| Footprint | `npm run upholstery:trace` — IoU **59.1%**, 83.3% of the model lands on the plate's cognac |
| Checks | `npm run qa` green · 7 of 7 visual cases · paint line and silhouette unchanged |
| QA | `.qa/PHASE_4_7_2_comparison.png` · `p472-clay-*.png` · `p472-debug-*.png` |

---

## A. §1 — what the long raised structure actually was

It is the **delivered STL's own side platform**, and it has been in this model
since Phase Two. `_stack` on the 4.7.1 export drops a ray at each point and
lists everything under it:

```
  (0, 0.60)   cockpit_sole @ 0.570 ^      hull_lower @ 0.003 v
  (0, 0.70)   cockpit_sole @ 0.570 ^      hull_lower @ 0.059 v
  (0, 0.30)   cockpit_sole @ 0.366 ^      hull_lower @ −0.104 v
```

A shelf 0.19 m above the sole, about 0.32 m wide, running both sides from the
bench to the bow, **with nothing under it** — the next surface below is the
inside of the hull's bottom.

**Phase 4.7 is what made it look like furniture, and that is worth stating
plainly.** Its interior material correction moved every up-facing interior
surface below z 0.62 into `cockpit_sole`, which was right for the floor and
wrong for this: a band that had read as part of the moulded shell for four
phases turned graphite and became a long black bench. The 4.7 report claimed
that change as a win. It was half a win.

§29 rules out the obvious repair by name — "Do not paint it black. Do not rename
it. Do not turn it into liner. Delete it." The faces now go into `SIDE_VOID`, a
bin `split_by_zone` never builds an object for, exactly as the bow panel has
since Phase 4.4. They leave the model.

**What is kept, and why.** Forward of x 0.000, because that is where the traced
cushions start and it is what carries them — §11 permits a support "local to
the cushion footprint" and forbids extending one aft into the cockpit. Abaft
x −1.700, because that is the full-beam platform the driver's bench stands on
and §5 keeps the rear seat. What goes is the 1.70 m between them, which is the
cockpit.

---

## B. §3 — the floor continues

Deleting a shelf with nothing under it leaves a hole, so `build_cockpit_floor`
continues the sole through the space it occupied: 61 stations, the delivered
sole's own edge out to the hull's own side, at the sole's own height.

```
  cockpit floor: 61 stations x −1.70..0.00   y 0.48→0.98 .. 0.48→0.97
                 z 0.366   opening 1.97 m across
```

The cockpit's clear floor goes from 1.02 m wide to **1.97 m**, which is §9's
"the dark floor should expand laterally into the space currently occupied by the
old bench" as a number.

**Three details that are not details.**

* **`outer_y`, not `inner_y`.** The first version measured the outboard edge
  with `inner_y`, which fires from the centreline and takes the FIRST surface —
  and between x −0.98 and −0.22 the first surface at floor height is the
  CONSOLE. Every station under the helm measured the console's side at y 0.35,
  failed the width guard and was thrown away; the panel came out 1.25 m long
  instead of 1.70 and stopped dead at the console's aft face. `outer_y` fires
  inboard from outside the beam against the shell alone and cannot see anything
  standing in the cockpit.
* **Tucked 2 mm under the delivered sole, overlapping it by 30 mm.** Two
  coplanar panels meeting on a measured edge z-fight along their whole length.
* **An end wall at each station.** Deleting a shelf leaves its cut edge standing
  at both ends — the same class of defect Phase 4.6 spent a section on when it
  deleted the bow panel and kept its rim. The forward one is also a real part:
  it is the aft face of the forward seating module, and it is what §7's
  transverse acceptance station is drawn against.

**No new side liner.** Under the platform the hull's own moulded inside is
already there and already two-sided — `_stack` finds it at z 0.25 where the
platform was at 0.57 — so a second skin over it would be a wall inside a wall.
§10 asks for HULL → GUNWALE → INNER LINER → FLOOR, and after the deletion that
is what the geometry is.

---

## C. The height brief — the seat does not get higher

Phase 4.7.1 took each cushion station's base by raycast, so the cushions sat on
whatever was under them. Forward of x 1.33 that is the forward liner, whose flat
climbed from 0.570 to 0.83 over its run — and the cushions climbed with it.
Measured on the 4.7.1 export: top at 0.645 amidships, **0.893 at the stem**. A
248 mm ramp.

Two changes, in the order they matter:

1. **`cushion_base_z = 0.570`, authored.** One elevation at every station.
   `_pad_seat` still runs, because its other job is keeping the outboard edge
   off anything that has risen under it, but its height is discarded.
2. **The liner's flat holds level under the padding** and lifts only over the
   last quarter of its run, where there is none. §6 of the height brief: "If
   local support geometry below the cushion needs to adapt to the hull, modify
   the SUPPORT / liner underneath. Keep the actual upper upholstered surface
   level."

```
  cushion top, measured          z 0.6520
  cushion base, measured         z 0.5700
  top at the aft end / the bow   0.6520 / 0.6520  — a rise of −0.0 mm
```

`.qa/p472-debug-side.png` is §9's picture: the upholstery alone, drawn straight
abeam in parallel projection against a dashed guide at its own measured maximum
height. The top lies on the guide for its whole length.

**A z-fighting artefact came out of the levelling and took two attempts.** With
the flat level, the new liner became coplanar with the delivered moulding across
their 80 mm overlap and drew as a sawtooth right across the bow. Tucking it 3 mm
UNDER swapped one artefact for another — the delivered moulding's cut edge is
the STL's own ragged triangulation, so it then stood proud and drew as the same
sawtooth in solid grey. It lies 3 mm OVER it now, which covers a ragged edge
with a smooth one.

---

## D. §12–§16 — the cushions, retraced and smoothed

§13 says not to assume the 4.7.1 shape is approved, and it was not: its plan
came off a table read at 0.1 m intervals and interpolated LINEARLY, which puts a
corner at every one of its own rows. A lofted cushion draws each of them as a
crease, and the shoulder at x 1.1 was the worst of them.

* **`_spline_table`** — Catmull-Rom through the traced points. It passes through
  every measured value, so nothing is smoothed away, and arrives at each with
  its neighbours' slope, so nothing is cornered. The ends are clamped by
  duplicating the terminal rows, which keeps the aft end square: §15 asks for a
  clean aft end and that is the one corner the reference does have.
* **The tables were re-read** onto a gentler set of control points, monotone
  with a gradually increasing slope through the turn rather than a step in it.
* **One master curve, mirrored.** §16 — `_mirrored` supplies the other side, so
  the two cannot be eyeballed differently.

```
  forward cushions: 2 x 121 stations   x 0.00..2.05
                    inboard 0.505→0.008   outboard 0.793→0.055
                    width 0.047..0.422    meet x 1.537
```

The footprint measures better for it, on the same reference and through the same
solved camera:

| | Phase 4.7 | 4.7.1 | **4.7.2** |
|---|---|---|---|
| projected cognac / plate | 1.368 | 0.900 | **0.805** |
| overlap, IoU | 37.8% | 57.6% | **59.1%** |
| of the model, landing on the plate | 47.5% | 77.2% | **83.3%** |
| forward upholstery, per side | 2.549 m² | 1.918 m² | **1.631 m²** |

---

## E. §21, §23 — the two QA views

**Clay** — `p472-clay-{top,cockpit3q,bow,side}.png`. All geometry one light
grey, the cockpit sole one darker, and nothing else. §20: "Do not create the
illusion of open floor merely by painting wrong geometry black. Geometry
silhouette must be correct first." A picture with five colours can hide a shape;
a picture with two cannot.

**Silhouette** — `p472-debug-*.png`. Floor black, hard liner white, rear seating
yellow, port cushion red, starboard cushion blue, and no other colour. The two
cushion colours are still assigned by CONNECTED COMPONENT rather than by side,
so the picture states a fact rather than restating its own rule; a third piece
would draw magenta and fail the build.

```
  piece  side     tris    area          x range          y range          z range
      1  PORT     4752   1.631 m²   0.000.. 2.050   -0.793..-0.008   0.570.. 0.652
      2  STBD     4752   1.631 m²   0.000.. 2.050    0.008.. 0.793    0.570.. 0.652

  MIRROR  area Δ 0 m² · x ends Δ 0.0 mm · z ends Δ 0.0 mm · outboard Δ 0.0 mm
  SEAM    16.0 mm
```

The z range is the levelling, stated as a bound: 0.570 to 0.652 at every station
of both cushions, which is 75 mm of thickness and 7 mm of crown and nothing else.

---

## F. §28 — what was not touched

The lower-hull paint line measures 0.057 mean deviation, unchanged to three
decimal places. `npm run reference` returns the same sheer, keel and band
deviations. The motor's lower unit, the metal Duna and PXL badges, the plexi
mark, the boarding platform, the gunwale capping, the propulsion variants and
the exterior configuration are all untouched; the four visual regression cases
that cover them pass, along with the three that do not.

---

## G. Remaining mismatches

1. **The sole/liner boundary at the bow is ragged.** `split_by_face` assigns the
   forward liner's faces to the floor or the coaming by testing each face
   centroid against the flat's half-width, and on a bevelled, solidified mesh
   that boundary zig-zags by a triangle. It is visible in the silhouette view,
   where the two are black and white; at product materials it is the join
   between graphite and the hull colour and is far less conspicuous. Cutting the
   mesh at the boundary — as `recut_paint_line` does for the hull — would fix it
   properly.
2. **67.1% of the reference's cognac is covered, against 83.3% of the model's
   landing on it.** The model is now the smaller of the two footprints. The
   uncovered part is a band along the far cushion's outboard edge where the
   plate runs the padding closer to the coaming than 40 mm of inset allows.
3. **The near-side cushion is visible in the model and not in the plate.**
   Unchanged from 4.7.1, and unchanged for the same reason: §16 requires the
   mirror, so it stays and is named rather than resolved by building one side
   short.
4. **The floor is 1.97 m across, which is wide for a 5.25 m boat.** It is what
   the delivered hull gives when the sole is continued to the shell — the STL is
   nearly wall-sided at that height, at a half-beam of 0.99 m — rather than a
   choice. If the yard's real boat has a side deck there, this is the number to
   put to them.

---

## §24–§27 — acceptance

Answered from `.qa/p472-clay-top.png` first, as §24 requires, and then from the
rest.

| | |
|---|---|
| **§24** IS THE OLD LONG SIDE-BENCH GEOMETRY COMPLETELY DELETED | **YES** — 33 faces / 2.177 m² into a bin nothing builds; no raised strip in the clay top view |
| **§25** DOES THE DARK FLOOR PHYSICALLY CONTINUE INTO THE SPACE | **YES** — 61 stations of new panel, 1.97 m across at z 0.366 |
| **§26** DO THE FORWARD CUSHIONS BEGIN ONLY AFTER THE OPEN COCKPIT | **YES** — x 0.000, with 1.70 m of floor between them and the backrest |
| **§26** ARE THEY TWO SYMMETRICAL CONTINUOUS FORMS | **YES** — two connected components, 4,752 triangles and 1.631 m² each, mirror deltas 0.0 mm |
| **§26** DO THEY FOLLOW THE INNER HULL RATHER THAN OLD BENCH GEOMETRY | **YES** — both edges traced from the plate, clamped by the hull's own coaming |
| **§26** DO THEY CURVE AND MEET NATURALLY AT THE BOW | **YES** — Catmull-Rom plan, meeting at x 1.537 with a 16 mm seam |
| **§27** IS THE VAST MAJORITY OF THE OPEN COCKPIT FLOOR DARK | **YES** — 9.07 m² of `cockpit_sole` at 0.010 linear plus the new panel |
| **§27** IS THE CUSTOM INTERIOR COLOUR LIMITED TO TRUE PADDED SURFACES | **YES** — `upholstery_primary` only, asserted from both ends by `npm test` |
| **§27** IS THERE NO BLACK VERSION OF A PAD WHERE A PAD SHOULD NOT EXIST | **YES** — the only raised objects in the clay render are the two cushions and the rear seat |
| **HEIGHT §7** IS THE CUSHION TOP HORIZONTAL FROM SIDE VIEW | **YES** — 0.6520 at both ends, a rise of −0.0 mm, drawn against a guide |
| **HEIGHT §4** DO PORT AND STARBOARD MEET LEVEL | **YES** — same z bound on both, mirror delta 0.0 mm, seam horizontal |
