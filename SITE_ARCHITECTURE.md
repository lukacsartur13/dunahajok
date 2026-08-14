# SITE ARCHITECTURE

Every route the site serves, what it is for, where its content came from, and
what state it is in. §B34.

The source of truth for the first two columns is `src/content/routes.ts`; the
PXL rows come from `src/content/publication.ts`. Both are asserted by
`npm test` — a navigation destination that is not a declared route, or a
declared route that falls under a disallowed prefix, fails the build.

---

## 1. PUBLIC ROUTES

| Route | Status | Purpose | Content source | Major interaction | WebGL | Locale | SEO |
|---|---|---|---|---|---|---|---|
| `/` | Built · indexed | The brand. Hero, product split, specifications, story, craft, Győr, heritage, awards, propulsion, CTA. | Phase One — transcribed from dunahajok.hu | Scroll-driven hero with the WebGL water and wake; the Duna Line section cuts | **Yes** — hero vessel + water | EN | Title, description, canonical, OG, Organization + Product JSON-LD |
| `/boats` | Built · indexed | The product family. One platform, two boats, alternating grounds. | `content/boats.ts` | Vertical band transition, ground inversion between models | No | EN | Unique title/description/canonical/OG |
| `/boats/duna-61-cabin` | Built · indexed | Cabin product experience — nine movements, slow rhythm, warm ground. | `content/boats.ts` (verbatim specs) | **Signature:** pinned interior reveal, raked mask (`CabinReveal`) | No | EN | Unique title/description/canonical/OG |
| `/boats/duna-61-kadet` | Built · indexed | Kadét product experience — seven movements, faster rhythm, dark ground, specs early. | `content/boats.ts` (verbatim specs) | **Signature:** scroll-drawn sheer line over a parallaxed profile (`RacingLine`) | No | EN | Unique title/description/canonical/OG |
| `/craft/design` | Built · indexed | FROM LINE TO WATER — five movements: wood, line, hull, water, wake. | `content/craft.ts` (condensed from company history) | Alternating movements, two full-bleed plates | No | EN | Unique title/description/canonical/OG |
| `/craft/manufacturing` | Built · indexed | DESIGNED ON THE DANUBE. BUILT IN GYŐR. Three movements. | `content/craft.ts` | Two full-bleed plates on the river-dark ground | No | EN | Unique title/description/canonical/OG |
| `/craft/materials` | Built · indexed | Four surfaces, photographed close. Teak, rail, platform, upholstery. | `content/craft.ts` → `MATERIALS` | Four full-height macro bands, caption alternating side | No | EN | Unique title/description/canonical/OG |
| `/story/heritage` | Built · indexed | The chronicle: 1991, 2016, 2020, 2022, 2023. | `content/story.ts` → `MILESTONES` | Continuous spine whose marker material changes with the era | No | EN | Unique title/description/canonical/OG |
| `/story/awards` | Built · indexed | Four recognitions, editorially. | `content/story.ts` → `AWARDS` | Typographic only — display-scale years, no imagery (see §S) | No | EN | Unique title/description/canonical/OG |
| `/suzuki-marine` | Built · indexed | Dealership and service point. Overview, outboard power, service. | `content/suzuki.ts` | Alternating movements; service block with direct contact | No | EN | Unique title/description/canonical/OG |
| `/projects` | Built · indexed | Marine work: shipbuilding, renovation, joinery, engine service. | `content/editorial.ts` → `PROJECT_CAPABILITIES` | Capability grid; case-study grid present and empty | No | EN | Unique title/description/canonical/OG |
| `/projects/[slug]` | Built · **0 pages** | §B15's reusable case-study template. Every section after the hero is conditional. | `content/editorial.ts` → `PROJECTS` (empty) | — | No | EN | Per-article title/description/canonical/OG |
| `/journal` | Built · indexed | Journal index. Sorted by date; empty-state notice. | `content/editorial.ts` → `JOURNAL` (empty) | — | No | EN | Unique title/description/canonical/OG |
| `/journal/[slug]` | Built · **0 pages** | Article template with `Article` JSON-LD. | `content/editorial.ts` → `JOURNAL` (empty) | — | No | EN | Per-article title/description/canonical/OG + `Article` schema |
| `/contact` | Built · indexed | Direct details first, then a general enquiry form. | `content/site.ts` → `CONTACT`, `SOCIALS` | Enquiry form → composed message → `mailto` handoff | No | EN | Unique title/description/canonical/OG |
| `/contact/private-viewing` | Built · indexed | §B18's flow: select boat · details · message · request. | `content/boats.ts`, `content/pxl.ts` (filtered) | Enquiry form with boat selector; PXL absent while unpublished | No | EN | Unique title/description/canonical/OG |
| `/robots.txt` | Built | Disallows `/dev/` and `/preview/`. | `content/publication.ts` | — | No | — | — |
| `/sitemap.xml` | Built | Derived from `INDEXABLE_ROUTES`. Depth-derived priority. | `content/routes.ts` | — | No | Home carries `hreflang` alternates | — |

## 2. UNPUBLISHED ROUTES

These are **not** in `content/routes.ts`, are **not** in the sitemap, are
**not** linked from any navigation, and are disallowed in `robots.txt` and
`noindex` in their own metadata. Three independent mechanisms, asserted against
each other by `npm test`.

| Route | Status | Purpose | Interaction | WebGL | SEO |
|---|---|---|---|---|---|
| `/preview/pxl` | Built · **noindex, disallowed** | The PXL's customer-facing editorial page, on a staging path. | Static composition + entry to the configurator | Yes (static preset) | `noindex, nofollow, nosnippet, noimageindex, noarchive` |
| `/preview/pxl/configure` | Built · **noindex, disallowed** | The configurator. Four categories, six controls. | Orbit, category rail, finish sweep, drive crossfade, snapshot | **Yes** | Same |
| `/dev/pxl` | Built · **noindex, disallowed** | Model inspection bench. Never linked from a customer surface. | Channel-level controls, telemetry readout | **Yes** | Same |
| `/boats/pxl` | **Reserved — not built** | The public product page, when the yard announces the PXL. | — | — | Indexable when built |
| `/boats/pxl/configure` | **Reserved — not built** | The public configurator. | — | — | Indexable when built |

**Publishing the PXL** is: set `PXL.published = true` in `content/pxl.ts`, move
the two preview routes to the reserved paths, add them to `content/routes.ts`,
and approve the catalogue labels. The Boats overview and the private-viewing
selector already filter on `published` and need no edit.

## 3. LOCALIZATION

**Status: single-locale (EN), architecture prepared, no routing.** §B24.

| Layer | State |
|---|---|
| UI strings — configurator | `content/pxlStrings.ts`, keyed by locale, EN + HU complete. Read through `pxlStrings(locale)`. |
| UI strings — site chrome | Still inline in components. **Not yet extracted.** |
| Editorial content | `content/*.ts`, EN only. Structured as data, so a locale dimension is a key rather than a rewrite. |
| Product facts | `content/boats.ts` — transcribed from the EN source pages. HU/DE/SK equivalents exist on the legacy site and have **not** been cross-checked. |
| Routing | None. `LANGUAGES` in `content/site.ts` links out to the legacy WordPress translations. |
| `hreflang` | Emitted on `/` only, pointing at the legacy URLs. Deliberately not claimed for interior routes — see the note in `app/sitemap.ts`. |

**What §B24 asked for and what was done.** The instruction was not to bolt
translations on afterwards and to prepare new content architecture for
localization. Every new page's content is a typed module with no strings in the
component tree, which is the precondition for a locale dimension. What has *not*
been done is the routing (`/hu/...`), the chrome extraction, or any
auto-translation — §B24 explicitly says not to auto-translate factual content
without checking the existing sources, and the existing HU pages have not been
read.

## 4. NAVIGATION

`content/site.ts` → `NAV` is the single tree. The header renders the top level
(≥76rem only), the overlay renders the top level and the children, the footer
renders the top level. No component keeps a second list.

```
BOATS        → /boats            Overview · Duna 6.1 Cabin · Duna 6.1 Kadét
CRAFT        → /craft/design     Design · Manufacturing · Materials
STORY        → /story/heritage   Heritage · Awards
SUZUKI MARINE→ /suzuki-marine
PROJECTS     → /projects
JOURNAL      → /journal
CONTACT      → /contact          General enquiry · Private viewing · Suzuki service
```

## 5. ROUTE CHARACTER — §B22

Declared as `tone` on each route; changes a ground, a rule and a weight, never
the typeface, scale, rake or motion curve.

| Tone | Ground | Routes |
|---|---|---|
| `paper` | `--paper` | Boats overview, Awards, Projects, Journal |
| `warm` | `--paper-warm` | Cabin, Materials |
| `technical` | `--paper-sunk` | Design, Suzuki Marine |
| `archival` | `--paper-sunk` | Heritage |
| `depth` | `--depth` | Home, Kadét, Manufacturing, Contact, Private viewing |

## 6. THE WAKE, PER ROUTE — §B23

One motif, six readings. Positioned and weighted by `data-line` on the page
opening; never the same drawing twice.

| Reading | Where | Treatment |
|---|---|---|
| Physical wake | Homepage | The WebGL water's own wake |
| Hull / design line | Cabin, Kadét, Private viewing | `profile` — low, long, flattened to 0.42 |
| Construction line | Craft, Suzuki Marine | `construction` — high, tight, flattened to 0.3 |
| Timeline | Heritage | `timeline` — near-flat spine, plus the chronicle's own rule |
| Racing line | Kadét signature | Authored SVG path along the 6.1's sheer |
| Transition line | Every route change | The raked veil in `RouteTransition` |
| Departure | Footer | Phase One's existing footer wake |
