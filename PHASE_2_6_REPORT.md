# PHASE 2.6 — PXL CONFIGURATOR FOUNDATION

Phase 2.5 recovered a boat. Phase 2.6 built the product experience around it.

`public/models/PXL.glb` is untouched — same 303 kB, same 20,235 triangles, same
thirteen meshes, same origin. No geometry was remodelled, no pipeline was
restarted, no invented boat replaced the recovered one. What changed is
everything *around* the asset: semantic material roles, a single owned
configuration state, a shareable URL, an interpolated finish change, an authored
product composition on three device classes, and a documented contract for
replacing the console when the yard finally sends it.

---

## MODEL CONTRACT

Full table in **[PXL_CONFIGURATOR_MODEL_MAP.md](PXL_CONFIGURATOR_MODEL_MAP.md)**;
this is the summary.

### Mesh map — 13 meshes, 10 material roles

| Role | Meshes | Channel | Configurable |
|---|---|---|---|
| `EXTERIOR_HULL` | `hull_primary`, `deck_trim` | `hullPrimary` | **yes — six finishes** |
| `HULL_BOTTOM` | `hull_lower` | `hullLower` | yes, one finish |
| `STERN_MOULDING` | `transom_black` | `hullLower` | yes, one finish |
| `GUNWALE_CAPPING` | `hull_accent` | `hullAccent` | yes, one finish |
| `INTERIOR_LINER` | `deck_main` | `flooring` | yes, one finish |
| `CONSOLE` | `console_body`, `console_trim` | `console` | withheld — superseded revision |
| `HELM` | `helm_wheel` | — | no |
| `HARDWARE` | `rails` | `metal` | yes, one finish |
| `PROPULSION` | `motor`, `motor_trim` | `motor` | yes — never follows the hull |
| `COVER` | `accessory_cockpit_cover` | — | visibility only, **hidden by default** |

Roles are addressed as `finishForRole(config, 'EXTERIOR_HULL')`. Nothing anywhere
touches `materials[n]`, and `npm test` asserts the bindings.

### Roles the brief named that do not exist here

`INTERIOR_HULL`, `DECK` and `FLOOR` were not created. The hull is a
zero-thickness open shell — its inner face is the same triangles as its outer
face — and `deck_main` is one mesh carrying the liner, the sole and the inner
shell together. Two role names pointing at one material is a trap that fires the
first time somebody sets them differently. `STERN_ACCENT` exists as
`STERN_MOULDING`, renamed to what the part is.

### Uncertainties

- `deck_trim` (10 triangles) is painted with the topsides **on the assumption**
  that the renders show that; it has not been confirmed.
- The cognac inlay in the capping is not separable — it is inside `hull_accent`.
- `rails` is 40 triangles for two rails: indicative, not detailed.
- The outboard is not identifiable as any specific engine.
- `accessory_cockpit_cover` is in the STL and in none of the renders. Nobody has
  said whether it is a product.
- **The waterline is a visual calibration, not flotation data.** Measured off the
  design renders (freeboard 0.1665 of LOA at amidships). It does not account for
  load, fuel, crew or the outboard's weight aft.

---

## CONFIG STATE

### Schema

```
PxlConfiguration
├── exterior { hullPrimary · hullLower · hullAccent }
├── interior { flooring · console · metal }
├── propulsion { variant · finish }
└── equipment { <zone>: boolean }
```

### Categories — derived, not hard-coded

The UI maps over `PXL_AVAILABLE_CATEGORIES`. Today it finds one, so it renders
one: no disabled tabs, no "01 / 04", no future theatre.

| Category | Param | Status |
|---|---|---|
| `exterior` | `exterior` | **active — six finishes** |
| `upholstery` | `upholstery` | reserved · no seating geometry, no specification |
| `console` | `console` | reserved · the asset's console is the superseded revision |
| `engine` | `engine` | reserved · one unidentified outboard, no option list |
| `equipment` | `equipment` | reserved · no equipment list |
| `accessories` | `accessories` | reserved · no accessory range |

Reserved categories declare their parameter and their reason, and their `write`
is a no-op — asserted by test, so a reserved category cannot be half-enabled by
accident.

### URL format

```
/dev/pxl                      the default boat — a clean URL
/dev/pxl?exterior=navy        one choice, one parameter
/dev/pxl?exterior=navy&upholstery=…&engine=…      the shape it grows into
```

Slugs: `white` · `sage` · `black` · `warm-grey` · `gold` · `navy`.

- **One owner.** The query string is read once, on mount, by `pxlStore`.
  Everything after that is state → URL via `history.replaceState` — never
  `pushState`, so Back leaves the page instead of stepping through six swatch
  clicks. No reload, ever.
- **Only meaningful parameters are written.** A category on its default
  contributes nothing.
- **Invalid state fails safe and is corrected.** `?exterior=invalid-value&engine=v8`
  → the default boat, and both parameters are *deleted from the address bar*.
  Verified in the browser: the URL came back as `?render=always` with the boat on
  Sage Green. Unrelated parameters are preserved, so the link stays shareable.

---

## EXTERIOR COLOURS

Six, one per delivered colour study. **All names are provisional working names.
No RAL code, no manufacturer reference, no confirmed range** — `manufacturingCode`
is empty on every finish and a test asserts it stays empty until the yard
supplies one.

| Display name | Slug | Base (sRGB) | Rough | Metal | Clearcoat | CC rough | Source |
|---|---|---|---|---:|---:|---:|---:|---|
| White | `white` | `#dcdedb` | 0.24 | 0 | 0.62 | 0.10 | `pxl-water-white` |
| Sage Green | `sage` | `#61817b` | 0.24 | 0 | 0.62 | 0.10 | `pxl-water-sage` |
| Black | `black` | `#15181c` | 0.28 | 0 | 0.70 | 0.08 | `pxl-water-black` |
| Warm Grey | `warm-grey` | `#a49d95` | 0.26 | 0 | 0.58 | 0.11 | `pxl-water-warm-grey` |
| Gold | `gold` | `#8a7140` | 0.32 | 0.34 | 0.66 | 0.09 | `pxl-water-gold` |
| Navy | `navy` | `#1b3a5c` | 0.24 | 0 | 0.66 | 0.09 | `pxl-water-navy` |

Marine gelcoat over composite, not automotive metallic: low metalness, clearcoat
carrying the gloss, roughness carrying the soft wide highlight the reference
renders show. The gold is the one exception — 0.34 metalness, because a pigment
with flake in it darkens away from the light and lifts sharply toward it, and
without that range it renders as flat yellow plastic.

Every base colour is held well off zero (asserted by test): a black at `#000000`
produces no gradient under any light and the whole hull collapses into a
silhouette.

### Transition

Measured: **334 ms across 41 frames** for the widest traverse (Sage → Black),
smoothstep, no overshoot. Not a cut, not a wipe, not a dissolve. Interpolated in
the renderer's linear working space, which matters most on white → black and
anything → gold, where an sRGB blend passes through a washed-out midpoint that
neither endpoint contains.

The change writes to the existing `MeshPhysicalMaterial` instances. No material
is replaced, no shader recompiles, no geometry reloads, no GLB is re-fetched, and
the environment, the sun, the water and the camera do not move — same boat, same
light, different finish.

---

## CAMERA

| View | Preset | Exposed | Note |
|---|---|---|---|
| Three-quarter | `hero_3q` | ✅ default | the angle both delivered renders were composed from |
| Profile | `side` | ✅ | dead abeam; the shot design decisions are checked in |
| Bow | `bow_3q` | ✅ | |
| Stern | `stern_3q` | ✅ | the view where the outboard must visibly *not* follow the hull |
| Cockpit | `interior` | ✅ | the only view showing liner, sole and console together |
| Free | `free` | ✅ | a **mode**: adopts wherever the viewer has turned the boat and stops re-resolving on resize |
| Detail | `detail` | ❌ **withheld** | it frames the helm at close range — the one composition where the superseded console is unmissable |

Preset moves interpolate over **620–1180 ms scaled by angular change** — a 28°
nudge does not take as long as the 94° swing from bow to stern. Under reduced
motion the move is instant: measured, azimuth went 33.6° → 0° in a single frame.

### Framing — measured, not asserted

`pxlTelemetry` projects the vessel's bounding box through the live camera every
frame. Horizontal coverage across the full responsive matrix, all six views:

| Viewport | Stage | 3/4 | Profile | Bow | Stern | Cockpit | Clipping |
|---|---|---:|---:|---:|---:|---:|---|
| 2560×1440 | 1464×1276 (89% vh) | 78% | 78% | 68% | 74% | 82% | none |
| 1920×1080 | 1464×916 (85% vh) | 78% | 78% | 68% | 74% | 61% | none |
| 1440×900 | 1031×751 (83% vh) | 78% | 78% | 68% | 74% | 71% | none |
| 1280×800 | 917×668 (84% vh) | 78% | 78% | 69% | 75% | 82% | none |
| 1024×768 | 675×662 (86% vh) | 80% | 79% | 78% | 80% | 84% | none |
| 768×1024 | 736×529 (52% vh) | 79% | 79% | 77% | 80% | 63% | none |
| 844×390 | 584×370 (95% vh) | 80% | 79% | 78% | 80% | 55% | none |
| 430×932 | 398×474 (51% vh) | 80% | 79% | 78% | 80% | 84% | none |
| 390×844 | 358×438 (52% vh) | 80% | 79% | 78% | 80% | 84% | none |
| 320×568 | 296×274 (48% vh) | 80% | 79% | 78% | 80% | 80% | none |

**No clipping at any size, in any view.** Coverage sits in the 68–84% band the
brief asks for, except the cockpit view on the two shortest, widest slots, where
the vertical floor described below trades occupancy for a complete boat.

### A defect this phase found and fixed

The first pass **clipped the cockpit view at four of the ten sizes** — 1920×1080,
768×1024, 844×390 and 390×844 — with vertical coverage up to 112%. The cause was
architectural, not a bad number: the camera locks the *horizontal* field of view,
which is right for a hull seen broadside and wrong for a view looking down at 40°
where the projection is nearly square. On a wide, short slot the derived vertical
angle collapsed and the bow and transom left the frame.

The fix is a per-preset `minVfov`, declared and measured, applied by widening the
lens rather than pulling the camera back — distance is what a preset *composes*
with, and changing it would alter the shot's character on exactly the viewports
that are hardest to check. Only the cockpit view declares one (29°), and a test
asserts that no other preset has quietly acquired one.

### Orbit

Hand-written, not `OrbitControls`. Cannot pan, cannot pass the poles, cannot go
under the water, cannot push through the hull. Elevation −4° to 62°, distance
3.6 m to 26 m. Pinch-to-zoom added this phase, as a *ratio* of the current finger
spread to the starting spread, so releasing where you began returns exactly where
you began. Wheel zoom only claims the gesture when it will actually do something,
so the page still scrolls at the extremes.

---

## UI

### Desktop

Dominant stage, narrow rail. Product identity (`DUNA — PXL`), the selected
colour named in full, six swatches, the scope sentence, view controls
*underneath* the configuration (secondary, per the brief), then the CTA and copy
link. The rail never grows past 24 rem and the whole composition caps at 120 rem
and centres, so a 2560 px display gets a larger boat rather than a boat marooned
from its controls.

The swatch row is a six-column grid rather than wrapping flex — with flex it
broke 4 + 2 at 1440, and a range of six colours should not look like four
colours and a remainder.

### Portrait phone and tablet

Its own composition: identity, stage, tray. **The tray is capped at 38 dvh.**
The first build was content-sized and reached 570 px on an 844 px phone, leaving
the boat 205 px — 24% of the screen, an ecommerce thumbnail. Capping it is what
makes the stage's `1fr` mean anything; the stage now measures 52% of the viewport
at 390×844 and is by a wide margin the largest thing on screen. The view chips
scroll horizontally rather than wrapping. At ≤360 px the scope sentence, the CTA
note and the development block drop out.

### Landscape phone

`844×390` gets a genuinely different layout — the identity band is removed and
the tray becomes a 15 rem side rail, because height is the scarce axis there. The
stage takes **95% of the viewport height**.

---

## ACCESSIBILITY

- **Keyboard.** Fifteen tab stops, in order: skip link → six colour radios →
  six view radios → CTA → Copy link. Nothing extraneous; the site's overlay menu
  is `inert` on this route and does not intercept. Verified by enumerating
  focusable, non-inert, visible elements in the live page.
- **Touch.** Swatch cells are never smaller than 44 px in their short axis and
  stretch wider on a phone. One-finger orbit, pinch zoom, tap presets, tap
  swatches. No hover is required for anything.
- **Screen reader.** Swatches are `role="radio"` inside a labelled `radiogroup`,
  with accessible names `Exterior colour: Navy` and a real `aria-checked` — the
  selection is exposed semantically, not only as a ring. The selected colour is
  also printed in full as text and announced with `aria-live`. The canvas is
  never traversed: the stage is one `role="img"` node reading *"Interactive 3D
  view of the Duna PXL boat."*
- **Focus.** A 2 px `--signal` outline with 3 px offset on swatches, views, CTA
  and share — visible over water, over a black hull and over the rail.
- **Reduced motion.** Camera moves land in one frame (measured), material changes
  apply instantly, orbit is disabled, and every control still works — the presets
  provide the same views without the movement.
- **Safe areas.** The tray pads for `env(safe-area-inset-bottom)`; the landscape
  rail pads for `env(safe-area-inset-right)`.
- **Localisation.** Every UI string is in `src/content/pxlStrings.ts`, keyed by
  locale, with **EN and HU** both written. No new i18n system was built — there
  is nothing to build on yet — but no component holds a literal, so introducing
  routing changes no component. `PXL` is not a key and is never translated.

---

## PERFORMANCE

| | |
|---|---|
| **GLB** | 303 kB on disk · **259.6 kB over the wire** (measured, production) |
| **Triangles** | 20,235 in the asset · 20,534 drawn (cover hidden, backdrop added) |
| **Draw calls** | **14** — thirteen meshes plus the studio backdrop |
| **Textures** | 0 |
| **Homepage First Load JS** | **172 kB — unchanged** (11.8 kB route) |
| **Homepage transfer** | 17 JS files, 423.4 kB encoded · **zero PXL requests, no GLB** |
| **`/dev/pxl` First Load JS** | 269 kB (115 kB route chunk) |
| **`/dev/pxl` transfer** | 21 JS files, 460.3 kB encoded + 259.6 kB GLB |
| **Configurator's own cost** | ≈ 37 kB of JS beyond what the homepage already loads |
| **Compression** | meshopt retained — decoder ships inside three-stdlib, no extra request |
| **LOD** | none, and none needed at 20k triangles |

### Frame times

Interactive orbit, continuously dragging, 375×812 viewport at DPR 2, quality tier
resolved to **low**, renderer DPR clamped to 1.20:

```
mean 8.34 ms · median 8.30 ms · p95 9.40 ms · max 15.2 ms   (230 frames)
CPU per frame (renderer's own counter): 0.35 ms
```

The display caps at ~120 Hz, so these are display-limited rather than
GPU-limited; the p95 of 9.4 ms leaves comfortable headroom over a 16.7 ms
60 fps budget.

**This is not an Android measurement, and must not be quoted as one.** It is a
Mac desktop GPU running the *mobile composition* — mobile viewport, coarse
pointer, the same `low` quality profile and DPR clamp a phone would get. What it
demonstrates is that the mobile code path resolves correctly and costs little on
the CPU side. Real mid-range Android numbers still require a real mid-range
Android device, and **that measurement has still not been taken.**

### Memory

120 colour changes and 20 preset changes, back to back, then a settle:

```
heap before 115.15 MB → after 104.03 MB   (−11.12 MB; GC ran)
draw calls 14 → 14 · triangles 20,534 → 20,534
```

Nothing accumulated. Materials are written in place and never replaced, geometry
belongs to `useGLTF`'s cache and is never re-parsed.

### Idle

The PXL scene registers as *static* whenever nobody is touching it and there is
no water running, so the runtime draws it only when its box moves or the scene
explicitly asks for a frame. Every change that happens while the box is still —
the model arriving, a colour interpolating, a preset move running — requests its
own frames and stops when it is done.

---

## FALLBACKS

- **No WebGL.** The route detects it before mounting anything and serves a
  different screen: product identity, the studio's own colour study for the
  selected finish, the six swatches (which swap the render), and the same CTA.
  It says *"3D view unavailable"* and explains why. It claims no interactive
  configuration, because there is none. Verified with `?webgl=off`.
- **GLB fails to load, or the model never arrives.** The stage keeps the studio's
  profile render — a real picture of the real boat, and a perfectly respectable
  thing for the page to settle on permanently. Silent by construction: the scene
  only takes the slot once the model has resolved *and* several frames have been
  drawn.
- **Context lost.** The slot goes back to the still; when the context returns the
  scene repaints its materials and re-claims the slot.
- **Invalid configuration in the URL.** Falls back to the default boat and
  rewrites the address bar. Never preserved, never shown as selected.
- **Loading state.** A technical line — `PXL · LOADING` — over the still, in the
  site's mono voice, not a spinner. It clears on its own even if the model never
  arrives, because a permanent "loading" over a good render is worse than
  silence.

---

## PRODUCT TRUTH

| | |
|---|---|
| **Console revision** | `PXL_CONSOLE_CURRENT`. The asset carries the **STL revision** console — low, faceted, open. The six colour studies show a **later revision**: a tall glazed tower with its own `PXL` mark. Everything else agrees between them. Stated in code (`PXL_CONSOLE_REVISION`), on the development bench, and in the model map. The `console` category is withheld and the `detail` view is not exposed because of it. |
| **Branding** | **None placed.** `PXL` on the stern, `PXL` on the console and the `Duna` script on the topsides all appear in the renders and exist nowhere as geometry. No artwork, no placement dimensions. `branding.PXL` and `branding.DUNA` are reserved keys and nothing implements them. Decals or a UV overlay is the expected route; the model has no UVs yet, which is a prerequisite. |
| **Upholstery** | No geometry and no specification. The cockpit in the source is a bare moulded liner. It is given one restrained neutral presentation material — a `PLACEHOLDER_VISUAL_MATERIAL`, never offered as a choice. |
| **Glazing** | No geometry. The `glazing` channel is declared and unbound. Note that its eventual shape changed: the screen to model is a *tower*, not a windscreen. |
| **Engine** | One outboard, unidentifiable, no maker's marks, no option list. Its finish never follows the hull colour. |
| **Specifications** | None published. `PXL.specs` is nine entries all marked `available: false` with a stated reason. `SPECIFICATIONS PENDING` appears on the development bench only. |
| **Colour names** | Provisional working names. No RAL, no manufacturer code. |

---

## ANALYTICS

No analytics provider exists in this project, so **no events are fired**. The
contract is documented here so that adding one later is wiring, not design:

```
pxl_configurator_open      { locale }
pxl_colour_change          { from_slug, to_slug, view }
pxl_camera_preset          { preset, entered_free }
pxl_configuration_share    { query }
pxl_quote_start            { query, summary }
```

Every payload is derivable from state that already exists — `currentPxlQuery()`
and `summariseConfiguration()` — so no new tracking state is needed.

---

## VALIDATION

```
npm run typecheck   ✓  no TypeScript errors, no GLSL errors
npm run model       ✓  all checks passed — 13 meshes, 13 materials, 0 textures,
                       20,235 triangles, no duplicate geometry, no stray fragments,
                       no mannequin, one vessel
npm test            ✓  208 checks passed
npm run build       ✓  7 static pages, no regressions
```

`npm test` is new this phase. It covers URL parsing and serialisation, invalid
and reserved parameter rejection, round-tripping, slug uniqueness across the
whole palette, material-role resolution, the console swap set, preset existence
and limits, and the summary. It runs on plain node with no test framework — the
tested modules import nothing but each other, which is what makes that possible;
keep them that way.

### Configurator validation

All six exterior states load, select, update the URL, survive a reload and
restore. Copy link writes the full permalink including unrelated parameters.
All six views reachable, no clipping at ten viewport sizes. Touch orbit and pinch
work. Header, navigation, language switch, CTA and footer all remain clickable —
hit-testing at a rail control's centre returns that control, not the canvas.

### One defect fixed in passing

A hydration mismatch on the CTA. The store handed React a *copy* of the default
configuration on the client and the original on the server —
`useSyncExternalStore` compares by identity, concluded the external data had
changed mid-hydration, and re-rendered a subtree that also reads
`window.location`. Fixed at the root by sharing one deep-frozen default object
across the server and every client, rather than by suppressing the warning.
A clean load now produces zero console errors.

### One development affordance added

`?render=always` keeps the render loop drawing while `document.hidden` is true,
on the same terms as the existing `?webgl=off` and `?motion=reduce`: development
only, stripped from production builds, reachable only on purpose. Without it an
automated browser — which is permanently "backgrounded" as far as the page is
concerned — can never capture the scene, and every review frame comes back
showing the static fallback.

---

## PUBLICATION

**`PXL.published` is `false`, and stays false.** `/boats/pxl` is a reserved
route, not a built one. `/dev/pxl` is `noindex`, linked from nothing, and carries
development notices that must never reach a customer surface.

What still blocks production publication:

1. **Verified specifications** — LOA, beam, draft, weight, capacity, power,
   speed, CE category. All nine are unpublished.
2. **The production console.** The asset is the superseded revision. Until it is
   replaced, the configurator is showing a boat that differs from the renders the
   yard's own colour studies were made from.
3. **Approved colour names**, and paint codes if any exist.
4. **Branding artwork and placement dimensions** — plus UV generation, which is a
   prerequisite for either.
5. **A sales CTA destination.** The current CTA is an honest `mailto:` carrying
   the configuration and the permalink to the published address. It is a real
   action with a real destination, and it is not an enquiry flow.
6. **Product approval** that any of this may be shown at all.

None of the six is a technical blocker. All six are things the yard has to send.

---

## IS THE PXL CONFIGURATOR FOUNDATION READY?

**YES.**

**PXL CONFIGURATOR FOUNDATION LOCKED.**

Upholstery, engines, accessories and cabin configuration are not started, and
will not be started without verified product data.
