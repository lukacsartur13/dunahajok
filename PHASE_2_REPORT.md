# Phase Two — the WebGL experience layer

One idea, built once: **the boat moves, therefore the water moves, therefore a
wake appears, therefore the site's graphic identity emerges.**

The homepage is structurally unchanged. No section was added, removed or
reordered; no typography, copy, navigation or SEO was touched. What changed is
what happens underneath the hero's waterline.

---

## A. Architecture added

```
src/webgl/
├── stage/                        the renderer, scene-agnostic
│   ├── WebGLStageMount.tsx       WHERE and WHEN the 3D layer enters the app
│   ├── WebGLStage.tsx            the single root <Canvas>; support gate, DPR, scroll
│   ├── StageRuntime.tsx          the master render loop — scissored viewports
│   ├── StageScene.tsx            SceneSlot bridge: one THREE.Scene + camera per slot
│   ├── sceneRegistry.ts          renderer-side half of the SceneSlot contract
│   ├── stageState.ts             the per-frame mutable bridge (extended)
│   ├── quality.ts                tiers and the WebGL2 probe (extended)
│   ├── heroScroll.ts             ScrollTrigger → normalised hero progress
│   └── SceneDebug.tsx            ?sceneDebug=1, dev only
├── scenes/hero/                  the only production scene in this phase
│   ├── HeroVesselScene.tsx       ONE useFrame that drives everything
│   ├── heroConfig.ts             every authored number in the sequence
│   ├── cameraRig.ts              keyframe sampling + camera application
│   ├── heroUniforms.ts           one uniform pool, shared by every material
│   ├── WaterSystem.tsx           radial disc + material assembly
│   ├── Backdrop.tsx              the shared sky
│   ├── VesselModel.tsx           the one switch: mesh or plate
│   ├── VesselPlate.tsx           photographic plate + reflection
│   ├── VesselGltf.tsx            the glTF path (code-split, unexercised)
│   └── vesselContract.ts         the production model socket
└── glsl/
    ├── atmosphere.ts   dunaSky + the backdrop shaders  (extended)
    ├── water.ts        surface shading                 (extended)
    ├── wake.ts         THE DUNA WAKE                   (extended)
    ├── plate.ts        composite + reflection          (new)
    └── rake.ts         the Duna Line as a screen mask  (new)
```

**Single root canvas.** One `<Canvas>` is mounted at the document root beside
the header and preloader. Each scene lives in its own `THREE.Scene` via an R3F
portal, with its own camera, and is drawn into its SceneSlot's measured
rectangle using `setViewport` + `setScissor`. That is what makes one renderer
serve five slots instead of five renderers serving one each — and it is why
adding `product-morph` in Phase Three is a `<StageScene id="product-morph">`,
not a second canvas.

Rendering is taken away from R3F entirely by a `useFrame` at priority 1.
Scene components update uniforms at priority 0, which R3F guarantees runs first,
so cameras and uniforms are always current when the frame is drawn. There is one
rAF loop in the application, and GSAP still owns it.

**The z-index decision.** The canvas sits *above* `<main>`, not behind it. Every
section carries its own opaque ground — the hero paints `--depth` across its full
height — so a canvas below the content is a canvas nobody can see. It is safe
above because it is cleared to transparent everywhere outside an active slot and
carries `pointer-events: none`. `--z-scene` moved `0 → 40`, below `--z-menu: 70`.
The fullscreen menu remains fully operable over the scene; verified.

## B. Dependencies added

None. `three`, `@react-three/fiber` and `@react-three/drei` were already in
`package.json` from the interrupted Phase Two start. No post-processing stack,
no physics, no debug GUI, no second animation framework. GSAP still owns scroll
choreography; the scene consumes the number it produces.

Two npm scripts were added: `vessel` (the plate pipeline, referenced by the
generated manifest but missing from `package.json`) and a GLSL guard folded into
`typecheck` — see *Notes on inherited code*.

## C. Model status

**No Duna 6.1 model exists.** A full search of the repository and `public/` for
`.glb .gltf .fbx .obj .usdz .blend .ply .stl` returned nothing.

No generic speedboat was fabricated and labelled "Duna 6.1". Instead the
approved studio profile is composited as a plate at its true size, and the
production socket is fully specified:

- `vesselContract.ts` declares both vessels (Cabin **and** Kadét, separately —
  the scene never assumes one file contains both) with orientation, scale,
  draft, compression and expected material groups.
- `VesselModel.tsx` is the single switch. It resolves to the plate today and to
  `VesselGltf` when `available` flips to `true`.
- `VesselGltf.tsx` is code-split behind a dynamic import, so the DRACO and glTF
  loaders are not shipped for an asset that does not exist. **It has never
  rendered a frame** — it is type-checked and reviewed, not tested. Budget an
  afternoon on materials the first time a real model goes through.
- **[WEBGL_ASSET_SPEC.md](WEBGL_ASSET_SPEC.md)** is the artist-facing delivery
  specification: coordinate system, origin, metres, the nine named mesh groups,
  material separation and targets, texture budgets and what must *not* be baked,
  UV rules, polygon budget, compression, and the six camera-reference renders
  required to validate the implementation against the real vessel.

## D. Water implementation

Custom, not the three.js `Water` example.

Six sine trains at real dispersion speeds (`c = √(gλ/2π)`), so the long swell
genuinely outruns the chop and the surface never beats in a visible cycle. Every
wavelength is chosen against the vessel: the longest train is 9.5 m — a little
longer than the hull — and the largest amplitude is 4.5 cm. Get that wrong and a
perfectly good boat reads as a bath toy.

Normals are **analytic**: `∂h/∂x` and `∂h/∂z` accumulate alongside the height,
so the surface is shaded per fragment while being displaced per vertex and the
two always agree. This is why geometry barely matters here, and why the low tier
can switch vertex displacement off and lose only an undulating horizon line.

Shading is Fresnel from water's real 0.02 reflectance up to a full mirror at
grazing, one tight specular lobe, and a distance falloff in two stages: one that
kills the ripple trains before they alias, and a much longer one that eases the
whole normal toward vertical so the far field resolves into a calm sheet rather
than a field of sparkle.

**Two art-direction corrections made during the phase.** The inherited
attenuation was tuned for aliasing safety alone; from a metre above the water
almost the entire frame is far water, so it produced a smooth Fresnel ramp with
no surface in it — calm water that read as a gradient with a boat on it. It was
loosened by ~4×. And `dunaSky` gained a **far bank**: a dark strip a degree and a
half high standing on the horizon. The Danube at Győr is a river, not an ocean;
something always stands on the other side of it, and at grazing angles that
strip is what the surface spends most of its reflection on. The horizon lift was
simultaneously closed up to ~2°, so the sky *inside* the band is the page's own
`--depth` and the join between canvas and DOM has no visible shelf.

## E. Wake implementation

The signature feature. Authored, not simulated — and it does not need to be: a
displacement wake is a *stationary* pattern in the hull's frame, and that shape
has been known since Kelvin. Evaluating the closed form per fragment gives a
physically plausible wake every frame, for a few dozen instructions and no state.

What makes it Duna rather than generic:

- **Three pairs of arms** at 0.29 / 0.67 / 1.00 of the Kelvin half-angle,
  carrying the opacity ramp 1.00 / 0.87 / 0.74 — exactly the six curves and
  exactly the ramp of the Phase One `<WakeLine>` SVG. The 3D wake is not *like*
  the site's motif; it is the same drawing solved in world space.
- **The divergence profile is `s^0.78`**, not linear: the arms leave the stern
  tight and open late, which is the concave attack of the authored SVG curves
  and of the hull's own sheer.
- A **transverse system** whose curvature comes from the stationary-phase
  condition, so the crests arc and stretch outboard rather than running straight.
- A **transom boil**, the only genuinely time-varying part.

Derivatives are analytic throughout — finite-differencing would mean three
evaluations per fragment for a normal.

Three corrections were needed to make it read on screen. The inherited decay
(`exp(-2.15s)`) left foam on only the first 20% of the wake, so the V never
opened where the camera could see it; it was softened to `exp(-1.15s)` and the
foam threshold lowered. And the arms were **1.9× wider than the gaps between
them**, so all three merged into a single aerated wedge — physically defensible,
and the exact moment the wake stops being the Duna drawing and becomes a generic
patch of white behind a boat. Narrowing them is what made the six curves read.

The wake responds to vessel position, heading, virtual speed, time, hero
progress and quality tier. Every one of those comes from the same blended camera
state, so the surface can never be calm while the wake is roaring.

## F. Camera choreography

`cameraRig.ts` samples four authored states and applies them. No component
outside it touches the camera.

States are authored in the terms a camera operator uses — eye height above the
water, distance out, angle round, look-at, and lens — not as world-space
matrices. Interpolating *those* is what keeps the hull's proportions believable;
lerping two positions and two targets lets the subject distance drift and the
vessel breathe in and out of frame. Blending uses the site's own registered
`glide` ease, so the camera accelerates out of one composition and settles into
the next instead of sliding linearly through both.

| State | at | Composition |
|---|---|---|
| ENTRY | 0.00 | Abeam and low. Water near glass, no wake. Stillness. |
| REVEAL | 0.26 | Eye lifts, stern begins to disturb, lens unchanged. |
| PROFILE | 0.60 | Camera swings astern and up; the wake opens into the Duna geometry. This is the composition the section is about. |
| DEPARTURE | 1.00 | The vessel leaves the opening frame. What remains is the wake, already becoming a drawing. |

`hfov` is the **horizontal** field of view; the vertical angle is derived from
the slot's own aspect and clamped. The band is 4.7:1 on a laptop and 1.5:1 on a
phone — locking the horizontal angle is what keeps a 6.72 m hull the same
fraction of the frame's *width* on both, which is the dimension the eye judges a
boat's length against.

**Azimuth is honestly limited.** The authored swing is ~24°. A photographic
plate has one point of view baked into it, so `AZIMUTH_SCALE.plate = 0.34` lands
it at ~8° — enough that the camera is unmistakably moving relative to the water
and the wake, short of the angle at which a flat element shears. When the GLB
arrives the scale becomes 1 and the full 24° happens. Nothing else changes. The
camera never orbits, never spins the boat, and never leaves the visitor without
control of the page.

## G. DOM ↔ WebGL handoff

Three separate joins, all deliberate:

1. **The rake.** The hero's static plate is clipped along `--rake-cut`, the
   site's one diagonal. The scene masks itself to the *same* line, computed from
   `gl_FragCoord` against the slot rectangle, with the value **measured off the
   live token** rather than hard-coded. Change `--rake-cut` and the WebGL band
   re-rakes with everything else.
2. **The sky.** `dunaSky`'s zenith is `--depth`, which is also the hero
   section's background colour. Above the horizon the canvas and the DOM are the
   same colour by construction and the seam cannot be found.
3. **The wake becomes the line.** From ~0.6 the `uLineify` uniform ramps: foam
   is suppressed, and the same three arm pairs re-render as hairlines of
   constant *screen* width in `--signal`. The width is derived each frame from
   the live field of view and the band's pixel height, so it matches the DOM
   SVG's 1 px non-scaling stroke on a phone and on a laptop. By the time the band
   leaves the viewport, the physical wake has become the graphic wake and handed
   the page over.

The preloader's travelling water disturbance now reads as the same water: it
resolves into a wake pair that opens, and the live scene it uncovers opens the
same wake.

## H. Responsive behaviour

Two authored compositions, not one cropped.

| | Desktop | Mobile |
|---|---|---|
| Band | ~1713 × 340 (≈4.7:1) | 375 × 244 (≈1.5:1) |
| Lens | 43° → 48° hfov | 34° → 40° hfov |
| Distance | 22.5 → 21.5 m | 15.5 → 15.4 m |
| Eye | 1.38 → 5.8 m | 1.5 → 4.1 m |
| Camera travel | full | ~55% |
| Triangles | 43 732 | 10 964 |

The phone gets one legible idea per frame, so its composition is built around the
silhouette: closer in, a longer lens, a higher eye so the wake reads from above
as a shape rather than edge-on as a texture. The emotional sequence is identical;
the framing is redrawn. Touch scrolling is untouched — the canvas takes no
pointer events at all, on any device.

Verified with no horizontal overflow at 375, 430, 768, 1024, 1440 and 1728.

## I. Reduced motion

A designed mode, per Phase One's standard.

No scroll-driven camera, no vessel travel, no wake expansion, no shader
animation, no water drift. The scene renders **one composed still frame** and
holds it — and that frame is deliberately *not* the sequence paused at zero.
Zero is the least interesting composition in the sequence: stillness only means
something as the thing that gets broken. The still frame is composed at the point
the sequence is about — vessel abeam, wake open — with the water reduced to a
non-animating surface.

Because it is static, the runtime draws it only when its box actually moves, and
the DPR cap is raised to 2 (a single render can afford the resolution). Scenes
can request a frame via `invalidateStageScene` while they are still composing —
without that, the scene drew its first still-empty frame, never again, and left a
black rectangle where the photograph had been. `?motion=reduce` exercises the
path without changing an OS setting.

## J. Performance decisions

Measured on the dev build at 1728 × 1000, high tier:

| | High (desktop) | Low (phone) |
|---|---|---|
| Draw calls | 4 | 4 |
| Triangles | 43 732 | 10 964 |
| CPU in render loop | **0.21 ms/frame** | 0.22 ms/frame |
| DPR cap | 1.6 | 1.2 |
| Shader detail scalar | 1.0 | 0.42 |
| Vertex displacement | on | off |
| Reflection | on | **on** |

- **Fill rate is the constraint, not geometry.** The water is a full-screen
  multi-octave fragment shader, so DPR is the single most expensive dial: a 3×
  retina phone would ask for nine times the shader work for a surface whose
  highest-frequency content is deliberately soft. Caps are well under
  `devicePixelRatio` on every modern display.
- **Tier detection uses only what the browser already tells every page** —
  viewport, pointer type, reported core count, reduced-motion. Nothing is
  probed, timed or reported. This is a rendering budget, not a profile.
- **The reflection is kept on the low tier.** It is one small transparent quad
  with a cheap shader and it is the strongest cue that the vessel is *in* the
  water rather than in front of it; dropping it to save a draw call would cost
  the phone composition the thing it is built around.
- **Lifecycle.** When no slot is on screen the loop measures and returns — no
  clear, no draw. Crossing that boundary issues exactly one final clear, because
  a canvas that is not drawn to keeps showing its last frame, and without it the
  hero's water stayed frozen over the section that scrolled into its place.
  `document.hidden` short-circuits the same way.
- **Bundle.** three + R3F (~175 kB gzipped) are **not** in the critical path.
  `next/dynamic` with `ssr: false` splits the whole stage, and it is not even
  requested until the preloader has released the page. Initial JS is 198 kB
  gzipped across ten chunks, none containing `WebGLRenderer`. A visitor with no
  WebGL2 downloads none of it. The preloader was not lengthened by a single
  millisecond.
- **No React state per frame.** Everything per-frame is a ref or a uniform; the
  scene re-renders about six times over its whole life.
- Geometry and materials are disposed explicitly, because they are memoised on
  the quality tier — which changes when a resize crosses a breakpoint, not only
  on unmount.

## K. Fallback behaviour

The site does not depend on WebGL to function. Every failure resolves to *the
site exactly as it shipped in Phase One*, which is a good failure mode.

| Failure | Result | Verified |
|---|---|---|
| No WebGL2 | Stage never mounts; the chunk is never fetched | ✅ `?webgl=off` |
| Context lost | Slot handed straight back to the photograph | ✅ `WEBGL_lose_context` |
| Plate texture fails | Slot never claimed; photograph remains | ✅ by construction |
| Model missing | Plate path (current state) | ✅ shipping |
| Scene not yet ready | Photograph, then a crossfade | ✅ |

The slot is claimed only once the vessel has resolved *and* frames have been
drawn, and it is released on unmount. There is no state in which the band is a
black rectangle, an empty canvas or a stalled loader.

## L. Remaining limitations

1. **There is no Duna 6.1 model.** The vessel is a photographic plate. It is
   composited properly — shared atmosphere, waterline dissolve, torn reflection —
   but it cannot turn, which is why the camera's authored 24° swing is scaled to
   8°. This is the single largest gap in the phase and
   [WEBGL_ASSET_SPEC.md](WEBGL_ASSET_SPEC.md) exists to close it.
2. **`VesselGltf.tsx` is unexercised.** Type-checked, reviewed, never rendered.
3. **No IBL yet.** With no PBR meshes in the scene there is nothing to light, so
   no environment map is generated. When the GLB lands, the right move is
   `PMREMGenerator.fromScene()` on the existing sky sphere — the model's
   reflections would then provably be the sky the water is reflecting. Deliberately
   not built ahead of the asset.
4. **The wake opens to screen-left, mirroring the DOM `<WakeLine>`.** The
   photographed vessel's bow faces image-right and mirroring it would reverse the
   `Duna` script badge on the hull, so the boat travels right and its wake trails
   left. The geometry is identical; the handedness is not. A real model, or a
   second plate shot from the port side, resolves it.
5. **Tablet widths (768–980) use the phone composition.** The switch is on band
   width. At 768 the vessel reads larger than intended — good, but on the edge.
   Worth revisiting as an aspect-ratio switch, or a blend, in Phase Three.
6. **The other four SceneSlots are untouched**, by instruction. They register and
   are measured; nothing renders into them.
7. **Measured on one machine.** No cross-GPU testing, no Safari/iOS verification.

## M. Recommendation for Phase Three

**Do not start `product-morph` until a real model exists.** Everything in the
morph depends on geometry that can be interpolated between two configurations; a
photographic Cabin↔Kadét crossfade would be Phase One's raked divide with more
machinery.

In order:

1. **Commission `Duna61Cabin.glb` against the spec.** It is the gate on
   everything else, including the hero reaching its authored 24°.
2. **When it lands, do the hero properly first** — replace the plate, set
   `AZIMUTH_SCALE` to 1, add the PMREM environment from the existing sky, and
   spend real time on the teak and glass. The hero has to be excellent with a
   real model before scope expands. Expect this to be a week on materials alone.
3. **Then `product-morph`,** with `Duna61Kadet.glb` as a second file. The
   architecture already supports two vessels and two scenes; the work is the
   transition, not the plumbing.
4. **`drivetrain` is the cheapest remaining win** — `PowerSelector` already
   exposes `onModeChange`, and the `motor` node is specified as separable
   precisely so propulsion can be swapped rather than re-modelled.
5. **Before any of it, get a second pair of eyes on real hardware.** An iPhone,
   a mid-range Android, and Safari. The performance numbers here are honest but
   they come from one machine.

---

## Notes on inherited code

Phase Two was started before this session and interrupted. `glsl/{water,wake,
atmosphere}.ts`, `stage/{quality,stageState}.ts`, `scripts/build-vessel-plate.mjs`
and the extracted plate already existed and are excellent work; they were
extended, not replaced. Three things about that inheritance are worth recording:

- **The GLSL modules had never compiled.** Two comments inside the shader
  template literals quoted identifiers with backticks, which terminates the
  literal — TypeScript reported it as `',' expected` eighty lines away. It
  recurred twice more while writing new comments in the same style, so
  `scripts/check-glsl.mjs` now guards it and runs as part of `typecheck`.
- **`package.json` had no `vessel` script**, although `vessel.generated.ts`
  instructs the reader to run `npm run vessel`. Added.
- **Adding react-three-fiber to the type graph broke two Phase One primitives.**
  R3F declares its ~90 scene objects by augmenting the global
  `JSX.IntrinsicElements`, so React's `ElementType` — which `Reveal` and
  `DisplayLines` use for their `as` prop — began to include `<mesh>` and
  `<bufferGeometry>`, and the props those primitives may pass resolved to the
  intersection of every element in that union, i.e. `never`. Fixed with a single
  shared type in `components/primitives/polymorphic.tsx`. Type-level only; no
  runtime or API change.

## QA affordances (development builds only)

| | |
|---|---|
| `?sceneDebug=1` | Status, vessel source, tier, DPR, hero progress, draw calls, triangles, CPU/frame, slot bounds. Also exposes `window.__duna` — set `__duna.heroProgress = 0.42` to park the sequence anywhere. |
| `?webgl=off` | Force the no-WebGL fallback |
| `?motion=reduce` / `?motion=full` | Force either motion mode |

All three are stripped from production builds. No debug UI ships.
