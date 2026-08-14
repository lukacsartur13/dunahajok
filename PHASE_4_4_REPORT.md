# PXL — PHASE 4.4

**Bow / gunwale / motor height / optional aft platform — final geometry correction.**

Phase 4.3 rebuilt the upper boat and measured well. This phase is not another
rebuild: it is four specific corrections that direct inspection of the
reference / before / after sheet showed 4.3 had not made, plus the first genuine
equipment option on the boat.

The four are §2 (delete the large bow element), §4–§9 (build a capping that has
width), §14–§18 (put the motor where the reference puts it) and §20–§29 (the
aft boarding platform, as a real configurable option). The primary hull is
untouched — `npm run reference` returns the same silhouette numbers it returned
in 4.1, to four decimals.

**Before any of it was changed, the references were looked at.** Not the old
geometry logic: the plates, at magnification, with a labelled pixel grid over
them (`scripts/pxl/_grid.mjs`, new this phase). Every number below is either a
plate reading with its row and column quoted, or a measurement off the exported
GLB. Where a delivered drawing asks for something that cannot be built, §O says
so rather than quietly averaging it away.

| | |
|---|---|
| Model | `assets/derived/pxl/PXL.production.glb` → `public/models/PXL.glb` |
| Working file | `assets/blender/PXL.blend` |
| Faces | 50,256 authored · 27,582 delivered · 0.447 MB transfer |
| Zones | 20 (17 + `gunwale_capping`, `platform_frame`, `platform_deck`) |
| Checks | `npm run qa` — 2,084 state · 125 vessel · model validation green |
| Visual | 7 of 7 regression cases pass |
| Sheet | `.qa/PHASE_4_4_comparison.png` — 5 rows, reference / 4.3 / 4.4 |

---

## A. The large bow element — removal

**It was `interior_hard_liner`, and it was measured before it was touched.**
`scripts/pxl/_probe44.mjs`, new this phase, reports geometry forward of a
station in the model's own axes. On the Phase 4.3 production file:

```
interior_hard_liner, forward of x 1.45
  42 triangles · 2.479 m² · 2.072 m² of it UP-FACING
  x 1.431 → 2.611 · y ±0.838 · z 0.570 → 0.873 · median z 0.570
```

Two square metres of flat, up-facing surface spanning the full beam and 22% of
the waterline length, in forty-two triangles. That is the "large light/white
polygonal element filling the bow" §2 names, and the top view in row A of the
comparison sheet is what it looks like: a pale slab occupying the forward third
of the boat.

**It is deleted, not moved.** §2 rules out shrinking, recolouring, thinning and
conditional hiding, so the faces are routed to a label — `BOW_VOID` in
`pxl_blender.py` — that `split_by_zone` never builds an object for. There is no
zone to re-enable and nothing to find in the GLB.

**The cut is at x 1.470, and the station is not arbitrary.** It is where the
delivered side platforms stop being side platforms: `pxl_upper.SPEC
.side_cushion_x` runs the cushions to 1.470 because the interior probe found the
raised moulding ending there, and the probe above finds the flat panel starting
at 1.431. They are the same edge. Everything abaft it is a real seat base
carrying real cushions and is kept; everything forward of it only closed the
bow.

**Result: 39 faces, 2.072 m², gone.** `_upface.mjs` on the delivered asset now
reports 0.000 m² of up-facing liner forward of the cut.

**§3 — nothing replaced it.** No deck plate, no smaller panel, no cushion
stretched forward. What closes the bow is described in §D.

---

## B. The gunwale / capping — reconstruction

**The zone called "Gunwale capping" since Phase Four had no top surface.**
`_upface.mjs` on the 4.3 asset:

```
hull_accent    1.342 m² total    0.000 m² up-facing
```

Zero. It is a 74 mm band of the hull's own vertical side below the sheer,
painted a different colour. §4's complaint — "the current top edge of the boat
still reads too thin when viewed from above" — is literally true: from above it
had no width at all. No measurement in `PXL_REFERENCE_QA.md` could have caught
that, because every table in it measured a profile.

**What was built.** `gunwale_capping`, a new zone: a continuous moulding round
the whole upper perimeter, 2,374 authored faces, swept over 200 stations from
x −2.626 to +2.627.

| | |
|---|---|
| Section | 46 mm, with a 10 mm outer chamfer and a 14 mm inner one |
| Top surface | falls 11 mm inboard, so it sheds water and catches a highlight |
| Width | 108 mm at the transom → 159 mm amidships → 250 mm at x 2.0 |
| Convergence | x 2.330 |
| Up-facing area | **1.736 m²** delivered (1.775 m² before compression) |

**The 46 mm is measured, not chosen.** On the August side view at 349 px/m the
capping's own outer edge reads 10 plate pixels ≈ 29 mm of flat face and the
dark sheer band below it reads 12 px ≈ 34 mm. Thicker and the capping swallows
the band; thinner and it disappears. The section is what fits between them.

**The width law follows the reference's proportions**, read off the cockpit
three-quarter against the local half-beam — about 15% of half-beam amidships,
opening out forward as §7 asks. It is a station table in `pxl_upper.SPEC
.gunwale_width` rather than a formula, so a future correction is an edit to
eight numbers.

**The outer edge is the hull's own, and getting that right took a second
attempt.** `Hull.inner_y` fires outboard from the centreline and returns the
first hit, which is the right question for a cushion and the wrong one for a
capping: at the sheer it answers with the liner's coaming. The first capping
came out with its outer edge at y 0.984 against a hull skin at 1.047 — a 63 mm
ledge running the length of the boat. `Hull.outer_y` (new) fires inboard from
outside the beam against the shell alone. The capping now measures ±1.047,
which is the hull's own figure exactly.

---

## C. Top-view comparison against the reference

**§6 makes this the phase's own acceptance view, and there was no camera for
it.** `reference_plan` is new: azimuth 0, elevation 88°, 26 m on a 13.4° lens —
nearly orthographic, for the same reason `reference_side` is. Row A of the
comparison sheet is Phase 4.3's top view beside it.

What the plan shows, against the delivered cockpit three-quarter:

* **Substantial side-edge width** — a continuous pale band with two visible
  edges, where 4.3 had a line.
* **Gradual change in width** — narrowest at the transom, widening steadily
  forward, no steps. The sweep is smoothed over four passes because the hull it
  is measured against is triangulated in facets up to 0.4 m across.
* **A clean inner cockpit boundary** and **a clean outer hull boundary** — the
  outer is the hull's own raycast edge and the inner is the width law.
* **Narrowing and widening as the references show it**, including the
  convergence.

**The reference_plan preset needed one rule changed rather than bent.** The
configurator test asserted that every preset sits inside the orbit's elevation
limits (−4° to 62°) and that a preset declares a vertical floor exactly when
`elevation >= 30`. A plan view fails both, and both failures were the rules
being written from the cases that existed:

* The orbit limit applies to presets a viewer can DRAG from. Reference
  compositions are chosen on the bench and never orbit-entered; 88° is not a
  composition anybody should be able to drag a product into, which is why the
  orbit stops at 62 and why the plan is exempt. The physical bound — never under
  the water, never past the pole — still applies.
* The vertical floor is needed where the subject's PROJECTION is nearly square.
  Looking straight down at this boat gives its own 5.25 × 2.09 plan, an aspect
  of 2.5 — the LEAST square thing the camera sees. The rule now says that, with
  the plan as the declared exception.

---

## D. Bow convergence

**§7's diagram, built as a construction rather than as a special case.** The
capping is two side sweeps over the same station list. Their inner edges are
drawn in toward the centreline through a taper, and at x 2.330 both reach y = 0,
touch, and weld into one surface.

```
 x < 2.000   two side forms, cockpit open between them
 2.000→2.330 the opening narrows as the forms widen
 x > 2.330   one bow structure, made of the two forms arriving together
```

**The taper is squared rather than smoothstepped, and that is a decision with a
reason.** Smoothstep spends half its travel in the first third and closed the
cockpit at x 2.13, which put 0.50 m of solid deck forward of the seating —
visibly a foredeck again, just a smaller one. `t²` holds the opening to x ≈ 2.25
and then shuts it quickly.

**The converged region is 0.30 m long**, from x 2.330 to the stem at 2.627.
Phase 4.3's panel was 1.18 m. That is the difference between a bow termination
and a foredeck, and it is why §3's instruction — "there should NOT be a giant
polygon closing the front of the cockpit" — is satisfied by there being no
polygon there at all: what closes the bow is the capping, arriving.

**The bow stays open.** Forward of the cushions and abaft the convergence the
cockpit shows the hull's own inner shell, which is what the delivered cockpit
three-quarter shows in the same place — a dark recess between the bow cushion
and the capping.

---

## E. Rail repositioning

**§12 — re-measured against the new structure, not transformed.** `_rail_path`
used `hull.sheer(x) + rail_above_sheer` as its datum, which was correct while
the gunwale had no top surface and is wrong now that it has one: the same number
would bury every stanchion foot 46 mm inside the new moulding.

The height is now **raycast against the capping object itself** (`_gunwale_top`),
with the sheer less half the capping's fall as a fallback, so a rail can neither
float nor intersect. The plan position comes from `gunwale_plan`'s outer edge
less `rail_inboard`, which puts both pairs on the capping rather than over the
water. Stanchion feet are seated 30 mm INTO the moulding, the same seat the
wheel's stalk takes, so no gap can open at any camera angle.

**Landmarks after the move** (`npm run landmarks`):

| Landmark | Reference | Live | Error |
|---|---:|---:|---|
| cockpit rail, top | 0.960 | 0.907 | −2.3% rel · CLOSE |
| cockpit rail, aft end | −2.056 | −2.062 | −0.1% · MATCHED |
| cockpit rail, fwd end | −0.256 | −0.250 | +0.1% · MATCHED |
| bow rail, aft end | 2.215 | 2.202 | −0.2% · MATCHED |
| bow rail, fwd end | 2.555 | 2.568 | +0.3% · MATCHED |

Overall: **13 MATCHED · 1 CLOSE · 1 PARTIAL · 2 SOURCE**, up from 12 MATCHED.

---

### Bow rail termination — §13

**Inspected on the plate before it was rebuilt.** `.qa/ref44/ref-cockpit-bow.png`
— the cockpit three-quarter's bow at 2.2× — shows both bow rails running level
and then breaking sharply down AND inboard into a single kinked foot, close to
the stem. That kink is now drawn: the last two path stations are pulled inboard
by 20 mm and 52 mm, applied after the path smoother so it cannot round the
sharpness back out.

**The run was cut short and then restored, which is worth recording.** The first
version clamped the bow pair to `gunwale_converge_x − 0.072` on the reasoning
that forward of the convergence a rail would be running down the middle of the
bow. That reasoning was wrong twice — the rails are inboard of the OUTER edge,
so they follow the sheer whether or not there is a cockpit beside them, and the
capping at x 2.555 is still 0.25 m of half-beam. `npm run landmarks` is what
said so: the forward end went to 2.271 against the plate's 2.555 and the row
dropped from MATCHED to PARTIAL at −5.4% of LOA. §13 asks that the rails
complement the thickened bow form; running them onto it is complementing it,
stopping them short of it is neither.

**The bow cleats moved with them.** `build_bow_fitting` used to search a grid of
guessed half-beams and accept a hit 0.03–0.16 m below the sheer, which is what
the deleted liner panel measured. The capping's top is 5–11 mm below the sheer —
inside the old rule's dead band, so the cleats would simply have failed to
place. Placement is now derived: centred across the capping's own width at the
station Phase 4.2 measured, with the height raycast at that exact point.

---

## F. Motor vertical calibration — §14, §15

**The measurement.** `scripts/pxl/_grid.mjs` over the stern three-quarter, using
the transom's own visible height as the scale — top of the moulding at plate row
990, its foot at 1150, so 160 px spans the model's 0.832 m and the view runs at
192 px/m.

| Landmark | Plate row | Normalised (transom heights, down) |
|---|---:|---:|
| top of the transom moulding | 990 | 0.000 — the datum |
| **top of the motor cowling** | **985** | **−0.031** |
| bottom of the motor cowling | 1110 | 0.750 |
| cowling height | 125 px | 0.651 m |

**The cowling's top is level with the transom. Phase 4.3 put it at −0.601 —
0.42 m of engine standing over a gunwale it should have been level with.** That
is §14 in one number, and the stern three-quarter in row D of the comparison
sheet is what it looked like.

**The datum changed, and that is the correction.** Until this phase the chain
started at the cowling's UNDERSIDE — `cowl.position.y = MOUNT.y + height/2`, so
every powerhead stood on top of the transom — while the plate hung from the
transom independently. Two ends of the same engine, positioned by two unrelated
numbers. Now:

```
cowlTop      = MOUNT.y + spec.mountRise      measured off the reference
cowlBottom   = cowlTop − spec.cowl.height    the engine's own size
plateY       = cowlBottom − spec.shaft       the engine's own leg
```

`shaft` was redefined with it: it used to be measured from the transom top,
which made it a second expression of the mounting height rather than a dimension
of the engine.

**§16 — the mounting was rebuilt, not just lowered.** Dropping the cowling alone
would have left the clamp at the transom top with the engine hanging in free air
beside it. The clamp is the one part whose height is fixed by the BOAT, so it is
now authored between the transom top and the cowling's upper third — where a
swivel bracket actually grips — and the two are guaranteed to overlap because
`mountRise` is small and positive on every drive. The bracket's forward face is
still the transom plane exactly, measured and corrected for the extrude bevel,
so nothing enters the hull.

**§19 — no tiller.** Preserved by construction: there is nothing in
`buildDrive` or `build_rails` that could draw one, and the 4.3 zone that read as
one in profile is still gone.

---

## G. Drive-specific mount calibration — §18

**"Do NOT use one global transform blindly."** There is no global transform.
Each drive resolves its own chain from its own `mountRise`, `cowl.height` and
`shaft`, and `npm test` asserts the four rises are four distinct numbers so a
find-and-replace cannot quietly collapse them.

| Drive | mountRise | cowl top | cowl bottom | plate | lowest | leg |
|---|---:|---:|---:|---:|---:|---:|
| compact | 0.020 | 0.647 | 0.247 | 0.020 | −0.160 | 0.252 |
| standard | 0.027 | 0.654 | 0.154 | −0.060 | −0.273 | 0.244 |
| large | 0.033 | 0.660 | 0.045 | −0.120 | −0.368 | 0.202 |
| electric | 0.024 | 0.651 | 0.286 | −0.080 | −0.297 | 0.388 |

Normalised against the transom, every cowling top lands within 0.009 of the
reference's −0.031. The rises differ because a bigger engine is trimmed a hole
or two higher on a real bracket — and because collapsing them to one number
would put the large cowling back over the sheer.

**`bottom of cowling` is judged on `large` alone**, and matches at 0.700 against
0.750. The reference draws ONE engine: 125 plate pixels at 192 px/m is 0.651 m,
which is the large proxy's 0.615 m cowling and nothing else's. Charging a
compact drive for not being as tall as the drawing would be asserting that the
range has one member; the other three are reported as SIZE rather than as
errors. Full table in `PXL_REFERENCE_QA.md` §4b.

**The existing clearance assertions still hold**, re-tuned per drive: the plate
lands between 0.02 m above and 0.12 m below the waterline, every propeller is
submerged, and nothing hangs absurdly below the keel at −0.2206.

---

## H. The boarding platform — reconstruction

**Measured off the August side view**, which §21 names and which is the only
delivered drawing that shows the platform orthographically. Grid readings at
349 px/m against a sheer at plate row 398:

| Reading | Plate | Model |
|---|---:|---:|
| slab, top edge | row 581 | z 0.179 — 0.524 m below the sheer |
| slab, bottom edge | row 618 | z 0.073 — 73 mm above the static waterline |
| aft end | col 436 | 0.504 m abaft the transom |
| thickness | 37 px | 0.106 m |

**The July plate does not show it at all**, which is itself a finding: two
delivered drawings of the same boat, one with and one without, is what an option
looks like. It is why the configurator's default is OFF (see §K).

**The forward face is buried in the hull, not butted to it.** `scripts/pxl/_aft.mjs`
walks the shell's aft-most station by height: at the platform's own z 0.073 →
0.179 the hull ends at x −2.609, which is 18 mm FORWARD of the transom plane the
mount is authored on. A platform starting at −2.6266 stood 18 mm off the boat
and drew as a dark seam between the two. 50 mm of overlap puts every forward
face inside the shell, which is invisible from outside and cannot open a gap at
any angle.

---

## I. Platform support and frame — §22

**TRANSOM → SUPPORT / FRAME EXTENSION → WOOD / TEAK STEP**, built as three
things rather than implied by one.

* **Two bearers**, trapezoids in plan following the transom's own taper aft, 78 mm
  deep, carrying the tread.
* **A knee at each**, 145 mm tall against the transom. The reference shows the
  support meeting the hull as a bracket rather than as a butt joint, and without
  it the platform reads as a shelf glued to the back of the boat.
* **A cross-member** running the full beam under the transom, in the 110 mm
  every drive leaves clear.

**The cross-member exists because the first version failed inspection.** With a
parallel-sided notch and no beam, the stern three-quarter showed two teak pads
either side of an engine rather than one structure — which is exactly what §21
warns against, from the other direction. The tread now runs continuously from
gunwale to gunwale across the transom, and the notch begins abaft the boarding
edge rather than at it.

Structural material is `#232324`, sampled off the reference frame beneath the
tread (`#232323` / `#333434`).

---

## J. Teak material — §23

**Sampled, not chosen.** `scripts/pxl/_sample.mjs` walks the reference tread from
its shadowed inboard end to its lit outboard one — `#744520`, `#985927`,
`#9f5e2c`, `#b0753f` — and the lit sample is the surface's own colour: sRGB
`#b0753f`, linear (0.434, 0.178, 0.050). Roughness 0.68, because oiled teak is
not a varnished sole.

**It is laid as decking, not painted on.** 92 mm planks with 8 mm caulking seams
running fore-and-aft, clipped station by station to the trapezoid so the notch's
edge is a real diagonal rather than a staircase. 520 authored faces.

**A new surface family.** `PxlZoneSpec.finish` gains `"wood"`, with an
environment intensity of 0.55 — between a moulding and a paint, which is what
carries a sheen along the grain and almost none across it.

**It is separate from everything, by construction rather than by care.**
`platform_deck` takes **no configuration channel at all**, so
`applyConfiguration` skips it: an exterior change cannot reach it, an interior
change cannot reach it, and the hull's material sweep does not run over it. The
same is true of `platform_frame`. §33's last three requirements are satisfied by
the binding rather than by a rule somebody has to remember.

---

## K. Configurator integration — §24, §25, §27, §28

**EQUIPMENT is a category now, under the rule that excluded it.** Phase Four's
deferral reason was checkable rather than vague: "no equipment range supplied;
the only optional mesh in the asset is an undocumented flush cockpit cover, and
one undocumented cover is not a category". What changed is the asset, not the
standard. The cockpit cover is still undocumented and is still not offered —
§25's "do not add artificial additional equipment just to fill it" is why it did
not come along.

`PXL_AVAILABLE_CATEGORIES.length` is 5 because five entries have options in
them. The test asserts EQUIPMENT carries exactly one control.

**§24 — a real geometry toggle.** `platform_frame` and `platform_deck` are
exported in every build with `visibleByDefault: false`; the option writes into
`PxlConfiguration.equipment`, the zone-keyed registry Phase Four built for
exactly this and never used. Nothing about the asset differs between the two
states. The two configurations differ in which meshes are drawn and in no other
field — asserted.

**The control's value is DERIVED, not stored.** There is no
`equipment.boardingPlatform: boolean` anywhere: the truth is which zones are
visible, and the control reads its current option back out of that. A second
field holding the same fact is a second field that can disagree, and the
disagreement would show as a highlighted option that is not the boat on screen.

**One defect was caught by an assertion that predates this phase.**
`selectedOption` matches on the value an option writes, and `optionValue` knew
about finishes, treatments, surfaces and drive variants — none of which an
equipment option writes. It wrote correctly and read back as "Not fitted". The
round-trip check in the catalogue suite failed on the first run; the fix is one
branch, and it is documented at the function rather than in a commit message.

**§28 — the camera is suggested once.** `suggestedView: "stern_3q"`, through the
same one-shot mechanism the other four categories use: the configurator moves on
FIRST entry to a category and never again, and any orbit afterwards puts the
viewer in `free` and keeps them there. No special case, so nothing can forget to
let go. Asserted to be a customer-facing preset, never a reference composition.

**§27 — the summary names it and carries no price.** The EQUIPMENT line reads
"Aft boarding platform / Aft Boarding Platform"; every catalogue string is run
against `PXL_CATALOGUE_FORBIDDEN`, and a summary line has no price field to
print.

---

## L. URL, share and reset — §26

The platform serialises under `platform`, its own reserved key. `equipment` stays
reserved but unused, so links that carried it before still sanitise the same way.

| Behaviour | Result |
|---|---|
| `serialiseConfiguration(on)` | `platform=on` |
| `serialiseConfiguration(off)` | `""` — the delivered boat still serialises to nothing |
| `parseConfiguration("platform=on")` | round-trips to the same visibility |
| `?exterior=navy&platform=maybe` | navy applies; `platform` rejected; falls back to OFF |
| `applyConfigurationToHref("/dev/pxl", on)` | `/dev/pxl?platform=on` |
| share link with other params | survives the round trip |
| `clearConfigurationFromHref` | `/dev/pxl` — reset clears it with everything else |

All of it comes from the generic machinery: the control is data, so nothing in
`pxlConfig`'s serialiser, parser or reset needed a branch for it.

---

## M. Clearance validation — §29

**"The aft platform geometry must be designed around the propulsion
installation."** It is, and the design is the notch's shape.

**The well is tapered, and the taper is derived.** A swivelling drive's parts
sweep sideways in proportion to how far ABAFT the steering axis they are, so the
room a platform must give grows with distance aft and is nearly nothing where
somebody steps aboard. `platformClearance` in `pxlCatalog` reports the reach of
every part inside the platform's height band, at 30° of lock, at both ends of
where it overlaps the structure:

| Drive | at the transom | at the aft edge | binding part |
|---|---:|---:|---|
| compact | 0.155 | 0.333 | propeller disc |
| standard | 0.228 | 0.406 | cowling, lower corner |
| large | 0.255 | 0.433 | the same, hung lower |
| electric | 0.126 | 0.276 | the leg |

**Well: ±0.280 at the transom, ±0.470 at the aft edge.** 25 mm of margin at both
ends against the worst case, and 625 mm of tread a side at the boarding edge.

**Two refinements the first calculation needed, both of which changed the
answer.** A single "widest thing anywhere" figure demanded ±0.54 and would have
left two slivers:

* **Height.** The propeller is the widest thing on every drive and can never
  touch the platform, because it hangs below the frame. Only parts inside the
  band count.
* **Fore-aft.** The large cowling's aft corner reaches x −3.342 at 30° of lock,
  which is 0.21 m ABAFT the platform's own aft edge — it sweeps past the
  structure rather than over it. The reach is evaluated where the part and the
  platform actually overlap.

**Which part passes through the well depends on the drive**, and the test asks
the geometry rather than assuming: a compact drive's cowling stops 68 mm above
the tread and it is the leg that goes through; a large drive hangs low enough
that the bottom of the COWLING does. Both are checked.

**The duplication is checked rather than trusted.** The clearance arithmetic is
TypeScript and the geometry is Python. `scripts/pxl/validate-model.mjs` measures
`platform_frame` and `platform_deck` in the exported GLB and fails the build if
they disagree with `PXL_PLATFORM` by more than 10 mm. It was verified to bite by
perturbing the declared well and watching the build fail.

**It caught a real defect.** The teak planks are clipped per station to the
trapezoid, and a plank falling entirely inside the notch at one end had its span
sorted rather than collapsed — turning an empty span into one running back INTO
the well. The notch's aft edge measured 0.365 m against a declared 0.470. The
fix makes such a plank a triangle, which is also the diagonal the notch is
supposed to have.

---

## N. Visual regression — §34

`.qa/PHASE_4_4_comparison.png`, five rows, reference / before / after.

| Row | Comparison |
|---|---|
| A | PLAN — 4.3's top view against 4.4's `reference_plan` |
| B | COCKPIT 3Q — `reference_top_3q`, both phases |
| C | SIDE — `reference_side`, both phases |
| D | STERN 3Q — `reference_stern_3q`, both phases |
| E | STERN 3Q — platform OFF against ON, both Phase 4.4 |

**Row A's before-frame is not from `reference_plan`, and cannot be.** The preset
was added this phase precisely because §6 says the model had been validated from
the side and that was no longer sufficient — so 4.3 has no plan capture to put
beside it. `p43b-top.png` is 4.3's own top view from a free camera at a similar
elevation. It answers §35's question and it is not a pixel-comparable pair; the
sheet says so in the cell rather than implying otherwise.

**Pixel-diff cases, `window.__pxlQa.visual()`:** 7 of 7 pass, including two new
ones — `platform-off-vs-on` (0.72% against a 0.4% floor) and
`platform-teak-ignores-exterior` (4.48% against 3.0%). Full table in
`PXL_REFERENCE_QA.md` §5, including the second one's first-run failure and why
the floor rather than the boat was wrong.

---

## O. Remaining mismatches

**Deliberate, and named.**

1. **The reference's leg depth is not built.** §17 asks for five stern
   landmarks; two are matched and three are marked SOURCE. The drawing puts the
   anti-ventilation plate 1.96 transom-heights down — **0.88 m below the static
   waterline** — and the propeller deeper again. That is a large engine drawn
   nearer the camera than the transom it hangs on. Building it would put the
   plate on the riverbed, submerge the lower unit far past any plausible
   installation, and break the platform clearance. The three landmarks that
   describe how the engine READS against the boat are matched; the two that
   describe how deep the drawing sinks it are not, and this is the trade.

2. **The dark sheer band is heavier than the plate's.** The reference shows
   ~34 mm of band under a ~30 mm capping edge. `hull_accent` is the delivered
   STL's own zone at 74–115 mm, and the capping covers its top 46 mm, leaving
   ~28–69 mm visible. §31 says do not remodel the hull, so it stays. Fixing it
   would mean re-cutting a hull zone that measures well.

3. **The platform's own reference is one drawing, seen once.** Height,
   thickness and aft projection come from a single orthographic view. Nothing
   confirms its width, its notch, or that it clears the engine the yard intends
   — the motor well here is derived from our own four proxies. If a real engine
   arrives, the well is one number and the test that guards it already exists.

4. **`seat cushion, top` is still PARTIAL at +10.9% relative.** Unchanged from
   Phase 4.3 and unchanged in cause: the reference is the drawn figure's own
   lowest point and its station is known to about half a metre.

5. **The console station conflict is untouched.** The July plate and the August
   sheet disagree by 0.83 m. Still the largest single uncertainty in the model,
   still only the yard can settle it.

6. **The bow's open recess is a judgement.** Forward of the cushions and abaft
   the convergence you see the hull's inner shell. The delivered cockpit
   three-quarter shows a dark recess in the same place, which is what this was
   built to, but the drawing is not detailed enough there to say whether it is
   a moulded well, a locker lid, or open structure.

---

## §38 — Final acceptance

Answered by looking at `.qa/PHASE_4_4_comparison.png`, `.qa/p44-plan.png`,
`.qa/ref44/final-plan.png` and the reference crops in `.qa/ref44/`, not from the
test output.

| Question | Answer |
|---|---|
| LARGE FALSE BOW ELEMENT REMOVED | **YES** — 2.072 m² deleted; 0.000 m² of up-facing liner remains forward of x 1.47 |
| TOP GUNWALE NOW HAS REAL WIDTH/THICKNESS | **YES** — 1.736 m² of up-facing capping against 0.000 m² before, 46 mm section |
| GUNWALE WIDENS AND CONVERGES CORRECTLY AT BOW | **YES** — 108 → 250 mm, then to the centreline at x 2.330 |
| TOP VIEW NOW READS LIKE THE DELIVERED PXL | **YES** — row A of the sheet; the perimeter, the widening and the bow all read as the cockpit three-quarter draws them |
| MOTOR IS LOWER AND MATCHES THE REFERENCE POSITION | **YES** — cowling top at −0.031 ± 0.009 transom heights, from −0.601 |
| ALL PROPULSION OPTIONS MOUNT CORRECTLY | **YES** — four independent chains, all four clear the well at 30° of lock |
| OPTIONAL REAR BOARDING PLATFORM COMPLETE | **YES** |
| PLATFORM HAS REAL SUPPORT FRAME | **YES** — two bearers, two knees, a full-beam cross-member |
| PLATFORM HAS SEPARATE TEAK/WOOD SURFACE | **YES** — own zone, own role, own surface family, no channel |
| CONFIGURATOR EQUIPMENT OPTION WORKS | **YES** — geometry toggle, URL, share, reset, summary, camera |

The first five are the ones §38 says to keep iterating on if any is NO. None is.

---

## Files

**Geometry**

* `scripts/pxl/pxl_upper.py` — `build_gunwale`, `build_platform`, `Hull.outer_y`,
  `gunwale_plan`, `_gunwale_top`; `_rail_path` and `build_rails` re-datumed
* `scripts/pxl/pxl_blender.py` — `BOW_VOID`, three new zones, `build_bow_fitting`
  re-seated, materials
* `scripts/pxl/compress-pxl.mjs` — the three new zones in the TIGHT set

**Runtime**

* `src/webgl/scenes/pxl/pxlModel.ts` — `gunwale_capping`, `platform_frame`,
  `platform_deck`; `SHEER_BAND`, `PLATFORM_FRAME`, `PLATFORM_DECK` roles;
  `PXL_PLATFORM`, `PXL_STERN_REFERENCE`
* `src/webgl/scenes/pxl/pxlCatalog.ts` — EQUIPMENT, `mountRise`,
  `sternLandmarks`, `platformClearance`
* `src/webgl/scenes/pxl/pxlConfig.ts` — `boardingPlatform` accessor
* `src/webgl/scenes/pxl/pxlPropulsion.ts` — the mounting chain
* `src/webgl/scenes/pxl/pxlPresets.ts` — `reference_plan`
* `src/webgl/scenes/pxl/pxlVisualCases.ts`, `PxlVessel.tsx`, `pxlStrings.ts`

**Measurement, new this phase**

* `scripts/pxl/_grid.mjs` — labelled pixel grid over a plate crop
* `scripts/pxl/_probe44.mjs` — geometry forward of a station, in model axes
* `scripts/pxl/_upface.mjs` — up-facing area per zone
* `scripts/pxl/_aft.mjs` — the hull's aft-most station by height
* `scripts/pxl/landmarks.mjs` — the stern table
* `scripts/pxl/validate-model.mjs` — the platform mirror check
