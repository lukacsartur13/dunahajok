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
| On disk | 303 kB · **259.6 kB over the wire** (measured, production build) |
| Compression | `EXT_meshopt_compression` — decoder ships inside three-stdlib, no extra request |
| Triangles | 20,235 |
| Meshes / materials / textures | 13 / 13 / **0** |
| Units · up · forward | metres · +Y · +X (bow) |
| Origin | amidships on the **visual** waterline |
| Draft below y = 0 | 0.221 m |
| Design revision | `PXL_CONSOLE_CURRENT` — see §5 |

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
| `hull_primary` | Topsides, chine to sheer | `EXTERIOR_HULL` | **yes** | `hullPrimary` | 5,818 | 2 | always | none — this is the surface the six colour studies vary |
| `deck_trim` | Bow bulkhead and console base panel | `EXTERIOR_HULL` | **yes** | `hullPrimary` | 10 | 2 | always | 10 triangles; whether the yard paints these with the topsides is *assumed from the renders*, not confirmed |
| `hull_lower` | Bottom, below the chine | `HULL_BOTTOM` | yes | `hullLower` | 7,187 | 2 | always | one finish only — every reference shows structural black |
| `transom_black` | Transom and black stern moulding | `STERN_MOULDING` | yes | `hullLower` | 2,254 | 2 | always | carries the `PXL` mark in the renders; **no mark exists as geometry** |
| `hull_accent` | Gunwale capping | `GUNWALE_CAPPING` | yes | `hullAccent` | 792 | 2 | always | the cognac inlay visible in the renders is not separable — it is inside this mesh |
| `deck_main` | Cockpit liner, sole **and inner shell faces** | `INTERIOR_LINER` | yes | `flooring` | 1,149 | 2 | always | one mesh doing three jobs; see §3 |
| `console_body` | Helm console | `CONSOLE` | yes | `console` | 247 | 1 | always | **superseded revision** — see §5 |
| `console_trim` | Console control box | `CONSOLE` | yes | `console` | 92 | 1 | always | superseded with the console |
| `helm_wheel` | Steering wheel | `HELM` | no | — | 1,840 | 1 | always | a bought-in part; not identifiable, not configurable |
| `rails` | Fore and aft grab rails | `HARDWARE` | yes | `metal` | 40 | 1 | always | 40 triangles for two rails — geometry is indicative, not detailed |
| `motor` | Outboard cowling and leg | `PROPULSION` | yes | `motor` | 346 | 1 | always | not identifiable as any specific engine; carries no maker's marks |
| `motor_trim` | Outboard bracket | `PROPULSION` | yes | `motor` | 37 | 1 | always | as above |
| `accessory_cockpit_cover` | Flush cockpit cover | `COVER` | visibility only | — | 423 | 2 | **hidden by default** | present in the STL, absent from every render; nobody has confirmed it is a product |

Node hierarchy:

```
PXL_ROOT
├─ HULL         hull_primary · hull_lower · hull_accent
├─ TRANSOM      transom_black
├─ DECK         deck_main · deck_trim
├─ CONSOLE      console_body · console_trim · helm_wheel
├─ METAL        rails
├─ PROPULSION   motor · motor_trim
└─ OPTIONAL     accessory_cockpit_cover
```

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
| `EXTERIOR_HULL` | ✅ | topsides + deck panels |
| `STERN_ACCENT` | ✅ as `STERN_MOULDING` | renamed to what the part is |
| `CONSOLE` | ✅ | but see §5 |
| `METAL / HARDWARE` | ✅ as `HARDWARE` | the rails |
| `INTERIOR_HULL` | ❌ absent | the hull is a zero-thickness shell. Its inner face is the *same triangles* as its outer face, drawn double-sided. There is no second surface to name. |
| `DECK` | ❌ folded into `INTERIOR_LINER` | `deck_main` is one mesh carrying the liner, the sole and the inner shell faces. Two roles pointing at one material is a trap: the first person to set them differently finds out at render time. |
| `FLOOR` | ❌ folded into `INTERIOR_LINER` | same mesh, same reason |

Additional roles the geometry *does* support and the proposal did not name:
`HULL_BOTTOM`, `GUNWALE_CAPPING`, `HELM`, `PROPULSION`, `COVER`.

**The rule: a role exists when a mesh exists to carry it.** Adding one when the
geometry arrives is a line in the union plus a binding in `PXL_ZONES`; nothing
downstream addresses a material any other way.

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

| Channel | Bound to | Finishes | Note |
|---|---|---|---|
| `hullPrimary` | `hull_primary`, `deck_trim` | **six** | the only customer-facing choice |
| `hullLower` | `hull_lower`, `transom_black` | one | structural black in every reference |
| `hullAccent` | `hull_accent` | one | capping black |
| `flooring` | `deck_main` | one | `PLACEHOLDER_VISUAL_MATERIAL` — see below |
| `console` | `console_body`, `console_trim` | one | superseded revision, not offered |
| `metal` | `rails` | one | cognac inlay |
| `motor` | `motor`, `motor_trim` | one | **never follows the hull colour** — an outboard is a bought-in component in the manufacturer's own finish |
| `upholsteryPrimary` | *nothing* | — | no seating or cushion geometry in the source |
| `upholsterySecondary` | *nothing* | — | as above |
| `glazing` | *nothing* | — | no windscreen geometry; and the screen to model is a *tower*, not a windscreen — see §5 |

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
   *same* names: `console_body`, `console_trim`, `helm_wheel`, plus any new node
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
| GLB transfer | 259.6 kB | ~400 kB | measured on the production build |
| Triangles | 20,235 | ~25,000 after the console | a glazed tower is hundreds, not thousands |
| Meshes | 13 | — | do not merge to save draw calls; configuration semantics outrank micro-optimisation |
| Materials | 13 | — | one per mesh, so any zone can be broken out later without a re-export |
| Textures | 0 | — | keep it that way until upholstery or branding genuinely need one |
| Draw calls in scene | 14 | — | 13 meshes + the studio backdrop |

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
| `console_body`, `console_trim` | channel `console` | channel **`interiorSecondary`** |
| `motor`, `motor_trim` | `visibleByDefault: true` | **`false`** — see below |

The stern moulding was split off `hullLower` so that FULL BODY COLOUR can repaint
the bottom without repainting the ground the PXL mark sits on. `upholsteryPrimary`
and `upholsterySecondary` are gone from `PXL_UNSUPPORTED_CHANNELS` — **not**
because upholstery arrived, but because a channel named after a cushion and bound
to a moulding is a lie the material system would repeat in every summary and
payload.

### Proxy drives

`pxlPropulsion.buildDrive(variant)` builds one of four outboards from extruded
profiles — bracket, cowling, midsection, anti-ventilation plate, gearcase, and a
three-blade propeller with real pitch — and mounts it at `PXL_MOUNTS.transom`.

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
npm run pxl      # STL → source GLB → optimised GLB → web media
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
(`PXL.source.glb`, 971 kB, 45,681 triangles).
