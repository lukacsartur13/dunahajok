# PHASE 4.3 — REBUILDING THE UPPER BOAT FROM THE DESIGN REFERENCES

**The brief's own test, §30: if the before and after look nearly the same, the
phase has failed.** They do not. The comparison sheet is
`.qa/PHASE_4_3_comparison.png`, built by `npm run sheet`, and it is the first
thing to look at.

Everything below is measured, and where something is an estimate, a judgement
or a thing I could not do, it says so.

---

## A — Hull geometry preserved

**Nothing below the sheer was regenerated.** The delivered surface, with Phase
4.2's four corrections still on it, is what ships. §1 says to preserve what
measures well and the hull measures well; `npm run reference` returns:

```
hull depth        plate 1.133 m   model 1.163 m   (−2.6%)
keel  deviation   mean 0.0451 m   max 0.0797 m    (n=21)
band edge         plate 71.4%     model 72.1%     of local depth
sheer deviation   mean 0.0444 m   max 0.1459 m    (n=10)
```

Three of those four are identical to Phase 4.2 to four decimals, which is the
expected result of not having touched the surface. The fourth moved and the
reason is worth stating rather than claiming: **the sheer deviation improved
from 58 mm to 44 mm because the rasteriser measures the top of the
SILHOUETTE, and the rebuilt rails now stand 58 mm above the deck edge where the
old forty-triangle zone did not.** The hull is unchanged; what the measurement
can see changed. Reporting that as a hull improvement would be false.

Carried forward from Phase 4.2, all still in the build: 1,960 speckle faces
dissolved, 29 inverted foredeck normals turned upright, the gunwale capping cut
on an exact plane at z 0.860 and carried the final 570 mm to the stem.

---

## B — Upper geometry removed and rebuilt

Four zones were **deleted**, not hidden. A hidden mesh is still transfer and
still a name the configurator can bind to by mistake.

| Deleted | Faces | What it was, measured |
|---|---:|---|
| `console_body` + `console_trim` | 679 | A wedge, x −1.47 → −0.96, top z 1.147. Its **tallest face is the aft one** — the dash rakes DOWN toward the bow. The plate rakes up. |
| `helm_wheel` | 2,988 | A ring at z 0.873 → **1.237**, which is 0.09 m ABOVE the console's own crest. It stood in free air. |
| `rails` | 40 | x −2.594 → −1.162, **y −0.179 → +0.273**, z up to 1.109. Not rails at all: a bar on the CENTRELINE running forward from the transom, 0.37 m above the deck. |

That last row is §6. **There is no tiller in the propulsion proxies and there
never was** — `pxlPropulsion.buildDrive` builds a bracket, a cowling, a leg, an
anti-ventilation plate, a gearcase and a propeller, and `npm run vessel`
confirms every drive's forward-most point is the transom plane at −2.6266 m, so
nothing enters the boat. The tiller §6 reports is the `rails` zone above: a
straight bar, at the centreline, projecting forward from beside the outboard,
which in profile is indistinguishable from a steering handle. Rebuilding the
rails is what removed it.

`interior_pads` was also deleted — the raised platform lifted 35 mm, which is
what drew as §12's "thin orange decorative stripe". Its faces went back into the
liner they were cut from and real cushions were built on top.

**Authored this phase**: console body and shell, windscreen, steering wheel,
rails, all upholstery. Carried over from 4.2: the coaming inlay and the bow
cleats.

---

## C — Console reconstruction

§4's five complaints — too tall, too monolithic, too solid, too wedge-like,
visually heavy — are one defect measured five ways, and the measurement is the
rake's sign.

`scripts/pxl/measure-upper.mjs` reads the July side plate through the
calibration `reference-qa.mjs` already uses (345.1 px/m, transom at column 699,
sheer maximum at row 796) and separates the helm from the human standing behind
it by VALUE: the drawing's structure peaks at 0.44 and its figure bottoms out at
0.87, with nothing in between. It reports:

| | Plate | Built |
|---|---|---|
| Dash above the local deck line, **aft** | +0.130 m | +0.130 |
| Dash above the local deck line, **forward** | +0.199 m | +0.199 |
| Above-deck footprint, fore-aft | 0.351 m | 0.362 |

The dash **rises toward the bow**. The STL's fell. That single sign change is
most of the perceptual difference, because it turns a wall the driver looks at
into a dash the driver looks over.

**Two materials, and the split is not decorative.** The cockpit three-quarter
shows a pale moulded panel facing the driver and a dark shell around it; the
colour studies show the same pale panel from the other side, as a triangle at
the tower's base. So `console_body` is the aft panel — configurable, on
`interiorSecondary` — and `console_detail` is the shell, unbound, because it is
the same structural black as the capping in every plate including the white
ones.

**The station is the one thing the sources disagree about.** The July plate puts
the console at 0.47–0.55 of LOA from the transom; the August views sheet and the
delivered STL put it at 0.25–0.35 and 0.240–0.317. Two of three agree, the
colour studies are consistent with them, and the seating layout only works aft —
so it is built where the model already had it. Its **size** is not in dispute:
0.351 m above deck on the July plate against the STL's 0.405 m overall. The two
sources draw the same console in two places, which is what makes the profile
transferable. The landmark table records this as SOURCE rather than as agreement.

---

## D — Steering system

Mounted on the panel the driver faces, not standing on the crest.

| | Plate | Built |
|---|---|---|
| Rim apex above the local deck | +0.217 m | +0.219 |
| Diameter | 0.253 m implied | 0.280 |
| Tilt from vertical, top aft | leaning | 22° |
| Hub, aft of the console's face | — | 0.105 m |

A rim, three spokes, a hub and a stalk that ends **inside** the console rather
than at its face, so no gap can open between the two at any camera angle.

Reach was checked rather than assumed: the bench's forward face is at x −1.720
and the hub lands at x −1.515, so a seated driver's hands are about 0.35 m from
their chest with the elbows bent — which is what the cockpit three-quarter
draws. At 708 triangles it is a quarter of what the STL's ring cost.

---

## E — Windscreen reconstruction

§7: genuine 3D geometry, not a flat decorative plane. The old one was exactly
that — a runtime slab sized off the console's bounding box, which on the STL's
wedge meant it stood behind the driver's hands.

Built in Blender with the console, as a loft along a plan curve: a front face
with 85 mm corner radii, two wings sweeping aft and down to the dash, 9 mm of
real section, and a 24 mm dark cap along the top edge with a post closing each
wing. Measured:

| | Plate | Built |
|---|---|---|
| Apex above the local deck | +0.486 m | +0.487 |
| Wing top where it meets the dash | +0.264 m | +0.263 |
| Rake of the forward post | 9.2° | 9.2° |

**The rake was nearly got wrong and the error is instructive.** Reading it from
the apex's station gives 19°, because on a wrapped screen the apex is not above
its own foot — that figure is the rake and the top edge's aft sweep added
together. The forward post itself falls 21 plate pixels over 130, which is 9.2°.

---

## F — Bow seating

§10: not a box. It is not built as one — no part of the seating is an extrusion
of a flat outline. Every pad is a **lofted section**: a closed profile with a
75 mm thickness, a 22 mm filleted top edge, a 7 mm crown and vertical side
walls, swept along a plan the hull was asked for.

The plan is measured, not authored. At each of 41 stations a ray fan finds the
step down to the cockpit sole; that step is the cushion's inboard edge and the
coaming is its outboard one. Forward of x ≈ +1.0 the sole ends and the platform
runs right across the boat, so there is no step to find — there the inboard edge
converges to the centreline on a smoothstep, which is what makes the chevron the
cockpit three-quarter shows rather than a triangle dropped in at the stem.

The plan is measured on ONE side and mirrored. A discrete ray fan disagrees with
itself by a scan step wherever the step face is oblique, and on the first build
that made the starboard cushion 0.21 m wider than the port one on a symmetrical
boat.

---

## G — Side and rear seating

Same section, same construction, five parts: both side cushions, the driver's
bench, its backrest and the bow chevron the side cushions run into.

The **bench** sits on the full-width platform the interior probe finds at
x −2.13 → −1.72 — which is also 0.13 of LOA from the transom, the station the
cockpit three-quarter shows. Its base height is taken once and held: a first
pass raycast it per station, found the sole under its forward end, and ramped
the cushion 0.20 m down into the cockpit floor.

The **backrest** is the same cushion section rotated so its thickness runs
fore-and-aft, because a backrest is a cushion and building it as a different
kind of object is how it ends up looking like a bulkhead. Its top lands +0.185 m
above the local sheer against the plate's +0.185. Its foot is the seat, not the
moulding behind it: abaft the bench the liner steps UP to an aft deck at z 0.74,
so a raycast foot started the backrest above its own cushion and left it 0.19 m
tall.

**No aft deck pad, and that is a decision.** The stern three-quarter carries an
orange band at the transom and a first pass built one for it. It sits at the
level of the black moulding, outside the cockpit — it reads as a boarding pad on
the motor well rather than as seating — and the delivered liner has no flat
shelf to put one on: rays between x −2.55 and −2.29 come back at 0.57, the
bench's own level, so the pad landed under the aft deck instead of on it. §13
says not to invent a luxury interior the references do not show. It is in §R
instead of in the model.

---

## H — Rails

§16, and §17: rails are an accent system, not upholstery.

Swept tube, 27 mm, following the hull's own sheer at every station rather than a
line between two remembered points. Four runs — a cockpit pair and a bow pair —
each with short square stanchions at 0.62 m and a down-bend onto the deck at
both ends.

| | Plate | Built |
|---|---|---|
| Cockpit rail, aft end | x −2.056 | −2.065 |
| Cockpit rail, forward end | x −0.256 | −0.250 |
| Bow rail, aft end | x +2.215 | +2.202 |
| Bow rail, forward end | x +2.555 | +2.568 |
| Tube top above the local deck | +0.072 m | +0.071 |
| Tube section | 27 mm | 27 |

The path is smoothed — three passes of a five-point mean over y and z, x pinned.
The sheer it follows is a measurement over a triangulated shell and carries a
15 mm step about every metre, which a 27 mm tube draws as a visible kink.

The rails' height is the one number in this report with real uncertainty. The
plate reads the tube's underside 65 mm clear of the capping and its top 91 mm,
both against a deck band the drawing shows almost edge-on, so the datum inside
that band is uncertain by about 30 mm. 0.058 m to the tube's centre is inside
that range and puts the gap where the three-quarter views put it.

---

## I — Transom

Refined, not rebuilt — §19 asks for the upper architecture and warns against
damaging the hull silhouette, and the silhouette numbers in §A are the evidence
that it was not.

**The aft deck now belongs to the stern moulding.** Abaft x −2.10 the liner
steps up to a shelf at z ≈ 0.73 that carries round to the transom, and every
reference shows that whole area in the black moulding rather than in the hull's
colour. Phase 4.2 left it pale, which drew as a large light wedge behind the
driver and was the most conspicuous thing wrong with the stern three-quarter.
44 faces, 1.74 m², moved from `interior_hard_liner` to `transom_black`.

The cockpit termination is now the bench and its backrest rather than an open
platform, and the coaming inlay still runs across the top of the moulding as it
does in the reference.

**What was not done**: the 774 mm of rubbing moulding the plate carries abaft
the sheer terminus. It is a hull difference, it needs a revised STL, and it has
been the one PARTIAL row in the QA table since Phase 2.

---

## J — Motor-control correction

Removed. See §B: the tiller was `rails`, and the propulsion proxies never had
one. Asserted by construction rather than by inspection — every drive's
forward-most point is the transom plane, so nothing can project into the
cockpit, and `npm run vessel` checks it on every run.

Engine size is still carried by cowling dimensions, shaft length, lower-unit
proportions and overall mass, which is what §6 asks for:

```
drive       tris     len     hgt     wid    fwd-most   deepest
compact     1520   0.542   1.185   0.325  -2.627   -0.122
standard    1520   0.651   1.398   0.382  -2.627   -0.228
large       1520   0.782   1.599   0.435  -2.627   -0.305
electric    1520   0.536   1.252   0.297  -2.627   -0.249
```

---

## K — Semantic material zones

§14, and the migration §14 permits. Seventeen zones, one mesh and one material
each.

| Was | Is | Why |
|---|---|---|
| `deck_liner` | `interior_hard_liner` | It was never a deck. It is the hull seen from inboard. |
| `deck_sole` | `cockpit_sole` | Named after the mesh it was cut from rather than the surface it is. Now also carries the step face down to the sole, which the references show dark. |
| `interior_pads` | `upholstery_primary` | It was a moulding lifted 35 mm. It is now cushions. |
| `console_trim` | `console_detail` | The dark structural shell, plus the screen's surround. |
| — | `windshield` | New. |

New roles: `CONSOLE_SHELL` and `GLAZING`. `UPHOLSTERY` is carried by real
upholstery for the first time.

**§15 is satisfied by construction and checked from both ends.**
`zonesForChannel("interiorPrimary")` returns exactly `["upholstery_primary"]`,
and each of the seven surfaces §15 forbids it from reaching — liner, sole,
hull, console body, console shell, rails, windscreen — is separately asserted
not to be on that channel. Read live at
`exterior=navy&lower=body&interior=black`:

```
upholstery_primary   #1d1f21   ← the only surface the cockpit colour reached
interior_hard_liner  #1b3a5c   ← follows the topsides, as every reference shows
cockpit_sole         #2f3030   ← unchanged
console_body         #232830   ← its own channel
console_detail       #282a2d   ← unbound
rails                #a85a1d   ← unchanged
windshield           #ffffff   ← transmission; no finish is offered on it
```

**No `upholstery_secondary`.** §14 makes it conditional on being visually
justified and it is not: every reference shows one upholstery colour on every
pad. A second channel would be a distinction the product does not make.

---

## L — Exterior material changes

§22 is that the render is flatter and more pastel than the references, and §23
asks the finishes be tuned against them. Both were done by **sampling**, not by
eye — the plate and the live frame at the same semantic point.

| Surface | Plate | Before | After |
|---|---|---|---|
| Topsides, mid | `#586764` | `#4d746e` | `#5f776c` |
| Topsides, forward | `#526362` | `#476d67` | `#4f6459` |
| Capping | `#2b2b2b` | `#172125` | `#24282d` |

The sage was **too saturated and too cool**, not too pale: 34% saturation and
20° round toward cyan against a plate that runs 8–13% and grey-green. It went to
`#66796f` with the clearcoat raised from 0.62 to 0.72 to carry the depth the
saturation was doing badly — §22's "do not merely increase saturation", read the
other way round.

The structural blacks were lifted (`#101215` → `#17191c`, capping `#14161a` →
`#191c20`) and, per §25, separated by roughness rather than by colour: the
capping is a lacquered moulding at 0.28 with a 0.46 coat, the bottom is paint
below the chine at 0.40 with 0.38, the sole is a textured covering at 0.88 with
none. Three bases within nine levels of each other reading as three materials.

In the lighting rig: the broad overhead wash came down (1.55 → 1.40), because a
near-uniform lobe lifts every surface by the same amount whichever way it faces
and that is precisely "flat"; the lower ring and the floor bounce came up.

**An honest limit.** The plate draws the hull bottom at `#414141` where it faces
the light and the live hull returns `#140c02`. No studio produces that from a
black painted surface — an albedo of 0.011 would need an irradiance near 5.6.
The plate's bottom is drawn, not lit. What §22 actually asks is that darks stay
*dimensional*, and the test for that is range rather than level: the bottom now
runs from its own shadow to a chine highlight instead of sitting at one value.
A first attempt to close the gap by brightening the lower ring to 2.7 moved the
bottom barely at all and pushed the topsides to `#728e82` and the capping to
`#404347`, which is how the limit was established rather than assumed.

---

## M — Interior material changes

§24: cognac, not flat orange. Measured — the views sheet's cushions are
`#985127`; the live cushions returned `#ca7d48`, and `#f5a06e` where the light
caught them.

**The hex was not the problem.** `#8a4d24` is a perfectly good cognac. What was
wrong was a sheen lobe of 0.34 in `#c98a52` — a broad retro-reflective lift
which, on a surface that is curved everywhere and therefore grazing to something
everywhere, acts as a second and lighter albedo. Halved to 0.16 and its colour
pulled back to a tint of the base; roughness eased from 0.78 to 0.72 because a
weakened sheen at 0.78 goes chalky; the micro-normal kept, because §24 asks for
subtle microstructure and that is what carries it. Then the base deepened to
`#6c3818` to land the RENDER on the reference rather than the swatch. Two passes
were needed. It now samples `#7b3f12` in shade and `#aa6742` in light, bracketing
the reference.

§17's distinction was widened rather than narrowed: the rails went the other way
— `#a85a1d`, roughness 0.36, metalness 0.16, clearcoat 0.46 — so a lacquered
extrusion and a matt cushion no longer share a look.

The plexi (§8) had **no tint at all**: `attenuationDistance` was 0.09 m over a
9 mm section, which applies a tenth of the colour, and the screen returned
`#75797b` — the studio reflected off clear plastic. At 0.014 m it lands about two
thirds of the way to a cool neutral `#8d9aa6`. Neutral, not blue: a tint applied
as albedo colours the reflection too, which is where "blue sci-fi glass" comes
from.

---

## N — Branding placement

All five marks present and placed by ray against the rebuilt surfaces, which is
why the two hull marks needed no attention at all — `pxlDecals` has found them
from geometry since Phase 4.1, and the mouldings they land on kept their names.

```
pxl_wordmark_starboard  x −2.297  y 0.364  z  0.998   width 0.290  n·z  0.982
pxl_wordmark_port       x −2.297  y 0.364  z −0.999   width 0.290  n·z −0.982
duna_script_{port,starboard}   on the capping, x +0.213
pxl_plexi                      on the delivered glazing's front face
```

**The plexi mark did need re-placing, and §9 is why.** Its basis used to come
from the runtime screen's own construction; the screen is geometry now, so
`measureScreenFrame` fires a ray at it and takes the surface point and normal
from what it hits. Two constants moved with it: `across` from 0.62 to 0.50 and
`capHeight` from 0.20 to 0.15. The rebuilt screen is 0.38 m across the beam but
only the middle 0.21 m is flat — the rest is the two corner radii turning aft —
and at the old values the lockup resolved to 0.253 m and ran onto the starboard
radius, so the last letter bent away from the camera. It now has 13 mm of flat
glass either side and stays on one plane at every angle.

---

## O — Reference landmark comparison

`npm run landmarks`. Seventeen landmarks, each measured on the plate and on
`public/models/PXL.glb`, normalised by LOA fore-and-aft and by hull depth
vertically. Full table in PXL_REFERENCE_QA.md §4.

**Two errors are reported for every vertical landmark and the second is the one
that means something.** The model's sheer sits 44 mm below the plate's on
average — measured, recorded and accepted in Phase 4.1 — so an absolute
comparison charges every piece of deck furniture for a hull difference nobody is
proposing to fix. The relative error measures each landmark against its own
local sheer in each source.

```
MATCHED 14 · SOURCE 2 · PARTIAL 1
```

The two SOURCE rows are the console's station (§C). The one PARTIAL is the seat
cushion's height: the drawn figure sits 0.20 m below the plate's deck line and
the delivered moulding's platform is 0.146 m below the model's sheer, so the
cushion lands 0.127 m high relative to the gunwale. Both numbers are what they
are — the platform is delivered geometry and lowering the cushion would float it
above nothing. It is source-limited and it is in §R.

Also worth stating: **the reference station for the seat is only known to about
half a metre**, because the figure's lowest visible pixel is a knee and the
drawing does not say where the knee is fore-and-aft. That row's error bar is
wider than the others'.

---

## P — Before / after visual assessment

`.qa/PHASE_4_3_comparison.png`, three rows × three columns, built by
`npm run sheet` from the reference plates' own crops so the comparison cannot be
flattered by choosing a region.

What changes, row by row:

**A · SIDE.** Before: a low dark wedge with a ring floating above it, an orange
stick projecting from beside the outboard, no screen. After: a console with a
dash that rises forward, a raked wrapped screen above it, a slim rail on
stanchions running the cockpit with a down-bend at each end, a bow rail, and the
driver's backrest standing proud of the gunwale.

**B · COCKPIT THREE-QUARTER.** Before: a flat orange ribbon round the perimeter,
a bare pale foredeck, a wedge in the middle. After: two side cushions with real
section converging into a bow chevron, a graphite sole with a dark step face, a
bench and a backrest, a console offset to starboard with a screen and a wheel.

**C · STERN THREE-QUARTER.** Before: a large pale wedge behind the driver, the
plexi mark floating in air and mirrored, no seating. After: the aft deck in the
stern moulding's black, the backrest, the bench, and the mark on real glass.

**One caveat on the sheet.** The 4.2 column was captured at a 916 × 588 slot and
the 4.3 column at 1224 × 886, because the development page's slot changed size
between the two runs. The reference cameras are responsive, so the boat sits
slightly smaller in the 4.3 cells. That works against this phase rather than for
it, which is why it was left rather than re-shot.

---

## Q — Performance after rebuild

| | Phase 4.2 | Phase 4.3 | §33 ceiling |
|---|---:|---:|---|
| Transfer | 0.341 MB | **0.397 MB** | — |
| GPU geometry | 0.566 MB | **0.657 MB** | — |
| Triangles | 20,574 | **25,503** | 100k–300k acceptable |
| Meshes / materials | 16 / 16 | **17 / 17** | draw calls controlled |

**§33 says 20k is not a target and 100k–300k is acceptable; this came in at
25.5k, and that is a result rather than a restraint.** The parts that needed
resolution got it — the cushions are 2,160 triangles against the old 276, the
rails 1,366 against 40 — and the parts that did not were left alone. The
authored upper boat is a fifth of the model; four fifths is still the delivered
hull, and the largest single saving is that the STL's 2,988-triangle wheel
became a 708-triangle one that is also correct.

§32's protected list — silhouette, cushion shapes, console, plexi, rails, design
edges — is enforced in `compress-pxl.mjs`, where every authored part now takes
the 1.2 mm error budget rather than the general 4 mm. At 4 mm a quadric collapse
eats a 27 mm tube and a 22 mm cushion fillet, because losing them costs almost
nothing in position; the coaming inlay was exactly that casualty in Phase 4.2.
The two hull shells still go into the collapse at 11,000 faces each and come out
at half.

**Visual regression, §36** — `window.__pxlQa.visual()`, five cases, all passing:

```
exterior-sage-vs-navy          8.34%  (floor 6.0%)
lower-dark-vs-body             3.74%  (floor 2.0%)
interior-cognac-vs-dark        2.59%  (floor 1.2%)
drive-compact-vs-large         2.66%  (floor 0.4%)
drive-combustion-vs-electric   2.06%  (floor 0.3%)
```

**Both drive cases returned exactly zero on the first run**, and the cause was in
the cases rather than in the boat: they were written against `?drive=…` and the
parameter is `?propulsion=…`, so both frames drew the default. That is the same
shape as the defect §36 exists to catch — a configuration that parses cleanly
and changes nothing on screen. The difference is that this time something was
looking. It is recorded in `pxlVisualCases.ts` rather than quietly fixed.

`npm run qa` is green: 1,875 configurator checks, 125 vessel checks, the model
validator, and the landmark table.

---

## R — Remaining mismatches

Honest list. Each is visible or measurable; none is hidden behind a passing test.

1. **The console's station disagrees with the July side plate by 0.83 m.** Two of
   three delivered sources put it aft and the model follows them. Only the yard
   can settle it. Landmark rows marked SOURCE.
2. **The seat cushion sits 0.127 m high relative to the gunwale** against the
   drawn figure. The delivered moulding's platform is where it is; §O.
3. **No aft deck pad.** One ambiguous orange band in one reference, and no flat
   shelf in the moulding to carry it. §G.
4. **The stern rubbing moulding is still absent** — 774 mm of it, on the plate
   and not in the STL. Source-blocked since Phase 2.
5. **The console shell is sparsely tessellated between x −1.34 and −1.14.** The
   loft has five rings and the plan has points only at its corners and arcs, so
   there is a 0.20 m stretch with no vertices. It shades correctly and reads
   correctly; it would not survive a much closer camera than `detail`.
6. **The plexi mark reads mirrored from astern.** It is printed on the forward
   face, so this is what a real printed mark does — but it renders at full
   brightness through the tint rather than dimmed, because the decal is drawn
   after the glass rather than through it.
7. **The Duna script is still a mechanical trace** of a 147 × 28 px instance.
   `provisional_brand_artwork` remains `true`.
8. **No UV set**, so the upholstery grain is triplanar rather than a real map.
9. **The blacks cannot reach the plate's drawn values.** Physical limit, measured
   and explained in §L rather than papered over.
10. **The sage foredeck renders near-white** — `#e3f5ec`, against the same paint
    on the vertical topsides at `#5f7469`. A horizontal surface under a bright
    ring genuinely is much brighter than a vertical one, so some of this is
    correct; not all of it is. The overhead key lobe was the obvious suspect and
    is not the cause — taking it from 4.2 to 3.1 moved the deck by one level.
    The source is the main ring, which an up-facing normal sees at cos ≈ 0.6 and
    which is also what gives the topsides their travelling highlight. Reducing
    it would trade the hull's key for a darker deck, which is the wrong trade,
    so this is left rather than fixed. A per-role `envMapIntensity` for
    `INTERIOR_SHELL` is the honest fix and is a change to make deliberately
    rather than at the end of a phase.

---

## FINAL ACCEPTANCE — §40

Answered after rendering and inspecting the comparison sheet, not from the
automated checks.

**DOES THE CONSOLE NOW MATCH THE REFERENCE: YES**, in form and proportion — the
dash rakes the right way, at +0.130 / +0.199 m against the plate's own figures,
with the pale panel and dark shell the references show. Its STATION follows the
August sheet and the STL rather than the July plate, and that disagreement is
between the delivered sources.

**IS THE WRAPAROUND PLEXI PRESENT AND ACCURATE: YES.** Front face, two side
returns, swept upper profile, 9.2° rake, 9 mm section, dark cap. Apex within
1 mm of the plate relative to the local deck.

**IS THE STEERING WHEEL CORRECTLY INTEGRATED: YES.** On a stalk out of the
console's aft panel, at the plate's hub height, reachable from the bench.

**IS ANY TILLER-LIKE MOTOR CONTROL REMOVED: YES.** It was the `rails` zone, not
the motor; deleted and rebuilt.

**DOES THE BOW NOW USE THE CORRECT PADDED FORM INSTEAD OF A BOX: YES.** A lofted
chevron with 75 mm of thickness, filleted edges and a crown, on a plan taken
from the moulding by raycast.

**DO THE SIDE/REAR PADDED SURFACES MATCH THE REFERENCE: MOSTLY.** The side
cushions, bench and backrest are right in form and station; the cushion height
relative to the gunwale is 0.127 m out because the delivered platform is where
it is. §R2.

**DOES INTERIOR COLOUR AFFECT ONLY THE CORRECT SOFT SURFACES: YES.** One zone,
asserted from both ends, verified live.

**DO THE RAILS MATCH THE REFERENCE: YES.** Four stations within 13 mm, tube
section within 0 mm, height within 1 mm of the plate. Real tube on stanchions
with down-bends.

**ARE THE MATERIALS VISUALLY CLOSE TO THE REFERENCE: CLOSER, NOT EQUAL.**
Topsides and capping now sample within a few levels of the plate and the cognac
brackets it. The hull bottom cannot reach the plate's drawn value and §L says
why.

**DOES THE COMPLETE BOAT NOW READ AS THE SAME PXL DESIGN: YES.** The comparison
sheet is the evidence and it does not need an explanation of why the two boats
are technically similar.

---

## What the next phase should do

1. **Send the yard three questions**, in this order: which console station is
   current, is there an aft deck pad, and can they supply the Duna logotype as a
   vector. The first two are the only things stopping this model from being
   unambiguously right; the third is the last provisional artwork on the boat.
2. **Subdivide the console shell's loft** (§R5) — twenty minutes, and it is the
   only authored part that would not survive a closer camera.
3. **The rest of the site.** §37 scoped this phase to the PXL asset, and the
   Journal, Projects, Awards and Manufacturing sections have been waiting since
   Phase Four.
