# PXL — REFERENCE FIDELITY QA

**Phase 4.1, §36 · updated Phase 4.2 · rewritten Phase 4.3 · extended Phase 4.4.** The delivered PXL design renders are the
primary visual authority. This document records, element by element, how far the
live WebGL configurator is from them, how that distance was established, and what
would close it.

**Nothing here is marked MATCHED on the strength of a look.** Every row cites
either a measurement (`scripts/pxl/reference-qa.mjs`, `scripts/pxl/measure-upper.mjs`,
`scripts/pxl/landmarks.mjs`, `scripts/pxl/_mark.mjs`) or a deterministic frame
rendered through `window.__pxlQa` and inspected. Rows that were judged by eye
say so in the METHOD column.

**WHAT PHASE 4.3 ADDED TO THIS DOCUMENT, AND WHY.** §30 of the 4.3 brief is
that Phase 4.2's numbers all passed while the boat was visibly wrong. That is
true and this document is where it happened: rows 1–7 were green throughout and
they are all about the hull, because a silhouette rasteriser is all §36 of the
earlier brief gave us and a silhouette rasteriser cannot see a console.

Two sections are new. **§4 is a landmark table** — named points a person can
find in both the drawing and the model, seventeen of them, most of them above
the sheer where the old measurements stopped. **§5 is a visual regression run**:
pairs of configurations that must not render to the same pixels. Between them
they cover the two failure modes the silhouette missed — geometry above the
deck, and a control that changes nothing.

**WHAT PHASE 4.4 ADDED, AND THE SAME ARGUMENT ONE STEP FURTHER.** §6 of the 4.4
brief: "the current model was previously validated heavily from the side. That
is no longer sufficient." It is the 4.3 argument applied to the axis 4.3 kept —
every table above measures a PROFILE, and a gunwale capping's width is invisible
in profile. The `hull_accent` zone was labelled "Gunwale capping" for four
phases and carried **0.000 m² of up-facing surface**; nothing in this document
could have said so, because nothing in it looked down.

Two more sections are therefore new. **§4b is the stern landmark table**, which
§17 asks for and which needs its own datum — a drive hangs off the transom
rather than standing on the deck. **§7 is the plan measurement**: the up-facing
area of the capping, before and after, which is the one number that answers §35
without an opinion in it.

---

## 0. Sources

| Plate | File | Role |
|---|---|---|
| Side profile | `assets/source/pxl/pxl-side-20240719.jpg` | The datum. The only true orthographic profile delivered. |
| Views sheet | `assets/source/pxl/pxl-views-20240815c.jpg` | Cockpit layout, stern 3Q, motor scale. |
| Colour studies ×4 | `assets/source/pxl/pxl-colours-0{1..4}.jpg` | Six finishes on water, plexi mark, interior colour. |
| Geometry | `assets/source/pxl/PXL-3D.stl` → `public/models/PXL.glb` | The hull the live scene actually draws. |

Measurement basis: the plate and the model are aligned on their **sheer
termini**, not on overall length. The plate's stern rakes some 774 mm abaft the
sheer end; aligning overall span instead stretches the plate by that rake and
dumps the whole error into depth. See `PXL_SIDE_PLATE` in `pxlReference.ts`.

Scale: **345.1 px/m** over 5.235 m of hull.

---

## 1. Comparison table

Statuses: **MATCHED** (measured agreement, or visually indistinguishable at the
reference camera) · **CLOSE** (measurably off, below the threshold at which a
viewer would call it a different boat) · **PARTIAL** (visibly different, work
identified) · **BLOCKED BY SOURCE ASSET** (cannot be fixed in code).

| # | Reference element | Live implementation | Status | Difference | Method | Action |
|---|---|---|---|---|---|---|
| 1 | **Overall side silhouette** | `PXL.glb` hull, `reference_side` camera | **CLOSE** | Hull depth: plate 1.133 m, model 1.163 m → **−2.6%** | Silhouette rasteriser, 21 stations | None. 2.6% on depth is inside the plate's own line weight. |
| 2 | **Sheer line** | `hull_primary` upper edge | **CLOSE** | mean **58 mm**, max **151 mm**, bias −58 mm (n=10 clear stations) | Rasteriser | None in code. The model sits marginally *deeper* than drawn; a revised STL would close it. |
| 3 | **Keel line** | `hull_lower` | **MATCHED** | mean **45 mm**, max **80 mm**, bias −31 mm (n=21) | Rasteriser | None. |
| 4 | **Bow** | Model bow | **CLOSE** | Plate bow extends marginally further forward at the overlay's authored calibration; within the sheer deviation above | Overlay bench, `?pxlReference=1` | None. |
| 4b | **Gunwale capping, forward run** | `hull_accent` | **MATCHED** | **Corrected in Phase 4.2.** The capping ran out at x +2.06 on a hull reaching +2.63, leaving 570 mm of topsides colour running to the deck edge and a hard termination that read as a wedge at the stem. The plate carries the band at every one of 144 clean stations, x −2.62 → +2.53. Now cut on a plane at z 0.860 and carried to the stem, 74 mm deep. | Side-plate column sweep; `pxl_blender.py` | None. |
| 4c | **Bow deck fitting** | `bow_fitting` ×2 | **CLOSE** | **Authored in Phase 4.2.** A flush cognac pull-through cleat, 190 × 72 mm, on each bow side deck — the part both three-quarter references show. Placed by raycasting the real deck, landing 41–68 mm below the sheer. Aperture detail is simplified to a two-bar frame. | Views sheet, bow crop; deck raycast | None at configurator viewing distance. |
| 5 | **Stern / transom** | `transom_black`, `stern_spoiler` | **CLOSE** | **Authored in Phase 4.9, as an option.** The plate carries 774 mm of raked moulding abaft the transom that the delivered STL does not have; the August stern three-quarter draws the same station as a plain transom with a teak platform. Both are now buildable: `stern_spoiler` is the plate's rake, and it ships with the boarding platform, because it lands on the platform's own tread and shares its plan. Profile sampled off the plate at four stations — top 0.243 → 0.753 m below the sheer datum over the run, underside flat at 0.87, tip 102 mm. The model's platform is 504 mm rather than the plate's 700, so the rake is laid on the platform the model has. | Plate silhouette sweep, `build_stern_spoiler` | The PLAN width is not authored: the inner face is the platform's outer side and the outer face is the hull's own wall carried aft, both measured. The section is a wedge because the topsides tumble in — 41 mm at the transom, ~100 mm at the tip — and the moulding dies out on its own at z 0.56, where the wall meets the platform's edge. |
| 6 | **Dark lower treatment (edge height)** | `hull_lower`, `lower=dark` | **MATCHED** | Band edge sits at **71.4%** of local hull depth in the plate, **72.1%** in the model — 0.7 points apart | Rasteriser, band-edge detection, n=12 plate / n=18 model | None. This is the strongest single agreement in the comparison and it is the PXL's key identity line. |
| 7 | **Dark lower treatment (shape)** | as above | **CLOSE** | Band deviation mean **111 mm**, max **269 mm**; the worst stations are forward, where the plate's band lifts faster than the model's | Rasteriser | Accepted. Follows the hull geometry, so it inherits row 2's difference. |
| 8 | **Console** | `console_body`, `console_detail` (Phase 4.3 reconstruction) | **CLOSE** | **Rebuilt in Phase 4.3.** The STL's wedge is gone. The dash now rakes UP toward the bow at +0.130 m aft and +0.199 m forward of the local deck line, against the plate's own +0.130 and +0.199 — the STL's raked DOWN, which is why it read as a wall. Two materials: a pale aft panel and a dark shell, as both three-quarters show. Remaining difference is the STATION, where the sources disagree — see §4. | `measure-upper.mjs`, `landmarks.mjs`, deterministic frames | Ask the yard which station is current. Not a build error. |
| 9 | **Windshield / plexi** | `windshield`, delivered geometry | **MATCHED** | **Rebuilt in Phase 4.3 and no longer a runtime plane.** A wrapped screen with a front face, two side returns, a swept upper profile, 9.2° of rake and 9 mm of real section, with a 24 mm dark cap along its top edge. Apex lands +0.487 m above the local deck against the plate's +0.486; the wing's aft end +0.263 against +0.264. | `landmarks.mjs`, `detail` frames | None. |
| 10 | **Rails / grab rails** | `rails`, swept tube, cognac lacquer | **MATCHED** | **Rebuilt in Phase 4.3.** The delivered forty-triangle zone was not rails at all — x −2.59 → −1.16 at y −0.18 → +0.27, a bar on the CENTRELINE running forward from the transom, which in profile is the tiller §6 of the 4.3 brief reports. Now four runs of 27 mm tube following the hull's own sheer, with stanchions and a down-bend at each end. Four stations within 13 mm of the plate; section and height within 1 mm. | `measure-upper.mjs`, `landmarks.mjs` | None. |
| 11 | **Interior — colour zoning** | `upholstery_primary` / `cockpit_sole` / `interior_hard_liner` | **MATCHED** | **Finished in Phase 4.3, §15; extended in 4.7.** The cockpit colour has reached ONE zone since 4.3, and each of the seven surfaces §15 forbids it from touching is separately asserted not to be on it. What 4.7's interior material correction adds is the other half of the same question — not "where does the interior colour go" but "what colour is the floor when it goes nowhere". It was the HULL's: `interior_hard_liner` is bound to `hullPrimary`, and it carried the raised side platforms and the whole forward floor, so the plan view of the 4.6 boat is teal from the console to the stem. Every up-facing interior surface below z 0.62 is now `cockpit_sole`. | Live `__pxlQa.zones()`; asserted from both ends by `npm test`; §5 pixel diff; `p47-plan.png` | None. |
| 11b | **Interior — colour value** | `pxl_interior_cognac` `#8a4d24` | **MATCHED** | Warm cognac, held below the rails' chroma so it reads as upholstery rather than orange plastic | Live material read (`__pxlQa.zones()`), frames vs plates | None. Reference-derived preset is the default. |
| 12 | **Interior — material response** | Triplanar micro-normal (`pxlGrain`) | **MATCHED** | Grain visible at the `detail` camera. **Phase 4.2 moved it**: `UPHOLSTERY` and `SOLE` carry it, `INTERIOR_SHELL` does not — it now wears sprayed paint, and graining it would put leather on a topcoat. | Deterministic frames | None. |
| 12b | **Interior — forward upholstery footprint and height** | `upholstery_primary`, two side cushions + bench + backrest | **CLOSE** | **Traced in 4.7.1, smoothed and levelled in 4.7.2.** The plan comes from the plate through a solved camera; the seating plane is authored at z 0.570 rather than raycast, so the top is 0.652 at the aft end and 0.652 at the bow — 4.7.1's cushions followed the forward liner's rising flat and climbed 248 mm. | `npm run upholstery:trace` (IoU 59.1%, 83.3% of the model on the plate); `npm run upholstery` (topology, mirror, level); `.qa/p472-debug-side.png` | 67.1% of the reference is covered; the model is now the smaller footprint. |
| 12e | **Interior — the raised side platform** | deleted; `cockpit_floor` | **CLOSE** | **New row, 4.7.2.** The delivered STL carries a shelf 0.19 m above the sole running both sides of the cockpit, with nothing under it — `_stack` finds the hull's bottom as the next surface down. It read as part of the shell until Phase 4.7 moved up-facing interior below z 0.62 into the sole, after which it read as a long black bench. It is now deleted between x −1.70 and 0.00 and the floor continues through at z 0.366. | `_stack.mjs`; `.qa/p472-clay-top.png` | The clear floor is 1.97 m across, which follows from continuing the sole to a shell that is nearly wall-sided at that height. Worth putting to the yard if their boat has a side deck there. |
| 12d | **Interior — the floor under the padding** | `cockpit_sole`, `forward_sole` | **CLOSE** | **New row, 4.7.** Two defects, both invisible until the padding stopped covering them. (1) `_probe47` drops rays through the 4.6 production model and finds the INSIDE OF THE BOTTOM OF THE BOAT at x 1.36 → 1.48 across most of the beam — the bow-panel deletion cut at 1.410 and the forward liner began at 1.470, and 4.6's crossing pad lay over the difference. Both stations are now 1.330. (2) The floor rendered a mid grey; its delivery base is down from 0.028 to 0.010 linear, which takes the plan view's sole from 103 to 74 of 255. | `_probe47.mjs` plan scan; `p47-plan.png` pixel read | The reference draws the sole at about 37 of 255 and the model reads 74. The remaining gap is the studio rig, not the material: the same rig renders the cognac 1.9× the plate's value at this camera. |
| 12c | **Coaming inlay** | `coaming_inlay`, 30 mm, full length | **MATCHED** | The cognac line along the top of the capping, present in every reference and in none of the delivered geometry. Built on the capping's own top boundary loop. | Side plate colour sweep (present at 56 stations, x −2.62 → +2.53); deterministic frames | None. Authored in Phase 4.2. |
| 13 | **Motor / propulsion** | Four authored proxies (`pxlPropulsion`) | **CLOSE** | Reads plausibly against transom width and cockpit scale at `reference_stern_3q`. Deliberately not a commercial model. | Deterministic frames vs views sheet | None. Proxies by design (§18). |
| 14 | **Duna script** | `duna_script_{port,starboard}`, threshold trace | **CLOSE** | Present, on the gunwale capping, correct side, correct baseline, cognac ink. Shape is a **mechanical trace of a 147 × 28 px instance** — the largest that exists anywhere in the delivery. | `build-duna-trace.mjs`, `trace-proof.mjs`, `detail` frames | **PROVISIONAL ARTWORK.** `provisional_brand_artwork: true`. Needs Duna's vector. |
| 15 | **PXL hull mark** | `pxl_wordmark_{port,starboard}` on `transom_black` | **CLOSE** | Re-proportioned from the plate's own 100 × 19 px lockup; ink measured at `#d6703c` from 889 plate pixels. Overlay shows a small horizontal offset against the plate at authored calibration. | `_mark.mjs`, overlay bench | Refine placement against the overlay; artwork still authored, not official. |
| 16 | **PXL windshield / plexi mark** | `pxl_plexi`, on the delivered glazing | **MATCHED** | **Re-projected in Phase 4.3, §9.** The basis now comes from a ray fired at the real screen rather than from the runtime screen's own construction. Two constants moved with it: the rebuilt plexi is 0.38 m across the beam but only its middle 0.21 m is flat, so at the old size and offset the lockup ran onto the starboard corner radius and the last letter bent away from the camera. Now 0.184 m centred, with 13 mm of flat glass either side. | `detail` frames | None. |
| 17 | **Waterline / flotation** | `reference_water_side` + water backdrop | **CLOSE** | Attitude and the black section's relationship to the water read as the studies do | Deterministic frames vs `pxl-colours-02` | None. |
| 18 | **Colour rendering — 6 finishes** | `PXL_HULL_FINISHES` | **CLOSE** | **Re-tuned in Phase 4.3 against sampled plate values, §22–§25.** The sage was 34% saturated and 20° toward cyan against a plate that runs 8–13% and grey-green; it now samples `#5f776c` against the plate's `#586764`. The structural blacks were lifted and separated by roughness rather than colour. The hull bottom still cannot reach the plate's drawn `#414141` — that is a physical limit and PHASE_4_3_REPORT §L shows the arithmetic. | Pixel sampling, plate vs live frame at matched points | None available without changing the light. |
| 19 | **Full-body colour option** | `lower=body` | **MATCHED** | Hull form stays readable; panel boundaries survive through geometry and light rather than through paint | Deterministic frames | None. |
| 20 | **Finish sweep (Duna Line)** | `PXL_SWEEP_*`, 340 ms | **MATCHED** | Boundary travels bow → aft, rake follows the Duna Line, no seam, no artefact, branding stable throughout | Frames at sweep 0 / .25 / .5 / .75 / 1 | None. |

---

## 2. Material response under one light (§27)

All six rendered at `reference_side`, identical environment, no per-colour
lighting rig. Judged from one contact sheet.

| Finish | Check | Result |
|---|---|---|
| White `#dcdedb` | No clipping | **Pass** — highlight rolls off, topsides keep their crease |
| Black | Curvature readable | **Pass** — the chine and the sweep both read; the hull is not a silhouette |
| Navy `#1b3a5c` | Does not disappear into water | **Pass** |
| Sage `#61817b` | Not muddy | **Pass** — the delivered default, and the closest to the studies |
| Warm / gold | Not metallic-plastic | **Pass** — reads as a warm paint, metalness 0 |
| Warm grey | Separates from environment | **Pass** |

Branding was checked on all six and on the two extremes at the `detail` camera:
the Duna script, the PXL hull mark and the plexi mark **do not change colour with
the hull finish** (§26), because their grounds — the gunwale capping, the stern
moulding and the glazing — are not what the exterior control paints.

---

## 3. What the numbers do and do not cover

The silhouette rasteriser answers **shape**: it projects the delivered GLB to the
XY plane, fills it, does the same to the plate, and reports deviation at 21
stations. It needs no GPU and runs inside `npm run qa`, so rows 1–7 are regression
-guarded rather than re-measured by hand.

It cannot answer anything about **light** — material response, glazing,
highlight travel, how a mark reads on a ground. Those were checked with the
deterministic frame mode (§23), which is new this phase and is the reason rows
11, 12, 15, 16 and 20 could be assessed at all.

Nine stations on the plate's sheer are marked `occl` — occluded by the boat's own
deck furniture and by the human silhouette in the drawing. The sheer statistics
are over the ten clear stations, and that is stated rather than smoothed over.

---

## 3b. What Phase 4.2 changed, and what it did not

Corrected: rows 4b, 4c, 11, 12, 12b, 12c. Three defects that were never rows in
this table at all, because nothing here was looking for them:

- **Eighty-six stray interior islands on the outside of the hull**, painted with
  the cockpit colour. Found by decomposing every zone into connected components,
  not by looking at a render.
- **Twenty-nine foredeck faces with inverted normals.** Invisible in silhouette,
  drawn double-sided, and lit as though the sun were under the boat. Found by
  raycasting a grid over the bow and reading the hit normals.
- **`deck_trim` bound to `EXTERIOR_HULL`** — the bow panel and the console base
  plate, physically inside the boat, painted with the topsides.

The lesson for this document: **a silhouette rasteriser and a contact sheet
cannot see a material zoning error.** Rows 1–7 were green throughout, and the
boat was wrong. What found these was decomposing the asset — islands, face
normals, area by height — and the live `__pxlQa.zones()` read, which reports the
colour a material is *wearing* rather than the one the catalogue intended.

Unchanged, and expected to be: rows 1, 2, 3, 6, 7. Phase 4.2 never touched the
hull surface, and `npm run reference` returns the same numbers to four decimals.

---

## 4. Landmark comparison — §28, §29

`npm run landmarks`. Regenerate after any change to the asset; the numbers below
are from the build in `public/models/PXL.glb`.

Reference values come from `assets/derived/pxl/PXL.upper.json`, written by
`measure-upper.mjs` off the July side plate through the same calibration the
hull rasteriser uses — 345.1 px/m, transom at column 699, sheer maximum at
row 796. Live values come from the delivered GLB, parsed through the loader the
browser uses, by asking each zone's geometry a specific question rather than for
its bounding box.

**TWO ERRORS PER VERTICAL LANDMARK, AND THE SECOND IS THE USEFUL ONE.** Absolute
error is normalised by LOA (5.2532 m) fore-and-aft and by hull depth (1.1634 m)
vertically. Relative error measures the same landmark against ITS OWN LOCAL
SHEER in each source — which matters because the model's sheer sits 44 mm below
the plate's on average (row 2 of §1, measured and accepted in Phase 4.1), so an
absolute comparison charges every piece of deck furniture for a hull difference
nobody is proposing to fix. Where the two disagree, the reason is the sheer.

Statuses: **MATCHED** relative error under 2% of hull depth (23 mm) ·
**CLOSE** under 5% (58 mm, the sheer's own deviation) · **PARTIAL** over that ·
**SOURCE** the delivered sources disagree with each other.

| Landmark | Axis | Reference | Live | Abs error | Rel error | Status |
|---|:--:|---:|---:|---:|---:|---|
| bow tip | x | 2.627 | 2.627 | -0.0% | — | **MATCHED** |
| stern tip | x | -2.627 | -2.661 | -0.7% | — | **MATCHED** |
| sheer maximum | z | 0.943 | 0.943 | 0.0% | -0.8% | **MATCHED** |
| console aft face | x | -0.503 | -1.435 | -17.7% | — | **SOURCE** |
| console fwd face | x | -0.152 | -0.980 | -15.8% | — | **SOURCE** |
| console dash, aft | z | 1.009 | 0.909 | -8.6% | 0.7% | **MATCHED** |
| console dash, fwd | z | 1.091 | 0.993 | -8.4% | -1.3% | **MATCHED** |
| windshield apex | z | 1.377 | 1.292 | -7.3% | 0.1% | **MATCHED** |
| windshield, aft wing | z | 1.143 | 1.034 | -9.4% | -0.1% | **MATCHED** |
| steering wheel, rim top | z | 1.091 | 0.995 | -8.2% | 0.9% | **MATCHED** |
| cockpit rail, top | z | 0.960 | 0.911 | -4.2% | -1.9% | **MATCHED** |
| cockpit rail, aft end | x | -2.056 | -2.065 | -0.2% | — | **MATCHED** |
| cockpit rail, fwd end | x | -0.256 | -0.250 | 0.1% | — | **MATCHED** |
| bow rail, aft end | x | 2.215 | 2.202 | -0.2% | — | **MATCHED** |
| bow rail, fwd end | x | 2.555 | 2.568 | 0.2% | — | **MATCHED** |
| backrest, top | z | 1.024 | 0.925 | -8.5% | -0.2% | **MATCHED** |
| seat cushion, top | z | 0.670 | 0.662 | -0.7% | 10.9% | **PARTIAL** |

**MATCHED 14 · SOURCE 2 · PARTIAL 1.**

The two SOURCE rows are one fact: the July side plate stations the console at
0.47–0.55 of LOA forward of the transom, the August views sheet at 0.25–0.35 and
the delivered STL at 0.240–0.317. The model follows the two that agree. Its SIZE
agrees across sources to 0.02 m, which is what makes the July plate's profile
transferable to the August plate's station — see PHASE_4_3_REPORT §C.

The PARTIAL is the seat. The drawn figure sits 0.20 m below the plate's deck
line; the delivered moulding's platform is 0.146 m below the model's sheer. Both
are what they are, the platform is delivered geometry, and lowering the cushion
would float it. Note also that the reference station for this row is only known
to about half a metre — the figure's lowest visible pixel is a knee and the
drawing does not say where the knee is fore-and-aft — so its error bar is wider
than any other row's.

---

## 4b. Stern landmarks — §17

`npm run landmarks`, second table. A drive does not stand on the deck, so the
datum is not the sheer: it is **the top of the transom moulding at y 0.6275**,
and the scale is **the transom's own height, 0.832 m**, positive downward. Read
off `pxl-views-20240815c.jpg` with `scripts/pxl/_grid.mjs`; the transom spans
plate rows 990 → 1150, which puts the view at 192 px/m.

The drives are authored at runtime rather than exported, so the model column is
computed by `sternLandmarks` in `pxlCatalog` — the same chain
`pxlPropulsion.buildDrive` walks, with the configurator suite asserting the two
agree.

| Landmark | compact | standard | large | electric | reference | status |
|---|---:|---:|---:|---:|---:|---|
| top of transom | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | datum |
| top of cowling | −0.024 | −0.032 | −0.040 | −0.029 | −0.031 | **MATCHED** |
| bottom of cowling | 0.457 | 0.569 | **0.700** | 0.410 | 0.750 | **MATCHED** (large) |
| anti-ventilation plate | 1.278 | 1.362 | 1.410 | 1.354 | 1.956 | **BUILT in 4.6** |
| propeller centre | 1.380 | 1.482 | 1.546 | 1.468 | 2.219 | **BUILT in 4.6** |
| lowest lower-unit point | 1.669 | 1.779 | 1.843 | 1.762 | 2.469 | **BUILT in 4.6** |

**Phase 4.3 for comparison**: the cowling's top was at −0.601 on this scale —
half a metre of engine standing over a gunwale it should have been level with.
That is the whole of §14, and it is the row the phase turns on.

**`bottom of cowling` is judged on `large` alone.** The reference draws ONE
engine, and 125 plate pixels at 192 px/m is 0.651 m — which is the large
proxy's 0.615 m cowling and nothing else's. The other three differ from the
drawing by their own heights, which is what having a range of four means; they
are reported as SIZE rather than as errors.

**The three depth rows WERE declined and are now built. PHASE 4.6, §2, §3.**
Phase 4.4 read them and refused them, on the grounds that an engine drawn 1.96
transom-heights down is drawn nearer the camera than the transom it hangs on.
The result was a lower unit that stopped 52 mm below the keel — level with the
bottom of the boat, which is the failure §42 of the 4.6 brief names by name.

§3 removed the discretion: "Do not 'correct' the reference because it seems
mechanically unusual." The rows were re-read on the boat's own datum — sheer at
the transom to the bottom of the ghosted hull, 253 px — and built. On that datum
the reference puts the plate 1.308 depths down and the skeg 1.684, and `standard`
reproduces both exactly. The figures in this table are on the OLD transom-height
datum and so do not reach 1.956; the two normalisations differ by the ratio
between the transom's moulding height and the hull's full depth. See
`PXL_STERN_REFERENCE.hullNormalised` and PHASE_4_6_REPORT §A.

The platform clearance the old note worried about was revalidated and is
unaffected: everything that moved hangs below the frame at y 0.073 and cannot
reach the tread at any angle of lock. See PHASE_4_6_REPORT §M.

---

## 5. Visual regression — §36

`window.__pxlQa.visual()` in the development page. The cases are declared in
`src/webgl/scenes/pxl/pxlVisualCases.ts`, which `npm test` asserts is complete
and well-formed; the pixel comparison itself needs a GPU and runs in the
browser.

Each case renders two configurations from the same camera with the same clock
and no transition, so the only difference between the frames is the
configuration. A pixel counts as changed when any channel moves by more than 6
levels.

| Case | Requirement | Changed | Floor | Mean Δ | Result |
|---|---|---:|---:|---:|---|
| `exterior-sage-vs-navy` | default vs navy | 10.59% | 6.0% | 5.26 | **PASS** |
| `lower-dark-vs-body` | default vs full-body lower | 4.56% | 2.0% | 1.17 | **PASS** |
| `interior-cognac-vs-dark` | cognac vs dark interior | 2.38% | 1.2% | 1.15 | **PASS** |
| `drive-compact-vs-large` | compact vs large motor | 1.63% | 0.4% | 0.82 | **PASS** |
| `drive-combustion-vs-electric` | combustion vs electric | 1.37% | 0.3% | 0.62 | **PASS** |
| `platform-off-vs-on` | §34 — platform off vs on | 0.72% | 0.4% | 0.65 | **PASS** |
| `platform-teak-ignores-exterior` | §33 — exterior does not reach the teak | 4.48% | 3.0% | 2.11 | **PASS** |

Values re-measured on the Phase 4.4 build; the first five moved because the
capping, the platform's absence and the drive's new mounting height all change
what share of the frame the boat occupies. The two new rows are §34's fourth
comparison and §33's last requirement.

**`platform-teak-ignores-exterior` failed on its first run**, at 4.48% against a
floor of 5.0%. The floor was wrong rather than the boat: it had been set by
analogy with `exterior-sage-vs-navy`, which measures 10.6% — but that case is
composed from the side, where the frame is mostly topsides, and this one is from
the stern quarter, where it is mostly black transom and drive. Recalibrated to
3.0%. Recorded because a floor set by analogy rather than by measurement is
exactly the habit this section exists to break.

**The floors are not zero, and that is deliberate.** §36 says a diff of zero
must fail; "not zero" is too weak a test, because one anti-aliased edge moving by
a pixel is not zero and is not a working configurator either. Each floor is a
real share of the frame, set well under what the change actually produces.

**Both drive cases failed on the first run at exactly 0.00%.** The cause was in
the cases — they named `?drive=…` and the parameter is `?propulsion=…`, so
`parseConfiguration` discarded the value and both frames drew the default. It is
recorded in the case file rather than quietly corrected, because it is the same
shape as the defect the whole section exists to catch.

---

## 7. The plan measurement — §4, §6, §35

The one number that answers §35 without an opinion in it.
`scripts/pxl/_upface.mjs` sums the area of every triangle whose normal points
up (n·z > 0.7), per zone, on `public/models/PXL.glb`.

| Zone | Phase 4.3 | Phase 4.4 | |
|---|---:|---:|---|
| `hull_accent` — what was called the capping | **0.000 m²** | 0.081 m² | a band on a wall |
| `gunwale_capping` — the moulding | — | **1.736 m²** | authored this phase |
| `interior_hard_liner`, forward of x 1.47 | **2.072 m²** | **0.000 m²** | the bow element, deleted |

The first row is the defect §4 describes, measured: a zone named "Gunwale
capping" since Phase Four with no top surface anywhere on it. The 0.081 m² it
carries now is incidental — chamfer facets that catch the threshold — and it is
still not a capping. The third row is §2.

**Compression costs 2% of it.** `gunwale_capping` measures 1.775 m² up-facing in
`PXL.production.glb` and 1.736 m² in the compressed asset the browser loads: the
collapse spends its budget along the sweep, where the surface is smooth, rather
than on the section, where the chamfers are. The zone is in `compress-pxl`'s
TIGHT set for that reason.

---

## 6. Outstanding, in priority order

Three items left this list in Phase 4.3 and are recorded here so the change is
visible: **production console geometry**, **upholstery geometry** and **bow grab
rails**. None of them was delivered by the yard. All three were reconstructions
that the plates carried enough information to measure, and the reason they sat
here for three phases is that "blocked by source asset" was applied to a
REPLACEMENT when what was available was a RECONSTRUCTION. That distinction is
worth keeping in mind for the rest of this list.

1. **Which console station is current.** The July side plate and the August
   views sheet disagree by 0.83 m and only the yard can settle it. Rows 8, and
   the two SOURCE rows in §4. This is now the largest single uncertainty in the
   model.
2. **Official Duna vector artwork.** Everything about the script's placement,
   scale and ink is measured and correct; only the letterforms are a
   reconstruction. Replacing it changes one generated file (row 14).
3. **Whether there is an aft deck pad.** The stern three-quarter carries one
   ambiguous orange band at the transom and the delivered moulding has no flat
   shelf to carry it. PHASE_4_3_REPORT §G.
4. **Confirmation of the stern spoiler's depth** (row 5). Its rake, length and
   tip are measured off the July plate and its width is measured off the boat —
   between the platform's outer side and the hull's wall carried aft. What no
   drawing settles is how far DOWN it should reach: the plate's wedge is the
   moulding and the platform read as one silhouette, and the model's platform is
   504 mm against the plate's 700.
5. **A UV set on the interior meshes.** The upholstery grain is triplanar
   because the asset has no UVs; a proper unwrap would allow a real map on
   cushions that now have the geometry to deserve one.
6. **PXL hull mark placement refinement** against the overlay (row 15).
7. **Whether the aft boarding platform is an option at all.** It is drawn in the
   August views sheet and absent from the July side plate, which is what an
   option looks like — but two drawings is not a specification. The
   configurator defaults it OFF and follows the plate that defines the profile.
   PHASE_4_4_REPORT §H.
8. **The platform's own reference is one drawing seen once.** Its height,
   thickness and aft projection are measured off a single orthographic view at
   349 px/m; nothing confirms its width, its notch, or that it clears the engine
   the yard intends. The motor well here is derived from our own four proxies.
9. **The console shell's tessellation.** Its loft has five rings and its plan
   has points only at the corners and arcs, so there is a 0.20 m stretch with no
   vertices. It shades and reads correctly and would not survive a camera much
   closer than `detail`. Twenty minutes, whenever Blender is next open.
10. **The bimini has no drawing at all.** §4.10 built it from a supplier's
    product photograph the client sent, and then through six revisions against
    his marked-up screenshots. A three-bow top, black canvas on tube, three deck
    fittings a side.

    *The rig.* Each end bow drops a strut off its own tip, falling inboard to a
    fitting at the middle bow's station, and a rigid leg whose head is 250 mm
    into the canopy from that bow, raking 200 mm the other way to a fitting of
    its own. Both ends the same. §4.10.7 briefly replaced the after leg with
    webbing, on the argument that a bimini is stayed aft rather than stood on;
    it left the canopy's after corner with nothing under it and the client asked
    for the symmetric pair back.

    *What is measured.* All six fittings are raycast onto the capping the boat
    actually has, 30 mm inboard of its inner edge, which keeps them 34 mm clear
    of the grab rails' centreline. Every arc sits 22 mm inside the canvas's
    edge, measured to the tube's centreline so the cloth covers the tube and not
    just its axis; on the built model the frame spans ±0.674 against the
    canvas's ±0.697 and x −2.092…−0.528 against the canvas's −2.155…−0.465, so
    no metal reaches past the cloth in any direction.

    *Struck.* Clicking any part of it swings the tubes in on their feet, eased
    over about a second, and `bimini_boot` — one sleeve over all three bows —
    comes up as the canvas goes.

    It is a ROTATION, per vertex: each one keeps its height above the deck as a
    radius and travels on a circle about the point below it, by an angle ramped
    across the boat so the after members swing forward, the forward members aft
    and the middle bow not at all. The feet do not move — below deck level the
    vertex is inside the fitting and is left alone. At 38° the end bows' heads
    come 601 mm along the boat and fall 207 mm, arriving 154 mm either side of
    the middle one.

    Two versions preceded it. A rigid HINGE on the whole assembly does not fold
    it, it swings it: 55° about the forward fittings put the canvas at y −0.81,
    through the sole and out of the bottom. A horizontal GATHER folds it but
    shortens every tube — the heads stayed at one level, which is what the
    client saw and objected to. What none of the three can do is bring the three
    heads to one point: rigid tubes on fixed feet, swung equally, stay their own
    length apart.

    *What is chosen.* 1.31 m of headroom over the sole, a 1.69 × 1.51 m canopy,
    25 mm tube, a 50 mm sleeve depth. §4.10.11 spread the bows to 2.60 m at the
    client's word — roughly twice the opening — and §4.10.12 put them back to
    this, which is the size every revision has been judged against. No air draft is claimed, and nothing about
    the fabric, the supplier or the fitting is specified by anybody.
