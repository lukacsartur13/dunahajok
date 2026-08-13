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

**No branding has been placed, and none may be placed by eye.**

The renders show `PXL` on the stern moulding, `PXL` on the console, and a `Duna`
script on the topsides. None exists as geometry, no logo asset was supplied in a
usable form, and no placement dimension has been given. Guessing a mark's
position on a real product's hull and shipping it is exactly the kind of
invention this phase rules out.

What is prepared, and only prepared: the configuration schema reserves
`branding.PXL` and `branding.DUNA` as future keys. Nothing implements them.

When artwork and placement arrive, the expected route is a **decal or a UV
overlay**, not geometry baked into the hull — a mark baked into `hull_primary`
cannot be moved, cannot be turned off, and forces a re-export for a typo. The
model currently carries **no UVs**; generating them is a prerequisite, and is the
reason UVs were skipped in Phase 2.5 rather than an oversight.

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

## 9 — What is still missing from the yard

Findings, not a wish list. Each was confirmed by inspecting the source.

| Missing | Blocks |
|---|---|
| Production console geometry | §5, §6 — the `console` and `glazing` channels, the `detail` view |
| Upholstery geometry **and** specification | the `upholstery` category |
| Branding artwork + placement dimensions | §7 — and UV generation before that |
| Engine option list | the `engine` category |
| Equipment / accessory range | those two categories |
| Approved colour names, and paint codes if any | `previewLabel` values are working names, `approvedDisplayName` is undefined and `published` is false on every finish, `manufacturingCode` is empty. `finishLabel(f, "public")` therefore returns null for the whole range — see PXL_CONFIGURATOR_SCHEMA.md |
| Published specifications (LOA, beam, draft, weight, capacity, power, CE category) | `PXL.published` staying `false` |
| Displacement or hydrostatic data | replacing the visual waterline with a real one |

---

## 10 — Regenerating and checking

```bash
npm run pxl      # STL → source GLB → optimised GLB → web media
npm run model    # validate the production GLB through three's own loader
npm test         # the configurator contract: URL, roles, presets, slugs
npm run qa       # all three, plus typecheck
```

The pipeline never writes to `assets/source/`. Inspection renders land in
`assets/derived/pxl/` beside the archival master
(`PXL.source.glb`, 971 kB, 45,681 triangles).
