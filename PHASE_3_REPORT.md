# PHASE 3 — PXL CUSTOMER-FACING CONFIGURATOR

The first complete customer experience for the Duna PXL: an editorial product
page, a cinematic entry into product mode, and a configurator where the vessel
is the page and the interface is a rail along the bottom of it.

Built on the Phase 2.5 / 2.6 foundation. Nothing in the asset pipeline, the
material-role system, the camera rig, the water shader or the stage
architecture was rebuilt.

**The product remains unpublished.** `PXL.published` is `false`, the experience
lives at `/preview/…`, and every fact it declines to state is documented below
with what unblocks it.

---

## A — EXISTING ARCHITECTURE REUSED

Reused unchanged:

| | |
|---|---|
| Single root WebGL canvas | `WebGLStage`, one `<Canvas>` at the document root |
| Scissored multi-scene runtime | `StageRuntime` + `sceneRegistry` + `SceneSlot` |
| PXL product scene | `PxlProductScene`, still lazy-loaded |
| Model contract | `pxlModel.ts` — 13 zones, 10 material roles, unchanged |
| Configuration model | `pxlConfig.ts` — schema, categories, serialisation |
| Configuration store | `pxlStore.ts` — `useSyncExternalStore`, no state library added |
| Camera presets | `pxlPresets.ts` — the six Phase 2.5 compositions, values untouched |
| Controlled orbit | `pxlOrbit.ts` — limits, pinch, damping |
| Studio lighting | `pxlLighting.ts` — the procedural PMREM rig |
| Material transition | `applyConfiguration` / `tickFinishes`, mutation in place |
| Quality tiers, WebGL detection, reduced motion | `quality.ts`, `hooks.ts` |
| Design tokens, motion system, type scale | `tokens.css`, `motion.ts` |
| Telemetry | `pxlTelemetry.ts` — the framing measurement Phase 2.5 built |

Extended rather than replaced:

| File | Change |
|---|---|
| `pxlPalette.ts` | `displayName` → `previewLabel` + `approvedDisplayName?` + `published`, and `finishLabel()` |
| `pxlConfig.ts` | pure URL helpers; `summariseConfiguration` takes a surface |
| `pxlStore.ts` | `syncPxlUrl()`, `pxlIsDefault()`; permalink built on the pure helper |
| `pxlPresets.ts` | `PXL_CONFIGURATOR_VIEW_CONTROLS` — derived, excludes FREE |
| `pxlView.ts` | two flags: `arrival`, `adaptive` |
| `PxlVessel.tsx` | the sweep: `installSweep`, swept branch in `applyConfiguration`/`tickFinishes` |
| `PxlProductScene.tsx` | arrival, idle breath, adaptive backdrop |
| `PxlBackdrop.tsx` | one `uLift` uniform |
| `StageRuntime.tsx` | six lines: the snapshot read, in the only frame where it is valid |
| `Preloader.tsx` | skips itself on immersive product routes |
| `tokens.css` | `--z-product-ui` |
| `robots.ts` | reads the disallow list from `publication.ts` |

New:

```
src/content/publication.ts                  one source of truth for what is not indexed
src/lib/analytics.ts                        the event contract, no provider
src/webgl/glsl/pxlSweep.ts                  the signature moment, as GLSL
src/webgl/scenes/pxl/pxlRequest.ts          payload, validation, transport boundary
src/webgl/scenes/pxl/pxlSnapshot.ts         client-side capture
src/components/pxl/PxlProductConfigurator.* the experience
src/components/pxl/PxlSwatches.tsx          the finish control
src/components/pxl/PxlRequestPanel.tsx      the request flow
src/components/pxl/pxlEntry.ts              the handover between the two routes
src/app/preview/layout.tsx                  segment-wide noindex
src/app/preview/pxl/                        the editorial page
src/app/preview/pxl/configure/              the configurator
```

**No new dependency.** `package.json` is unchanged.

---

## B — CUSTOMER CONFIGURATOR ARCHITECTURE

```
/preview/pxl/configure
  └── PxlProductConfigurator            "use client"
        ├── PxlStage                    → SceneSlot "pxl-product" (the whole viewport)
        │     └── fallback <Image>      the colour study for the CURRENT finish
        ├── header .top                 exit · DUNA / PXL · share · focus
        ├── .rail                       EXTERIOR · VIEW · RESET / SAVE IMAGE / REQUEST
        │     └── PxlSwatches           one radiogroup, roving tabindex
        ├── .srOnly                     model, finish and view as DOM text
        └── PxlRequestPanel             modal, focus-managed

pxlStore  ←→  URL          the only two places a configuration lives
pxlView   →   WebGLStage → PxlProductScene → PxlVessel → materials
```

The store is the same one the development bench uses. No second store was
introduced; `usePxlConfiguration` is the only subscription, and the render loop
still polls a version counter rather than being driven by React.

**The interface never animates the product.** Changing a colour is one call into
the store. The sweep, the camera move and the backdrop response all belong to
the scene, which is why the UI file has no `gsap` import in it.

---

## C — ROUTE STRATEGY

| Route | State | Purpose |
|---|---|---|
| `/preview/pxl` | built, noindex | the editorial product page — the beginning |
| `/preview/pxl/configure` | built, noindex | the configurator — product mode |
| `/boats/pxl` | reserved | the public product page |
| `/boats/pxl/configure` | reserved | the public configurator |
| `/dev/pxl` | built, noindex | the development bench, unchanged |

Publishing is a routing change plus a flag. The components at `/preview` are the
customer-facing ones; nothing about them is provisional except the address and
the facts they are not allowed to state.

Direct navigation is a first-class entry. The configuration comes from the URL,
a refresh keeps it, back and forward behave, and the cinematic entry is a
nicety for people who came through the product page rather than a prerequisite.

---

## D — PUBLICATION SAFETY

Three files have to agree, so they read from one — `src/content/publication.ts`.

| Guarantee | Where | Verified in the build |
|---|---|---|
| `Disallow: /dev/`, `/preview/` | `robots.ts` | ✅ `.next/server/app/robots.txt.body` |
| `noindex, nofollow, noarchive, nosnippet, noimageindex, nocache` | `app/preview/layout.tsx` — the **segment**, so a page added later inherits it | ✅ in the rendered HTML |
| Absent from the sitemap | `sitemap.ts` lists the homepage only | ✅ |
| Linked from nothing | no `NAV` entry, no footer link, no internal link outside `/preview` | ✅ |
| Title says PREVIEW | both page `metadata` blocks — a tab and a bookmark read no meta tag | ✅ |

`nosnippet` and `noimageindex` are not decoration: a cached snippet of an
unpublished product cannot be withdrawn by changing a route.

**Not published, and nothing pretends otherwise:** no price, no specification, no
availability, no engine option, no approved colour name, no invented wordmark.

---

## E — EXTERIOR FINISH UI

Six finishes, one radiogroup, one tab stop.

- **A material sample, not a colour fill.** Each swatch carries the finish's own
  base colour under a fixed sheen — a highlight where a softbox would fall and a
  shadow where the sphere turns away. The light is identical on all six, so they
  stay comparable; it is what lets the near-black finish read as a glossy object
  rather than as a hole in the rail.
- **Keyboard:** arrows move *and* select (so the boat repaints as the selection
  travels), Home/End jump to the ends, focus follows selection, exactly one
  member of the group is in the tab ring.
- **Selection is carried three ways:** `aria-checked`, a ring, and the name
  printed beside the group. Never colour alone.
- **Hover/focus names the other five** without selecting them.
- 44 px targets, `:focus-visible` ring that survives a white hull, a black hull
  and the scrim.

The name comes from `finishLabel(finish, "preview")` with a fallback to the
slug. No component can print a colour name any other way — see the schema doc §3.

---

## F — MATERIAL TRANSITION IMPLEMENTATION

### The signature moment

Changing the exterior finish does not fade the whole boat. The new paint arrives
at the bow and travels aft along a line raked to the Duna Line's own 6.5°.

**It is a true material transition.** What moves across the hull is the albedo
the lighting model is evaluated with — both sides of the boundary are the same
`MeshPhysicalMaterial`, running once, lit by the same environment, taking the
same clear-coat highlight along the same sheer.

| | |
|---|---|
| Mechanism | `onBeforeCompile` on the two `EXTERIOR_HULL` materials, installed at load |
| Uniforms | `uPxlSweepBasis` (plane equation), `uPxlSweepEdge` (position, softness), `uPxlSweepFrom` (linear colour), `uPxlSweepFromSurface` (roughness, metalness) |
| Coordinate | `position.x / LOA + 0.5`, raked by 3 × tan 6.5° — geometry, not UVs (the model has none) |
| Duration | **520 ms**, decelerating (`1 − (1−t)³`) so the line settles into the transom |
| Boundary | ~0.29 m of hull, soft. **No glow, no emissive, no rim** — §67 |
| Surface parameters | roughness and metalness follow the same boundary. Not cosmetic: the gold study is metalness 0.34 against zero for the rest, and fading it globally would put a flat bow on a metallic stern |
| Geometry | not reloaded |
| Materials | not duplicated, not replaced |
| Shader | compiled once at load — **no recompile during a change** |
| Cost at rest | the mask is parked below every hull coordinate; the smoothstep resolves to 1 and the mixes are the identity |
| Cost during | four uniform writes per frame, per material, for 520 ms |

### What was kept from Phase 2.6

The eleven zones that do not change colour still take the plain 340 ms
interpolation and, on an exterior change, do not animate at all (the equality
check short-circuits them). Colour is still interpolated in the renderer's
linear working space. Reduced motion still lands the change instantly — a
colour change is information, and someone who asked for less motion still needs
to see which colour they picked.

### Interruption

A sweep interrupted mid-flight **completes instantly** and the new one departs
from a settled hull. Half way through a change the hull is genuinely two colours
at once and there is no single "from" that describes it: starting the next sweep
from the incoming colour would pop the un-swept stern, from the outgoing one
would pop the bow. Resolving first is the only option with no pop in it, and at
520 ms it takes deliberate effort to reach.

---

## G — CAMERA INTERACTION

The Phase 2.5 orbit, unchanged: drag to turn, wheel/pinch to zoom, elevation
clamped to −4°…62°, distance clamped to 3.6…26 m, no panning, no pole crossing,
no underwater camera, no dolly into the near plane. Input is taken from the slot
element, not the canvas — the canvas is `pointer-events: none` for the whole
site.

**Presets and manual drag do not fight.** Selecting a preset captures the move
from wherever the camera actually is, orbit offsets included, then zeroes them —
so the move starts from what is on screen rather than jumping back to the last
authored composition. Dragging afterwards continues from the new pose. Entering
FREE freezes the live composition instead of re-resolving it, so a resize does
not re-compose the boat under someone who has just turned it.

`touch-action: none` on the interactive slot, so the first few pixels of a drag
turn the boat instead of being claimed as a page scroll. The page does not
scroll in product mode at all (`html.is-immersive`), which removes the gesture
conflict rather than arbitrating it.

Desktop cursor reads `DRAG TO EXPLORE` over the vessel and returns to normal
elsewhere.

---

## H — CAMERA PRESETS

Five offered: **Three-quarter, Profile, Bow, Stern, Cockpit**. All from the
Phase 2.5 table, values untouched.

**FREE is not a button.** It is a state the camera reaches, so it is named in the
`VIEW` line the moment someone turns the boat and none of the five chips is
selected — but "put me in free mode" is not an instruction anybody would give,
and a button that appears to do nothing when pressed is worse than no button.
Choosing a chip is how the camera is handed back. The control list is *derived*
by filtering the derived presets, so a future mode cannot become a chip by
accident.

`detail` (the console close-up) is still withheld: its subject is the superseded
console revision.

Transitions are scaled by angular and dolly distance, 0.62–1.18 s, on the site's
`glide` easing. No teleports.

---

## I — DESKTOP COMPOSITION

```
← CLOSE ── DUNA  PXL                                    COPY LINK   FOCUS

                        [ the vessel, full bleed ]

EXTERIOR  Sage Green │ PROVISIONAL NAME     VIEW  Three-quarter
● ● ● ● ● ●                                 [3/4][Profile][Bow][Stern][Cockpit]
                                                    RESET  SAVE IMAGE  [ REQUEST ]
```

The stage is `position: absolute; inset: 0`, not a grid cell. That is what makes
the brief's §7 structural rather than aspirational: a narrower window, a taller
rail or a longer language cannot take a pixel away from the boat, because the
boat is not in the same layout flow as the controls.

**Measured at 1440 × 813:** rail 145 px, stage **82 %** of the viewport height,
and the vessel spans 78 % of the frame width inside it. No sidebar anywhere.

The rail earns its legibility from a gradient scrim rather than a panel, and the
top chrome does the same — a filled header would be a second horizontal band
competing with the rail for the frame.

Tablet and small desktop compress the secondary controls first: the view chips
and the swatches may scroll, the groups may shrink, the stage does not.

---

## J — MOBILE COMPOSITION

Not the desktop scaled down. Three authored compositions.

**Portrait, measured at 390 × 844:**

- top: `← CLOSE / COPY LINK / FOCUS` on one line, `DUNA PXL` on the next — at
  390 px they do not fit on one row, and the thing that may not shrink is the
  product's name;
- middle: the vessel;
- bottom: a tray capped at `34dvh`. **Measured: 255 px, leaving the stage 70 %**
  of the screen. The cap is what makes the stage's claim mean anything — Phase
  2.5 found an uncapped tray taking 570 px of an 844 px phone.
- swatches and view chips scroll inline with `overscroll-behavior-inline:
  contain`, so a swipe along them does not also scroll the tray;
- no horizontal document overflow at any tested width.

**Landscape, measured at 844 × 390:** one slim row over an otherwise full-bleed
stage; group labels hide; the identity returns to a single line. When the row
cannot hold everything at 44 px, **SAVE IMAGE is what goes** — the ranges may
compress and scroll because a range that scrolls is still a range, but a CTA
that has slid off the right edge of a phone is a CTA that does not exist.

All controls are ≥ 44 px in their short axis at every size, including landscape.
Safe-area insets are honoured top and bottom, and on both inline edges in
landscape.

---

## K — URL / SHARE IMPLEMENTATION

The URL is the configuration. See PXL_CONFIGURATOR_SCHEMA.md §4 for the full
table; verified live:

| Test | Result |
|---|---|
| `?exterior=navy` | loads Navy, swatch checked, name printed |
| pick a swatch | URL updates via `replaceState` |
| `?exterior=not-a-colour&utm_source=newsletter&engine=v8` | → `?utm_source=newsletter`, boat on the default. Invalid dropped, reserved dropped, unrelated kept |
| `?render=always` through a colour change and a reset | preserved throughout |
| COPY LINK | writes the full permalink to the clipboard, confirms in a live region and one brief line |
| refresh | configuration survives |
| back / forward | `popstate` re-reads the URL |

A denied clipboard is silent: the address bar is already correct, which is the
whole point of the URL being the state.

---

## L — RESET BEHAVIOUR

`RESET` restores the delivered configuration, drops the configurator's own
parameters from the URL and leaves every other parameter alone. It does not
reload, does not confirm (one category — §29), and **does not move the camera**:
someone who has turned the boat to look at the transom and then reset the colour
has not asked to be moved.

The material change is the same smooth transition as any other, including the
sweep.

---

## M — CONFIGURATION SUMMARY

Generated from `summariseConfiguration(config, surface)` — one line per
*available* category, never a written-out list. Today that is one line.

It is shown in two places: the rail always names the selected finish, and the
request panel prints the full summary above the fields, so the customer never
re-enters their configuration.

On a preview surface the summary prints the working name **and the stable slug
beside it**, so what reaches the yard is unambiguous even if the working name
changes before anyone reads it. On a public surface the same function returns
`value: null` for every line and the UI prints no colour name at all.

---

## N — REQUEST-FLOW ARCHITECTURE

A focused form — name, email, optional phone, optional message — in a proper
modal: `aria-modal`, focus moved in and restored on close, Escape closes, Tab is
trapped, invalid submission moves focus to the first field that needs attention
rather than announcing a problem the visitor then has to go looking for.

Validation is the smallest honest set: a name and something shaped like an
address. Every additional required field is a decision that the yard would
rather lose the enquiry than receive it incomplete, and nobody at the yard has
made that decision.

The payload is pure data, versioned, and carries the configuration three ways
(canonical query, flattened selections, permalink) plus the product's *own*
publication state — a lead that arrives while the product is unpublished is a
lead about a boat whose specification does not exist yet, and whoever answers it
needs to know that without having to remember what was true in August.

Full shape in PXL_CONFIGURATOR_SCHEMA.md §8.

### No fake submission

`PXL_REQUEST_DESTINATION` is `{ kind: "none" }`. `submitPxlRequest()` performs
**no network call** and returns `no-destination`. The panel renders that as what
it is — nothing went wrong, and nothing was sent — and offers a `mailto:` to the
yard's published address with the configuration already in the body. The
customer can see the message, edit it, and knows perfectly well whether they
sent it.

There is no tick, no spinner resolving into a promise nobody has made, and no
POST to a borrowed endpoint.

**To connect it:** change the constant to `{ kind: "endpoint", url, approvedBy }`.
Nothing else changes — the transport already POSTs the payload and the UI
already renders the `sent` and `failed` branches. A test replaces `fetch` with a
tripwire that fails the suite if the flow ever calls it without an approved
destination.

---

## O — SNAPSHOT IMPLEMENTATION / STATUS

**Implemented, and honest about the one thing that can defeat it.**

The canvas is created with `preserveDrawingBuffer: false` — correct for a
full-viewport canvas on every page of a site, and the reason a `toDataURL` from
a click handler returns a blank image. The way out is not to turn the flag on
(that costs a second full-size buffer and a copy per frame, permanently, for a
feature almost nobody uses) but to read the buffer at the one moment it is
guaranteed to hold the frame: synchronously, inside the render loop, immediately
after the draw.

```
requestPxlSnapshot()  →  invalidates the scene (a still product shot is a static
                         scene and would otherwise never draw again)
StageRuntime          →  after gl.render for "pxl-product", capturePxlSnapshot()
                      →  crop the slot rect in device pixels, cap the long edge
                         at 2400, toBlob
```

The capture contains the vessel, the current finish and the studio, and nothing
else — the interface is DOM and was never in the canvas. High-DPI is handled by
cropping in device pixels and capping the long edge.

Every failure path resolves to `null` rather than throwing: no scene, no frame
within 2 s, a browser that refuses the read. The button then hides itself and
says so once. **It cannot block the phase.**

Offered as a secondary action, never in the primary rail, and never as a
fabricated hosted URL — the file is produced on the visitor's machine and saved
to it.

**Not verified end-to-end.** The automation harness could not capture a WebGL
frame reliably (see §T), so the download path has been exercised in code but not
observed producing a PNG on a real device. It is architecturally complete and
fails safely; treat it as *implemented, unconfirmed*.

---

## P — ACCESSIBILITY

| | |
|---|---|
| Swatches | true radiogroup, roving tabindex, arrows select, Home/End, `aria-checked` |
| Views | radiogroup, `aria-checked`, all reachable by keyboard |
| Focus mode | `aria-pressed`, Escape exits (to the controls, not off the page) |
| Request panel | `aria-modal`, labelled, focus in and restored, Tab trapped, Escape closes, `aria-invalid` + `aria-describedby` on errors |
| The 3D object | `aria-hidden`, as it must be — a scene graph has nothing to traverse |
| **What the canvas cannot say** | a visually-hidden line states the model, the selected finish and the current view, updated as they change. It is the only place some visitors can read what is on screen |
| Live region | `role="status" aria-live="polite"` for finish changes, copy confirmation and reset. One line, never a stack |
| Targets | ≥ 44 px in the short axis everywhere, landscape included. The exit link gets its 44 px from padding-out/margin-back-in so the type stays on the lockup's baseline |
| Focus ring | `:focus-visible`, 2 px, offset, in `--signal` so it survives a white hull, a black hull and the scrim |
| Colour alone | never used to carry state |

Verified in the browser: 6 swatches with exactly 1 tab stop; ArrowRight from the
last wraps to the first, selects it and moves focus; the screen-reader line
reads `Duna PXL. Exterior: Sage Green. View: Three-quarter.`

---

## Q — REDUCED MOTION

| | |
|---|---|
| Idle breath | not started |
| Compositional arrival | skipped — the camera resolves straight into the composition |
| Preset changes | applied directly, no transition |
| Finish change | lands instantly. A colour change is information, not decoration |
| The sweep | not used |
| Entry curtain | not drawn; the CTA navigates immediately |
| Rail | simply present rather than arriving |
| Swatch hover | no scale |
| Water | not used in the configurator at all |
| Orbit | the scene registers as static; frames are drawn on demand |
| **Everything remains functional** | every control, the URL, the share, the request |

The product does not go away. What goes is travel.

---

## R — PERFORMANCE MEASUREMENTS

Measured in Chrome (Apple M4, ANGLE Metal) at 1440 × 813, high tier:

| | |
|---|---|
| Draw calls | **15** (13 zones − 1 hidden cover + backdrop + contact shadow) |
| Triangles | **22,237** |
| GLB requests on the configurator | **1** (`PXL.glb`) |
| GLB requests on the homepage | **0** ✅ |
| PXL scene JS chunks on the homepage | **0** ✅ |
| Texture requests | 0 — the model has no textures |
| Environment map | 1 PMREM bake at mount, nothing per frame |
| Materials created | 13, once, at load |
| Shader programs compiled | at load. **Zero during a finish change** |
| Per-frame cost of a finish change | 4 uniform writes × 2 swept materials, for 520 ms |
| Per-frame cost at rest | none — the scene invalidates itself only when something changes |

Bundle, from `next build`:

| Route | Route JS | First load |
|---|---|---|
| `/` | 11.8 kB | **172 kB** (unchanged from Phase 2.6) |
| `/preview/pxl` | 1.61 kB | 267 kB |
| `/preview/pxl/configure` | 10.6 kB | 276 kB |
| `/dev/pxl` | 5.22 kB | 270 kB |

**The homepage did not regress.** The PXL scene is still behind `lazy()` and the
promise is only created once a `pxl-product` slot exists — confirmed by loading
the homepage and finding zero `.glb` requests and zero PXL chunks after four
seconds.

**Frame timing is not reported.** The only readings obtainable through the
automation harness were taken in a throttled tab immediately after it regained
focus (54 ms/frame), which measures the harness rather than the scene. A
figure that misleading is worse than none. This is the one measurement Phase
Three owes a real device.

Memory after repeated finish changes is unchanged by construction: no material
is allocated, no texture is created and no geometry is loaded by a colour
change. The only allocation per change is one `SurfaceState` per zone.

---

## S — AUTOMATED TESTS

`npm test` — **345 checks, all passing** (208 in Phase 2.6).

New this phase:

| Group | What it asserts |
|---|---|
| finishes | every finish is unpublished, has no approved name, refuses to name itself publicly, names itself on preview, and carries a working name of at most two words (which catches an invented range name) |
| categories | available categories are genuinely available and have options; `write` does not mutate; reserved categories are declared without being offered |
| share links | absolute and relative permalinks; idempotence; unrelated parameters preserved; a stale parameter replaced not appended; fragment preserved; reset clears only what the configurator owns; cold-load hydration |
| publication | both built PXL routes are unindexed, both reserved routes are not, the preview robots block has index/follow/snippet/imageindex all off, every prefix is a path prefix, the exterior range is not publicly nameable |
| summary | shape, stable slug, internal key, approval flag; a public surface gets `null`; one line per available category |
| camera presets | the five view controls are exactly the non-derived presets, FREE is not among them |
| analytics contract | nothing recorded with no sink; an installed sink receives documented names; a throwing sink cannot break the configurator |
| request payload | versioned, carries the canonical query and it round-trips, blank optional fields omitted, no price/total/deposit/leadTime/availability/specs field exists, the message names the finish by token and marks the name provisional |
| request validation | name and address required, both problems reported at once, phone and message genuinely optional |
| request destination | destination is `none`, submitting reports `no-destination`, **and `fetch` is replaced with a tripwire that fails the suite if the flow ever calls it** |

Still no test framework. The tested modules import nothing but each other, which
is what makes running them on plain node possible; `pxlRequest.ts` was written
to that rule deliberately (the product record is passed in rather than imported).

Not tested, and deliberately: anything needing a GPU, a DOM or a screenshot.

---

## T — VISUAL QA

### What was verified

| Viewport | Result |
|---|---|
| 1440 × 813 | rail 145 px, stage 82 %, vessel 78 % of frame width, no clipping, margins L .08 / R .13 / T .23 / B .20 |
| 768 × 1024 | all five view chips and all three actions fit; stage dominant |
| 844 × 390 landscape | single-row rail, CTA fully visible, stage ~80 % |
| 390 × 844 portrait | tray 255 px, stage 70 %, no horizontal overflow, CTA above the fold |
| all | no horizontal document overflow; no hydration warnings; no console errors |

Interaction verified live: swatch selection and URL sync; keyboard selection and
wrap; reset; unrelated-parameter preservation; invalid and reserved parameter
sanitisation; focus mode on and off by Escape; the request panel end to end
including empty-submit validation, focus routing and the `no-destination`
outcome with a correctly-encoded `mailto:`.

### Three defects found and fixed during QA

1. **The interface disappeared the moment the vessel began drawing.** The root
   canvas is at `--z-scene: 40` and, on this route, the slot is the entire
   viewport — so every control was painted over by the boat it operates. Fixed
   with a `--z-product-ui` token above the scene and below the menu. The token
   file's own note explains why everything else on the site is safe at its
   current level.
2. **`contain: layout` on the shell.** Added for paint isolation; it makes the
   element a stacking context, which flattened every control back underneath the
   canvas and made fix (1) look like it had not worked. Removed, with the reason
   recorded in the file so it is not re-added.
3. **The site preloader gated the configurator on the homepage's hero
   photograph** — a second of full-screen panel waiting for an asset the page
   never shows, which is exactly the "black flash over an empty background" §57
   rules out. It now skips itself on immersive product routes.

Also fixed in passing: the view chips wrapped to two rows at 1440; the naming
qualifier was a three-line footnote overlapping the swatches (now a one-line
marker beside the name it qualifies); the exit link and the top chips were below
44 px; the mobile top bar collided at 390 px; the editorial CTA sat just below
the fold.

### The limitation, stated plainly

**Pixel-level visual QA of the live WebGL scene could not be completed through
the automation harness.** Two independent obstacles:

- the in-app browser reports `document.hidden === true` permanently, so
  `ResizeObserver` never fires and the canvas is never sized;
- the real-Chrome harness sizes the canvas correctly, but `requestAnimationFrame`
  is throttled whenever the window is not foregrounded, and its screenshot
  pipeline returned stale cached frames once the WebGL layer became active —
  confirmed by resizing the viewport and receiving a byte-identical image.

What this means: the scene was verified to **load, compose and measure
correctly** — model resolved, 15 draw calls, 22,237 triangles, `hero_3q` at
78 % frame width with no clipping — using the telemetry Phase 2.5 built for
exactly this purpose, which is the same method Phase 2.5 and 2.6 used to tune
the presets. What was **not** verified by eye is the appearance of the six
finishes at the five camera angles, the sweep in motion, the adaptive backdrop,
and the snapshot's output.

**This is the outstanding QA item for Phase Three, and it needs a human at a
real browser rather than more automation.** The brief's §54 checklist — every
finish at bow, side, stern and cockpit, checking for clipped highlights, crushed
shadows, background blending and branding contrast — has not been performed.

---

## U — UNRESOLVED BUSINESS / CONTENT BLOCKERS

Unchanged from Phase 2.6, and none of them is technical.

1. **Verified specifications.** LOA, beam, draft, weight, capacity, power,
   speed, CE category. All nine unpublished. The editorial page prints nine
   "Not yet published by the yard" rows rather than nine plausible numbers.
2. **The production console.** The asset carries the STL revision; the colour
   studies show a glazed tower. The `console` category is withheld and the
   `detail` view is not exposed because of it. Phase Three added no control
   around the console, per §51.
3. **Approved colour names.** No RAL, no manufacturer code, no range. Enforced
   in data: `finishLabel(f, "public")` returns null for all twelve finishes, and
   the preview surface marks every name `PROVISIONAL NAME`.
4. **Branding artwork and placement dimensions**, plus UV generation, which is a
   prerequisite. Nothing was drawn or invented.
5. **An approved sales destination.** `PXL_REQUEST_DESTINATION` is `none`. The
   flow is complete up to the boundary and refuses to cross it.
6. **Product approval** that any of this may be shown at all.

New this phase:

7. **Human visual QA of the six finishes at the five camera angles** — see §T.

---

## V — RECOMMENDATION FOR PHASE FOUR

**Do not add configuration categories.** Nothing has arrived that would make one
real, and the architecture already expands without a redesign.

In order:

1. **Complete the visual QA of §T on a real browser**, against the §54
   checklist. It is the only thing standing between this phase and a confident
   sign-off on the part of the work that is finished.
2. **Measure a real frame time** on a mid-range phone and a laptop, and
   re-measure memory after fifty finish changes. Both are cheap and both are
   currently claims rather than numbers.
3. **Chase the six blockers.** Every one of them is a thing the yard has to
   send, and four of them (specs, names, console, destination) each unblock a
   visible piece of what is already built.
4. **Then, and only then, publication:** flip `PXL.published`, move the two
   routes from `/preview/pxl…` to `/boats/pxl…`, add the sitemap entries and the
   navigation link, and delete `/preview`. The components do not change.
5. Deferred, in the brief's own words: Cabin, Kadét, the morph, pricing,
   checkout, accounts and saved builds. None of them is blocked by anything
   here.

---

## FINAL

Verification run on the current tree:

```
npm run typecheck   ✓  GLSL literals clean, no TypeScript errors
npm run model       ✓  13 meshes, 13 materials, 0 textures, 20,235 triangles
npm test            ✓  345 checks passed
npm run build       ✓  9 static pages, homepage first-load unchanged at 172 kB
robots.txt          ✓  Disallow: /dev/ and /preview/
preview HTML        ✓  noindex, nofollow, noarchive, nosnippet, noimageindex
sitemap.xml         ✓  homepage only
homepage            ✓  zero PXL GLB requests, zero PXL scene chunks
```

No console errors. No hydration warnings. No horizontal overflow. No fake
categories. No invented specification, price, or colour name. No accidental
indexing.

---

## **PXL CUSTOMER CONFIGURATOR READY: YES**

The experience is complete and behaves correctly: one real category presented
well, a true travelling material transition, controlled cinematic camera
inspection, a designed mobile and landscape composition, shareable and
sanitised URL state, a generated summary, a complete request architecture that
refuses to fake a submission, strong keyboard and screen-reader support, a
designed reduced-motion path, graceful WebGL failure, and no performance
regression.

One qualification, and it is recorded rather than buried: the appearance of the
six finishes at the five camera angles has not been reviewed by eye, because the
automation harness could not produce a reliable frame. That is a review task,
not a build task — but it is a review that has to happen before anyone shows
this to a customer.

## **PXL PUBLICATION READY: NO**

Six business and content blockers remain, all of them things the yard has to
supply and none of them technical. `PXL.published` stays `false`, the experience
stays at `/preview`, and the code refuses — structurally, not by convention — to
state a price, a specification or an approved colour name until it has one.
