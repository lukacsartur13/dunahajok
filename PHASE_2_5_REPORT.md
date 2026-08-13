# PHASE 2.5 — the PXL as a real-time product

Phase One built the site. Phase Two built the renderer. This phase turned a
SketchUp STL into a 303 kB production asset with thirteen separately
addressable, separately configurable surfaces, put it into the Phase Two
renderer without rewriting any of it, and built the configuration architecture
underneath it.

Nothing in Phase Two was replaced. The single canvas, the SceneSlot registry,
the scissor-per-slot runtime, the quality tiers, the water, the wake and the
hero's whole choreography are untouched; the PXL is a second scene in the same
machine.

**Inspect it at `/dev/pxl`** — non-indexed, and not a preview of the
configurator.

---

## A. Source asset audit

Delivered, and now held immutably in `assets/source/pxl/`:

| File | Was | Content |
|---|---|---|
| `PXL-3D.stl` | `PXL 3D.stl` | 10.06 MB binary STL, 201,155 triangles, written by SketchUp |
| `pxl-side-20240719.jpg` | `20240719.jpg másolata.jpg` | Profile design render, bow right, on white |
| `pxl-views-20240815c.jpg` | `20240815c.jpg másolata.jpg` | Three studies: profile, cockpit from above, stern quarter |
| `pxl-colours-01.jpg` | `color1.jpg másolata.jpg` | White and sage hulls, on water |
| `pxl-colours-02.jpg` | `Colors2.jpg másolata.jpg` | Black hull, and a two-tone white/sage study |
| `pxl-colours-03.jpg` | `Colors3.jpg másolata.jpg` | Warm grey and dark slate hulls |
| `pxl-colours-04.jpg` | `Colors4.jpg másolata.jpg` | Gold and navy hulls |

They were moved out of the repository root into `assets/source/pxl/` and given
stable names. Nothing was modified, and the pipeline only ever opens them for
reading. The names they arrived with — spaces, a Hungarian "másolata", a
mixture of `color`/`Colors` — are not names a build script should depend on.

Web derivatives are generated into `public/media/pxl/` by
`scripts/pxl/build-pxl-media.mjs`, with a typed manifest at
`src/lib/pxl.media.generated.ts`, following the same pattern as the existing
`build-assets.mjs`.

**What the imagery establishes.** An open boat with a single side-mounted helm
console and a transom outboard. A faceted hull with a hard chine running the
full length, a black moulded bottom, a black stern moulding carrying the `PXL`
mark, a black gunwale capping with a cognac inlay, cognac grab rails fore and
aft, a `Duna` script on the topsides, orange-cognac upholstery on moulded seat
boxes, and a tinted windscreen on the console. Six hull colours.

---

## B. STL findings

The STL is **not one boat**. It is a working scene:

| Cluster | Content |
|---|---|
| 0 | A complete PXL — 15 loose parts, 48,745 triangles. **The instance shipped.** |
| 1 | The same vessel again, translated. 16 parts, 48,787 triangles |
| 2 | The same vessel, missing its console. 14 parts, 44,948 triangles |
| 3 | The same vessel plus duplicate consoles and wheels lying alongside it. 25 parts |
| 4 | 34 fragments of construction/reference geometry spread over 8.1 m |
| 5 | One 740 × 1024 × 378 mm fragment, unattached to anything |

The four hulls are byte-identical in shape — same 41,043 triangles, same
20,166,432 mm² of surface, same 5253.2 × 2094.3 × 1163.4 bounding box — and
differ only by translation. Cluster 0 was chosen because its loose parts are
exactly the vessel and nothing else.

Structural findings across the whole file:

| | |
|---|---|
| Triangles | 201,155 |
| Vertices | 603,465 raw → 106,493 welded at 1e-4 |
| Connected components | 106 |
| Boundary edges (used once) | 19,025 |
| Non-manifold edges (3+ faces) | 4,116 |
| Duplicate triangles | 1,427 sets, 1,571 redundant |
| Zero-area triangles | 114 |
| Facet normals disagreeing with their own winding | **61,182 of 201,155** |
| Triangles under 1 mm² | 3,619 |

Two findings drove real decisions:

**Every copy contains a seated mannequin** — 1,464 triangles, 725.7 × 763.7 ×
1458.2 mm. It is a scale reference, not product, and is dropped by the
pipeline.

**The stern is grossly over-tessellated.** 12,634 triangles — 31% of the hull —
sit in the aftmost 5% of its length, describing a transom that is very nearly
flat. This is where the optimisation pass earns its keep.

---

## C. Scale and orientation

**Units are millimetres.** Established from three independent measurements
rather than assumed:

| Object | Measures | Real-world |
|---|---|---|
| Hull | 5253.2 × 2094.3 × 1163.4 | a 5.25 m × 2.09 m open boat |
| Mannequin | 1458.2 tall | a seated adult |
| Steering wheel | 371.3 across | a 370 mm helm wheel |

Read as metres the boat would be five kilometres long; as centimetres, 52 m.
Millimetres is the only reading in which all three objects are the size of the
things they depict.

**Source axes** are SketchUp's Z-up: X longitudinal with the bow at +X, Y
athwartships, Z up. Confirmed by the sheer profile, which rises monotonically
from 917 mm at 0.1 LOA to 1161 mm at 0.8 LOA — the bow end.

**Delivered contract** (one −90° rotation about X, a proper rotation, so
winding survives):

```
        +Y  up
         │
         │        +X  BOW
         │      ↗
  ───────●────────────  waterline, y = 0
       origin
      ╱
    +Z
```

Metres. Origin **amidships on the visual waterline** — the same contract
`WEBGL_ASSET_SPEC.md` already specified for the Duna 6.1, so the vessel needs
no correction to sit in a scene whose water is the plane y = 0.

---

## D. Cleanup performed

Conservative by design, and the numbers are small because the source is
basically sound:

| Removed | Count |
|---|---|
| Mannequin | 1,464 triangles |
| Unidentified debris (a 5-triangle fragment) | 5 triangles |
| Zero-area triangles | 20 |
| Exact duplicate triangles | 338 |
| Slivers under 0.5 mm² | 1,937 |

Windings were rebuilt from scratch — propagated across shared edges to make
each shell internally consistent, then turned the right way out by an
area-weighted vote against a reference point inside the vessel. This was not
optional: 30% of the source facets disagree with their own vertex order, so
without it every third triangle renders backwards.

---

## E. Geometry intentionally preserved

**No remeshing pass exists anywhere in this pipeline.** No voxel remesh, no
quad remesh, no global smoothing, no decimation by target count. The PXL reads
almost entirely on hard-surface transitions and a generic pass would round
exactly the edges that make it the boat it is.

The design's own hard edges were *found* rather than guessed: faces are
flood-filled across edges whose dihedral angle is under 26°, which partitions
the hull into the smoothly-continuous surfaces the designer drew, bounded by
its chines, panel breaks and deck edges. The hull's own curvature is
tessellated at roughly 3–8° per edge, so there is a wide margin either side of
that threshold.

Preserved unchanged: the hard chine running the full length, the bow volume and
its flare, the sheer line's 244 mm rise from stern to bow, the transom
geometry, the deck boundaries, the console silhouette and the gunwale capping.

---

## F. Mesh and component separation

The hull arrives as **one welded shell** — topsides, bottom, transom, capping
and the black stern moulding are a single skin. Everything the configurator
addresses separately had to be recovered from the geometry:

1. **Cut** along the forward edge of the black stern moulding. This is the one
   boundary that is a designed straight line rather than a crease, so the mesh
   is genuinely split along the plane `x = 290 + 0.62·z` mm, with the triangles
   it crosses divided. Classifying whole triangles instead would leave a 25 mm
   zigzag on the one edge of the paint scheme the eye follows. The plane was
   measured off the water renders: the break passes 804 mm forward of the
   transom at the sheer and 420 mm forward at the waterline, and appears in the
   same place under all six hull colours — it is a moulding boundary, not paint.
2. **Partition** by crease, which separates the bottom from the topsides at the
   chine and finds the gunwale capping as its own pair of patches.
3. **Transom**: what faces aft at the stern.
4. **Inside from outside**: an athwartships ray test on what remains, which
   separates the painted topsides from the shell's inward-facing side.

Result: 13 meshes in 7 groups. The full table — mesh, part, material, triangle
count, channel — is in **`PXL_MODEL_MAP.md`**, generated against the actual
export rather than written from intent.

Loose parts mapped straight across: the liner, console, control box, wheel,
outboard, bracket, two rails, a bow bulkhead and a console base panel.

---

## G. Material system

One mesh, one material, at most one configuration channel. Ten channels are
declared; six are bound, one (`hullPrimary`) carries the six hull studies, and
**three are declared with nothing bound to them** because the asset cannot
serve them — see P.

The runtime **never swaps a material object.** Changing a colour writes to the
existing `MeshPhysicalMaterial`: `.color.set()`, `.roughness =`, and so on.
Assigning a new material invalidates the shader program and makes the renderer
compile a new one — a frame-long stall on precisely the interaction that has to
feel instant. Writing to a uniform costs nothing.

Every zone is promoted to `MeshPhysicalMaterial` on load so a zone can gain
clearcoat at runtime without changing class. The scene contributes exactly one
opinion about the product — `envMapIntensity` per surface family, because how
strongly a surface answers *this room* is a property of the room.

---

## H. Colour presets

Six hull finishes, matching the six delivered studies, with internal ids only:
`pxl_white`, `pxl_sage`, `pxl_black`, `pxl_warm_grey`, `pxl_gold`, `pxl_navy`.

**These are working identifiers, not product names.** None has been confirmed
as an orderable finish, none has a commercial name, none has a price. The ids
are deliberately unattractive so that nobody is tempted to put one in front of
a customer before the yard approves a range.

Values are anchored on the lit diffuse reading sampled from each reference
render and then opened up, because a render's mid-tone under an overcast sky is
darker than the paint. Full table in `PXL_MODEL_MAP.md`.

Checked in the browser against §31:

| Test | Result |
|---|---|
| Dark colours keep body definition | `pxl_black` at `#15181c` — never zero — holds the sheer, the chine and the topside highlight |
| White does not clip | `pxl_white` at `#dcdedb` sits well below clipping |
| Metallic/warm does not look like plastic | `pxl_gold` **failed the first pass** as a flat yellow. Fixed by going deeper and browner and raising metalness 0.22 → 0.34 — the fix is range, not hue |
| Blue does not merge with the water | `pxl_navy` lifted and warmed away from the Danube's blue-green |
| Green stays intentional | `pxl_sage` holds its teal against a neutral studio |

The structural black is a separate channel from the hull, so the bottom stays
black under every hull colour — as it does in all six renders.

---

## I. Export and compression

```
SOURCE STL  10.06 MB, 201,155 tris
   ↓  instance extraction, cleanup, zoning, orientation, split normals
MASTER      assets/derived/pxl/PXL.source.glb   971 kB, 45,681 tris  (archival)
   ↓  simplify → reorder → encode
PRODUCTION  public/models/PXL.glb               303 kB, 20,235 tris
```

**Normals** are angle-based split normals at 32°: a vertex gets one normal per
smooth patch it touches, so the hull's compound curvature shades continuously
while every chine, panel break and deck edge stays hard under a moving light.

**Simplification** is a tolerance, not a target: collapse anything that moves
the surface by less than the zone's budget, and stop. Borders are locked so the
zones stay welded to each other — a configurator that recolours the topsides
independently of the bottom must not be able to open a crack between them.

The error is measured over **normals as well as positions**. The first pass used
positions only and took the topsides from 11,904 triangles to 2,246 within a
4 mm budget — geometrically defensible and visibly faceted, because the collapse
that costs nothing in position can cost a great deal in curvature. Feeding the
normals in as weighted attributes, and tightening the reflective surfaces to
1.2 mm, produced this:

| Mesh | In | Out | Error achieved |
|---|---:|---:|---:|
| `hull_lower` | 13,949 | 7,187 | 1.20 mm |
| `hull_primary` | 11,904 | 5,818 | 1.20 mm |
| `transom_black` | 10,482 | 2,254 | 1.20 mm |
| `helm_wheel` | 2,988 | 1,840 | 3.99 mm |
| `deck_main` | 2,743 | 1,149 | 3.76 mm |
| `accessory_cockpit_cover` | 1,591 | 423 | 3.98 mm |
| `hull_accent` | 818 | 792 | 1.13 mm |
| everything else | 1,206 | 772 | — |
| **total** | **45,681** | **20,235** | |

The transom loses 78% and the capping loses 3%, from the same pass, because one
is flat and the other is the edge of the boat. 1.2 mm on a 5.25 m hull is
0.02% of LOA.

**Compression is `EXT_meshopt_compression`, not Draco.** The decoder is already
in the bundle — drei's `useGLTF` wires `MeshoptDecoder` from three-stdlib into
every loader it creates — so the file costs **zero extra requests and zero extra
runtime assets**. Draco would mean either a call out to Google's CDN, on a page
whose whole point is a controlled first impression, or self-hosting ~180 kB of
WASM to save a few tens of kB. Meshopt also decodes several times faster, which
matters on the phones this has to open on.

---

## J. WebGL integration

`PxlProductScene` mounts through the existing `StageScene` into the existing
single canvas, registers in the existing `sceneRegistry`, is scissored to its
own `SceneSlot` by the existing `StageRuntime`, takes the existing
`QualityProfile` and honours the existing reduced-motion flag.

**The homepage was not touched.** The Duna 6.1 hero is exactly as Phase Two
left it, and the PXL scene is `lazy()`-imported so its loader and material
system are not in the bundle a homepage visitor downloads — verified: loading
`/` fetches no PXL chunk and no `PXL.glb`.

`PxlStage` is the drop-in: a `SceneSlot` with the PXL profile render inside it
as the fallback. Put it in any section and the boat renders there. That is the
capability §36 asks for; where it goes on the customer-facing site is a Phase
Three decision that needs product information this phase does not have.

Two Phase Two defects were found and fixed on the way:

- **The canvas was swallowing every click on the site.** `WebGLStage.module.css`
  sets `pointer-events: none` and documents at length why that matters, but
  react-three-fiber wraps the canvas in containers that set `pointer-events:
  auto` inline, and the property is inherited — so the computed value on the
  canvas was `auto`. A fixed, full-viewport, above-the-page canvas with hit
  testing on is a transparent sheet over the whole site. Invisible until
  something under it needs to be operated; the PXL is turned by dragging its
  own slot, and the slot never received a `pointerdown`.
- `MeshPhysicalMaterial.copy()` throws on a `MeshStandardMaterial` source
  (it reaches for `clearcoatNormalScale`), which is what glTF gives you for any
  material without a clearcoat extension. Materials are now built field by
  field.

---

## K. Waterline calibration

**Visual, and stated as such.**

Freeboard at amidships was measured off the water renders — the top of the
gunwale capping to the surface — and reads **0.1665 of LOA** across all six
colour studies. The model's sheer is 1095.6 mm above the keel and its LOA is
5253.2 mm, so the surface was placed **220.6 mm above the lowest point of the
keel**, giving a freeboard ratio of 0.1666.

That is a match to how the boat is *drawn*. It is not a hydrostatic
calculation, and it does not account for load, fuel, crew or the outboard's
weight aft. The forefoot leaves the water at about 0.87 LOA, which is where the
renders put it.

`PXL_MODEL.waterlineTrim` is 0 and exists so a real figure from the yard can be
applied without re-exporting the model.

Verified against the actual Phase Two water surface, not against the number:
`/dev/pxl` has a water toggle that swaps the studio for the hero's river. The
vessel needs no vertical offset — its origin is on the waterline and the water
is the plane y = 0.

---

## L. Camera presets

Six, authored in a camera operator's terms — where the camera stands, what it
looks at, how long the lens is — and interpolated as *those*, which is what
keeps the vessel's proportions stable through a move.

`hero_3q` · `side` · `bow_3q` · `stern_3q` · `interior` · `detail`

The horizontal field of view is what is authored; the vertical falls out of the
viewport, so a 5.25 m boat is the same fraction of the frame's *width* on a
phone and a desktop.

**Distances were measured, not estimated.** `pxlTelemetry` projects the
vessel's bounding box through the live camera each frame and reports what
fraction of the frame it covers and whether any of it left the viewport; the
development viewer prints it. The first pass, derived arithmetically, **clipped
the bow in the profile view** — the estimate treats the boat as a flat
rectangle, and under perspective the near end of a 5.76 m hull subtends more
than that allows.

Transitions run 0.9 s on the site's own `glide` easing, captured from wherever
the camera actually is, so switching preset mid-move or after the viewer has
turned the boat resolves smoothly rather than snapping back.

---

## M. Responsive behaviour

Mobile is authored, not derived: the phone compositions sit lower, frame
tighter and use a **longer** lens from **further back**, which is what recovers
a silhouette that a scaled-down wide shot loses. Between 640 and 1024 px of
slot width the two ends are blended, so a tablet gets a composition that
belongs to it and a window dragged across the breakpoint does not jump.

Measured frame fill, vessel bounding box, no clipping at any width:

| Viewport | Slot | hero_3q | side | bow_3q | stern_3q | interior |
|---|---|---|---|---|---|---|
| 375 × 812 | 375 × 502 | 80% | 79% | 78% | 80% | 84% |
| 390 × 844 | 390 × 522 | 80% | 79% | 78% | 80% | 84% |
| 430 × 932 | 430 × 577 | 80% | 79% | 78% | 80% | 84% |
| 768 × 1024 | 768 × 634 | 78% | 78% | 75% | 78% | 82% |
| 1024 × 768 | 623 × 768 | 80% | 79% | 78% | 80% | 84% |
| 1280 × 860 | 879 × 860 | 78% | 78% | 70% | 75% | 82% |
| 1440 × 900 | 1039 × 900 | 78% | 78% | 68% | 74% | 82% |
| 1728 × 1000 | 1327 × 1000 | 78% | 78% | 68% | 74% | 82% |

`detail` is the exception and clips by design: it is a close shot on the helm.

The three phone widths are identical because all three sit at the mobile end of
the range, where the composition is fixed. 1024 reads like a phone because the
inspector's own two-column layout starts there and leaves the scene a 623 px
slot — which is the point of measuring the *slot* and not the viewport.

---

## N. Performance

Measured on the development machine (Apple Silicon, 10 cores, Chrome, the
browser pane at DPR 1 — **not** a claim about a retina display or a phone).
Two-second `requestAnimationFrame` samples.

| Scene | Draw calls | Triangles | CPU/frame | Frame rate |
|---|---:|---:|---:|---:|
| PXL · studio · hero_3q | 14 | 21,814 | 0.36 ms | 120 fps (display cap) |
| PXL · studio · cockpit | 14 | 21,814 | 0.25 ms | 120 fps |
| PXL · **on the river** | 14 | 63,540 | 0.43 ms | 120 fps |
| Phase Two hero (photographic plate) | 4 | 43,732 | 0.14 ms | 120 fps |

Asset transfer, measured off the network panel:

| | |
|---|---|
| `PXL.glb` on disk | 303,252 B |
| over the wire (compressed) | 265,823 B |
| download | 11 ms on localhost |
| geometry resident on the GPU | 488 kB |
| textures | none |

**The frame rate is the display's refresh cap, not a measured ceiling.** At
0.36 ms of CPU per frame the scene is nowhere near the budget on this machine;
what those numbers establish is that it is cheap, not how it behaves on a
mid-range Android. That has not been measured and is not claimed.

Against Phase Two's photographic scene: the PXL costs 10 more draw calls and
about 0.2 ms more CPU, and draws half the triangles, because the river's
1.5 km water disc is a bigger mesh than the boat. On the river the PXL scene
draws both and still costs 0.43 ms.

---

## O. Configuration state architecture

`PxlConfiguration` is a plain object: no classes, no methods, no derived state,
nothing that cannot survive `JSON.stringify`. Everything Phase Three needs to
do with a configuration — put it in a URL, attach it to a quote, store it
against a lead, rebuild the scene from it a month later — is easy if the
configuration is data.

State lives in `pxlStore`: one mutable object, explicit subscription, and a
version counter the renderer compares against what it last applied. A
configurator changes its configuration a few dozen times a session and renders
it sixty times a second; those are different clocks. React components that want
to re-render subscribe through `usePxlConfiguration`, built on
`useSyncExternalStore`. **The scene does not subscribe at all** — it reads the
version inside its frame callback and repaints its materials when the number
moves.

No state library. Redux, Zustand or Jotai would each be more code than the
80-line store, and would put the configuration behind an abstraction the render
loop has to poll anyway.

URL serialisation works today, and is compact and legible on purpose:
`?pxl=sage.black.black~graphite.graphite.cognac~outboard`. Something a
salesperson can read down a phone line. Unknown ids are dropped rather than
thrown on, so a link from before a rename opens the default boat.

Component visibility is keyed on **zone names**, so a genuine option is
expressible as "these meshes on, those off" without a schema change. Presentation
state — camera, interactivity, water — is a separate store, because a shareable
configuration should not also pin someone else's camera angle.

---

## P. Source limitations

Findings, each confirmed against the STL. Full detail in `PXL_MODEL_MAP.md`.

| Missing | Consequence |
|---|---|
| **Upholstery** | The renders show cognac cushions on the seat boxes and a backrest at the console. The STL has none. `upholsteryPrimary` and `upholsterySecondary` are declared and unbound |
| **Windscreen** | Every colour study shows a tinted screen. The console is a closed 247-triangle box. `glazing` is declared and unbound |
| **Branding** | `PXL` on the stern moulding, `PXL` on the console, `Duna` on the topsides. None modelled, and no usable logo asset was supplied. **Nothing was recreated** — placing a mark by eye on a real product's hull is exactly the invention this phase rules out |
| **UVs** | None in STL; none generated, because every material here is a solid painted or moulded surface. Branding and upholstery are what will make them necessary |
| **Hull thickness** | Zero. The shell is open, so the hull zones are double-sided |
| **Interior detail** | The liner is 218 triangles over 16.2 m². Seat boxes and a sole; no lockers, hatches or fastenings |
| **Motor identity** | 468 triangles, no maker's marks. Propulsion variant recorded as unconfirmed |
| **Waterline** | Estimated visually. No displacement data |
| **Specifications** | Nothing. No length, beam, draft, weight, capacity, power, speed, CE category or price is published |

### The STL and the colour studies are different design revisions

The most consequential finding in this section, and the one that needs an
answer before Phase Three.

The STL and the two dated renders both show a **low, faceted helm console**
with a small raked windscreen; the model matches them closely. The six colour
studies show a **tall, dark, glazed tower** carrying its own `PXL` mark, about
twice the height. Everything else in those renders is identical.

The colour studies therefore appear to be a **later revision than the geometry
that was delivered**. The model is faithful to the file it was built from and
cannot be faithful to the newer console without new geometry — and inventing it
from a render is exactly what this phase does not do. It also changes what the
`glazing` channel is for: the screen to model is a tower, not a windscreen.

---

## Q. Still needed from Duna Hajók

In the order that unblocks the most.

1. **Specifications.** LOA, beam, draft, dry weight, maximum crew, CE category,
   engine options and power. Nothing customer-facing can be built without
   them — `src/content/pxl.ts` marks each as unavailable rather than guessing,
   and `published: false` keeps `/boats/pxl` unbuilt until they arrive.
2. **Confirmation of the colour range.** Which of the six studies are actually
   orderable, and their commercial names. The internal ids ship no further.
3. **Upholstery geometry**, or approval to model it from the renders. This is
   the largest visual gap: the cockpit currently reads as a bare moulding while
   every render shows it trimmed.
4. **A ruling on the console.** The STL has the low faceted console; the colour
   studies have a tall glazed tower. Which is current — and if it is the tower,
   the geometry for it.
5. **Vector logo assets** — `PXL` and the `Duna` script — plus their intended
   placement and size on the hull and console.
6. **The outboard's identity**, or the electric drive if that is the launch
   configuration. Duna already builds an e-drive; whether the PXL takes one is
   not stated anywhere in the material.
7. **Displacement or a marked waterline**, to replace the visual estimate.
8. **The genuine option list.** The visibility architecture is ready and has
   exactly one honest member; it needs real options, not invented ones.

---

## R. Recommendation for Phase Three

**Do not start with the configurator UI.** Start with items 1–5 above. The 3D
is finished and the state architecture is finished; what is missing is product
information and two pieces of geometry, and building swatches over a boat with
no confirmed colours, no upholstery and no specification would produce a
convincing-looking page full of things that are not true.

When that arrives, in this order:

1. **Upholstery and glazing into the pipeline.** Both channels already exist
   and are unbound. New geometry drops into `pxl_zones.py`, gets a zone and a
   material, and binds — no runtime change.
2. **`/boats/pxl`** as an editorial product page, in the existing Phase One
   language, using `PxlStage` for the hero. Flip `PXL.published` when the specs
   are real.
3. **`/boats/pxl/configure`.** Near-fullscreen viewer, `PxlStage` with
   `interactive`, the six presets as hotspots, swatches driven by
   `PXL_CHANNEL_OPTIONS` — which the development viewer already reads, so the
   two cannot drift. The camera, the orbit limits, the material updates and the
   permalink all exist.
4. **Quote flow.** `serialiseConfiguration()` is the payload. A saved
   configuration image wants `preserveDrawingBuffer` on a dedicated capture
   pass rather than on the shared canvas.
5. **An adaptive background.** `pxlLighting` is procedural specifically so the
   studio can respond to the hull colour — a white hull wants a darker room
   than a black one. §31 asks to prepare for it; the hook is a uniform.

Two things worth doing regardless:

- **Measure on a real mid-range Android.** Every number in N is from one
  desktop.
- **Re-run `npm run pxl` against any revised STL.** The pipeline is
  deterministic and re-derives every zone from geometry, so a new revision of
  the boat costs one command — provided the loose-part triangle counts in
  `LOOSE_PARTS` still identify the same objects, which is the one thing to
  check.

---

## Deliverables

| # | Deliverable | Where |
|---|---|---|
| 1 | Cleaned production geometry | `assets/derived/pxl/PXL.source.glb` |
| 2 | Real-scale normalised model | metres, +Y up, +X bow, origin on the waterline |
| 3 | Production GLB | `public/models/PXL.glb` — 303 kB |
| 4 | Semantic mesh structure | 13 meshes, 7 groups — `PXL_MODEL_MAP.md` |
| 5 | Semantic materials | 13, one per zone — `pxl_zones.py`, `pxlPalette.ts` |
| 6 | Colour presets | six hull + six structural — `pxlPalette.ts` |
| 7 | WebGL integration | `WebGLStage`, `StageScene`, `SceneSlot`, quality tiers |
| 8 | Product scene | `src/webgl/scenes/pxl/PxlProductScene.tsx` |
| 9 | Camera presets | `pxlCamera.ts` — six, measured |
| 10 | Waterline | 220.6 mm above the keel, visual — see K |
| 11 | Typed configuration | `pxlConfig.ts` |
| 12 | Component visibility | `PxlConfiguration.equipment`, keyed on zones |
| 13 | Development viewer | `/dev/pxl`, noindex + robots disallow |
| 14 | Mobile framing | authored, measured at seven widths — see M |
| 15 | Reduced motion | static composition, no idle motion, changes still paint |
| 16 | GLB failure fallback | `PxlStage` → the PXL profile render |
| 17 | Validation script | `npm run model` |
| 18 | Model map | `PXL_MODEL_MAP.md` |
| 19 | Updated WebGL docs | `WEBGL_ASSET_SPEC.md`, `README.md` |
| 20 | This report | `PHASE_2_5_REPORT.md` |

### Commands

```bash
npm run pxl        # STL → GLB → web media
npm run model      # validate the production GLB
npm run qa         # typecheck + GLSL check + model validation
npm run build
```
