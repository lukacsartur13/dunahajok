# PXL — PHASE 4.6

**Reference-locked primary geometry and material correction.**

Six named corrections, each of which was measured off the delivered plates
before anything was changed and looked at afterwards. §1 rules out declaring the
phase complete from landmark counts, zone counts or a green test run, so the
numbers below exist to *support* a visual judgement rather than to stand in for
one, and §52's fourteen questions are answered at the foot of this file from the
renders rather than from the metrics.

| | |
|---|---|
| Model | `assets/derived/pxl/PXL.production.glb` → `public/models/PXL.glb` |
| Working file | `assets/blender/PXL.blend` |
| Faces | 54,680 authored · 29,000 delivered · 0.50 MB transfer |
| Zones | 20, unchanged in name and count |
| Checks | `npm run qa` — 2,147 state · 153 vessel · model validation green |
| Visual | 7 of 7 regression cases pass |
| Sheets | `.qa/PHASE_4_6_comparison.png` (5 rows) · `.qa/PHASE_4_6_details.png` (7 crops) |
| Paint QA | `npm run paint` — mean deviation 0.057 of local depth |

**Where the numbers came from.** Every reading in this report is a column scan
over the raw pixels of `pxl-side-20240719.jpg` or `pxl-views-20240815c.jpg`, or
a measurement off the exported GLB. Nothing below is an estimate off a
screenshot. The crops the readings were taken through are in `.qa/ref46/` and
are the same crops the detail sheet uses, so a disagreement in the sheet is a
disagreement with the number rather than with a rectangle chosen afterwards.

---

## A. Motor — the lower-unit reconstruction

**Phase 4.4 measured this and declined to build it, and its own report says so.**
`PXL_STERN_REFERENCE` has carried the readings since 4.4: the plate puts the
anti-ventilation plate 1.956 transom-heights below the transom top and the
lowest point at 2.469. §O of `PHASE_4_4_REPORT.md` called that "a rendering of a
big engine drawn nearer the camera than the transom it hangs on" and built the
leg to a length that put the plate near the waterline instead. The result was a
lower unit that stopped **52 mm** below a keel at y −0.2206 — level with the
bottom of the boat, which is the failure §42 names in as many words.

§3 removes the discretion. The rows were re-read this phase by column scan on a
datum that can be checked — the sheer at the transom, and the crisp lower edge
of the ghosted underwater body, 253 px apart:

```
sheer at the transom       row  975    0.000   ← datum
cowling top                row  986    0.043
cowling bottom             row 1122    0.581
bottom of the ghosted hull row 1228    1.000   ← one transom depth
anti-ventilation plate     row 1306    1.308
propeller centre           row 1355    1.502
skeg, lowest point         row 1401    1.684
```

The cowling reading is the check that the scale is right rather than a landmark
in its own right: 0.581 − 0.043 is 0.538 of a depth, and at the model's own
0.9236 m transom depth that is **0.497 m** of cowling against the 0.500 m
`standard` already carried. Three millimetres. The rows below can be trusted on
the same scale.

**What was built.** The powerhead did not move — §4 asks that the mounting stay
plausible and rules out translating the whole engine down — so the cowling top,
the cowling height and the clamp are all where 4.4 put them, and the midsection
and lower unit were extended under them. `shaft` went from 0.21 m to 0.66 m on
`standard`; the gearcase deepened; a skeg was added.

| drive | cowl top | cowl bottom | plate | prop | skeg | plate ↓keel | lowest ↓keel |
|---|---|---|---|---|---|---|---|
| compact | 0.647 | 0.247 | −0.435 | −0.520 | −0.760 | 0.232 | 0.584 |
| standard | 0.654 | 0.154 | **−0.505** | −0.605 | **−0.852** | **0.308** | **0.684** |
| large | 0.660 | 0.045 | −0.545 | −0.658 | −0.913 | 0.351 | 0.750 |
| electric | 0.651 | 0.286 | −0.500 | −0.595 | −0.840 | 0.303 | 0.671 |
| *reference* | | | | | | *0.308* | *0.684* |

Model metres; the last two columns are transom-depths below the keel. `standard`
reproduces the plate exactly because it is the drive the plate draws; §5 spreads
the other three either side of it rather than setting them to it. The measured
bounding boxes from `npm run vessel` — 1888 triangles each — put the four
deepest points at **−0.769, −0.862, −0.925, −0.847**, a few millimetres past the
arithmetic because `ExtrudeGeometry` grows a bevelled profile outward.

**§6 — the lower half is no longer an abstract extrusion.** Eight named parts
where there were six: cowling, **apron**, bracket, midsection, anti-ventilation
plate, **trim tab**, gearcase, **skeg**, propeller. Two of them are new and one
was rewritten:

* the **midsection** was a rounded rectangle. At 0.21 m that reads as a strut;
  at 0.66 m it reads as a plank. It is now an authored silhouette — widest under
  the powerhead where the exhaust housing is, necking to a quarter of the
  gearcase's length at the foot, raked aft, with a hollow in its trailing edge.
* the **skeg** is the deepest part of every drive and is sized to a target
  (`lowerDrop`) rather than left to fall out of the gearcase and the propeller.
* the **apron** is 40 mm of collar between the cowling and the leg, which is what
  stops the leg appearing to grow out of the middle of a large flat face.

**A bug worth recording.** The first build computed the skeg's drop as
`plateY − lowerDrop − gearcaseBottom`, which is the right two numbers subtracted
in the wrong order and comes out negative on all four drives. The guard below it
then skipped the skeg silently and the propeller became the lowest point at
−0.724 instead of −0.852. `npm run vessel` caught it, because it measures the
built bounding box rather than the arithmetic — which is the entire reason it
measures the built bounding box.

**Two assertions were inverted rather than relaxed.** `configurator.test.ts`
asserted `plate < 0.06 && plate > −0.16` and `lowest > −0.42`; `validate-vessel`
asserted `min.y > keel − 0.2`. Those are not tolerances that the new geometry
happens to exceed — they *are* the old requirement, and keeping them alongside
§42 would have been keeping two contradictory specifications. They now assert
the reference relationship: the plate below the keel by more than 0.15 of a
transom depth, and the lowest point between 0.35 and 0.85 of one.

---

## B. Bow — the vertical wall, removed

`_probe44` on the 4.4 production file, forward of x 1.30:

```
interior_hard_liner   6 triangles · x 1.135 → 1.494 · z 0.570 → 0.873
```

Six near-vertical triangles standing across the boat, and nothing at all forward
of them. That is §8's "large vertical panel closing off the forward interior
like the end wall of a box", and it is what Phase 4.4's deletion of the bow panel
left behind rather than something the deletion missed: it is the panel's own cut
edge.

The rule in `split_interior` that removed the panel took only UP-FACING interior
faces forward of the station. It now takes every interior face there, and the
station is pulled back 60 mm so faces whose centroid sits just abaft the cut are
caught. 43 faces / 2.546 m² are dropped, against 42 / 2.479 m² before.

Deleting a lid and keeping its rim is not a bow, so the deletion is only half of
the correction — §C is the other half.

---

## C. Deck and liner — the forward continuation

**`build_forward_liner` in `pxl_upper.py`, new this phase.** 1,526 faces running
x 1.470 → 2.300: from exactly where the delivered moulding stops to where the
capping has all but converged, leaving 0.33 m of bow structure forward of it.

**It is not the old panel at a different size.** The Phase 4.3 element was 2.07 m²
of flat, up-facing surface at a *constant* z 0.570 spanning the full beam — a
lid. This is a moulding defined by two curves that move in opposite directions:

* its **centre climbs** from 0.570 to 0.83 over the run — a rake, not a deck;
* its **flat narrows** from 0.72 m half-width to nothing, so the section turns
  from a sole with a coaming into a pure cove and the interior visibly comes to
  a point before the stem.

Section-wise it is a crowned flat, then a quarter-cosine cove rising outboard to
meet the hull just under the capping. §9's progression — cockpit → forward
interior → narrowing bow → bow termination — is those two curves.

**One failure worth recording, because it is a class of failure.** The first
version measured its outboard edge with `hull.inner_y(x, sheer − 0.070)`. Near
the bow the sheer profile is a smoothed windowed maximum, so at stations whose
real deck edge is 30 mm lower the ray passed over the deck and picked up the
inside of the *outer* skin instead — 0.89 rather than 0.75. The liner burst
through the topsides in a lobe half a metre across; `.qa/p46a-blob.png` is the
render. The fix is not a smaller number but a different source: `interior_edge`
reads the capping's own authored inner half-width from `gunwale_plan`, so the
liner and the capping cannot disagree at any station.

---

## D. The forward padded architecture

**What was there.** `side_cushion_x = (−1.600, 1.470)`: one mirrored pair of
cushions running 3.07 m down both sides of the boat at near-constant section.
§12 rules that out in as many words — the treatment "must NOT begin across the
entire cockpit… should not run as one continuous strip from stern to bow" — and
the cockpit three-quarter agrees with §12 rather than with the model. Aft of the
console every reference shows the side decks in the hull's own colour with an
orange inlay on them and nothing else.

That pair is **deleted**, not shortened. A shorter continuous strip is still one.

**What replaces it**, read off `.qa/ref46/ref-fwd-pads.png` and
`ref-bow-interior.png` (2.6× and 4× crops of the cockpit three-quarter):

* the padding **starts at x −0.780**, 0.20 m forward of the console's forward
  face, which is §12's "approximately forward of the main cockpit / helm area";
* it starts on the **starboard side only**, as a raised lounge — and the
  asymmetry is the reference's, not a simplification. `ref-console-fwd.png`
  shows the port side forward of the console as bare sole with a low step and an
  inlay, all the way to where the two sides merge in the bow;
* its inboard edge **crosses the boat** between x 1.020 and 1.880 on a
  smoothstep, so by the bow the padding spans the interior rather than being two
  strips either side of it;
* it **stops at x 2.100**, leaving 0.23 m between the padding and the capping's
  convergence. §43's "interior narrows naturally" is that gap.

**§16 — the pads are objects.** Every one is a lofted section with 75 mm of
thickness, a 22 mm edge fillet, a 7 mm crown and a 10 mm bevel — the same
`cushion()` primitive the bench uses. No painted stripe and no paper-thin
polygon anywhere in the run.

---

## E. Three-part segmentation

**§13 rules out faking the divisions with colour**, so they are not colour: the
plan is cut into three at 0.512 and 0.822 of its own length with a **55 mm
physical gap** at each cut, and each piece is lofted as its own mesh.

| piece | station | inboard → | outboard → | base z |
|---|---|---|---|---|
| 1 · starboard lounge | −0.78 → 0.66 | +0.36 → +0.21 | 0.77 → 0.77 | 0.570 |
| 2 · the crossing | 0.75 → 1.53 | +0.21 → −0.22 | 0.76 → 0.50 | 0.570 → 0.60 |
| 3 · bow pad | 1.62 → 2.10 | −0.28 → −0.25 | 0.45 → 0.22 | 0.61 → 0.84 |

§14 forbids equal thirds and the reference does not draw them: the lounge is
half the run, the crossing a third, the bow pad the rest. §15's taper is in the
outboard column — 0.77 m to 0.22 m — and it follows the hull because both edges
are measured against it station by station rather than authored.

**§17 — the hard structure between and around them is preserved and is visible.**
Three ways: the 55 mm seams show the liner underneath; the outboard edge holds
62 mm off the capping's inner face so a band of the boat's own colour runs the
whole length; and the lounge stands on `build_forward_base`, a hard moulded box
in the **sole's graphite** rather than in the interior colour — which is what the
reference draws under the cognac top.

**Three iterations, and what each one fixed.** §41 asks that the loop be
documented rather than that one pass be declared sufficient.

1. **First build.** Pads 0.26 m wide — a ribbon down one side rather than a
   lounge. The delivered side platform is only 0.11 m wide at those stations, so
   a cushion laid on it and nothing else can be no wider. Fixed by building the
   lounge 0.30 m out over the sole on a base of its own.
2. **Second build.** The plan view showed **four** pieces where three were
   authored. Cause: `sole_edge` is a 14 mm ray scan and threw a single outlier
   that the mean smoothing spread rather than removed, cutting a 0.12 m notch
   out of the lounge — and, separately, the forward liner's cove came up through
   the two forward pads. Fixed with a width-5 median before the mean, a gentler
   decay on the liner's flat, and `_pad_seat`, which walks each station's
   outboard edge inboard until the surface under it is within 45 mm of the
   surface under its middle.
3. **Third build.** Pad 2 was *still* split. The station dump found why: at
   x 1.05–1.11 the pad spanned the sole's ragged forward end, with sole under
   its inboard half at z 0.377 and platform under its outboard half at 0.570.
   A lofted cushion has one base height per station. Fixed by running the
   lounge's base to x 1.16, past where the sole runs out, so the interior is at
   one level everywhere the padding crosses it.

A fourth thing was found and fixed along the way: `forward_pad_plan` was being
measured twice, once before the lounge base existed and once after — and after,
`sole_edge` stopped at the base's own face and returned a half-beam 0.15 m
smaller. The base came out 0.17 m wider than the cushions it carried and neither
measurement was wrong. The plan is now taken once and cached on the `Hull`.

---

## F. Lower-hull paint line — reconstruction

**The old line was measured before it was replaced.** Sampled along the
outward-facing starboard skin of the 4.4 asset:

```
x  −2.50  −1.00   0.00   0.75   1.50   2.00   2.25
z   0.015  0.021  0.105  0.172  0.276  0.336  0.333
```

It climbs 0.32 m from stern to bow. It has to: a constant fraction of local depth
on a hull whose sheer rises **is** a line that rises with the sheer. That is
§19's "generic hull-lower masking", and §45 fails it by name.

`npm run reference` did not catch it, and the reason is worth stating: it reduces
the division to one number — mean band edge as a percentage of local depth — and
reported 72.1% against the plate's 71.4% while the line was visibly wrong. A line
0.10 m too low aft and 0.30 m too high forward averages to very nearly the right
answer. §45 is a complaint about a *shape*.

**The drawing was traced rather than characterised.** Classifier: chroma, not
luminance. The teal topsides carry 20–30 levels of it and the black bottom under
8, and the gloss highlights that defeat a brightness threshold leave chroma
alone. At 345.1 px/m with the transom at column 699, in the model's own frame:

```
stern      z 0.178     nearly level
midship    z 0.140     falling gently — 38 mm over 2.6 m
x +0.78    z 0.092     THE KNUCKLE STARTS
x +0.87    z 0.032     and it has fallen 0.11 m in 90 mm
forward    z 0.032     dead level, until the keel rises to meet it near x 2.1
```

The real line is nearly **horizontal**, falls very slightly forward, breaks
sharply at 60% of the way to the bow, and then runs level until the hull's own
rise closes the band out. §20's "specific height, slope, rise/fall, angular
breaks" is that knuckle, and it is the one feature a depth-fraction rule can
never produce.

**§21, §22 — the hull was cut, not reclassified.** Classifying existing triangles
by centroid gives a boundary that zig-zags by whatever the triangulation happens
to be, which on this mesh is up to 0.15 m. So `recut_paint_line` splits every
edge that crosses the design surface at the crossing point, splits every face
that gains two new vertices between them, triangulates, and only then re-labels:

```
937 edges cut · 934 faces split · 8,391 faces re-labelled
```

**No vertex moves.** §21 forbids changing the hull and only permits correcting
the material zoning; `npm run reference` returns the same silhouette numbers
afterwards, and `npm run model` passes unchanged.

**§23 — both treatments preserved.** DARK LOWER paints the newly-cut region;
FULL BODY gives that exact region the selected hull finish. No geometry differs
between them — `lower-dark-vs-body` is one of the seven visual regression cases
and it passes.

---

## O. Matched-scale visual comparison, and the paint line measured

**§39.** `.qa/PHASE_4_6_comparison.png` — five rows, three columns, reference /
4.4 / 4.6, across SIDE, PLAN, COCKPIT 3Q, STERN 3Q and BOW 3Q. Each cell is
cropped to its own subject and fitted to a common height, so the boat is the same
size in all three columns.

That was not true of the first sheet, and §39 is a complaint about exactly that.
The subject finder compared each pixel against one corner sample with a loose
threshold; the studio backdrop is a vertical gradient running about 30 levels top
to bottom, so a threshold loose enough to ignore the gradient at the bottom
called it content at the top and the box became the whole frame. It now compares
each pixel with **the left edge of its own row**, which removes a vertical
gradient exactly rather than tolerating it, and the threshold comes down to 10.

**§24 — the paint division, measured at five stations.** `npm run paint`.
Normalised to v = 0 at the sheer, 1 at the keel, per station:

| station | u | plate v | model v | deviation |
|---|---|---|---|---|
| stern | 0.10 | — | 0.587 | no line on the plate |
| quarter | 0.28 | 0.673 | 0.636 | −0.037 |
| midship | 0.50 | 0.702 | 0.664 | −0.038 |
| forward quarter | 0.72 | 0.773 | 0.821 | +0.049 |
| bow | 0.88 | 0.866 | 0.972 | +0.106 |

**mean |deviation| 0.057 of local depth · max 0.106.** On a 0.39 m depth
amidships that is 15 mm. The same measurement on the 4.4 line gives about −0.26
at the bow and +0.10 at the quarter — it disagrees with the plate in opposite
directions at the two ends, which is precisely what a line of the wrong *shape*
does and what a single averaged figure conceals.

The stern station has no reading on the plate because there is no division
there: the PXL panel runs from the sheer to the keel, and reporting "no line" is
the honest answer rather than a guess. The bow's +0.106 is the largest residual
and is discussed in §Q.

**One method note.** The first version of `paint-line-qa.mjs` traced a *render*
of the model and failed twice for unrelated reasons — the scene's warm key puts
the dark lower hull at 22 levels of chroma against the teal topside's 23, so the
plate's classifier cannot separate the render at all; and the render's own
reflection continues below the keel in the same colour as the hull, so the scan
that establishes the normalising depth runs off the bottom of the boat. Both are
properties of the picture rather than of the boat. The model side is now read
from the GLB, where which faces carry `hull_lower` is not an inference.

---

## G, H. The Duna and PXL hull badges

**§25 rejects what they were, and what they were is not arguable:** a
zero-thickness `ShapeGeometry` carrying a colour and a clearcoat, offset 4 mm off
the panel with `polygonOffset` to stop it z-fighting. At any distance that is a
sticker, because a sticker is what it is. No material setting fixes it — a flat
quad has no edge to catch light on and casts no shadow onto its own ground.

**Both hull marks are now extruded solids.** `badgeGeometry` scales the artwork
in 2D first and extrudes by a real-world depth second, which matters: extruding
first would multiply the relief by the artwork's own scale factor and put 0.3 mm
on the boat.

| | relief | bevel | stroke | ratio |
|---|---|---|---|---|
| PXL lockup | 1.6 mm | 0.54 mm | ~9 mm | 0.18 |
| Duna script | **0.7 mm** | 0.24 mm | ~3 mm | 0.23 |

§27 asks for the script to be treated with "extremely restrained depth" because
it is finer typography, and the two numbers are not the same for exactly that
reason: 1.6 mm on a 3 mm stroke is a bar, 0.7 mm is a crease that catches light.
`bevelSegments: 1` is a chamfer — a machined edge break — rather than a
round-over; two or more and the mark starts to look moulded in plastic.

**§28 — the material.** `MeshPhysicalMaterial` at metalness 1, roughness 0.30,
**anisotropy 0.65**, clearcoat 0. Anisotropy is a BRDF term rather than a map,
which is what makes §28's "fine anisotropic / directional brushing" achievable at
a 55 mm cap height: the highlight is stretched analytically along the tangent, so
it stays smooth at every distance instead of shimmering the way a normal map fine
enough to read as brushing would. §28's exclusions are the other three numbers —
below roughness 0.12 it becomes a chrome mirror, above 0.45 it stops catching a
highlight at all, and a clearcoat over an anisotropic base adds an isotropic
second highlight that cancels the brushing.

**The script carries its own tone, and that came out of the crops.** Row C of
`.qa/PHASE_4_6_details.png` put the first build's satin nickel next to the plate,
where the Duna script is drawn almost tone-on-tone with the band it lies in —
legible by its edge rather than by its value. Nickel read as a chrome signature
on a black panel. `PXL_BADGE_SCRIPT` is a darker anodised tone at roughness 0.38
with the brushing rotated to run **along** the mark rather than across it, so the
highlight is continuous down the stroke instead of banding each one separately.
Still fully metallic, so §46's "must catch light differently from the hull" holds;
at rest it sits where the reference puts it.

**A deliberate divergence from the plate, recorded as such.** The side plate
draws the PXL hull mark in cognac and the model now renders it in brushed metal.
That is §25 instructing it — "Not printed text. Not flat orange/black paint. Not
HTML-style logo decals" — rather than a miss. The plate's own colour survives as
`PXL_MARK_PLATE_INK` and still governs which of the two badge tones is selected.

**§30 — one tone, for a structural reason.** Neither hull mark sits on a
configurable surface: the lockup's ground is `transom_black`, the script's is
`hull_accent`, and `pxlConfig` resolves both through `sternMoulding`, which is
deliberately constant. Change the hull to white, black, navy, sage or gold and
the two mouldings stay the same structural black. Tested on all five;
`.qa/p46-side-white.png`, `-black`, `-navy`, `-gold` are the frames.
`PXL_BADGE_DARK` is therefore unreachable today and is kept because §30's last
sentence asks for exactly that — the architecture for separate finishes is in
`badgeForInk`, on the same luminance threshold the ink already uses, and the
configurator suite asserts it agrees with `badgeForGround` on every published
finish so the two cannot drift.

---

## I. The windscreen mark

**Unchanged, and structurally excluded from everything above.** §31: "Do NOT turn
the windshield mark into a thick metal badge."

`placePlexiMark` still builds a flat `ShapeGeometry` with `PXL_INK_PLEXI` — a
matte light grey print at metalness 0 and clearcoat 0.08 — and still lays it in
the screen's own measured basis rather than by raycast. The exclusion is not a
special case in the badge code: the plexi placement carries
`inkFollowsGround: false`, which is the flag the re-badge pass in `PxlVessel`
filters on, so a mark whose ground is glazing cannot be reached by the metal
treatment at all. Asserted in the suite as `plexiSlot.ground === "glazing"` and
`PXL_INK_PLEXI.metalness === 0`.

Row E of the detail sheet is the crop.

---

## J. Top view

**§34 makes the plan the primary QA view for this phase**, and it is what the
three padding iterations in §E were judged on — every one of those defects was
invisible in the three-quarters and obvious from above.
`.qa/p46-plan.png` at 1833 × 1502 resolves, from aft: the transom pad and bench,
the console and its offset, the open cockpit with its coaming inlays and no
cushions, the starboard lounge on its dark base, the crossing pad, the bow pad,
the seams between all three, the forward liner narrowing under them, the cleats,
and the capping converging at x 2.33.

---

## K. Gunwale relationship

Unchanged geometrically — the capping is Phase 4.4's, 2,374 faces, 46 mm section,
159 mm wide amidships opening to 250 mm at x 2.0 and converging at x 2.33 — but
§33's requirement that the gunwale and the forward pads *relate* is now met by
construction rather than by coincidence. Both the forward liner and the pad plan
read `interior_edge`, which returns the capping's own authored inner half-width
from `gunwale_plan`. The spacing from outer hull → capping → liner → pad →
cockpit opening is therefore one chain of measurements taken from one source, and
the 62 mm pad inset is the only free number in it.

That replaced an independent raycast, and §C records what the independent
raycast did.

---

## L. Console, plexi and rails

No regressions and no rebuilds. The console (226 f shell + 54 f aft panel, dash
130 → 199 mm above the sheer), the wrapped screen (98 f, 9 mm section, 9.2° rake)
and the rails (1,320 f swept tube, 27 mm, both pairs raycast onto the capping)
are Phase 4.3/4.4's and measure identically. §35 and §36 ask that the bow work
not distract from them; the check is that their build-log figures are unchanged
line for line, and they are.

The one thing that did change near them is the removal of the side cushions,
which leaves the console standing in an open cockpit as the references show it
rather than between two orange strips.

---

## M. Platform compatibility

**§38 — revalidated for the deeper drive, and it is the propeller that was
never the constraint.** `platformClearance` reports the reach of every part
inside the platform's height band at 30° of lock; the parts that pass through the
band are the leg on a compact drive and the bottom of the cowling on a large one,
and both are *above* the extension. Everything that moved this phase — the plate,
the gearcase, the skeg, the propeller — hangs clear below the frame at
y 0.073 and cannot touch the tread at any angle.

Asserted per variant in the suite (`lm.lowest < PXL_PLATFORM.bottomY` and a
half-width check on every part in the band), and the platform's own geometry is
byte-for-byte what 4.4 exported: 130 f frame + 520 f teak, 504 mm aft of the
transom, tread at z 0.179, well ±280 → ±470 mm. `platform-off-vs-on` and
`platform-teak-ignores-exterior` both pass.

---

## N. Material changes

Three, all of them because something else moved:

* **`pxl_drive_alloy`** darkened from `#4a4e52` to `#2a2d31`, roughness 0.48 →
  0.44, metalness 0.28 → 0.34. At the old value a mid-grey column 0.9 m tall
  hanging under a near-black cowling read as a separate object bolted to the
  engine. It is still not the same value as `pxl_motor_black` and is still more
  metallic: a cast gearcase under paint and a moulded cover part company under a
  moving light even where they agree in base colour.
* **`PXL_BADGE_BRIGHT` / `PXL_BADGE_SCRIPT`** — new, §G/H above.
* The **badge material dropped `polygonOffset`**, which the flat marks needed and
  a solid does not: 1.6 mm of its own body between its face and the moulding is a
  larger separation than the offset was buying.

Everything else — hull paint, interior, liner, floor, rails, glass, teak — is
unchanged, and `zones()` reports the same twenty roles resolving to the same
finishes.

---

## P. Detail-crop visual QA

`.qa/PHASE_4_6_details.png`, seven rows, reference against 4.6:

| | subject | verdict |
|---|---|---|
| A | bow top | interior continues and narrows; no panel, no wall |
| B | lower hull paint line | knuckle and level run present; see §O for the numbers |
| C | Duna badge | restrained metal script, tone-on-tone as the plate draws it |
| D | PXL hull badge | brushed metal with a visible edge; colour departs from the plate by §25 |
| E | PXL plexi mark | print, unchanged |
| F | motor lower unit | midsection, plate, gearcase, skeg and propeller all below the hull |
| G | forward three-part padding | three pieces, real gaps, hard liner between and around |

Both columns are authored rectangles rather than found subjects — a detail crop
is a region of the picture, and finding it automatically would find the boat
again. The reference rectangles are the ones this phase's measurements were taken
through.

---

## Q. Remaining mismatches

1. **The bow station of the paint line reads +0.106.** The band there is 80 mm
   tall on a 250 mm depth, so the absolute error is about 26 mm; the model closes
   the band out at x 2.036 against a reference that closes it near x 2.10. It is
   the largest residual on the line and it is at the station where the band is
   thinnest and the trace least certain on both sides.
2. **The forward pads are smaller than the plate's.** Row G of the detail sheet
   shows it: the reference's padded surfaces fill slightly more of the interior
   than the model's do, particularly across the crossing pad. The pads follow the
   delivered moulding station by station and the moulding is what it is; opening
   them further would mean building more base under them than the reference shows.
3. **The anti-ventilation plate still reads small** relative to the plate's,
   even after a 15% increase this phase. It is bounded by the platform's motor
   well (±280 mm at its narrowest) and the largest plate is now 150 mm half-width,
   so there is room — but growing it further starts to look like a fin rather
   than a plate at this leg length, and one more iteration was not spent on it.
4. **The lounge's aft end is square.** The reference's is too, as far as the
   crop shows, but the crop is oblique there and a chamfered end is possible.

## R. Source-limited issues

1. **The plexi mark has no orthographic reference.** No delivered view shows the
   windscreen face-on, so its size and position remain Phase 4.1's fractions of
   the screen's own face. §31 asks only that it stay a print, which is
   checkable; where exactly it sits on the glass is not.
2. **The motor is drawn once, in one three-quarter view.** Every reading in §A
   comes from that one image, and two of its landmarks — the propeller centre and
   the skeg tip — are partly occluded by the propeller blades. The plate and the
   cowling are the two clean readings and they are what the leg is built between.
3. **The reference's leg is longer than a real outboard's.** At 1.42 m from the
   transom top to the skeg it is beyond a 30-inch shaft on a 5.25 m boat. §3 is
   explicit that this is not to be "corrected", so it is built as drawn and
   recorded here rather than quietly averaged toward plausibility.
4. **The forward lounge's asymmetry rests on one image.** Only the cockpit
   three-quarter shows the area forward of the console on both sides, and it
   shows the port side unpadded. No plan view of the interior was delivered to
   confirm it.
5. **The badge relief has no dimensioned source.** 1.6 mm and 0.7 mm are chosen
   against the stroke widths the artwork itself gives, not measured off a
   drawing. §29's test — typography from a distance, thickness up close — is the
   only criterion available and is the one they were tuned to.

---

## §52 — the final questions

Answered from `.qa/PHASE_4_6_comparison.png`, `.qa/PHASE_4_6_details.png` and the
eighteen frames in `.qa/p46-*.png`, after looking at them.

| | |
|---|---|
| MOTOR LOWER UNIT EXTENDS BELOW HULL LIKE REFERENCE | **YES** — 0.684 transom-depths below the keel against the reference's 0.684 |
| FALSE BOW VERTICAL WALL REMOVED | **YES** — all 6 triangles deleted; nothing near-vertical remains forward of x 1.41 |
| DECK / LINER CONTINUES NATURALLY INTO BOW | **YES** — 1,526 faces from x 1.47 to 2.30, rising and narrowing |
| FORWARD PADDED ELEMENTS CONTINUE AND TAPER INTO BOW | **YES** — to x 2.10, outboard edge 0.77 → 0.22 m |
| FORWARD PADDED DESIGN IS VISIBLY THREE-PART | **YES** — three meshes, 55 mm gaps, resolved in the plan view |
| INTERIOR COLOUR ONLY AFFECTS TRUE PADDED SURFACES | **YES** — `upholstery_primary` only; the lounge base is `cockpit_sole`, the liner is `interior_hard_liner` |
| LOWER HULL PAINT DIVISION MATCHES REFERENCE | **YES** — mean 0.057 of local depth over four stations, knuckle reproduced |
| DUNA HULL MARK IS PHYSICAL BRUSHED-METAL BADGING | **YES** — 0.7 mm relief, metalness 1, anisotropy 0.7 |
| PXL HULL MARK IS PHYSICAL BRUSHED-METAL BADGING | **YES** — 1.6 mm relief, metalness 1, anisotropy 0.65 |
| PXL WINDSHIELD MARK REMAINS CORRECT | **YES** — flat print, metalness 0, structurally excluded from the badge pass |
| GUNWALE VISUALLY MATCHES REFERENCE | **YES** — unchanged from 4.4, and now the datum the liner and pads are built from |
| HELM / WRAPAROUND PLEXI MATCHES REFERENCE | **YES** — unchanged from 4.3; no regression |
| PLATFORM STILL FUNCTIONS AND LOOKS CORRECT | **YES** — geometry unchanged, clearance revalidated for the deeper drive |
| COMPLETE PXL NOW READS AS THE SAME PRODUCT | **YES**, with the four mismatches in §Q named rather than claimed away |

The last answer is the one §1 says must not be given from metrics, so it is given
from row D and row B of the comparison sheet: the stern three-quarter now puts a
long lower unit well under a hull whose dark bottom band runs level and breaks
where the drawing breaks it, and the plan resolves a starboard lounge crossing
into a three-part bow. Those were the two pictures that did not previously read
as the same boat.
