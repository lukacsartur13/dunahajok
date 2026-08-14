# PXL_CONFIGURATOR_MODEL_MAP

**The contract between `public/models/PXL.glb` and the configurator.**

`PXL_MODEL_MAP.md` describes the asset — how it was recovered from the STL, what
it measures, what the source could not provide. This document describes what the
*configurator* is allowed to assume about it: which surface is which, what may be
changed at runtime, what may not, and exactly what has to happen when the console
is eventually replaced.

Everything here is written by `scripts/pxl/build_pxl.py`, declared in
`src/webgl/scenes/pxl/pxlModel.ts`, and asserted by `npm test` and
`npm run model`. If this document and the code disagree, the code is right and
this document is stale — say so in the phase report rather than editing the code
to match the prose.

---

## 1 — The asset

| | |
|---|---|
| File | `public/models/PXL.glb` |
| On disk | 341 kB (measured, production build) |
| Compression | `EXT_meshopt_compression` — decoder ships inside three-stdlib, no extra request |
| Triangles | 20,574 |
| Meshes / materials / textures | 16 / 16 / **0** |
| Units · up · forward | metres · +Y · +X (bow) |
| Origin | amidships on the **visual** waterline |
| Draft below y = 0 | 0.221 m |
| Design revision | `PXL_CONSOLE_CURRENT` — see §5 |
| Geometry revision | **`PXL_GEOMETRY_4_2`** — corrected in Blender; see §2b |

**The waterline is a visual calibration, not hydrostatic or flotation data.** It
was measured off the design renders: freeboard at amidships reads 0.1665 of LOA
in all six colour studies, and the origin was placed to match. It does not
account for load, fuel, crew or the outboard's weight aft.
`PXL_MODEL.waterlineTrim` exists so a real figure from the yard can be applied
without re-exporting. Do not present it to a customer as a draft figure.

---

## 2 — Mesh map

One mesh, one material, one **material role**, at most one configuration
channel. Configurator code addresses a role; `pxlModel.ts` is the only file that
knows which mesh currently carries it. Nothing anywhere addresses a material by
index — see §3 for why that matters.

| GLB node / mesh | Physical interpretation | Material role | Configurable | Channel | Tris | Sides | Visibility | Uncertainty |
|---|---|---|---|---|---:|:-:|---|---|
| `hull_primary` | Topsides, chine to sheer | `EXTERIOR_HULL` | **yes** | `hullPrimary` | 5,661 | 2 | always | none — this is the surface the six colour studies vary |
| `hull_lower` | Bottom, below the chine | `HULL_BOTTOM` | yes | `hullLower` | 7,555 | 2 | always | one finish only — every reference shows structural black |
| `transom_black` | Transom, stern moulding, aft deck | `STERN_MOULDING` | yes | `sternMoulding` | 2,391 | 2 | always | carries the `PXL` mark, placed at runtime by raycast. **Gained the aft deck shelf in 4.3** — 1.74 m² the references show in the moulding's black and 4.2 left pale. |
| `hull_accent` | Dark band on the hull's side below the sheer | `SHEER_BAND` | yes | `hullAccent` | 1,424 | 2 | always | **renamed and re-roled in 4.4.** It was called the capping for four phases and measured **0.000 m² of up-facing surface** — a band on a vertical wall. Still a real feature and still the Duna script's ground; the capping is the row below. Extended to the stem in 4.2 |
| `gunwale_capping` | The capping moulding — port, bow, starboard | `GUNWALE_CAPPING` | yes | `hullPrimary` | 1,112 | 2 | always | **authored in 4.4.** 46 mm section, 10/14 mm chamfers, top falling 11 mm inboard; 108 → 250 mm wide, converging to one bow form at x 2.330. **1.736 m² of up-facing surface** where the boat had none. Follows the topsides because every reference draws it in the hull's tone — never the interior colour |
| `interior_hard_liner` | Coaming walls and inner shell faces — **the cove of the forward liner, and no floor at all** | `INTERIOR_SHELL` | yes | `hullPrimary` | 997 | 2 | always | **renamed in 4.3** from `deck_liner`; it was never a deck. **Lost the foredeck in 4.4** — 2.072 m² of flat up-facing panel closing the bow, deleted under §2 — and in **4.6 lost the six-triangle vertical wall that deletion left behind** and gained the forward liner. **Halved in 4.7 by the interior material correction**: every up-facing interior surface below z 0.62 now goes to `cockpit_sole`, so the raised side platforms and the whole forward floor left this zone. 3.46 m² remain, all of it coaming, and it is what §11's hierarchy needs visible between the capping and the padding. Follows the topsides finish |
| `cockpit_sole` | **Every interior surface a person stands on** — the sole, the new cockpit floor, the step faces, the forward liner's flat, the cushions' lip | `SOLE` | yes | `sole` | 1,386 | 2 | always | **Redefined in 4.7** (every up-facing interior surface below z 0.62, delivery base 0.028 → 0.010 linear) and **re-cut in 4.7.2**: the delivered raised side platform between x −1.70 and 0.00 is DELETED — 33 faces / 2.177 m² into a bin nothing builds an object for — and `build_cockpit_floor` continues the sole through the space at z 0.366, out to the shell, with an end wall at each station. The cockpit's clear floor goes from 1.02 m to **1.97 m** across. One finish, not offered |
| `upholstery_primary` | **Two forward side cushions**, bench, backrest | `UPHOLSTERY` | **yes** | `interiorPrimary` | 3,098 | 2 | always | **Footprint traced in 4.7.1, smoothed and levelled in 4.7.2.** `pad_inboard` and `pad_outboard` are tables measured off the plate by `npm run upholstery:trace` and read through a Catmull-Rom, so the plan passes through every measured point without a corner at any of them. **x 0.000 → 2.050**, meeting at **x 1.537** with a **16 mm seam**, 1.631 m² a side. The base elevation is AUTHORED at z 0.570, not raycast: the top is z 0.652 at every station of both cushions, against 4.7.1's 0.645 → 0.893 ramp. **Still the only zone the cockpit colour reaches** |
| `coaming_inlay` | Cognac line along the capping | `HARDWARE` | yes | `metal` | 1,618 | 2 | always | authored in 4.2 from the capping's own boundary loop; 30 mm, full length |
| `bow_fitting` | Bow deck cleats, port and starboard | `HARDWARE` | yes | `metal` | 168 | 2 | always | authored in 4.2; aperture detail simplified to a two-bar frame |
| `console_body` | Helm console's aft panel | `CONSOLE` | yes | `interiorSecondary` | 108 | 2 | always | **rebuilt in 4.3.** The pale moulding the driver faces — both three-quarters show it in the hull's own tone |
| `console_detail` | Console shell and the screen's surround | `CONSOLE_SHELL` | no | — | 750 | 2 | always | **rebuilt in 4.3**, replacing `console_trim`. Structural black in every plate including the white ones, so nothing configures it |
| `windshield` | Wrapped plexi | `GLAZING` | no | `glazing` | 196 | 2 | always | **new in 4.3.** Delivered geometry, not a runtime plane. Bound to the channel so it is addressable; no finish is offered on it, so `applyConfiguration` never repaints it |
| `helm_wheel` | Steering wheel | `HELM` | no | — | 708 | 2 | always | **rebuilt in 4.3**, on a stalk out of the console's aft panel. The STL's was 2,988 triangles standing in free air |
| `rails` | Cockpit and bow grab rails | `HARDWARE` | yes | `metal` | 1,366 | 2 | always | **rebuilt in 4.3.** Four runs of 27 mm swept tube on stanchions. The delivered zone was 40 triangles at y −0.18 → +0.27 — a bar on the CENTRELINE, which is the tiller §6 of the 4.3 brief reports |
| `motor` | Outboard cowling and leg | `PROPULSION` | yes | `motor` | 348 | 1 | **hidden by default** | superseded by four proxy drives — see §8b |
| `motor_trim` | Outboard bracket | `PROPULSION` | yes | `motor` | 37 | 1 | **hidden by default** | as above |
| `accessory_cockpit_cover` | Flush cockpit cover | `COVER` | visibility only | — | 436 | 2 | **hidden by default** | present in the STL, absent from every render; nobody has confirmed it is a product |
| `platform_frame` | Boarding platform bearers, knees, cross-member | `PLATFORM_FRAME` | visibility only | — | 220 | 2 | **hidden by default** | **authored in 4.4.** Structural black; no channel, so no finish can reach it. Carries the tread 504 mm aft of the transom |
| `platform_deck` | Boarding platform teak tread | `PLATFORM_DECK` | visibility only | — | 880 | 2 | **hidden by default** | **authored in 4.4.** 92 mm planks, 8 mm seams, `finish: "wood"`. Colour sampled off the reference tread at `#b0753f`. **No channel at all** — which is what makes "an exterior change cannot recolour the teak" true by construction |

`deck_trim` is gone. It was 10 triangles of bow panel and console base plate —
surfaces physically inside the boat, bound to `EXTERIOR_HULL`, and therefore
painted with the topsides. Phase 4.2 folded them into the liner, where they
still take the topsides colour, but for the right reason.

**Phase 4.3 renamed three zones and deleted four.** §14 of its brief permits the
migration explicitly: do not keep an old assumption for backward compatibility
once it is wrong. `deck_liner` was never a deck, `deck_sole` was named after the
mesh it was cut from, and `interior_pads` was a moulding wearing an upholstery
name. Deleted: the STL's `console_body`, `console_trim`, `helm_wheel` and
`rails`, all four measured against the plates and all four rebuilt — see
PHASE_4_3_REPORT §B for what each one actually was.

Node hierarchy:

```
PXL_ROOT
├─ HULL         hull_primary · hull_lower · hull_accent
├─ TRANSOM      transom_black
├─ DECK         interior_hard_liner · cockpit_sole
├─ INTERIOR     upholstery_primary · coaming_inlay
├─ CONSOLE      console_body · console_detail · windshield · helm_wheel
├─ METAL        rails · bow_fitting
├─ PROPULSION   motor · motor_trim
└─ OPTIONAL     accessory_cockpit_cover
```

---

## 2b — The Blender correction stage

**Added in Phase 4.2.** `build_pxl.py` recovers zones from the STL with rules
that are geometric and repeatable, and four of its results were wrong in ways
only a render shows. `scripts/pxl/pxl_blender.py` corrects them.

```
PXL-3D.stl → build_pxl.py → PXL.source.glb   (archival master — never edited)
                          → pxl_blender.py   → PXL.production.glb
                          → compress-pxl.mjs → public/models/PXL.glb
```

```bash
npm run pxl          # the whole chain
npm run pxl:blender  # the Blender stage alone   (BLENDER=… to override the path)
```

It is a **script**, not a hand-edited `.blend`. The pipeline's contract is that
re-running it on a revised STL reproduces the same zones without a human in the
loop, and a manual edit would end that. `assets/blender/PXL.blend` is written
every run as an output for inspection — it is never an input.

| Correction | Measured effect |
|---|---|
| Weld the six shell zones back into one skin | 2,179 duplicate vertices merged |
| **Despeckle** — a connected same-zone patch under 0.020 m² takes its neighbours' zone | 1,960 faces; the 86 stray interior islands on the outside of the hull are gone |
| **Upright the deck normals** — near-horizontal interior faces are made to face up | 29 faces; the foredeck faced the keel |
| **Split the interior** by height and facing | 18.16 m² → 4.88 upholstery · 4.19 sole · 9.10 liner |
| **Cut and extend the capping** to the stem, `bisect_plane` at z 0.860 | 714 faces; band 74 mm below the sheer |
| **Lift the squabs** 35 mm, clipped inboard of the topsides | 214 faces, 71 vertices clipped |
| Build the coaming inlay and the bow cleats | 809 + 168 faces |

**It never regenerates the hull surface.** Every face keeps the zone
`build_pxl.py` gave it, carried across the join as a mesh attribute; the stage
only moves faces between zones. This is why `npm run reference` returns the same
silhouette numbers as before it existed. The chine is deliberately untouched —
it is the designer's own crease and measures at 72.1% of local depth against the
plate's 71.4%.

### Why several zones are double-sided

The source hull is a **zero-thickness open shell**. There is no inner skin below
the sheer and the moulded liner does not reach the gunwale, so under backface
culling you can see through the boat from inside the cockpit. Those zones are
therefore drawn double-sided. This is a property of the delivered geometry, not
a rendering preference: giving the hull thickness would mean inventing a surface
the yard has not drawn.

---

## 3 — Material roles

`PxlMaterialRole` in `pxlModel.ts`. Ten roles, and the set is **smaller than the
one Phase 2.6 §3 proposed**, deliberately:

| Proposed | Status here | Why |
|---|---|---|
| `EXTERIOR_HULL` | ✅ | the topsides |
| `STERN_ACCENT` | ✅ as `STERN_MOULDING` | renamed to what the part is |
| `CONSOLE` | ✅ | but see §5 |
| `METAL / HARDWARE` | ✅ as `HARDWARE` | rails, coaming inlay, bow cleats |
| `DECK` | ✅ as `INTERIOR_SHELL` **from 4.2** | the liner, coaming walls and foredeck, separated at last |
| `FLOOR` | ✅ as `SOLE` **from 4.2** | its own mesh, its own channel |
| `INTERIOR_HULL` | ❌ absent | the hull is a zero-thickness shell. Its inner face is the *same triangles* as its outer face, drawn double-sided. There is no second surface to name. |

**Phase 4.2 added `INTERIOR_SHELL`, `SOLE` and `UPHOLSTERY`, and deleted
`INTERIOR_LINER`.** Until then this table said DECK and FLOOR could not be
separated because "`deck_main` is one mesh carrying the liner, the sole and the
inner shell faces". That was true of the mesh and false of the boat: the
surfaces were always distinct — a sole at z ≈ 0.38, a raised platform at
z ≈ 0.57, coaming walls between and above them — and the interior's up-facing
area falls into those two bands with almost nothing in the gap. `pxl_blender.py`
cuts them apart, so there are now three names pointing at three meshes.

Additional roles the geometry *does* support and the proposal did not name:
`HULL_BOTTOM`, `GUNWALE_CAPPING`, `UPHOLSTERY`, `HELM`, `PROPULSION`, `COVER`.

**The rule: a role exists when a mesh exists to carry it.** Adding one when the
geometry arrives is a line in the union plus a binding in `PXL_ZONES`; nothing
downstream addresses a material any other way. Phase 4.2 is that rule being
exercised rather than an exception to it.

### 3b — What `UPHOLSTERY` is, and what it is not

It is **the only role the cockpit colour reaches**, and that is the whole point
of Phase 4.2. Before it, `interiorPrimary` was bound to `deck_main` — 17.6 m² of
liner, sole, coaming and inner shell — so choosing a cockpit colour painted the
entire inside of the boat. It now reaches 4.88 m².

It is **not cushions**. It is the raised platform tops of the delivered
moulding, lifted 35 mm so they stand proud with a visible edge. The references
show real squabs and an angular backrest on the aft deck; the STL contains no
such forms and this phase did not invent them. The split is also by height
alone, so it cannot distinguish an upholstered side deck from a hard-moulded one
— the references show both, and the model gives them all the same treatment.

Both limits are recorded in PXL_REFERENCE_QA rows 11 and 12b and are waiting on
upholstery geometry from the yard.

### The resolution chain

```
role            EXTERIOR_HULL          a fact about the boat
  → channel     hullPrimary            a fact about this configuration schema
    → finish    pxl_sage               a fact about the paint
      → material                       written in place, never replaced
```

`finishForRole(config, 'EXTERIOR_HULL')` is the supported entry point.
`materials[4].color.set(...)` is not, and is what the chain exists to prevent:
a material index is a property of one export of one file, and re-running the
pipeline with the meshes in a different order silently renumbers every one.

### Phase Three addition: EXTERIOR_HULL is the swept role

The finish transition described in §66/§67 of the Phase Three brief travels
across the hull rather than fading the whole boat at once, and the surfaces it
travels across are selected **by role, not by mesh name**:

```ts
function sweeps(spec: PxlZoneSpec): boolean {
  return spec.role === "EXTERIOR_HULL";
}
```

Two zones carry that role today — `hull_primary` and `deck_trim` — so two
materials are given the sweep uniforms at load. If the pipeline ever splits the
topsides again, the new mesh joins the sweep by virtue of what it *is*.

What this adds to the material contract:

| | |
|---|---|
| **Where** | `PxlVessel.installSweep()`, called once per swept material inside `indexZones` |
| **How** | `onBeforeCompile` injects four uniforms and four chunk replacements — see `src/webgl/glsl/pxlSweep.ts` |
| **When** | at load, before the material has ever been compiled, so the program is built with the injections already in it |
| **Cost at rest** | the mask is parked below every coordinate the hull contains; the smoothstep resolves to 1 and all three mixes are the identity |
| **Cost during a change** | four uniform writes per frame, per swept material, for 520 ms |
| **What it does NOT do** | no second material, no second draw call, no render target, no geometry reload, and — because the program is compiled once at load — **no shader recompile during a finish change** |

The sweep coordinate is a plane equation over the model's own `position`
(`x/LOA + 0.5`, raked by three times tan 6.5°), not a UV. That is not a
preference: **the model has no UVs at all** (see §7), so a texture-space mask
could not be authored today, and a coordinate derived from geometry cannot go
out of step with a re-export the way an atlas can.

A future console replacement (§6) does not interact with this. The console
carries `CONSOLE`, not `EXTERIOR_HULL`, and is not swept.

---

## 4 — Configuration channels

**Updated in Phase 4.2.**

| Channel | Bound to | Finishes | Note |
|---|---|---|---|
| `hullPrimary` | `hull_primary`, **`interior_hard_liner`** | **six** | the only customer-facing exterior choice. The liner is on it because the liner *is* the topsides seen from inboard — choosing Navy gives a navy cockpit shell, which is what a moulded liner does. |
| `hullLower` | `hull_lower` | two | DARK LOWER / FULL BODY COLOUR |
| `sternMoulding` | `transom_black` | one | split off `hullLower` in Phase Four so FULL BODY cannot repaint the PXL mark's ground |
| `hullAccent` | `hull_accent` | one | capping black |
| **`interiorPrimary`** | **`upholstery_primary`** | five | **the cockpit colour, and it reaches nothing else.** `npm test` asserts exactly this binding. |
| **`sole`** | **`cockpit_sole`** | one | new in 4.2. `PLACEHOLDER_VISUAL_MATERIAL`; the yard has supplied no deck-covering range. |
| `interiorSecondary` | `console_body` | three | the console's aft panel only. `console_detail` is unbound — structural black in every reference |
| `metal` | `rails`, **`coaming_inlay`**, **`bow_fitting`** | one | cognac lacquer |
| `motor` | `motor`, `motor_trim` | one | **never follows the hull colour** — an outboard is a bought-in component in the manufacturer's own finish |
| `motor` | `motor`, `motor_trim` | one | **never follows the hull colour** — an outboard is a bought-in component in the maker's own finish. Both zones hidden by default; the four proxy drives stand in — see §8b. |
| `glazing` | *nothing in the GLB* | one | served at runtime by `pxlGlazing`, which builds the screen from the console's measured box. The screen to model is a *tower*, not a windscreen — see §5. |

### `PLACEHOLDER_VISUAL_MATERIAL`

`pxl_floor_graphite`, `pxl_console_graphite` and `pxl_accent_black` are
**presentation materials for visual completeness only**. They are not offered,
not named to a customer and not confirmed by the yard. They exist so the boat is
not rendered with unpainted default grey where a real specification is missing.

---

## 5 — Revision mismatch: THE CONSOLE

**This is the known limitation of the whole PXL asset. It must not be
forgotten, and it must not reach a customer surface unqualified.**

The STL and the two dated renders (`pxl-side-20240719`, `pxl-views-20240815c`)
agree with each other: a **low, faceted helm console** with a small raked
windscreen. The recovered model matches them closely.

The six **colour studies show a different console**: a tall, dark, glazed tower
carrying its own `PXL` mark, roughly twice the height of the one in the STL.
Everything else in those renders — hull, chine, stern moulding, capping, rails,
outboard — is unchanged.

So the colour studies are a **later design revision** than the geometry that was
delivered. The model is faithful to the 3D file it was built from. It is *not*
faithful to the console in the colour studies, and it cannot be without new
geometry nobody has supplied.

| | STL revision (what we have) | Colour-study revision (what the renders show) |
|---|---|---|
| Console | low, faceted, open | tall, dark, glazed tower |
| Screen | small raked windscreen | full tower glazing |
| Branding | none as geometry | `PXL` on the tower |
| Hull, chine, stern, capping, rails, outboard | — identical — | — identical — |

### Consequences that are already encoded

- `PXL_CONSOLE_REVISION = "PXL_CONSOLE_CURRENT"` in `pxlModel.ts`, printed on the
  development bench.
- The `console` configuration category is marked **unavailable**, with this as
  its stated reason. Offering a finish choice on a part that is about to be
  replaced would be selling a decision we know is void.
- The `detail` camera preset exists but is **withheld from the configurator's
  view selector**. It frames the helm at close range — the one composition where
  the discrepancy is unmissable.
- The `glazing` channel's eventual shape changes: the screen to model is a
  tower, not a windscreen.

---

## 6 — Future console replacement contract

When the yard supplies the production console, this is the whole procedure. **No
configurator code changes.** If a step below turns out to require one, the
architecture has drifted and that is the bug to fix.

1. **Receive** the geometry (STEP or a clean mesh) and at least one orthographic
   reference showing its position relative to the sheer and the transom.
2. **Align** to the existing coordinate system: metres, +Y up, bow +X, origin
   amidships on the visual waterline. The hull is the datum — the console moves
   to the hull, never the reverse.
3. **Export** the replacement nodes from `scripts/pxl/build_pxl.py` under the
   *same* names: `console_body`, `console_detail`, `windshield`, `helm_wheel`,
   plus any new node
   the tower needs (glazing is the likely one).
4. **Bind** each new node in `PXL_ZONES` with a role and a channel. A glazing
   node takes `role: "GLAZING"` and `channel: "glazing"` — the channel is
   already declared and currently unbound, so this is a binding, not a new API.
5. **Preserve material roles.** `EXTERIOR_HULL`, `HULL_BOTTOM`,
   `GUNWALE_CAPPING`, `STERN_MOULDING`, `INTERIOR_LINER`, `HARDWARE` and
   `PROPULSION` must all still resolve to the same physical surfaces afterwards.
   `npm test` asserts the bindings; `npm run model` asserts the nodes exist.
6. **Preserve camera presets.** All five configurator views are composed against
   the hull, not the console, so a taller console changes what is *in* frame but
   not where the camera stands. Re-measure rather than re-author.
7. **Revalidate the bounding box.** A tower is taller than the current console;
   the vessel's height grows and `pxlTelemetry` will report higher vertical
   coverage. Re-run the responsive matrix (§76 of the phase brief) and adjust
   `minVfov` on any preset that now clips. This is the only number expected to
   move.
8. **Flip `PXL_CONSOLE_REVISION`** to `PXL_CONSOLE_PRODUCTION`, clear the
   `console` category's `unavailable` string if a finish range comes with it,
   and re-enable the `detail` preset in `PXL_CONFIGURATOR_VIEWS`.
9. **Re-check the budget.** Target stays ≤ 400 kB and roughly 20–25k triangles.
   A glazed tower should cost hundreds of triangles, not thousands.

---

## 7 — Branding

**Updated in Phase 4.1.** All three marks the references show are now placed. The
rule that opened this section — *none may be placed by eye* — was kept: every
position, scale and ink below was measured off a delivered plate by a script, and
the plate pixel it came from is recorded in `pxlReference.ts`.

| Slot | Zone / surface | Ground | Instances | Ink | Artwork |
|---|---|---|---|---|---|
| `pxl_wordmark` | `transom_black` | stern moulding | 2 (mirrored) | `#d6703c`, or `#191b1e` on a light ground | Authored outlines, re-proportioned from the plate's 100 × 19 px lockup |
| `duna_script` | `hull_accent` | gunwale capping | 2 (mirrored) | `#d6703c` | **Provisional.** Mechanical threshold trace of a 147 × 28 px instance |
| `pxl_plexi` | `pxl_screen_glass` | glazing | **1** (centreline) | `#c9d2d8`, fixed | Same authored lockup, own transform |

Five mark meshes in total, not six: the plexi mark is a single centreline
instance rather than a mirrored pair.

**How placement is derived.** By surface raycast against the real geometry, not
from memory — `npm run vessel` fires the ray and asserts the result lands on the
intended moulding, above the waterline, facing outboard, not mirrored, and not
z-fighting. A mark whose ray misses is a build failure, not a review finding.

**Ink follows the ground, not the configuration.** `inkForGround` picks between
the two hull treatments on the ground's luminance (threshold 0.18, *linear*). The
plexi ink is fixed because glazing is not a configurable finish. This is what
keeps the marks stable during a finish sweep and across all six exterior colours,
and it is why there is no outline, no drop shadow and no glow anywhere — none is
part of the product design, and the ink rule removes the need for them.

**Configuration independence holds.** One GLB, one set of mark geometry, no decal
texture per hull colour, no duplicated vessel. Geometry, branding and finish stay
three separate things.

**Still true:** the model carries **no UVs** — the source is an STL. The marks are
therefore *geometry* generated from contours rather than textures on an unwrapped
hull, and the interior grain is triplanar for the same reason. A re-export with a
UV set (F-02) remains the right long-term answer for both.

**The artwork is provisional and says so in code.**
`PXL_DUNA_ARTWORK.provisional_brand_artwork` is `true`, the disclaimer travels
with the contours, and the configurator tests assert both. See PHASE_4_1_REPORT.md
§C for why the trace is mechanical rather than hand-drawn.

---

## 8 — Budgets

| | Current | Ceiling | Note |
|---|---:|---:|---|
| GLB transfer | 341 kB | ~400 kB | measured on the production build |
| Triangles | 20,574 | ~25,000 after the console | a glazed tower is hundreds, not thousands |
| Meshes | 16 | — | do not merge to save draw calls; configuration semantics outrank micro-optimisation |
| Materials | 16 | — | one per mesh, so any zone can be broken out later without a re-export |
| Textures | 0 | — | keep it that way until upholstery or branding genuinely need one |
| Draw calls in scene | 17 | — | 16 meshes + the studio backdrop |

Compression stays **meshopt**. Draco would trade a bundled decoder for a CDN
fetch or ~180 kB of self-hosted WASM, on an asset already under 300 kB, and
decodes several times slower on exactly the devices that need it most.

---

## 8b — WHAT PHASE FOUR ADDS TO THE MODEL AT RUNTIME

Two things are now hung on the vessel that are **not in the GLB**, and both are
validated against it rather than assumed.

### Channel changes

| Change | Was | Is |
|---|---|---|
| `transom_black` | channel `hullLower` | channel **`sternMoulding`** |
| `deck_main` | channel `flooring`, finish family `moulding` | channel **`interiorPrimary`**, family **`soft`** |
| `console_body`, `console_detail` | channel `console` | channel **`interiorSecondary`** (the shell is now unbound) |
| `motor`, `motor_trim` | `visibleByDefault: true` | **`false`** — see below |

The stern moulding was split off `hullLower` so that FULL BODY COLOUR can repaint
the bottom without repainting the ground the PXL mark sits on. `upholsteryPrimary`
and `upholsterySecondary` are gone from `PXL_UNSUPPORTED_CHANNELS` — **not**
because upholstery arrived, but because a channel named after a cushion and bound
to a moulding is a lie the material system would repeat in every summary and
payload.

### Proxy drives

`pxlPropulsion.buildDrive(variant)` builds one of four outboards from extruded
profiles and mounts it at `PXL_MOUNTS.transom`. **Rebuilt below the powerhead in
4.6, §2–§6**: the leg went from 0.21 m to 0.59–0.79 m so the lower unit reaches
0.58–0.75 transom-depths below the keel, against a reference that draws 0.684.
The parts are now bracket, cowling, **apron**, midsection, anti-ventilation
plate, **trim tab**, gearcase, **skeg**, and a three-blade propeller with real
pitch — the two new ones and the rewritten midsection are §6's requirement that
the lower half stop reading as a rectangular extrusion. The powerhead did not
move: its top, its height and its clamp are Phase 4.4's, and only what hangs
under them was extended.

The delivered `motor` and `motor_trim` zones are **hidden, not deleted**. They
keep their ids, their `PROPULSION` role and their `motor` channel;
`visibleByDefault: false` is the whole of the change, and switching it back is
one flag. See PHASE_4_REPORT §F for why the delivered mesh was not scaled.

Measured by `npm run vessel`:

```
drive       tris     len     hgt     wid    fwd-most   deepest
compact     1520   0.542   1.185   0.325  -2.627   -0.122
standard    1520   0.651   1.398   0.382  -2.627   -0.228
large       1520   0.782   1.599   0.435  -2.627   -0.305
electric    1520   0.536   1.252   0.297  -2.627   -0.249
```

Every drive's forward-most point is the transom plane at −2.6266 m, so nothing
enters the hull. Every propeller is submerged and clear of the rails and deck by
construction.

### The PXL mark

`pxlDecals.placeWordmark(moulding, ink)` builds three authored letterforms as
`ShapeGeometry` and places them by **raycasting inboard from outside the beam**
at `PXL_MOUNTS.pxlMark`, taking the surface point and face normal from the real
`transom_black` mesh. Placement is therefore found rather than remembered, and
survives a re-export.

```
side        x       y       z    width   normal·z
starboard  -2.110   0.331   1.010   0.182    0.985
port       -2.110   0.331  -1.009   0.183   -0.981
```

### The interior grain, and the UV problem

**No mesh in this GLB has a `uv` attribute.** The source is an STL, and an STL
has no texture coordinates to export. Confirmed:

```
hull_primary  position,normal      deck_main     position,normal
hull_lower    position,normal      console_body  position,normal
…all thirteen: position and normal only
```

That makes a conventional normal map impossible, and §A9 asks for a
micro-normal. The implementation is **triplanar** — `src/webgl/glsl/pxlGrain.ts`
samples one procedurally generated 128×128 normal map three times, once down
each object axis, blended by the surface normal with the whiteout form. No UVs,
no seams, no stretching on any face orientation, and no dependency on the export.

**Re-exporting the model with a UV set is the correct long-term fix** and is
filed in ASSET_REQUIREMENTS.md as P0. It would also unblock a real branding
decal and any future albedo or roughness map.

### New anchors in `pxlModel.ts`

`PXL_MOUNTS` carries the transom plane and the mark's ray target, both read off
the delivered GLB by measuring zone bounding boxes rather than estimated from
the renders. `npm run vessel` asserts that what is built from them still lands
inside the zone it claims to sit on.

---

## 9 — What is still missing from the yard

Findings, not a wish list. Each was confirmed by inspecting the source.

| Missing | Blocks |
|---|---|
| Production console geometry | §5, §6 — the `console` and `glazing` channels, the `detail` view |
| Upholstery geometry **and** specification | real upholstery — the INTERIOR category currently configures the moulded liner and the console, which is the honest maximum |
| **A UV set on the model** | a conventional normal/albedo/roughness map, and a real branding decal. Worked around with triplanar projection — see §8b |
| **The Duna script logotype, as a vector** | §A12 — the slot is declared and empty |
| Engine option list | replacing the four neutral proxy drives with a real range |
| Equipment / accessory range | those two deferred categories |
| Approved colour names, and paint codes if any | `previewLabel` values are working names, `approvedDisplayName` is undefined and `published` is false on every finish, `manufacturingCode` is empty. `finishLabel(f, "public")` therefore returns null for the whole range — see PXL_CONFIGURATOR_SCHEMA.md |
| Published specifications (LOA, beam, draft, weight, capacity, power, CE category) | `PXL.published` staying `false` |
| Displacement or hydrostatic data | replacing the visual waterline with a real one |

---

## 10 — Regenerating and checking

```bash
npm run pxl      # STL → source GLB → Blender correction → optimised GLB → web media
npm run pxl:blender  # the Blender correction stage alone — see §2b
npm run model    # validate the production GLB through three's own loader
npm run vessel   # the runtime-built parts — drives and marks — against the GLB
npm test         # the configurator contract: URL, roles, presets, slugs
npm run qa       # all of the above, plus typecheck and GLSL validation
```

`npm run vessel` is the one to run after touching `pxlPropulsion`,
`pxlDecals` or `PXL_MOUNTS`. It builds the real objects with the real code and
measures them — which is how a bevel that had pushed 12 mm of bracket inside the
hull was found, invisibly, from every camera preset the configurator offers.

The pipeline never writes to `assets/source/`. Inspection renders land in
`assets/derived/pxl/` beside the archival master
(`PXL.source.glb`, 971 kB, 45,681 triangles) and the corrected
`PXL.production.glb` (1.08 MB, 46,668 triangles) the compressor now reads.
