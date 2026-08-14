# PXL — REFERENCE FIDELITY QA

**Phase 4.1, §36.** The delivered PXL design renders are the primary visual
authority. This document records, element by element, how far the live WebGL
configurator is from them, how that distance was established, and what would
close it.

**Nothing here is marked MATCHED on the strength of a look.** Every row cites
either a measurement (`scripts/pxl/reference-qa.mjs`, `scripts/pxl/_mark.mjs`)
or a deterministic frame rendered through `window.__pxlQa` and inspected. Rows
that were judged by eye say so in the METHOD column.

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
| 5 | **Stern / transom** | `transom_black` | **PARTIAL** | The plate carries **774 mm of rubbing moulding abaft the transom that the model does not have**. The delivered STL's transom is vertical within 18 mm; the drawing's rakes. | Rasteriser (datum offset) | **BLOCKED BY SOURCE ASSET.** A geometry difference, and §29 forbids papering over it with generic geometry. Needs a revised STL. |
| 6 | **Dark lower treatment (edge height)** | `hull_lower`, `lower=dark` | **MATCHED** | Band edge sits at **71.4%** of local hull depth in the plate, **72.1%** in the model — 0.7 points apart | Rasteriser, band-edge detection, n=12 plate / n=18 model | None. This is the strongest single agreement in the comparison and it is the PXL's key identity line. |
| 7 | **Dark lower treatment (shape)** | as above | **CLOSE** | Band deviation mean **111 mm**, max **269 mm**; the worst stations are forward, where the plate's band lifts faster than the model's | Rasteriser | Accepted. Follows the hull geometry, so it inherits row 2's difference. |
| 8 | **Console** | `console_body`, `console_trim`, `helm_wheel` (STL revision) | **PARTIAL** | Station agrees with the August plate (model 0.240–0.317 LOA from transom vs plate 0.25–0.35); the **July plate places it at 0.47–0.55**, i.e. the two delivered sources disagree with each other. Mass and screen area read visibly smaller than the glazed tower in the colour studies. | `PXL_CONSOLE_STATION`, deterministic frames | **BLOCKED BY SOURCE ASSET.** Known product-approval blocker carried forward from Phase Four. The asset is the STL revision, not the studies' console. Documented, not faked. |
| 9 | **Windshield / plexi** | `PxlScreen`, authored from the console's measured box (`PXL_SCREEN`: 860 × 370 mm, 4° rake, 9 mm) | **CLOSE** | Believable marine glazing; carries the mark. Smaller than the studies' screen because the console it is mounted on is smaller — inherits row 8. | Deterministic frames, `detail` camera | Re-derive when the production console arrives. |
| 10 | **Rails / grab rails** | `rails`, cognac lacquer | **MATCHED** | Present at the sheer and at the bow, in the reference's cognac | Deterministic frames vs plate | None. |
| 11 | **Interior — colour** | `deck_main`, `pxl_interior_cognac` `#8a4d24` | **MATCHED** | Warm cognac, held below the rails' chroma so it reads as upholstery rather than orange plastic | Live material read (`__pxlQa.zones()`), frames vs plates | None. Reference-derived preset is the default. |
| 12 | **Interior — material response** | Triplanar micro-normal (`pxlGrain`) | **MATCHED** | Grain visible at the `detail` camera; roughness 0.78, clearcoat 0 | Deterministic frames | **Fixed this phase** — the grain shader failed to compile for the whole of Phase Four. See report §M. |
| 13 | **Motor / propulsion** | Four authored proxies (`pxlPropulsion`) | **CLOSE** | Reads plausibly against transom width and cockpit scale at `reference_stern_3q`. Deliberately not a commercial model. | Deterministic frames vs views sheet | None. Proxies by design (§18). |
| 14 | **Duna script** | `duna_script_{port,starboard}`, threshold trace | **CLOSE** | Present, on the gunwale capping, correct side, correct baseline, cognac ink. Shape is a **mechanical trace of a 147 × 28 px instance** — the largest that exists anywhere in the delivery. | `build-duna-trace.mjs`, `trace-proof.mjs`, `detail` frames | **PROVISIONAL ARTWORK.** `provisional_brand_artwork: true`. Needs Duna's vector. |
| 15 | **PXL hull mark** | `pxl_wordmark_{port,starboard}` on `transom_black` | **CLOSE** | Re-proportioned from the plate's own 100 × 19 px lockup; ink measured at `#d6703c` from 889 plate pixels. Overlay shows a small horizontal offset against the plate at authored calibration. | `_mark.mjs`, overlay bench | Refine placement against the overlay; artwork still authored, not official. |
| 16 | **PXL windshield / plexi mark** | `pxl_plexi`, on the screen's own face | **MATCHED** | Present, centreline, single instance, cool grey `#c9d2d8` — reads as printed on the acrylic rather than floating | `detail` frames | None. Delivered this phase. |
| 17 | **Waterline / flotation** | `reference_water_side` + water backdrop | **CLOSE** | Attitude and the black section's relationship to the water read as the studies do | Deterministic frames vs `pxl-colours-02` | None. |
| 18 | **Colour rendering — 6 finishes** | `PXL_HULL_FINISHES` | **MATCHED** | See §2 below. All six judged under one lighting environment. | Deterministic frames, one sheet | None. |
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

## 4. Outstanding, in priority order

1. **Official Duna vector artwork.** Everything about the script's placement,
   scale and ink is measured and correct; only the letterforms are a
   reconstruction. Replacing it changes one generated file (row 14).
2. **Production console geometry.** Rows 8 and 9, and the largest remaining
   perceptual gap between the studies and the live model.
3. **Revised STL with the stern moulding** (row 5).
4. **PXL hull mark placement refinement** against the overlay (row 15).
5. **A UV set on the interior meshes.** The grain is triplanar because the asset
   has no UVs; a proper unwrap would allow a real upholstery map.
