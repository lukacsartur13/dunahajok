# Duna Hajók — digital experience

Phase One: a complete, art-directed homepage and design system for
[dunahajok.hu](https://dunahajok.hu), built from first principles and
structured so the Phase Two WebGL layer drops in without a rewrite.

```bash
npm install
npm run assets   # derive /public/media from the source photography (once)
npm run dev
```

| | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `start` | Production build and server |
| `npm run typecheck` | GLSL literal guard + `tsc --noEmit` |
| `npm run assets` | Rebuild `/public/media` + `src/lib/media.generated.ts` |
| `npm run vessel` | Rebuild the matted vessel plate + `src/lib/vessel.generated.ts` |
| `npm run pxl` | Rebuild the PXL model from its STL, and its web imagery |
| `npm run model` | Validate `public/models/PXL.glb` through three's own loader |
| `npm run qa` | `typecheck` + `model` |

---

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · CSS Modules · GSAP +
ScrollTrigger · Lenis · sharp (build-time only).

**No CSS framework.** The brief explicitly rules out generic utility-class
aesthetics, and the geometry here — raked clip paths, viewport-driven display
type, a shared hull angle — is not what utility classes are good at. Styling is
a token layer (`src/styles/tokens.css`) plus one CSS Module per component.

**No 3D dependencies.** Three.js is not installed. Phase One ships zero bytes
of WebGL; see *Phase Two* below for the seam it will attach to.

---

## Architecture

```
src/
  app/                 layout, page, robots, sitemap
  components/
    chrome/            Preloader · Header · MenuOverlay · Footer
                       CustomCursor · SmoothScroll
    primitives/        CinematicMedia · DisplayLines/SectionLabel · Reveal
                       ActionLink · WakeLine
    sections/          the ten homepage sections, one file each
    scene/             SceneSlot — the Phase Two mount points
    seo/               StructuredData (JSON-LD)
  content/             site.ts · boats.ts · story.ts   ← all copy and facts
  lib/                 fonts · motion · hooks · intro · media.generated
  styles/              tokens.css · base.css
scripts/
  build-assets.mjs     source photography → /public/media
```

Content, animation logic and presentation are separated: a section component
reads facts from `content/`, entrance behaviour from `lib/motion.ts`, and
nothing else styles itself outside its own module.

---

## The design language

### Concept
**DUNA — crafted by the river.** The page runs wood → line → hull → water →
wake, and the wake is the recurring form: it opens the preloader, sits on the
hero waterline, divides the two boats, becomes the timeline's rule, and carries
the last section into the footer.

### The Duna Line
One angle — `--rake: 6.5deg` — taken from the sheer of the 6.1 hull, governs
every diagonal on the site: the hero's meeting of type and water, the
Cabin/Kadét divide, image cuts, the preloader wipe, the `/` in term lockups.
Change the token and the whole geometry re-rakes together.

### Colour
Two grounds, alternating: warm paper `#F1F0EB` and river-dark `#0A0E0F` — a
desaturated green-blue taken from the Danube rather than the navy of yacht
brochures. Teak is **not** a UI colour: it appears only as a hairline accent
(spec rules, timeline segments, award results) and, properly, as photographed
material.

### Typography
Grotesk display + editorial serif + technical mono. The intended faces
(Suisse Int'l / ABC Diatype class) are commercially licensed, so Phase One
ships the closest free structural equivalents:

| Role | Ships as | Intended |
|---|---|---|
| Display / UI | **Archivo** (variable, width axis) | Suisse Int'l, ABC Diatype |
| Editorial | **Instrument Serif** | a display serif |
| Technical | **IBM Plex Mono** | a grotesque mono |

Everything reads `--font-display` / `--font-serif` / `--font-mono`, so swapping
in the licensed families is a change to `src/lib/fonts.ts` alone.

Display line breaks are **authored**, not left to the browser: `DisplayLines`
takes an array of lines and masks each one for the reveal. The lower bounds of
`--fs-d1`/`--fs-d2` are set by the longest authored line at 375px — raise them
and headlines re-wrap inside their masks.

---

## Motion

One language: slow, physical, inertial, precise. Two eases (`hull`, `glide`)
registered in `lib/motion.ts` and mirrored in `tokens.css`.

- **Entrances** — masked per-line rise for display type (`DisplayLines`),
  opacity + travel for everything else (`Reveal`).
- **Media** — every image enters through `CinematicMedia`: a raked wipe plus a
  slow internal drift. One component, so the whole site shares one behaviour.
- **Pins** — exactly two, both earned: the Craft pull-back and the heritage
  timeline. The timeline's pin length is derived from its content width, so
  adding a milestone lengthens it proportionally rather than by a magic number.
- **Scroll** — Lenis, conservative settings, wired into GSAP's ticker so
  ScrollTrigger never disagrees with the scroll position by a frame. Disabled
  on touch (the platform's own inertia is better) and under reduced motion.

### Reduced motion
Not an afterthought and not just "turn off transitions":

- Both pinned sections fall back to stacked/vertical layouts — the timeline's
  horizontal CSS is gated on `(prefers-reduced-motion: no-preference)` as well
  as width, because that layout is only navigable *because* of the pin.
- All entrance states resolve to their final values immediately.
- The custom cursor does not render.
- The preloader skips its sequence.
- Decorative loops (the scroll indicator) stop entirely.

Hidden entrance states are gated on `@media (scripting: enabled)`, so with
JavaScript off — or in a browser that doesn't understand the query — the rules
never apply and all content is simply visible.

**QA:** in development, `?motion=reduce` and `?motion=full` force either path
without touching an OS setting. Stripped from production builds.
Note it drives the JavaScript paths only; `gsap.matchMedia` and the CSS blocks
read the real media feature.

### Development handle
Also dev-only: `window.__gsap` for inspecting and scrubbing timelines from the
console.

---

## Accessibility

- Semantic landmarks, a real heading hierarchy, and a skip link.
- The overlay menu is a true modal: `aria-modal`, focus moved in and returned
  to the trigger, Tab cycled inside, `inert` when closed, scroll locked.
- The propulsion selector is a real tablist with roving tabindex and
  arrow/Home/End keys.
- The header sits **above** the overlay in the stacking order so Close stays
  reachable.
- Visible focus rings that survive both grounds.
- Alt text is authored per asset in `scripts/build-assets.mjs` and travels with
  the image through `media.generated.ts`; decorative repeats pass `alt=""`.
- No information exists only on hover. The Cabin/Kadét divide follows the
  pointer as an enhancement — both plaques are fully present without it.

---

## Editorial decisions worth knowing

**Facts are sourced, not written.** `content/boats.ts` and `content/story.ts`
are transcribed from dunahajok.hu (retrieved 2026-08-07) and carry their source
in the file header. No specification, date or award on this page was estimated
or inferred.

**One unresolved source conflict.** The awards page has a section headed
"HUNGARIAN DESIGN AWARD **2023**" whose body says the Kadét was entered "in
**2020**". The German page repeats the contradiction, so it isn't a translation
slip. That entry therefore ships with **no year** (rendered as `—`) until the
client confirms which is right. Please resolve it —
`content/story.ts` marks the spot.

**Prices are modelled but not displayed.** The published net prices (€68,050 /
€41,200) are in `content/boats.ts` and available to the future product pages,
but the homepage does not show them: on a hand-built boat the next step is a
conversation, not a checkout, and a price is the element most likely to go
stale. Reverse it by rendering `boat.priceFrom` — the data is there.

**No fabricated engineering drawings.** The Design chapter uses the existing
marketing render plus an abstract measurement grid. Nothing on the page
pretends to be a technical drawing that isn't one.

**No award logos.** Section 08 is typographic by design; the BIG SEE and MFD
marks are third-party assets with their own usage rules.

---

## The WebGL layer

`src/components/scene/SceneSlot.tsx` declares every place a real-time scene is
planned. Each slot is a measured box that registers itself, holds the static
art direction that currently occupies it, and publishes a stable id:

| Slot | Section | Currently |
|---|---|---|
| `hero-vessel` | 01 Hero | **live — Phase Two** |
| `pxl-product` | wherever a page mounts `<PxlStage>` | **live — Phase 2.5** |
| `product-morph` | 02 Cabin / Kadét | the raked photographic divide |
| `material-explorer` | 05 Craft | the teak dissolve |
| `drivetrain` | 09 Power | the propulsion plate |
| `wake-water` | 10 Final CTA | the closing plate |

`src/webgl/stage/WebGLStage.tsx` mounts one fixed canvas at the document root,
calls `getSceneSlots()` for every registered box, and renders each scene into
its slot's rectangle with a scissored viewport — one renderer for five slots,
not five renderers. A slot that gains a scene hides its fallback via
`data-scene-active`; nothing in the sections changed.

The canvas is code-split and is not requested until the preloader releases the
page, so three.js is never in the critical path. `?sceneDebug=1` opens a
development-only inspector; `?webgl=off` forces the fallback.

`PowerSelector` already exposes `onModeChange` for the same reason — the
drivetrain scene subscribes to it as a prop, not as a rewrite.

**Deliberately not built:** fake versions of the remaining planned interactions.
The static art direction is the design, not a placeholder — and it is also the
permanent fallback for no-WebGL, lost contexts and reduced motion.

See **[PHASE_2_REPORT.md](PHASE_2_REPORT.md)** for the hero experience, and
**[WEBGL_ASSET_SPEC.md](WEBGL_ASSET_SPEC.md)** for the Duna 6.1 model the scene
is waiting on.

### The PXL

The Duna PXL is the one boat with a real model. `assets/source/pxl/PXL-3D.stl`
goes through `npm run pxl` and comes out as a 303 kB, thirteen-mesh,
thirteen-material glTF at `public/models/PXL.glb`, in metres, bow +X, origin on
the waterline. `<PxlStage>` drops it into any section; `pxlStore` holds the
configuration; the studio it stands in is generated rather than loaded.

**Three routes, all noindex and robots-disallowed, all linked from nothing:**

| Route | What it is |
|---|---|
| `/preview/pxl` | the editorial product page — the PXL on the Danube, and the door into product mode |
| `/preview/pxl/configure` | the customer-facing configurator |
| `/dev/pxl` | the development bench, with the telemetry panel |

Exterior colour is the one thing that is genuinely configurable, and it is the
only thing offered: the category list is derived from the schema, so no option
appears until there is product data behind it. State is shareable as
`?exterior=<slug>`, invalid values fall back and are stripped from the address
bar, unrelated parameters survive, and a colour change interpolates the existing
materials rather than reloading anything.

Changing the finish runs **the sweep**: the new paint arrives at the bow and
travels aft along a line raked to the Duna Line's 6.5°, over 520 ms. It is a
real material transition — one `MeshPhysicalMaterial` with a spatially varying
albedo, lit by the same environment on both sides of the boundary — not a
crossfade between two renders. No second material, no second draw call, no
geometry reload, and no shader recompile: the program is built with the
injection already in it, at load.

**Colour names are provisional and the code knows it.** `finishLabel(f,
"public")` returns `null` for every finish in the palette, because none has an
approved name and none is published. There is no field on a finish that is both
human-readable and unconditionally safe, so a public surface cannot print a
colour name by accident.

Append **`?debug=1`** for telemetry — mesh table, material roles, framing
coverage and margins, draw calls, triangles, frame time, configuration state.
**`?webgl=off`**, **`?motion=reduce`** and **`?render=always`** exercise the
fallback, reduced-motion and offscreen-capture paths; all three are stripped from
production builds.

**The PXL is not on the homepage.** The 6.1 hero is exactly as Phase Two left
it, and the PXL scene is `lazy()`-imported so a homepage visitor downloads
none of it — verified: loading `/` fetches no PXL chunk and no `PXL.glb`.
`/boats/pxl` is reserved in `src/content/pxl.ts` and deliberately unbuilt: the
yard has published no specification for this boat, and a product page made of
placeholders is worse than no product page.

See **[PXL_CONFIGURATOR_SCHEMA.md](PXL_CONFIGURATOR_SCHEMA.md)** for the
categories, the URL format, the naming and publication rules, the request
payload and the analytics event contract;
**[PXL_CONFIGURATOR_MODEL_MAP.md](PXL_CONFIGURATOR_MODEL_MAP.md)** for the mesh
map, the material roles, the sweep contract, the console revision mismatch and
the contract for replacing that console; **[PXL_MODEL_MAP.md](PXL_MODEL_MAP.md)**
for the asset itself and what the source cannot provide; and
**[PHASE_2_5_REPORT.md](PHASE_2_5_REPORT.md)** /
**[PHASE_2_6_REPORT.md](PHASE_2_6_REPORT.md)** /
**[PHASE_3_REPORT.md](PHASE_3_REPORT.md)** for the pipeline, the measurements
and what is still needed from Duna Hajók.

---

## Performance notes

- 198 kB gzipped of initial JS (React + GSAP + Lenis). three.js and
  react-three-fiber are **not** in it: the WebGL stage is code-split and
  deferred until after the intro. No unused libraries.
- All photography derived to WebP at build time; `next/image` negotiates AVIF
  and resizes per breakpoint. Every image ships a generated base64 LQIP, so
  there is no layout shift and no runtime placeholder request.
- Only the hero plate is `priority`; everything else is lazy.
- Animation is confined to `transform`, `opacity` and `clip-path`.
- `--fs-mega` is sized against **both** axes (`min(21vw, 31vh)`) so the hero
  never overflows the fold on a laptop.

Not yet done, and worth doing before launch: the hero motion loop (HERO-02) is
specced as desktop-only — add the `<video>` behind a `(min-width: 48rem)` and
`(prefers-reduced-motion: no-preference)` gate inside the `hero-vessel` slot
rather than shipping it to phones.

---

## Content and asset gaps

See **[ASSET_REQUIREMENTS.md](ASSET_REQUIREMENTS.md)** — every missing asset is
specified with subject, framing, aspect, resolution, lighting, target section
and device. The three that matter most: a 4K hero plate, a 6000px teak macro,
and any photograph at all of the electric drivetrain.
