# PXL_CONFIGURATOR_SCHEMA

The configuration contract, as data. Everything a customer can choose, how it is
written into a URL, what may and may not be printed about it, and what a request
carries when someone asks for it.

This document describes what is **in the repository today**. Where something is
missing it says so, and says what unblocks it — a schema that documents its own
gaps is a schema somebody can finish.

> **PHASE FOUR.** The schema and the option list are now separate files. §1–§3
> below describe the Phase Four shape; the sections after them are Phase Three's
> and remain accurate about serialisation, publication and the request payload
> except where noted.
>
> ```
> pxlCatalog.ts   WHAT MAY BE CHOSEN.  Provisional, replaceable, and the only
>                 module that knows a colour is called Cognac.
> pxlConfig.ts    WHAT A CONFIGURATION IS.  Shape, field accessors, URL format,
>                 summary, material resolution.
> ```
>
> The seam is `PxlConfigField`: the catalogue declares which field each control
> writes, `pxlConfig` declares how each field is read and written, and the two
> sets are checked against each other by the compiler.

---

## 1 — Customer-facing categories

**CATEGORY → CONTROL → OPTION**, all three data, all three derived. The
configurator maps over `PXL_AVAILABLE_CATEGORIES` — `PXL_CATEGORIES` filtered to
the entries that have at least one control with options — and renders what it
finds.

| # | Category | Controls | URL keys | Options | Suggested view |
|---|---|---|---|---|---|
| 01 | `exterior` | Finish | `exterior` | 6 | `hero_3q` |
| 02 | `hull_detail` | Lower hull | `lower` | 2 | `side` |
| 03 | `interior` | Cockpit · Console · Surface | `interior` `console` `surface` | 5 · 3 · 2 | `interior` |
| 04 | `propulsion` | Drive | `propulsion` | 4 | `stern_3q` |
| 05 | `equipment` | Boarding platform | `platform` | 2 | `stern_3q` |

The middle level exists because INTERIOR is genuinely more than one decision.
Flattening it would force either three categories for one part of the boat or a
category that secretly renders three different things.

**The index a category shows is its position among the categories that exist.**
Five exist as of Phase 4.4, so they read 01–05. There is no arrangement of the
data that produces a number for a category that is not there.

**EQUIPMENT arrived under the rule that had excluded it.** Phase Four deferred
it with a checkable reason — no configurable equipment geometry existed on the
boat — and Phase 4.4 built some: the aft boarding platform, measured off the
August views sheet and switched by a real geometry toggle. The standard did not
move; the asset did. §25 of that brief is explicit that one genuine option is
enough and that inventing a second to pad the tab is not allowed, so the
category has exactly one control and `npm test` asserts it.

### Deferred categories

Declared in `PXL_DEFERRED_CATEGORIES`, which **nothing in the interface
iterates**. An entry there cannot become a tab, a count or a greyed control; it
exists so the reason lives beside the category and the URL parameter is reserved
before somebody picks a different one.

| Category | Param | Why not |
|---|---|---|
| `accessories` | `accessories` | no accessory range supplied |

`equipment` left this table in Phase 4.4. Its reserved parameter is still
reserved and still unused — the platform control claims `platform` — so links
written before the change sanitise exactly as they did. The flush cockpit cover
is still undocumented and is still not offered.

---

## 1b — The provisional guarantee

Every option carries the metadata §A1 asks for:

```ts
id · category · slug · previewLabel · approvedLabel · published · provisional
sortOrder · swatch · note
+ at most one of: finishId | lowerTreatment | interiorSurface | geometryVariant
```

- `provisional: true` on **every** option.
- `published: false` on **every** option.
- `approvedLabel: null` on **every** option — structurally null, because
  approving a name is a commercial act nobody has performed.
- `note` records what specifically has to be confirmed before this option can be
  published. It is a development string and is never rendered.

`PXL_CATALOGUE_IS_PROVISIONAL` is **computed** from the data rather than
asserted, so it cannot claim approval until the data actually carries it.

`PXL_CATALOGUE_FORBIDDEN` is a list of patterns — `hp`, `horsepower`, `kW`,
`knots`, `km/h`, `range`, currency, and seven manufacturer names — that the
configurator test suite runs against every customer-visible string the catalogue
can produce. A term that has to be used because it has genuinely been approved is
removed from that list in the same commit that approves it, which puts the
decision in front of a reviewer.

---

## 1c — What each category does to the boat

| Category | Mechanism | Geometry |
|---|---|---|
| EXTERIOR | material colour on `EXTERIOR_HULL`, travelling behind the Duna Line sweep | unchanged |
| HULL DETAIL | material colour on `HULL_BOTTOM`, resolved from the treatment, same sweep | **unchanged — nothing is hidden** |
| INTERIOR | material colour + sheen + grain amplitude on **`UPHOLSTERY`** and `CONSOLE` | unchanged |
| PROPULSION | a proxy drive built at runtime, crossfaded | **changes** — see PXL_CONFIGURATOR_MODEL_MAP §7 |

**HULL DETAIL is a treatment, not a colour.** `PxlConfiguration.exterior` holds
`lowerTreatment: "dark" | "body"` rather than a second finish id, because FULL
BODY COLOUR means "the bottom is whatever the topsides are" and storing it as a
finish would make the two independent. `finishForChannel` resolves it in one
place:

```ts
case "hullLower":
  return config.exterior.lowerTreatment === "body"
    ? config.exterior.hullPrimary
    : PXL_STRUCTURE_FINISHES[0].id;
```

`sternMoulding` was split off the `hullLower` channel in Phase Four so this is
possible: the moulding carries the PXL mark, and repainting it would turn a paint
option into a branding change.

**PROPULSION's cowling colour is a consequence, not a choice.**
`finishForChannel(config, "motor")` reads `PXL_DRIVE_SPECS[variant].cowlFinishId`,
so an electric drive in a combustion cowling is not a configuration anybody can
reach.

---

## 2 — Configuration keys and allowed values

The configuration object (`PxlConfiguration`) is deliberately dull: plain data,
`JSON.stringify`-safe, no methods, no derived state.

```ts
{
  exterior:   { hullPrimary, lowerTreatment, hullAccent },
  interior:   { primary, secondary, surface, metal },
  propulsion: { variant },
  equipment:  Partial<Record<PxlZone, boolean>>,
}
```

Seven of these fields are customer-configurable — `hullPrimary`,
`lowerTreatment`, `interior.primary`, `interior.secondary`, `interior.surface`,
`propulsion.variant` and, from Phase 4.4, `equipment`. `hullAccent` and
`interior.metal` are delivered state the renderer needs.

**`equipment` is the one field with no scalar behind it**, and that is
deliberate. It is a zone-keyed visibility registry, and the EQUIPMENT control
writes a SET of mesh visibilities into it rather than a value naming itself.
There is no `equipment.boardingPlatform: boolean`: the truth is which zones are
drawn, and the control's current option is read back OUT of that by
`FIELDS.boardingPlatform.read`. A second field holding the same fact is a second
field that can disagree with the first, and the disagreement would show as a
highlighted option that is not the boat on screen.

Each configurable field is reached through exactly one accessor in
`pxlConfig.FIELDS`, keyed by `PxlConfigField`. There is no other way to write a
configuration: `selectPxlOption(control, option)` routes through the accessor the
catalogue declared, which makes states like "a hull painted in an interior
finish" unreachable rather than merely unlikely.

### The exterior range

| Internal key | Slug (URL) | Working name | sRGB | Approved name | Published |
|---|---|---|---|---|---|
| `pxl_white` | `white` | White | `#dcdedb` | — | false |
| `pxl_sage` | `sage` | Sage Green | `#61817b` | — | false |
| `pxl_black` | `black` | Black | `#15181c` | — | false |
| `pxl_warm_grey` | `warm-grey` | Warm Grey | `#a49d95` | — | false |
| `pxl_gold` | `gold` | Gold | `#8a7140` | — | false |
| `pxl_navy` | `navy` | Navy | `#1b3a5c` | — | false |

Default: **`pxl_sage`** — the colour both delivered design renders were made in.

### The hull-detail range

| Internal key | Slug | Working name | Effect |
|---|---|---|---|
| `pxl_lower_dark` | `dark` | Dark Lower | `HULL_BOTTOM` takes the structural black |
| `pxl_lower_body` | `body` | Full Body Colour | `HULL_BOTTOM` follows `hullPrimary` |

Default: **`pxl_lower_dark`** — the treatment in all six delivered studies.
Neither option hides a single triangle.

### The interior ranges

| Control | Internal key | Slug | Working name | sRGB |
|---|---|---|---|---|
| Cockpit | `pxl_interior_light` | `light` | Light | `#d5cfc3` |
| Cockpit | `pxl_interior_sand` | `sand` | Sand | `#b9a684` |
| Cockpit | `pxl_interior_cognac` | `cognac` | Cognac | `#8a4d24` |
| Cockpit | `pxl_interior_graphite` | `graphite` | Graphite | `#3a3e41` |
| Cockpit | `pxl_interior_black` | `black` | Black | `#1d1f21` |
| Console | `pxl_console_graphite` | `console-graphite` | Graphite | `#232830` |
| Console | `pxl_console_black` | `console-black` | Black | `#15171a` |
| Console | `pxl_console_stone` | `console-stone` | Stone | `#767068` |
| Surface | `pxl_surface_smooth` | `smooth` | Smooth | — |
| Surface | `pxl_surface_grained` | `grained` | Grained | — |

Defaults: **cognac**, **console graphite**, **grained**.

**WHAT THE COCKPIT CONTROL ACTUALLY PAINTS — NARROWED IN PHASE 4.2.** It reaches
`upholstery_primary`, the cushions, and nothing else: 4.9 m² of the
boat. Until 4.2 it was bound to `deck_main`, a single mesh carrying the whole
17.6 m² interior, so choosing Cognac turned the sole, the coaming walls and the
inner shell cognac as well — a flat recolour rather than a trim choice. The
references show three interior materials and the model now has three zones:

| Surface | Zone | Driven by |
|---|---|---|
| Upholstery | `upholstery_primary` | **the Cockpit control** |
| Sole | `cockpit_sole` | `sole` — one finish, not offered |
| Liner, coaming, foredeck | `interior_hard_liner` | **the EXTERIOR control** — the liner is the topsides seen from inboard |
| Console shell, windscreen, rails | `console_detail`, `windshield`, `rails` | **nothing** — §15 forbids the cockpit colour from reaching any of them, and `npm test` asserts it from both ends |

Choosing an exterior finish therefore now changes the inside of the boat too,
which is what a moulded liner does and what every reference shows.
`npm test` asserts `zonesForChannel("interiorPrimary") === ["upholstery_primary"]`.

**SLUGS ARE UNIQUE WITHIN A RANGE, NOT GLOBALLY.** The honest names for the
interior are Light, Sand, Cognac, Graphite and Black, two of which the hull range
already uses. That is not a collision: `?exterior=black` and `?interior=black`
each name their own category, and `finishBySlug` has always taken the range to
search precisely so that `?exterior=motor-black` could not paint a hull.
`PXL_RANGES` is what the tests assert per-range uniqueness against; the flat
global map is gone.

### The propulsion range

| Internal key | Slug | Working name | Cowling L×H×W | Cowling finish |
|---|---|---|---|---|
| `pxl_drive_compact` | `compact` | Combustion — Compact | 0.340 × 0.400 × 0.325 | Outboard black |
| `pxl_drive_standard` | `standard` | Combustion — Standard | 0.450 × 0.500 × 0.382 | Outboard black |
| `pxl_drive_large` | `large` | Combustion — Large | 0.580 × 0.615 × 0.435 | Outboard black |
| `pxl_drive_electric` | `electric` | Electric | 0.285 × 0.365 × 0.245 | Drive graphite |

Default: **`pxl_drive_standard`** — the proportions of the outboard in the
delivered STL. No horsepower, kW, range, speed, brand or model number appears on
any of them, here or anywhere else.

---

## 3 — Names, and the publication rule

Phase Three §53 asks that a public surface be able to reject an unapproved
colour name **by itself**. `PxlFinish` therefore carries four separate facts
rather than one `displayName`:

| Field | Meaning | Today |
|---|---|---|
| `id` | internal key. Ugly on purpose, so an escape is unmistakable | set |
| `slug` | the URL token. The stable public identifier | set |
| `previewLabel` | a plain descriptor, staging surfaces only | set |
| `approvedDisplayName` | the name the yard has approved | **undefined on all 21** |
| `published` | whether the finish may be presented at all | **false on all 21** |

```ts
finishLabel(finish, "public")   // → null for every finish in the palette
finishLabel(finish, "preview")  // → the working name
rangeIsPubliclyNameable(PXL_EXTERIOR_FINISHES)  // → false
```

`PxlCatalogOption` carries the same three facts under catalogue names —
`previewLabel`, `approvedLabel`, `published` — and `optionLabel(option, surface)`
applies the same rule. Two functions rather than one because an option can exist
without a finish behind it (a hull treatment, a drive variant), and both are held
to the same standard.

```ts
optionLabel(option, "public")   // → null for every option in the catalogue
controlIsPubliclyNameable(c)    // → false for all six controls
```

**No component may print a name without going through one of those two,** and
there is no field on either type that is both human-readable and unconditionally
safe. That is the enforcement: it is structural, not a convention.

A public surface that gets `null` shows the swatch and says nothing. It does not
fall back to the working name, and it does not break.

Asserted by `npm test`: every finish is unpublished, has no approved name,
refuses to name itself publicly, and carries a working name of at most two
words — which is what catches an invented range name if one is ever added.

---

## 4 — URL encoding

One parameter per **control**, named after the control, valued with the option's
`slug`.

```
/preview/pxl/configure                                   the default boat — a clean URL
?exterior=navy                                           one choice
?exterior=navy&lower=body&interior=light&propulsion=electric
```

Six keys: `exterior` `lower` `interior` `console` `surface` `propulsion`.
Reserved and rejected: `equipment` `accessories`.

**Only non-default controls are written.** A URL is a summary of a decision, not
a dump of a state object.

### Independent sanitisation

The parse loop never breaks and never bails. Each control resolves against its
own parameter and falls back to its own default; every other control keeps the
value it was given.

```
?exterior=navy&lower=chartreuse&interior=cognac&propulsion=electric
→ navy hull · electric drive · cognac interior · DEFAULT lower treatment
→ rejected: ["lower"]
```

Rejected parameters are reported so the caller can **rewrite the address bar** —
leaving `?lower=chartreuse` in place while showing the default treatment is the
failure that turns one bad link into a hundred bad links.

Slugs are matched case- and whitespace-insensitively, because that is a human
typing rather than an attack.

### Share and reset

`applyConfigurationToHref` is pure and preserves everything it does not own, so
`?debug=1` and `utm_*` survive a share. `clearConfigurationFromHref` drops every
parameter this configurator owns — including the reserved names — and nothing
else. Reset is not "serialise the default": that happens to produce the same
string today only because the default boat serialises to nothing.

---

## 5 — Publication state

| | |
|---|---|
| `PXL.published` | **false** |
| Built routes | `/preview/pxl`, `/preview/pxl/configure` |
| Reserved routes | `/boats/pxl`, `/boats/pxl/configure` — not built |
| Development bench | `/dev/pxl` |
| Development QA surfaces | `/dev/pxl?debug=1` · `?pxlQa=1` · `?pxlReference=1` |

**The Phase 4.1 QA surfaces are development-only by construction, not by
convention.** `window.__pxlQa` (deterministic frames, contact sheets, live zone
material reads) and the reference comparison bench (`?pxlReference=1`) are both
behind `process.env.NODE_ENV !== "production"`, which the bundler resolves at
build time: in a production build `installPxlQa` has an empty body, the global is
never defined, and `PxlReferenceBench` compiles to a constant `null`.

The bench loads its reference plates from the **already-public** derivatives in
`PXL_MEDIA` rather than from `assets/source/`. That is deliberate: this site is a
static export, so anything placed under `public/` becomes a URL on the open web,
and copying the unreleased full-resolution design renders there to serve a
development tool would publish the product by the back door (§31).

Three files have to agree about what is indexable, so they read from one:
`src/content/publication.ts`.

- `robots.ts` → `Disallow: /dev/`, `Disallow: /preview/`
- `app/preview/layout.tsx` → `noindex, nofollow, noarchive, nosnippet, noimageindex, nocache` on the whole segment
- `content/pxl.ts` → `PXL.routes`

Verified in the production build output: the preview pages carry the meta
robots directives, `robots.txt` carries both disallows, and `sitemap.xml`
contains the homepage only.

Asserted by `npm test`: both built PXL routes are under a disallowed prefix,
both reserved routes are not, and the preview robots block has index, follow,
snippet and image indexing all switched off.

---

## 6 — Fields that are NOT in the schema, and must not be added

| Field | Why |
|---|---|
| price, total, deposit, monthly | no pricing data exists, and §46 forbids inventing it |
| LOA, beam, draft, weight, capacity, power, speed, CE category | all nine are `available: false` in `PXL.specs` with a stated reason |
| lead time, availability | not supplied |
| RAL or manufacturer paint code | `manufacturingCode` is the field for it and is empty on all 12 finishes |
| engine model or output | one unidentified outboard in the source model |

The request payload test asserts the absence of `price`, `total`, `deposit`,
`leadTime`, `availability` and `specs` as a **shape** check rather than a value
check — it fails when someone *adds* one, which is when the mistake happens.

---

## 7 — Future extension contract

Adding a real category is a data change:

1. add the finishes to `pxlPalette.ts`, with `previewLabel` and `published: false`;
2. add the field to `PxlConfiguration`;
3. fill in `options` and clear `unavailable` on the category in `PXL_CATEGORIES`;
4. add the case to `patchFor` in the configurator — a `switch`, so forgetting is
   a compile error rather than a click that does nothing;
5. add the label to `pxlStrings`.

Nothing in the layout changes. The rail maps over the available categories, the
summary is generated from the same list, and the URL gains one parameter whose
name was already reserved.

Adding a **geometry** option (show/hide) needs no new schema at all:
`equipment` is keyed on `PxlZone`, so a genuine option is a set of meshes to
show or hide and the registry is already the right shape.

---

## 8 — Request payload

`buildPxlRequestPayload()` in `pxlRequest.ts`. Pure — the product record, the
timestamp and the URL are all passed in, so the payload can be asserted by
`npm test` without a browser.

**Phase Four: every category is in the payload, by derivation.**
`summariseConfiguration` walks the catalogue, so a control added after this file
was last edited is in the payload the moment it exists — there is no list to
remember to extend. `control` is separate from `category` because INTERIOR
contributes three lines and a reader with only the category name could not tell
which surface a cognac belongs to.

`snapshot` is optional rather than nullable: a payload with `snapshot: null`
invites a reader to treat the field as always present, and a data URL is not
something to carry by default. It is a render of the configuration — exterior,
lower-hull treatment, interior, mark and fitted drive exactly as the visitor saw
them — and it makes no claim the payload does not already make in words.

```jsonc
{
  "version": 1,                      // a stored lead outlives the code
  "productId": "pxl",
  "productName": "Duna PXL",
  "query": "exterior=navy&lower=body&propulsion=electric",   // re-openable
  "configurationUrl": "https://…/preview/pxl/configure?exterior=navy&…",
  "selections": [                    // SIX lines — one per control, derived
    {
      "category": "exterior",
      "control": "exterior",         // INTERIOR contributes three lines
      "optionId": "pxl_navy",        // internal key — exact, never shown
      "slug": "navy",                // the stable identifier
      "previewLabel": "Navy",
      "labelApproved": false         // reader beware, in a field
    }
    // … lower, interior, console, surface, propulsion
  ],
  "contact": { "name": "…", "email": "…" },   // phone/message omitted when blank
  "snapshot": "data:image/png;base64,…",      // OPTIONAL — absent unless produced
  "createdAt": "2026-08-13T09:00:00.000Z",
  "sourcePage": "/preview/pxl/configure",
  "productPublished": false          // true state of the product at request time
}
```

### The destination is missing

```ts
export const PXL_REQUEST_DESTINATION: PxlRequestDestination = {
  kind: "none",
  reason: "no approved sales destination has been supplied…",
};
```

`submitPxlRequest()` branches on this. With `kind: "none"` it performs **no
network call** and returns `{ status: "no-destination" }`. The UI renders that
as what it is — nothing went wrong, and nothing was sent — and offers the
customer a `mailto:` to the yard's own published address with the configuration
already in the body. This site transmits nothing and claims nothing.

**To connect it:** change the constant to
`{ kind: "endpoint", url: "…", approvedBy: "…" }`. That is the whole change.
The payload has the shape, the transport already POSTs it, and the UI already
renders the `sent` and `failed` branches.

Asserted by `npm test`: the destination is `none`; submitting returns
`no-destination`; and `fetch` is replaced with a tripwire that fails the suite
if the request flow ever calls it without an approved destination.

---

## 9 — Analytics event contract

No provider exists and none was added (§60). `src/lib/analytics.ts` defines the
events and a `track()` that does nothing until a sink is installed.

| Event | Payload |
|---|---|
| `pxl_configurator_open` | `{ surface: "preview", entry: "direct" \| "product" }` |
| `pxl_finish_change` | `{ category, from, to }` — slugs. `category` is `"<category>/<control>"` from Phase Four, because INTERIOR owns three controls |
| `pxl_category_open` | `{ category }` — a category was opened in the rail |
| `pxl_camera_change` | `{ preset, source: "control" \| "drag" \| "category" }` — `"category"` is the composition offered on first entry |
| `pxl_share` | `{ query, method: "clipboard" \| "share-sheet" }` |
| `pxl_reset` | `{ from }` |
| `pxl_request_start` | `{ query }` |
| `pxl_focus` | `{ on }` |
| `pxl_snapshot` | `{ ok }` |

Slugs, preset ids and booleans. **No permalink, no free text from the form, no
identifier of any kind.** Every field describes the product interaction.

The default sink is null rather than a queue: a queue would start collecting the
moment somebody adds a provider, without anyone deciding to. In development the
events are mirrored to a bounded ring on `window.__dunaEvents` so the contract
can be verified in a browser without a provider existing.

Asserted by `npm test`: nothing is recorded with no sink installed; an installed
sink receives events under the documented names; and a sink that throws cannot
break the configurator.

---

## 10 — Checking

```bash
npm test        # 1,460 checks: catalogue, hull detail, interior, propulsion,
                # branding, URL, labels, publication, payload, analytics,
                # site architecture, editorial honesty
npm run model   # the GLB against three's own loader
npm run vessel  # 125 checks: the four proxy drives and the PXL mark, built
                # with the real code against the real model and measured
npm run qa      # all of the above, plus typecheck and GLSL validation
```

### What the tests catch that review would not

- A preview label containing `hp`, `kW`, `km/h`, a currency or a manufacturer
  name — `PXL_CATALOGUE_FORBIDDEN`, run against every customer-visible string.
- A catalogue string containing the word "upholstery" while the model has no
  cushion geometry.
- **The cockpit colour reaching more than the upholstery zone.** Added in Phase
  4.2, and it is the assertion that phase existed to make: the regression it
  guards against leaves the schema valid, the URL round-tripping and the console
  clean, and makes the boat wrong. No other test in the suite can see it.
- A drive whose dimensions have converged toward a uniform scale factor.
- A drive that reaches forward of the transom, or whose propeller is out of the
  water — measured on the **built** geometry, where a bevel had in fact pushed
  12 mm of bracket inside the hull.
- A wordmark whose placement ray misses the moulding, lands below the waterline,
  or faces inboard.
- A navigation destination that is not a declared route.
- A route in the public table that falls under a disallowed prefix.
