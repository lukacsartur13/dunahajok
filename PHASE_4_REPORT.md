# PHASE FOUR — REPORT

PXL configurator expansion, and the multi-page Duna Boats site.

---

## A. EXISTING PROJECT AUDIT

Carried out before anything was written. §B1.

**Routes that existed.** Five, of which one was public.

| Route | State |
|---|---|
| `/` | The complete Phase One homepage — ten sections, WebGL hero |
| `/preview/pxl` | PXL editorial page, noindex, linked from nothing |
| `/preview/pxl/configure` | The Phase Three configurator, one category |
| `/dev/pxl` | The model bench |
| `/robots.txt`, `/sitemap.xml` | One URL in the sitemap |

**Navigation destinations without pages.** All of them. `NAV` in
`content/site.ts` declared six sections with sixteen children, every one
carrying `phase: 2` and an `href` pointing at a homepage anchor. Fourteen of the
sixteen resolved to a `#section` on `/`.

**Content already typed and sourced.** `boats.ts` (both 6.1s, verbatim specs,
prices held back), `story.ts` (five milestones, four awards, one flagged source
conflict), `site.ts` (contact, socials, languages, legal), `pxl.ts` (the
unannounced product), `publication.ts` (the disallow list), plus 26 processed
media assets with dimensions, alt text and LQIPs in `media.generated.ts`.

**Content available from the old Duna site but NOT yet transcribed.** Anything
about individual commissions, a news feed, a Suzuki model range, or the HU/DE/SK
copy. The audit's most consequential finding is a negative one: the source site
publishes no project archive and no journal, which is what determines the shape
of two of the routes below.

**WebGL infrastructure.** One canvas at the document root, `SceneSlot`
publishing boxes, `sceneRegistry` publishing scenes, `StageRuntime` scissoring
each scene to its slot. Two scenes registered — the hero and the PXL product
scene. Untouched by this phase except where the PXL vessel is built.

**Duplicate files.** 29 iCloud conflict copies (`layout 2.tsx` and friends) were
present, gitignored, and being type-checked. Removed.

---

## B. CONFIGURATOR SCHEMA EXPANSION

The central structural change is that the **option list and the schema are now
separate files**, because Phase Four's option list is the part most likely to be
replaced wholesale.

```
pxlCatalog.ts   WHAT MAY BE CHOSEN.  Provisional. Replaceable. The only
                module that knows a colour is called Cognac.
pxlConfig.ts    WHAT A CONFIGURATION IS.  Shape, field accessors, URL format,
                summary, material resolution. Stable.
```

The seam is `PxlConfigField`: the catalogue declares which field each control
writes, `pxlConfig` declares how each field is read and written, and TypeScript
checks the two sets match. A control pointing at a field with no accessor does
not compile.

**CATEGORY → CONTROL → OPTION**, all three data. Four categories, six controls:

| Category | Controls | URL keys | Options |
|---|---|---|---|
| 01 EXTERIOR | Finish | `exterior` | 6 |
| 02 HULL | Lower hull | `lower` | 2 |
| 03 INTERIOR | Cockpit · Console · Surface | `interior` `console` `surface` | 5 · 3 · 2 |
| 04 PROPULSION | Drive | `propulsion` | 4 |

**Provisional metadata on every option** (§A1): `id`, `category`, `slug`,
`previewLabel`, `approvedLabel`, `published`, `provisional`, `sortOrder`,
`swatch`, plus at most one of `finishId` / `lowerTreatment` / `interiorSurface`
/ `geometryVariant`, plus a `note` recording what specifically has to be
confirmed before it can be published.

**The provisional guarantee is computed, not asserted.**
`PXL_CATALOGUE_IS_PROVISIONAL` is derived from the data, so it cannot say
"approved" until the data is. `PXL_CATALOGUE_FORBIDDEN` is a list of patterns —
hp, kW, knots, km/h, range, currency, and seven manufacturer names — that the
test suite runs against every customer-visible string the catalogue can produce.

**EQUIPMENT is in `PXL_DEFERRED_CATEGORIES`, not in `PXL_CATEGORIES`.** Nothing
in the interface iterates the deferred array, so it cannot become a tab, a
count, or a greyed control. §A2's "do not call them 01/05 if only four exist" is
structural: the index a category shows is its position among the categories that
exist.

---

## C. LOWER HULL OPTION

§A4. **DARK LOWER** (default, the treatment in all six delivered studies) and
**FULL BODY COLOUR**.

**It is a treatment, not a colour.** The obvious implementation is a second
finish field, and it is wrong: FULL BODY COLOUR does not mean "the bottom is
sage", it means "the bottom is whatever the topsides are". Stored as a finish
the two are independent — change the exterior to navy and the bottom stays sage.
Stored as a treatment, the relationship is a fact of the schema:

```ts
case "hullLower":
  return config.exterior.lowerTreatment === "body"
    ? config.exterior.hullPrimary
    : PXL_STRUCTURE_FINISHES[0].id;
```

**Nothing is hidden.** Asserted zone by zone: `zoneVisible` is identical under
both treatments for all thirteen zones. The difference is one material's colour
on `hull_lower` — 7,187 triangles of bottom below the chine.

**The stern moulding was split off the `hullLower` channel to make this
possible.** It carries the PXL mark; repainting it would take the mark's own
ground away and turn a paint option into a branding change. `sternMoulding` is
now its own channel bound to `transom_black`, and the gunwale capping keeps its
own. The result reads as a legitimately painted full-body hull rather than a
missing piece.

## Lower-hull transition — §A5

`HULL_BOTTOM` joined `EXTERIOR_HULL` on the existing Duna Line sweep. Same
basis, same 0.52 s, same 6.5°-derived rake. Changing the treatment *and* the
exterior finish together therefore paints topsides and bottom behind one
travelling boundary, which is what a hull being repainted looks like. No new
material, no duplicate geometry, no hard cut.

---

## D. INTERIOR OPTIONS

§A6–§A9. Three controls.

**What it is applied to, and the limit that was respected.** The source STL has
no cushions. `deck_main` is one mesh carrying the cockpit liner, the sole and
the inner faces of the shell. So the category does not offer upholstery, does
not use the word — asserted: no catalogue string matches `/upholster/i` — and
does not split one mesh into three imaginary controls. It offers the two
surfaces that are genuinely separate meshes with separate materials:

- **Cockpit** (`interiorPrimary` → `deck_main`) — Light · Sand · Cognac ·
  Graphite · Black. Cognac is the default, read off the delivered renders.
- **Console** (`interiorSecondary` → `console_body`, `console_trim`) — Graphite
  · Black · Stone.
- **Surface** — Smooth · Grained.

The old `upholsteryPrimary` / `upholsterySecondary` channels are **gone from
`PXL_UNSUPPORTED_CHANNELS`, and not because upholstery arrived**. A channel
named after a cushion and bound to a moulding is a lie the material system would
repeat in every summary, payload and share link.

**Material response — §A9.** Interior finishes carry no clearcoat (asserted),
roughness 0.78–0.86, sheen 0.30–0.42 with its own tint, and a micro-normal
amplitude. Sheen is the term that matters: a physical material at high roughness
with no sheen goes *flat*, and a dark upholstery loses its form entirely. The
two ends are set inside their failure modes — black at `#1d1f21` rather than
zero so shadowed folds separate; light at `#d5cfc3` rather than near-white so a
studio key does not clip it. Cognac is held at a lower chroma and a much higher
roughness than the lacquered rail inlay beside it, which is the difference
between leather and orange plastic.

**§A8's material character, and why there are two.** The model has **no UV set
on any mesh** — the source is an STL. A normal map was therefore unavailable,
and three options were considered: generate UVs at load (wrong for a mesh
containing a horizontal sole and near-vertical shell faces — any planar
projection streaks two thirds of it), re-export with UVs (correct, unavailable
this phase, filed as an asset requirement), or **triplanar projection**. The
third is implemented: `src/webgl/glsl/pxlGrain.ts` samples one procedurally
generated 128×128 normal map three times, once down each object axis, blended by
the surface normal with the whiteout form. No UVs, no seams, no stretching, three
texture fetches on two zones.

SMOOTH and GRAINED differ by a roughness multiplier (0.89 / 1.0) and a grain
amplitude multiplier (0.34 / 1.0). Both are things a boatbuilder does to one
moulding. Leather-versus-fabric was not offered, because there is no geometry
for stitching, no map for a weave, and inventing the difference in a slider is
exactly the misleading option count §A8 rules out.

---

## E. PXL BRANDING

§A10–§A12.

**Artwork: none exists.** The delivery is an STL and seven raster renders. There
is no vector, no font file and no brand sheet, and `public/media/brand-mark.webp`
is a photograph of workshop signage rather than a logo asset.

**Implementation: authored geometry.** Three letterforms as `THREE.Shape`
outlines — a P with a counter as a hole, a twelve-vertex cross whose notches are
the computed intersections of the two bars' edges, and an L — assembled into a
lockup at cap height 1 and scaled to 92 mm. §A10 lists lightweight geometry among
the acceptable implementations and it is the best one here: resolution-
independent at the closest orbit, ~90 triangles, one draw call per side, and no
dependence on font loading (the canvas approach silently gets the fallback face
on some proportion of visits).

**Placement is found, not assumed.** The mark is placed by raycasting inboard
from outside the beam at an authored `(x, y)`, taking the surface point and the
face normal from the real stern moulding. Measured result:

```
side        x       y       z    width   normal·z
starboard  -2.110   0.331   1.010   0.182    0.985
port       -2.110   0.331  -1.009   0.183   -0.981
```

Both inside the moulding's box (x ∈ [−2.6266, −1.8108], y ∈ [−0.2034, 0.6275]),
both above the waterline, both facing outboard, correctly mirrored — the basis
`right = up × n` gives +X to starboard and −X to port, so the lockup reads
bow-ward from one beam and stern-ward from the other, which is the same thing
seen from either side.

**Contrast — §A11.** Two ink treatments, cognac and graphite, selected on the
ground's linear luminance at a 0.18 threshold. No outline, no drop shadow — an
ink treatment is a colour and three surface parameters and there is no field on
it that could carry an effect. **With the current placement the ground never
changes**, because the mark sits on the structural moulding and FULL BODY COLOUR
deliberately leaves it alone; the selection still runs, on the moulding's real
finish, and is asserted across all six hull finishes × both treatments so that a
future moulding option cannot silently produce an unreadable mark.

**Duna branding — §A12: declared and empty.** The renders show a script "Duna"
logotype on the gunwale capping. It is **not** reproduced. A script logotype is a
drawing, not three geometric letters; approximating it by hand produces something
recognisably meant to be Duna's mark and recognisably not, and a wrong logotype
on a manufacturer's own boat is worse than an absent one. `PXL_DECAL_SLOTS`
declares the slot, its zone and the reason. ASSET_REQUIREMENTS.md carries the
vector as P0. One mark per side and nothing else — `PXL_MAX_MARKS_PER_SIDE = 1`,
so a third slot is a decision against a stated limit.

---

## F. PROPULSION PROXY SYSTEM

§A13–§A16. Four drives, built at runtime from primitives, in
`src/webgl/scenes/pxl/pxlPropulsion.ts`.

**Why built rather than modified.** The delivered STL contains one outboard, 346
triangles, unidentified. Scaling it is §A15's exact failure — an outboard's
cowling, leg, gearcase and propeller do not grow together, and multiplying one
mesh by 1.4 gives a comic propeller and a leg on the riverbed. It is also
somebody's product, and stretching an unidentified manufacturer's silhouette into
three "sizes" for a customer is a stronger claim than leaving it alone. The
delivered zones are kept, keep their role and their channel, and are switched off
with `visibleByDefault: false` — one flag from coming back.

**Measured result** (`npm run vessel`):

```
drive       tris     len     hgt     wid    fwd-most   deepest
compact     1520   0.542   1.185   0.325  -2.627   -0.122
standard    1520   0.651   1.398   0.382  -2.627   -0.228
large       1520   0.782   1.599   0.435  -2.627   -0.305
electric    1520   0.536   1.252   0.297  -2.627   -0.249
```

**The progression is non-uniform, and it is asserted.** Across the three
combustion drives the cowling gains 71% in length and 34% in width; the shaft
lengthens by 22% while the gearcase lengthens by 23%; the propeller grows 38%;
the corner radius *tightens* from 0.30 to 0.26 because a larger moulding carries
a proportionally smaller radius. The tests fail if the length and width ratios
converge — a future edit that "simplifies" the table into a scale factor breaks
the build.

**Mounting — §A16.** Every drive's forward-most point is exactly the transom
plane at −2.6266 m. That was **not** true on the first run: the bevel on the
bracket's extrusion pushed 12 mm of clamp inside the hull, where it is invisible
from every camera preset. `npm run vessel` found it, and the fix measures the
built bounding box and seats the assembly rather than compensating in the
bracket's own position. Anti-ventilation plates land between 0.03 m above and
0.10 m below the waterline; every propeller is submerged; nothing intersects the
hull, the rails or the deck (all aft of the transom by construction).

---

## G. ELECTRIC PROPULSION

§A17. A different object, not a smaller one.

Everything §A17 rules out is absent: no blue, no neon, no lightning, no glowing
battery, no sci-fi. What is left is the only honest difference — an electric
drive has no engine block, no airbox and no exhaust, so its cowling is a shell
rather than a cover.

| | compact | electric |
|---|---|---|
| Cowling width | 0.325 | **0.245** |
| Height / width ratio | 1.23 | **1.49** |
| Corner radius | 0.30 | **0.10** |
| Cowling finish | Outboard black | Drive graphite |

Narrower, taller for its width, and machined to a radius less than half the
smallest combustion drive's — a technical shell against three moulded covers. It
also reaches deeper than the compact drive: the mass is in the leg, not on the
transom. In the interface its swatch is an outline where the others are fills,
which is the one place the difference in kind is stated rather than only shown.

**No claim is made about it.** No kW, no range, no brand, no model. Duna builds
electric boats; no electric drive has been specified for the PXL and none is
depicted.

---

## H. CONFIGURATOR UI CHANGES

§A25, §A26. The rail became **two layers**.

Phase Three's rail was one row because there was one category. Four categories
and six controls flattened into one row is twenty-two controls across the bottom
of a product shot — §A25's "giant form". So: a low horizontal category
navigation (one line, four words, hairline underline on the current one), then
the open category's controls beside the actions. One category open at a time.
Measured at 1440×900 the whole interface is 190 px of a 900 px viewport.

- **Desktop** — horizontal, low-profile, as §A25 prefers.
- **Portrait phone** — the rail stacks into a tray capped at 34dvh; the category
  navigation scrolls horizontally rather than wrapping 3 + 1; the actions take
  their own row so the CTA stays a full-width target.
- **Landscape phone** — one row below the categories, group headings dropped,
  the snapshot control dropped (secondary, and it has an equivalent in the share
  link); the CTA never shrinks.

**One option control for all four categories.** `PxlSwatches` renders whatever
`PxlCatalogOption.swatch` declares: a lit colour disc, a disc split at the chine
whose lower band is the live exterior finish under FULL BODY COLOUR, or a
proportional mark whose **area** is the drive's cowling volume relative to the
largest. Area rather than height — the eye compares areas, and a bar chart of
engine sizes overstates the difference by a square root.

**Camera — §A19, §A26.** Opening a category suggests its composition **once**:
EXTERIOR → hero three-quarter, HULL → profile (the chine is a sliver from any
higher angle), INTERIOR → cockpit, PROPULSION → stern three-quarter. Never on
re-entry, never on a change within a category, and never at all once the viewer
has orbited or under reduced motion. Changing drive does not move the camera.

**Drive transition — §A18.** A crossfade with a 60 mm vertical lift: the
outgoing drive fades and settles, the incoming one rises out of the same 60 mm,
overlapping through the middle third. 0.42 s. Morphing was unavailable — two
proxies have no vertex correspondence — and would have looked like melting.
Materials are `transparent: true` from birth at opacity 1, so the crossfade does
not flip a shader define and force a recompile on the frame it starts.

---

## I. URL / SHARE STATE EXPANSION

§A21, §A22. Six keys, all short and deterministic:

```
?exterior=navy&lower=body&interior=light&console=black&surface=smooth&propulsion=electric
```

Only non-default controls are written, so the delivered boat's URL is clean and
a shared link contains only the choices someone actually made.

**Invalid values sanitise independently.** The parse loop never breaks and never
bails; each control resolves against its own parameter and falls back to its own
default. Asserted:

```
?exterior=navy&lower=chartreuse&interior=cognac&propulsion=electric
→ navy hull, electric drive, cognac interior, DEFAULT lower treatment
→ rejected: ["lower"]
```

Four correct choices survive a fifth being nonsense — which matters, because the
URLs that arrive broken are the ones somebody forwarded, truncated in a chat
client, or hand-edited. Rejected parameters are also *removed from the address
bar*, so a bad link cannot be forwarded on still looking valid.

**Reserved names are rejected, not ignored** — `?equipment=…` is cleared rather
than sitting there implying a control the interface does not have.

**RESET** restores every control to the one defined preview default, with no page
reload, no GLB reload, and unrelated query parameters preserved. The camera and
the open category deliberately stay where they are: someone who has turned the
boat to look at the transom and then reset the configuration has not asked to be
moved.

---

## J. CONFIGURATOR PERFORMANCE

| | Phase Three | Phase Four |
|---|---|---|
| GLB requests per configuration change | 0 | 0 |
| Material objects allocated per change | 0 | 0 |
| Shader recompiles per change | 0 | 0 |
| Vessel triangles | 20,235 | 20,235 − 383 (source motor hidden) + 1,520 (one drive) + ~90 (marks) ≈ **21,462** |
| Drives cached after visiting all four | — | 6,080 triangles, 8 materials |
| `/preview/pxl/configure` First Load JS | — | **280 kB** |
| Public editorial route First Load JS | — | **162–165 kB** |

**No recompile, and the three ways that could have happened were each closed:**

1. The **sweep** is installed at load, before first compile (Phase Three).
2. The **grain** is installed the same way; a surface change writes one float.
3. **Sheen** is floored at `1e-3` on the liner at index time, because three
   decides `USE_SHEEN` from `material.sheen > 0` when it *builds* the program — a
   material that starts at zero and gains sheen later recompiles mid-interaction.
4. **Drive materials** declare `transparent: true` at construction rather than at
   the moment a crossfade starts.

The grain costs three texture fetches per fragment on two zones and nothing on
the other eleven. Its map is 128×128 RGBA = 64 KB, generated once, deterministic
(a fixed integer scramble, not `Math.random`) so a snapshot of one configuration
is identical on every machine.

---

## K. COMPLETE ROUTE ARCHITECTURE

See **SITE_ARCHITECTURE.md** for the full table. Summary: 16 public routes built
(14 pages + robots + sitemap), 2 dynamic templates built with zero entries, 3
unindexed PXL routes, 2 reserved PXL routes not built.

The route table is `src/content/routes.ts`, and it is load-bearing rather than
documentation: the sitemap maps over it, the page metadata builder takes its
canonical from it, and `npm test` asserts that every navigation destination
resolves to a declared route and that no declared route falls under a disallowed
prefix.

---

## L. PAGES BUILT

| Page | Movements | Notes |
|---|---|---|
| Boats overview | 2 bands + tail | Alternating ground, PXL filtered on `published` server-side |
| Cabin | 9 | Pinned interior reveal |
| Kadét | 7 | Scroll-drawn sheer line, specs placed early |
| Craft — Design | 5 | Two full-bleed |
| Craft — Manufacturing | 3 | River-dark |
| Craft — Materials | 4 macro bands | No movements — §B9 wants macros, not headings |
| Story — Heritage | 5 dates | Continuous spine, marker material per era |
| Story — Awards | 4 | Typographic only |
| Suzuki Marine | 3 + service block | No borrowed brand assets |
| Projects | 4 capabilities | Case-study grid present, empty |
| Journal | index | Empty-state notice |
| Contact | details + form | Details above the form |
| Private viewing | form | Boat selector, PXL filtered |

---

## M. PAGE-SPECIFIC ART DIRECTION

§B22. Five tones, each changing a ground, a rule and a weight — never the
typeface, the scale, the rake or the motion curve. See SITE_ARCHITECTURE.md §5.

**Cabin vs Kadét is the test case**, because §B5 explicitly forbids duplicating
one into the other. The differences are structural rather than cosmetic:

| | Cabin | Kadét |
|---|---|---|
| Movements | 9 | 7, and shorter |
| Alternation starts | left — composed | right — the eye is thrown across the measure |
| Ground | warm paper | river-dark |
| Signature | pinned reveal, one viewport | scroll-drawn line, never stops the scroll |
| Specifications | late — the payoff | early — part of the argument |
| Full-bleed plates | 1 | 1, plus a raked-both-edges frame used nowhere else |

Nothing in the CSS changed to produce the alternation difference; it is the
`side` prop's starting parity.

---

## N. NAVIGATION CHANGES

§B19, §B20. One tree in `content/site.ts`; header, overlay and footer all read
it.

- **Header** gained the seven top-level sections, centred, in the technical
  face, with a hairline under the current one. Shown at ≥76rem only — below
  that the overlay carries everything, and a floating bar that has grown a
  horizontal scroller has stopped being furniture.
- **Overlay** — the plate is now `NavNode.plate` rather than a
  `Record<label, MediaId>` lookup. The old lookup was keyed on English labels
  and would have silently missed on every entry the day the menu was
  translated, showing one image for all seven.
- All navigation moved from `<a>` to `<Link>`, so the route transition has
  client-side navigations to run on.
- **PXL is absent from all three**, and from the sitemap. Asserted.

---

## O. PAGE TRANSITIONS

§B21. A raked veil sweeping across the viewport at the Duna Line's angle:
240 ms cover, 60 ms hold, 260 ms uncover — **560 ms**, inside the 400–800 ms
target.

**It is a visual event, not a gate.** The veil is `position: fixed`,
`pointer-events: none`, `aria-hidden`, and the new page is mounted, painted and
interactive underneath it the whole time. That is what keeps back/forward
responsive by construction rather than by testing: the browser's own navigation
is never waiting on an animation.

It does not run on the first paint (the preloader owns the arrival), does not
run on or off the immersive configurator routes (which compose their own
entrance), and does nothing at all under reduced motion — a route change is
navigation, and the honest response to a request for less motion is to stop
moving rather than to move more slowly.

---

## P. LOCALIZATION

§B24. **Single-locale (EN), architecture prepared, routing not built.** Full
state in SITE_ARCHITECTURE.md §3.

What was done: every new page's content is a typed module with no strings in the
component tree. What was deliberately **not** done: routing, chrome string
extraction, and any auto-translation — §B24 says not to auto-translate factual
content without checking the existing sources, and the legacy HU/DE/SK pages have
not been read.

`hreflang` is emitted on `/` only. Claiming an alternate for `/craft/design` that
resolves to a different site's home page would be worse than claiming none.

---

## Q. SEO

Every public page carries a unique title, a unique description, a canonical
derived from the route table, OG and Twitter metadata, and exactly one `<h1>`.

**One finding worth recording.** The first sweep of all fourteen routes returned
`h1: 0` on every new page. `DisplayLines` defaults to `h2` — correct for a
homepage section headline, wrong for a page's own heading — so every new route
shipped with its largest type as an `h2` and no `h1` at all. It is invisible in
every screenshot and was found by counting headings across the route list. Fixed;
worth repeating whenever a page type is added.

Structured data: Organization + Product on the homepage (Phase One), `Article` on
the journal template. Product schema is **not** emitted on the Cabin and Kadét
pages, because the fields that would make it useful — price, availability — are
the ones deliberately not published.

`robots.txt` disallows `/dev/` and `/preview/`; both also send `noindex,
nofollow, nosnippet, noimageindex, noarchive` themselves. The sitemap is derived
from built-and-indexable routes, so there is no edit to it that could add an
unannounced product.

---

## R. FORMS / CONTACT

§B17, §B18. Three intents, three destinations, one component.

`/contact` puts the **details above the form** — most people who reach a
boatbuilder's contact page want a telephone number, and a form above it is a
decision to prefer a lead over a customer. `/contact/private-viewing` is §B18's
flow as field order (boat · details · timing · message), not as a four-step
wizard: a wizard for four fields is three extra clicks and a lost enquiry on
every back button.

**Nothing is sent by this site, and it says so.** There is no endpoint — the site
is a static export with no server runtime, no CRM and no approved recipient. The
form composes the message, **shows it**, and hands it to the visitor's own mail
client addressed to the yard's published address. The button says "Open in
mail", which is what it does; it never says "Send", because this page cannot.

The message is displayed rather than hidden because a form that opens a mail
window with text the visitor has not read is a form that sends things in their
name. Verified end to end in the browser: filling the private-viewing form
produces the composed message and a correct `mailto:info@dunahajok.hu`.

Connecting a real backend is changing `ENQUIRY_DESTINATION` in `lib/enquiry.ts`
to an `endpoint`. The payload builder and the UI branch already exist.

---

## S. ASSET GAPS

Full list with priorities in **ASSET_REQUIREMENTS.md**. The four that most limit
this phase:

- **P0 · the Duna script logotype, as a vector.** Blocks §A12 entirely.
- **P0 · the PXL model with a UV set.** The triplanar grain is a workaround for
  an asset that has no texture coordinates on any mesh.
- **P0 · Awards photography.** The Awards page carries no imagery at all,
  because the library contains no trophy, certificate, ceremony or jury shot,
  and §B29 is explicit that generic stock is not the answer. The page is
  typographic by necessity as much as by design.
- **P1 · Manufacturing photography.** Three movements is what the two workshop
  photographs support. It should be six.

---

## T. RESPONSIVE QA

Verified at 375, 390, 430, 768, 1024, 1440, 1728.

- All fourteen routes: 200, one `<h1>`, no horizontal overflow
  (`scrollWidth === innerWidth`).
- Header sections collapse below 76rem; overlay carries everything.
- Movements go single-column below 60rem with the media always leading —
  alternating sides is a wide-screen rhythm and becomes an unpredictable order
  in one column.
- Configurator: three authored compositions (desktop rail, portrait tray capped
  at 34dvh, landscape single row), measured with the rail's real height
  published as `--rail-height` by a `ResizeObserver`.

**One limitation to state plainly.** The Browser pane this was verified in
reports `document.hidden === true`, which throttles `requestAnimationFrame` to
near zero. That freezes the render loop and the GSAP `ScrollTrigger` reveals, so
**scroll-triggered content and the live WebGL scene could not be captured in a
screenshot in this environment**. What was verified instead: static composition
at every breakpoint above the fold, DOM structure and heading order on every
route, the enquiry flow end to end, and — for the parts of the vessel that are
built rather than exported — headless geometry validation against the real GLB
(`npm run vessel`), which is stronger evidence than a screenshot for mounting,
clearance and decal placement. A visual pass on the configurator and on
scroll-driven sections on a foreground browser remains outstanding.

---

## U. PERFORMANCE QA

```
Route                          Size  First Load JS
/                           13.5 kB         172 kB
/boats                      4.07 kB         163 kB
/boats/duna-61-cabin          226 B         164 kB
/craft/materials            3.34 kB         165 kB
/story/heritage             3.59 kB         162 kB
/contact                      139 B         165 kB
/preview/pxl/configure      7.92 kB         280 kB   ← the only heavy route
/dev/pxl                     5.3 kB         274 kB
shared by all                               103 kB
```

**WebGL is on the routes that use it.** Every public editorial route is
162–165 kB; the configurator is 280 kB. §B26's specific requirement — homepage
PXL GLB requests = zero — holds, and no editorial route requests a GLB either
(verified in the network panel on `/boats/duna-61-cabin`).

`npm run build` produces 22 static pages with no server runtime.

---

## V. REMAINING BUSINESS BLOCKERS

Unchanged from Phase Three unless noted.

1. **No approved colour, interior or drive names.** Every option in the
   catalogue is provisional; `finishLabel(f, "public")` and
   `optionLabel(o, "public")` both answer null for all of them, so a public
   surface built on this data prints no names at all.
2. **No PXL specification.** Length, beam, draft, weight, capacity, power,
   speed, CE category and price are all unpublished. `published: false` stands.
3. **No approved sales destination** for a configured request.
4. **No form endpoint** for site enquiries. *(New in Phase Four.)*
5. **No Suzuki engine range or model list**, and **no licensed Suzuki brand
   assets**. The section uses the name and no visual identity. *(New.)*
6. **No project case studies.** The capability is verified; no individual
   commission has been published, and none was invented. *(New.)*
7. **No journal content.** *(New.)*
8. **One unresolved source conflict** — the Kadét's Hungarian Design Award year.
   Carried as `year: null`, printed without a year on the Awards page and
   omitted from the Heritage chronicle entirely.
9. **The Cabin and Kadét prices are published by the yard and deliberately not
   rendered.** Held in `boats.ts`; the specification blocks say why.

---

## W. WHAT SEPARATES THIS FROM AWWWARDS SUBMISSION READINESS

Not polish. Four specific gaps.

**1. Content depth on three of the fourteen routes.** Projects has no case
studies and Journal has no articles, and both say so honestly. That is the right
engineering decision and it is still a judge landing on a page whose main content
is an explanation of why there is no main content. **This is a client content
task, not a build task** — the architecture is complete and typed, and the first
project or article is an object in `content/editorial.ts`.

**2. Photography.** The site is built on 26 processed images from a WordPress
library, and it shows in three places: Manufacturing is three movements because
two workshop photographs is what exists; Awards has no imagery at all; Materials
covers four surfaces because glass and composite have none. §B29 was followed —
no generic yacht stock was used to fill any of it — which means the gaps are
visible as restraint rather than hidden as filler. A commissioned shoot is the
single highest-leverage thing left.

**3. The configurator's front door is closed.** The strongest thing on this site
is a route no visitor can reach, because the product is unannounced. An Awwwards
submission that links to `/preview/pxl/configure` is submitting an unindexed
staging URL for an unlaunched boat, and one that does not link to it is
submitting a site whose best work is invisible. **This is a launch-timing
decision for the yard, and it is the biggest single blocker.**

**4. The visual pass that this environment could not do.** Section T states the
limitation. The scroll-driven reveals, the pinned Cabin transition, the Kadét
line, the route veil and the entire live WebGL scene — including everything
Part A added — have been verified structurally, geometrically and by test, but
not watched. That is a real gap for a submission judged substantially on motion,
and it is an hour's work on a foreground browser rather than a rebuild.

**What is genuinely ready.** Design and Creativity are strong: the configurator
now has real depth, the site has a coherent system with per-route emphasis rather
than thirteen variations of one template, and the Duna Line, the wake and the
material language hold across every route. Usability is sound — one `<h1>` per
page, real form semantics, a roving-tabindex radiogroup, 44 px targets, reduced
motion honoured everywhere, no horizontal overflow at any tested width. Content
is where the gap is, and it is the client's to close.

---

## FINAL VERIFICATION

```
npm run typecheck   ✓  GLSL literals clean · tsc --noEmit clean
npm run model       ✓  all checks passed · 13 zones · 20,235 tris
npm run vessel      ✓  125 checks passed · 4 drives · 2 marks placed
npm test            ✓  1,460 checks passed · 18 groups
npm run build       ✓  22 static pages
```

Confirmed:

- **PXL remains unpublished.** `PXL.published === false`; preview routes
  disallowed and `noindex`; absent from the navigation, the footer, the menu,
  the sitemap, the Boats overview and the private-viewing selector — each by a
  `published` check rather than by omission.
- **Preview configuration options are isolated from approved product data.**
  `pxlCatalog.ts` is the only module declaring what may be chosen; every option
  carries `provisional: true`, `published: false` and `approvedLabel: null`;
  `PXL_CATALOGUE_IS_PROVISIONAL` is computed from the data.
- **No fake horsepower, price, performance specification or branded engine
  model.** `PXL_CATALOGUE_FORBIDDEN` is run against every customer-visible
  catalogue string by the test suite, and the Suzuki section is scanned
  separately for partnership, collaboration, endorsement and model-number
  language.

---

**PXL CONFIGURATOR DEPTH READY: YES**

Exterior (6) · dark lower / full body colour · interior (5 + 3 + 2) · PXL side
branding on both beams · four visibly different drives · electric option ·
camera-aware category presentation · full URL, share and reset state.

**FULL DUNA SITE FOUNDATION READY: YES**

Fourteen public pages across boats, Cabin, Kadét, craft, story, Suzuki Marine,
projects, journal architecture and contact, with real navigation, route
transitions, per-route art direction, SEO and a localization-ready content
layer.

**AWWWARDS SUBMISSION READY: NO**

Four gaps, listed in §W and repeated here without hedging:

1. **Projects and Journal have no content** — client content task, architecture
   complete.
2. **Photography is thin in three places** — Manufacturing, Awards, Materials.
   A commissioned shoot is the fix.
3. **The configurator cannot be linked publicly** while the PXL is unannounced.
   This is a launch-timing decision and it is the largest blocker.
4. **The motion has not been watched.** Every scroll-driven reveal, the two
   product signatures, the route veil and the live 3D scene are verified by
   test and by geometry but not by eye, because this environment's browser
   reports itself hidden and throttles the render loop. One session on a
   foreground browser closes it.
