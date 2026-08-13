# PXL_CONFIGURATOR_SCHEMA

The configuration contract, as data. Everything a customer can choose, how it is
written into a URL, what may and may not be printed about it, and what a request
carries when someone asks for it.

This document describes what is **in the repository today**. Where something is
missing it says so, and says what unblocks it — a schema that documents its own
gaps is a schema somebody can finish.

---

## 1 — Customer-facing categories

Derived, never written out. The configurator maps over
`PXL_AVAILABLE_CATEGORIES`, which is `PXL_CATEGORIES` filtered to the entries
that have options and no `unavailable` reason.

| Category | Param | Offered | Options | Why not |
|---|---|---|---|---|
| `exterior` | `exterior` | **YES** | 6 hull finishes | — |
| `upholstery` | `upholstery` | no | 0 | no seating or cushion geometry in the source STL, and no upholstery specification |
| `console` | `console` | no | 0 | the console in the asset is the STL revision, not the glazed tower in the colour studies |
| `engine` | `engine` | no | 0 | one unidentified outboard in the source model; no option list supplied |
| `equipment` | `equipment` | no | 0 | no equipment list supplied |
| `accessories` | `accessories` | no | 0 | no accessory range supplied |

**One category is offered, so one category is rendered.** No disabled tabs, no
`01 / 04`, no greyed future theatre. The reserved five are declared anyway so
that their URL parameters cannot be claimed by something else, their reasons
live beside them rather than in a comment, and turning one on is adding
`options` and clearing `unavailable` — a data change.

`unavailable` is a **development string**. It is never rendered to a customer.

Asserted by `npm test`: exactly one available category; every available category
has options and no reason; every unavailable category has zero options, a stated
reason, and a `write` that is a no-op.

---

## 2 — Configuration keys and allowed values

The configuration object (`PxlConfiguration`) is deliberately dull: plain data,
`JSON.stringify`-safe, no methods, no derived state.

```ts
{
  exterior:   { hullPrimary, hullLower, hullAccent },
  interior:   { flooring, console, metal },
  propulsion: { variant, finish },
  equipment:  Partial<Record<PxlZone, boolean>>,
}
```

Only `exterior.hullPrimary` is customer-configurable. The rest is delivered
state that the schema models because the renderer needs it, not because anyone
can change it.

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
| `approvedDisplayName` | the name the yard has approved | **undefined on all 12** |
| `published` | whether the finish may be presented at all | **false on all 12** |

```ts
finishLabel(finish, "public")   // → null for every finish in the palette
finishLabel(finish, "preview")  // → the working name
rangeIsPubliclyNameable(PXL_EXTERIOR_FINISHES)  // → false
```

**No component may print a colour name without going through `finishLabel`,**
and there is no field on `PxlFinish` that is both human-readable and
unconditionally safe. That is the enforcement: it is structural, not a
convention.

A public surface that gets `null` shows the swatch and says nothing. It does not
fall back to the working name, and it does not break.

Asserted by `npm test`: every finish is unpublished, has no approved name,
refuses to name itself publicly, and carries a working name of at most two
words — which is what catches an invented range name if one is ever added.

---

## 4 — URL encoding

One parameter per category, named after the category, valued with the finish's
`slug`.

```
/preview/pxl/configure                      the default boat — a clean URL
/preview/pxl/configure?exterior=navy        one choice
/preview/pxl/configure?exterior=navy&utm_source=x   unrelated params survive
```

Rules, all asserted by `npm test`:

| Rule | Behaviour |
|---|---|
| Default values | omitted. The delivered boat has no query string at all |
| Unavailable categories | contribute nothing, ever |
| Unknown slug (`?exterior=nope`) | falls back to the default **and the parameter is removed from the address bar** |
| Reserved category (`?engine=v8`) | rejected and removed — never stored |
| Unknown parameter (`?utm_source=x`) | preserved untouched |
| Case and whitespace (`?exterior=%20NAVY%20`) | matched leniently — a human typing is not an attack |
| Fragment (`#stern`) | preserved |
| History | `replaceState`, never `pushState` — Back leaves the page, it does not step through six swatch clicks |
| `popstate` | re-reads the URL, so browser Back/Forward across routes agrees with the boat on screen |

The pure functions are `applyConfigurationToHref(href, config)` and
`clearConfigurationFromHref(href)` in `pxlConfig.ts`. The browser wrappers
(`syncPxlUrl`, `currentPxlPermalink`) are two lines each and hold no logic —
which is what makes the behaviour above testable without a DOM.

**RESET** is `clearConfigurationFromHref`, not "serialise the default". The two
agree today only because the default boat serialises to an empty string, and a
future category with a non-default default would break the coincidence.

---

## 5 — Publication state

| | |
|---|---|
| `PXL.published` | **false** |
| Built routes | `/preview/pxl`, `/preview/pxl/configure` |
| Reserved routes | `/boats/pxl`, `/boats/pxl/configure` — not built |
| Development bench | `/dev/pxl` |

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

```jsonc
{
  "version": 1,                      // a stored lead outlives the code
  "productId": "pxl",
  "productName": "Duna PXL",
  "query": "exterior=navy",          // canonical; re-openable via parseConfiguration
  "configurationUrl": "https://…/preview/pxl/configure?exterior=navy",
  "selections": [
    {
      "category": "exterior",
      "finishId": "pxl_navy",        // internal key — exact, never shown
      "slug": "navy",                // the stable identifier
      "previewLabel": "Navy",
      "labelApproved": false         // reader beware, in a field
    }
  ],
  "contact": { "name": "…", "email": "…" },   // phone/message omitted when blank
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
| `pxl_finish_change` | `{ category, from, to }` — slugs |
| `pxl_camera_change` | `{ preset, source: "control" \| "drag" }` |
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
npm test        # 345 checks: schema, URL, labels, publication, payload, analytics
npm run model   # the GLB against three's own loader
npm run qa      # both, plus typecheck and GLSL validation
```
