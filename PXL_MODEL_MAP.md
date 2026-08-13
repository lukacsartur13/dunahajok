# PXL_MODEL_MAP — the configurable surfaces of `public/models/PXL.glb`

> **Phase 2.6 note.** This document describes the *asset* — how it was recovered,
> what it measures, what the source could not provide. The contract between the
> asset and the configurator — material roles, the console-revision mismatch and
> the exact procedure for replacing that console — now lives in
> **[PXL_CONFIGURATOR_MODEL_MAP.md](PXL_CONFIGURATOR_MODEL_MAP.md)**. The mesh
> table below and the one there describe the same thirteen meshes; that one adds
> the roles, the visibility dependencies and the per-mesh uncertainty.

Every name in this document is written by `scripts/pxl/build_pxl.py` and read by
`src/webgl/scenes/pxl/pxlModel.ts`. `scripts/pxl/validate-model.mjs` fails the
build if one of them goes missing. Regenerate the asset with `npm run pxl` and
check it with `npm run model`.

**This table describes the model that exists.** It is not a specification for a
model somebody might deliver later — for that, see *What the source cannot
provide* at the end, which is the list of things the yard still has to send.

---

## The asset

| | |
|---|---|
| File | `public/models/PXL.glb` |
| Transfer size | **303 kB** |
| Geometry in GPU | 488 kB (positions + normals + indices, decompressed) |
| Compression | `EXT_meshopt_compression` — decoder bundled with three-stdlib, no extra request |
| Triangles | 20,235 |
| Vertices | 15,273 |
| Meshes | 13 |
| Materials | 13 (one per mesh) |
| Textures | 0 |
| Animations | 0 |
| Hull bounding box | 5.253 × 1.163 × 2.094 m (length × height × beam) |
| With outboard | 5.762 × 1.457 × 2.094 m |
| Units | metres |
| Up / forward | +Y / +X (bow) |
| Origin | amidships on the visual waterline; hull centre reads 0.000, 0.361, 0.000 |
| Draft below y = 0 | 0.221 m |

Archival master: `assets/derived/pxl/PXL.source.glb` (971 kB, uncompressed,
45,681 triangles). Immutable source: `assets/source/pxl/PXL-3D.stl`.

---

## Mesh and material map

One mesh, one material, at most one configuration channel. The channel is what
a configurator writes to; a zone with `—` is not configurable, by decision or
because there is nothing to configure it against.

| Mesh / node | Product part | Material | Tris | Configurable | Channel | Sides |
|---|---|---|---|---:|---|---|---|
| `hull_lower` | Hull bottom, below the chine | `hull_lower` | 7,187 | yes | `hullLower` | 2 |
| `hull_primary` | Hull topsides, chine to sheer | `hull_primary` | 5,818 | **yes** | `hullPrimary` | 2 |
| `transom_black` | Transom and the black stern moulding | `transom_black` | 2,254 | yes | `hullLower` | 2 |
| `helm_wheel` | Steering wheel | `helm_wheel` | 1,840 | no | — | 1 |
| `deck_main` | Cockpit liner, sole, inner faces of the shell | `deck_main` | 1,149 | yes | `flooring` | 2 |
| `hull_accent` | Gunwale capping | `hull_accent` | 792 | yes | `hullAccent` | 2 |
| `accessory_cockpit_cover` | Flush cockpit cover — **hidden by default** | `accessory_cockpit_cover` | 423 | visibility only | — | 2 |
| `motor` | Outboard cowling and leg | `motor` | 346 | yes | `motor` | 1 |
| `console_body` | Helm console | `console_body` | 247 | yes | `console` | 1 |
| `console_trim` | Console control box | `console_trim` | 92 | yes | `console` | 1 |
| `rails` | Fore and aft grab rails | `rails` | 40 | yes | `metal` | 1 |
| `motor_trim` | Outboard bracket | `motor_trim` | 37 | yes | `motor` | 1 |
| `deck_trim` | Bow bulkhead and console base panel | `deck_trim` | 10 | yes | `hullPrimary` | 1 |

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

### Why "sides" is 2 for the hull

The source hull is a **zero-thickness open shell**. There is no inner skin
below the sheer, and the moulded liner does not quite reach the gunwale, so
under backface culling you can see daylight through the boat from inside the
cockpit. Those zones are therefore double-sided. This is a property of the
delivered geometry, not a rendering preference — giving the hull thickness
would mean inventing a surface the yard has not drawn.

---

## Configuration channels

Declared in `pxlModel.ts`. Four are declared with nothing bound to them, on
purpose: the union is the API, and a channel that appears later is a change
every consumer has to be recompiled against.

| Channel | Bound to | Finishes available |
|---|---|---|
| `hullPrimary` | `hull_primary`, `deck_trim` | six — see below |
| `hullLower` | `hull_lower`, `transom_black` | `pxl_structure_black` |
| `hullAccent` | `hull_accent` | `pxl_accent_black` |
| `flooring` | `deck_main` | `pxl_floor_graphite` |
| `console` | `console_body`, `console_trim` | `pxl_console_graphite` |
| `metal` | `rails` | `pxl_rail_cognac` |
| `motor` | `motor`, `motor_trim` | `pxl_motor_black` |
| `upholsteryPrimary` | *nothing* | no seating geometry in the source |
| `upholsterySecondary` | *nothing* | no seating geometry in the source |
| `glazing` | *nothing* | no windscreen geometry in the source |

### Hull finishes

Internal working identifiers. **Not product names, not confirmed as orderable,
no prices.** Each is anchored on the lit diffuse reading taken off the matching
reference render.

| id | Reference | Base (sRGB) | Roughness | Metalness | Clearcoat |
|---|---|---|---:|---:|---:|
| `pxl_white` | `pxl-water-white` | `#dcdedb` | 0.24 | 0 | 0.62 |
| `pxl_sage` | `pxl-water-sage` | `#61817b` | 0.24 | 0 | 0.62 |
| `pxl_black` | `pxl-water-black` | `#15181c` | 0.28 | 0 | 0.70 |
| `pxl_warm_grey` | `pxl-water-warm-grey` | `#a49d95` | 0.26 | 0 | 0.58 |
| `pxl_gold` | `pxl-water-gold` | `#8a7140` | 0.32 | 0.34 | 0.66 |
| `pxl_navy` | `pxl-water-navy` | `#1b3a5c` | 0.24 | 0 | 0.66 |

`pxl_black` is `#15181c` and not `#000000` deliberately: a base colour at zero
produces no gradient under any light, and the whole lower hull collapses into a
silhouette.

---

## Component visibility

`PxlConfiguration.equipment` is keyed on zone names, so any genuine option is
expressible as "these meshes on, those off" without a schema change. Today
there is exactly one honest member:

| Zone | Default | Note |
|---|---|---|
| `accessory_cockpit_cover` | **hidden** | A flush panel over the cockpit, present in the source model and in none of the design renders. Exported so the option exists; switched off because the product as drawn does not have it. |

---

## What the source cannot provide

Findings, not a wish list. Each one was confirmed by inspecting the STL.

| Missing | Detail |
|---|---|
| **Upholstery** | The renders show orange/cognac cushions on the seat boxes and a backrest at the console. The STL has none — the cockpit is a bare moulded liner. Two configuration channels are declared and unbound because of this. |
| **Windscreen** | Every colour study shows a tinted screen on the console. The STL console is a closed box, 247 triangles, with no glazing at all. The `glazing` channel is unbound. |
| **Branding geometry** | `PXL` on the stern moulding, `PXL` on the console and the `Duna` script on the topsides all appear in the renders. None exists as geometry, and no logo asset was supplied in a form the model could carry. **No branding has been recreated** — placing a mark by eye on a real product's hull is exactly the kind of invention this phase rules out. |
| **UVs** | STL carries none, and none were generated: every material here is a solid painted or moulded surface, so parametric PBR is both smaller and sharper than an atlas would be. Branding and upholstery are what will make UVs necessary. |
| **Hull thickness** | Zero — see "sides" above. |
| **Interior detail** | The liner is 218 triangles over 16.2 m² of surface: seat boxes and a sole, no lockers, no hatches, no fastenings, no rubbing strake detail. |
| **Motor identity** | An outboard is modelled at 468 triangles. It is not identifiable as a specific engine and carries no maker's marks, so the propulsion variant is recorded as unconfirmed. |
| **Waterline** | Estimated visually — see below. No displacement or hydrostatic data was supplied. |
| **Underside detail** | The bottom is a clean shell: no transducers, no anodes, no intakes. Mostly invisible in the water, so not a priority. |
| **Mannequin** | The STL contains a seated figure in every copy of the boat. Removed. |

### The STL and the colour studies are different design revisions

Worth raising with the yard before anything customer-facing is built on either.

The STL and the two dated renders (`pxl-side-20240719`, `pxl-views-20240815c`)
agree: a **low, faceted helm console** with a small raked windscreen. The model
matches them closely.

The six **colour studies show a different console** — a tall, dark, glazed
tower carrying its own `PXL` mark, roughly twice the height of the one in the
STL. Everything else in those renders (hull, chine, stern moulding, capping,
rails, outboard) is unchanged.

So the colour studies appear to be a **later revision** than the geometry that
was delivered. The model is faithful to the 3D file it was built from; it is
not faithful to the console in the colour studies, and it cannot be without new
geometry. This also changes the shape of the missing `glazing` channel: the
screen to model is a tower, not a windscreen.

### The waterline is a visual calibration

The model's origin sits on a waterline **measured off the design renders**, not
calculated. In all six colour studies the freeboard at amidships reads 0.1665
of LOA; the model's sheer is 1095.6 mm above the keel and its LOA is 5253.2 mm,
so the surface was placed 220.6 mm above the lowest point of the keel, which
gives a freeboard ratio of 0.1666.

That is a match to how the boat is *drawn*. It is not a flotation calculation,
and it does not account for load, fuel, crew or the outboard's weight aft.
`PXL_MODEL.waterlineTrim` exists so a real figure from the yard can be applied
without re-exporting the model.

---

## Regenerating

```bash
npm run pxl      # STL → source GLB → optimised GLB → web media
npm run model    # validate the production GLB through three's own loader
```

The pipeline never writes to `assets/source/`. Inspection renders land in
`assets/derived/pxl/` beside the archival master.
