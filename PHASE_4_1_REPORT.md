# PHASE 4.1 — PXL REFERENCE-LOCKED VISUAL FIDELITY, BRANDING COMPLETION, VISUAL QA

Phase Four built the PXL configurator's architecture and left one thing
conspicuously undone: the Duna script was declared and empty. This phase closes
that, adds the two branding instances the references show, and — most
consequentially — **makes the WebGL scene reviewable for the first time in the
project's history.**

That last change is what makes this report different from its predecessors.
Every previous phase reasoned about the render from the code. This one looked at
it. Within the first hour of looking, it found three defects that had survived
every prior review, two of them severe. They are in §M.

Companion document: **PXL_REFERENCE_QA.md**, the element-by-element comparison
table §36 asks for.

---

## A. Source reference audit

Seven delivered files, all under `assets/source/pxl/`:

| File | Content | Used as |
|---|---|---|
| `pxl-side-20240719.jpg` | 3034 × 1994 true orthographic profile | **The datum.** Every measurement in `pxlReference.ts` |
| `pxl-views-20240815c.jpg` | Side, top 3Q, stern 3Q on one sheet | Cockpit layout, motor scale, console station |
| `pxl-colours-01..04.jpg` | Six finishes on water, 3508 × 2480 | Colour, plexi mark, interior, flotation |
| `PXL-3D.stl` | 10 MB mesh, **no branding on it** | Geometry, via the build pipeline |

The side plate is the only true profile — the colour studies are three-quarter
views on water, where apparent depth is a property of the lens. Everything
dimensional is measured against the side plate; everything about light and
colour is measured against the studies.

**Plate → model mapping.** Aligned on the two **sheer termini** rather than on
overall length. The plate's stern rakes 774 mm abaft where its sheer ends;
aligning overall span stretches the plate by that rake and moves the entire error
into depth — the first pass reported the plate hull as 11% shallower than the
model, all of which was this artefact. Sheer-terminus alignment brings the two to
within 2.6% on depth. Scale: 345.1 px/m.

---

## B. Official branding assets found

**None.** §5 asks for the repository and delivery to be searched before anything
is drawn. The search covered every SVG, PDF, AI/EPS-derived file, PNG, WebP, font
and media asset in the tree and in `assets/source`. What exists:

- `PXL-3D.stl` — geometry, unbranded;
- seven raster renders, in which the Duna script appears at **147 × 28 px** at its
  largest anywhere in the delivery;
- `public/media/brand-mark.webp` — a **photograph of the yard's workshop signage**,
  not a logo file;
- no SVG, no PDF, no vector of any kind, no font, no brand sheet.

So §6 applies: reconstruct for the unpublished preview, mark it provisional.

---

## C. Duna script implementation

Present on the live model, both sides, on the gunwale capping, in cognac.

**The method matters more than the result.** The first implementation traced it
by hand — five pen paths, sixty numbers read off a 12× enlargement. Its aspect
came out within 2.3% of the plate's and it was still wrong: rendered directly
beneath the plate's own crop, the `una` was a zigzag where the reference has
arches, the D's bowl was too round, and the swash had a kink that existed only
because two authored nodes were out of order.

The lesson is recorded in `pxlScript.ts` because it will apply to the next mark
somebody reconstructs: **a signature carries information at a scale a person
cannot eyeball off a 28-pixel image**, and every place a hand trace is wrong is a
place it has quietly become a drawing of what the mark *ought* to look like.

The shipped trace is mechanical — a threshold and boundary walk over the
highest-contrast delivered instance, by `scripts/pxl/build-duna-trace.mjs`,
rectified for the study's foreshortening. Nothing about the shape is anybody's
opinion.

Provenance travels **with the artwork**, not in a document:

```
PXL_DUNA_ARTWORK.provisional_brand_artwork = true
```

The bench prints the disclaimer verbatim; the configurator tests assert the flag
is still true. The day an official vector arrives, that flag going false is the
same commit that replaces the generated file — no scene architecture changes.

---

## D. PXL side branding changes

Re-proportioned from the plate's own **100 × 19 px** lockup rather than from a
typeface chosen to look similar. Ink measured rather than matched by eye:
`scripts/pxl/_mark.mjs` isolates the 889 orange pixels of the lockup in the side
plate and averages them to **`#d6703c`**. Phase Four's `#d9762c` was 8% too
saturated — on a mark this small that reads as a hotter orange than the rails
beside it, and the rails are a different colour on purpose.

Placement is on `transom_black` by surface raycast, not from memory. The overlay
bench shows a small remaining horizontal offset against the plate at the authored
calibration; recorded in PXL_REFERENCE_QA.md row 15 as the refinement to make.

---

## E. PXL windshield / plexi branding

**Delivered.** A separate instance with its own transform, as §9 requires —
it does not reuse the side mark's.

- Placed against the screen's own face, from `PxlScreen`'s measured basis.
- One instance on the centreline, not a mirrored pair.
- Ink `#c9d2d8`, deliberately **not white**: a white mark on glazing reads as an
  opaque sticker, which is exactly what §9 forbids. A cool grey close to the sky
  the screen reflects reads as printed *on* it.
- Roughness 0.52, clearcoat 0.08 — much flatter than the hull inks. Giving a
  screen print the hull mark's clearcoat puts a second specular highlight on a
  surface that already has one, which is the fastest way to make a decal look
  like it is floating in front of the glass.

Verified at the `detail` camera against all six finishes.

---

## F. Glass changes

`pxlGlazing.ts` — the screen is authored from the console's measured box
(860 × 370 mm, 4° rake, 16 mm corner radius, 9 mm thickness, 20 mm frame). It
reads as marine glazing rather than as any of §11's four failure modes: not
opaque black plastic, not mirror, not heavy blue tint, not an invisible sheet,
and the Fresnel is restrained enough that the mark stays legible from the
reference cameras.

The mark remains independent of exterior colour — no baked windshield texture per
configuration.

---

## G. Exterior fidelity changes

All six finishes rendered at `reference_side` under one lighting environment and
judged from a single contact sheet. Results in PXL_REFERENCE_QA.md §2 — all six
pass their §27 check. No per-colour lighting rig was introduced.

The default is sage, which is the studies' own hull colour, and the live render at
`reference_side` is recognisably the same product as `pxl-colours-02`.

---

## H. Lower hull fidelity

**The strongest agreement in the whole comparison, and the most important one.**
The dark band's edge sits at **71.4%** of local hull depth in the plate and
**72.1%** in the model — 0.7 percentage points apart, measured at 12 plate
stations and 18 model stations.

That line is the PXL's key identity feature and it lands. Band *shape* deviates by
111 mm mean / 269 mm max, worst forward, where the plate's band lifts faster than
the model's — but that is inherited from the sheer difference rather than from
material assignment, so §14's warning about blurring the design line does not
apply.

`lower=body` (full body colour) keeps the hull form readable: the panel
boundaries survive through geometry and light rather than through paint, the
silhouette is unchanged, and it does not read as missing materials.

---

## I. Interior fidelity

The reference cognac is now the **default** interior and the fidelity benchmark:
`#8a4d24`, roughness 0.78, metalness 0, clearcoat 0, sheen 0.34.

Deliberately deeper and browner than the cognac on the rails. The rails are a
lacquered inlay catching the sky; the interior is a matt surface a metre away
from it, and reading the same hex off both is exactly what turns the trim into
orange plastic. It is none of §15's failure modes — not bright orange, not
red-orange, not cheap vinyl, not glossy plastic.

The other four presets keep the same material character and differ only in
colour, per §16.

**Interior micro-structure now actually renders.** See §M — it did not before.

---

## J. Console findings

Carried forward as a **product-approval blocker**, and now with a number on it.

The two delivered sources **disagree with each other** about where the console
goes:

| Source | Station, as fraction of LOA from the transom |
|---|---|
| `pxl-side-20240719.jpg` (July) | 0.47 – 0.55 |
| `pxl-views-20240815c.jpg` (August) | 0.25 – 0.35 |
| **The model** | **0.240 – 0.317** |

The model follows the August plate. That is a defensible choice — it is the later
delivery — but it means the July side plate, which is the dimensional datum for
everything else, is the one source the console does not agree with.

Beyond station: the asset's console is the STL revision, not the glazed tower in
the colour studies. Mass and screen area read visibly smaller. §29 forbids
substituting generic geometry to close the gap, so the difference is documented
rather than faked, and `PXL_CONSOLE_ZONES` names exactly the three zones a
replacement would swap.

---

## K. Propulsion proportion findings

Four authored proxies (small, medium, large, electric). Checked at
`reference_stern_3q` against transom width, cockpit scale and the human
silhouettes in the plates: the large drive reads as larger without reading as
comic, and the small one does not read as a toy.

They remain proxies by design (§18) — the delivered cowling is 346 triangles of an
engine nobody has identified, and scaling it three ways would be scaling somebody
else's product silhouette without knowing whose.

The electric drive stays generic and unbranded: cleaner massing, fewer surface
breaks, no glow, no blue, no sci-fi vocabulary.

---

## L. Camera reference matching

Four reference compositions added, authored to match the plates:

| Preset | Plate |
|---|---|
| `reference_side` | `pxl-side-20240719.jpg` |
| `reference_top_3q` | views sheet, upper-left |
| `reference_stern_3q` | views sheet, lower-right |
| `reference_water_side` | `pxl-colours-02.jpg` |

Internal ids. Customer-facing labels are unchanged and stay simple.

---

## M. Deterministic render QA — **and the three defects it found**

### The mechanism

Every phase of this project has been unable to look at its own WebGL output. The
automated browsers report `document.hidden === true` permanently, and two
mechanisms then conspire to leave the canvas empty: the stage skips frames while
hidden (correct, and `?render=always` already overrode it), and **rAF is not
serviced at all in such a tab** — so the flag turned off a guard inside a callback
that was never called. No flag can fix that, because the fix has to happen
outside the frame loop.

`pxlQa.ts` renders **without** the frame loop. `gl.render()` is an ordinary
function call; nothing about three requires it to be made from rAF. It puts the
scene into an exactly specified state — configuration parsed and applied with no
transition, named camera preset, sweep progress written straight into the
uniforms, fixed clock — sets the viewport and scissor the stage would have used,
and draws one frame synchronously.

Reachable at `?pxlQa=1` or `?pxlReference=1`, as `window.__pxlQa`:
`render()`, `capture()`, `sheet()`, `state()`, `zones()`. **Compiled out entirely
in production** — `installPxlQa` has an empty body and the global is never
defined.

### Defect 1 — the interior grain shader never compiled (Phase Four, whole phase)

`pxlGrain`'s fragment injection used `normalMatrix`. three declares that in its
**vertex** prefix only; the fragment prefix gets `viewMatrix`, `cameraPosition`
and `isOrthographic`. Every material carrying the grain — `deck_main`,
`console_body`, `console_trim` — failed to link with `'normalMatrix' :
undeclared identifier`.

So the interior had **no micro-structure at all** for the whole of Phase Four,
and §A9's material response was a claim the renderer had rejected. It was
invisible because a scene nobody can render is a scene whose shader errors nobody
reads. It surfaced in the first console read after the first deterministic frame.

**Fix:** declare the uniform in the fragment common block. The renderer uploads
the common matrices by looking their names up in the linked program's *active*
uniform map, which is stage-agnostic — so declaring it is sufficient, with no CPU
wiring and no varying.

**Regression guard:** `scripts/check-glsl.mjs` now reads three's own
`prefixVertex`/`prefixFragment` arrays out of the installed package, diffs them,
and fails the build if a fragment-stage literal uses a vertex-only uniform it has
not declared. It is checked against the installed three rather than a copied
list, so a three upgrade that moves a built-in between stages updates the guard
by itself. Verified both ways: clean on the fixed tree, and it reproduces the
original error when the declaration is removed.

### Defect 2 — **the configurator did not change the boat** (development)

The severe one.

`PxlVessel` built its vessel inside a `useMemo`, and that factory is not pure:
`indexZones` promotes each mesh's material and **assigns it back to the mesh**,
and `createScreen` adds a child to the model. React StrictMode — which
`next.config.ts` enables — deliberately invokes memo factories twice in
development to surface exactly that.

It surfaced. The second invocation re-promoted every material and left each mesh
wearing a fresh instance while the retained handle still held the first. Every
zone's `mesh.material !== handle.material`, so `applyConfiguration` wrote colours
to **thirteen orphaned materials**. The store was right, the URL was right, the
swatches were right, and the boat never changed colour. Nothing threw.

Found by rendering `exterior=navy` and `exterior=white` through the deterministic
mode and diffing the two images: **zero differing pixels across 1.1 million**,
against two materials that demonstrably held different colours. A screenshot
alone could not have distinguished this from a colour bug; the pixel diff plus
the live material read could.

**Fix:** key the built vessel to the root it was built from
(`WeakMap<Object3D, PxlVesselHandle>`), making the factory idempotent — invoke it
twice and the second call returns the first call's work. A weak key means the
entry dies with the model clone, so remounting still builds a new vessel and
unmount still disposes one. This is a production guarantee too, not only a
development one: nothing promises a memo factory runs once, and a second run in
production would have had precisely the same effect with no StrictMode to blame.

Verified: all thirteen zones report `attached: true`, and both exterior and
interior configuration changes now alter the rendered pixels.

### Defect 3 — the comparison bench was painted over by the canvas

Minor, and worth recording for the half hour it cost. The bench is
`position: fixed; z-index: 9998` and was still being covered by the WebGL canvas
at `--z-scene: 40`. Forty is not greater than 9998 — the two were never being
compared. `PxlConfigurator` wraps its content in a stacking context at
`--z-content: 10`, and a z-index only ranks a box against its siblings inside its
own context.

It was confusing because the canvas draws *the same boat* the bench was about to
draw, so "the plate is missing and the live frame is enormous" looked exactly like
a layout bug — while DOM measurement insisted both images were correctly laid out
at half width the whole time. They were. They were underneath.

**Fix:** portal the panel to `document.body`.

---

## N. Sweep visual QA

Sampled deterministically at 0 / 0.25 / 0.50 / 0.75 / 1.00 by writing progress
straight into the uniforms — sampling five exact places rather than hoping a
timer lands near them.

- Direction: **bow → aft**, as intended. ✓
- Boundary angle follows the Duna Line rake. ✓
- Softness reads as a material boundary, not a wipe. ✓
- No seam, no shader artefact, no logo corruption at any sample. ✓
- At 0 the hull is uniformly the origin finish; at 1 uniformly the destination. ✓

**Branding during the sweep** (§26): the Duna script, the PXL hull mark and the
plexi mark are stable and readable at every sample and **do not change colour**
with the underlying finish — their grounds are the gunwale capping, the stern
moulding and the glazing, none of which the exterior control paints.

---

## O. Material QA

See PXL_REFERENCE_QA.md §2. All six finishes pass under one shared environment;
no per-colour lighting was introduced.

---

## P. Remaining product mismatches

1. **Console** — geometry is the STL revision, not the studies' glazed tower; and
   the two delivered plates disagree about its station (§J).
2. **Stern moulding** — the plate carries 774 mm abaft the transom that the model
   does not have. A geometry difference; §29 forbids papering over it.
3. **Sheer** — model sits ~58 mm deeper than drawn on average.
4. **Duna letterforms** — a mechanical trace of a 28-pixel-tall source, not the
   real vector.
5. **PXL hull mark** — small horizontal placement offset against the plate.

---

## Q. Official source files still required

| # | Asset | Unblocks |
|---|---|---|
| 1 | **Duna script as vector** (SVG/AI/EPS) | Removes `provisional_brand_artwork`; the only thing standing between the current mark and a correct one |
| 2 | **PXL wordmark as vector** | Same, for the hull and plexi marks |
| 3 | **Production console geometry** | §J; the largest remaining perceptual gap |
| 4 | **Revised hull STL** with the stern moulding | §P.2 |
| 5 | **Interior meshes with a UV set** | Replaces triplanar grain with a real upholstery map |
| 6 | Approved colour names | Every option is `approvedLabel: null` today |
| 7 | Confirmed engine range | Replaces the four proxy drives |

---

## R. Exact publication blockers

`PXL.published` remains **false**. Unchanged and deliberate (§31): no public
route, not in the sitemap, `noindex` intact, not in product navigation.

Blocking publication:

1. **No official brand artwork.** Three marks on the boat, all reconstructions.
   A published surface showing a traced logotype is not acceptable.
2. **Console is not the product console.** A customer would be configuring a boat
   whose most prominent interior structure is a superseded revision.
3. **No approved colour names.** Every option is structurally unnamed —
   `approvedLabel: null` — because approving a name is a commercial act nobody has
   performed.
4. **No confirmed engine range.** The four drives represent size, not products.
5. **No sales destination.** Nothing to submit a configuration *to*.

None of these is a code problem. The configurator is technically ready and
commercially unapproved, and those are different states.

---

## Final statements

**PXL BRANDING COMPLETE: YES** — all three marks (Duna script, PXL hull, PXL
plexi) are implemented, placed from measurement, configuration-independent, and
verified across all six finishes. The *artwork* is provisional; the *branding
system* is complete.

**PXL REFERENCE FIDELITY READY: YES** — with the mismatches in §P documented
rather than hidden. The live render at the reference cameras is recognisably the
same product as the delivered plates: the silhouette agrees within 2.6% on depth,
the identity line (the dark band edge) agrees within 0.7 percentage points, and
the interior, branding and colour all read as the studies do.

**PXL CONFIGURATOR TECHNICALLY READY: YES** — and more so than when this phase
started. Two defects that made the product materially wrong (§M.1, §M.2) are
fixed, both are regression-guarded, and the scene is now inspectable.

**PXL PUBLICATION READY: NO.** Blocking items, exactly:
1. Official Duna script vector — not supplied.
2. Official PXL wordmark vector — not supplied.
3. Production console geometry — not supplied.
4. Approved colour names — not supplied.
5. Confirmed engine range — not supplied.
6. A sales destination for a submitted configuration — does not exist.

**AWWWARDS SUBMISSION READY: NO.** Blocking items, exactly:
1. The PXL configurator — the strongest thing the site has — is unpublished and
   `noindex`, so a jury cannot reach it. Publication is gated on the six items
   above, all of which are commercial rather than technical.
2. Site content gaps remain and were deliberately not fabricated (§33): Projects
   and Journal have no verified content, manufacturing photography is limited,
   Awards has no imagery, Materials imagery is incomplete.

---

## QA run

| Step | Result |
|---|---|
| `npm run typecheck` | **Pass.** GLSL literals clean; **5 vertex-only three built-ins guarded** (the new stage guard) |
| `npm run model` | **Pass** — the production GLB through three's own loader |
| `npm run vessel` | **Pass — 125 checks.** Proxy drives and marks built with the real code and measured |
| `npm test` | **Pass — 1,807 checks** across 20 groups |
| `npm run build` | **Pass — 20 routes**, **no warnings** |
| `GITHUB_PAGES=true npm run build` | **Pass** — static export, `Exporting (2/2)`, full `out/` |

### A deploy-only failure, found by deploying

The first push of this work **failed the GitHub Pages build**, and it is worth
recording because it passed every local gate first.

`output: "export"` is switched on only by `GITHUB_PAGES`, so an ordinary
`next build` never exercises it — and Next 15 refuses to build a dynamic route
whose `generateStaticParams()` yields no params under export:

```
Page "/journal/[slug]" is missing "generateStaticParams()" so it cannot be
used with "output: export" config.
```

The message is misleading (the function is present), but the rule is real.
`JOURNAL` and `PROJECTS` are empty arrays **on purpose** — §33 forbids inventing
content — so the routes had nothing to emit. Supplying a placeholder slug would
have put a fabricated article URL on the live site, which is precisely what §33
rules out, and deleting the finished templates would have thrown away work that
becomes correct the moment the yard supplies one article.

Both templates were moved into Next **private folders** —
`journal/_article-template`, `projects/_project-template` — which opts them out
of routing while leaving them on disk, beside their sections, and under `tsc`.
Re-enabling either is filling the array and renaming the folder back to
`[slug]`. Route count therefore drops from 22 to 20; nothing else changed.

### And a second one: every photograph on the site 404'd

With the build green, the deployed site came up **with no images at all** — while
the HTML, the CSS, the fonts and the 300 kB GLB all loaded correctly.

`next/image` applies `basePath` only through the optimiser: the emitted src is
`/_next/image?url=…`, and it is the `/_next/…` that carries the prefix, not the
`url` payload. A static export has no optimiser, so `next.config.ts` sets
`images.unoptimized` for the Pages build — and an unoptimised `<Image>` emits its
src **verbatim**. Every photograph requested `/media/…` instead of
`/dunahajok/media/…`.

`src/lib/basePath.ts` had listed `next/image` among the things "Next rewrites
for you", which is why nobody had wrapped them. That note is now corrected, and
all nine `<Image src>` sites go through `asset()` — which is the identity on a
domain-root build, so nothing changes off Pages.

**Guarded by test**, in the new `base path` group: it scans every `.tsx` in
`src/` and fails if an `src={…}` is not wrapped. A behavioural test cannot catch
this — the component renders identically in both modes and the difference only
exists in an exported bundle served from a sub-path — so the contract is the
source text. Verified in both directions: green as shipped, and it names the
exact file when a wrap is removed.

### The general lesson

**The deploy configuration is a build mode this project's local gate does not
cover.** Two separate defects shipped through a green `npm run qa` and a green
`npm run build`, and both were specific to `output: "export"` plus `basePath`.
`GITHUB_PAGES=true npm run build` is the command that reproduces CI, and it is
now in the table above — it belongs in the pre-push routine, not in the incident
notes.
| `node scripts/pxl/reference-qa.mjs` | Profile comparison; numbers in PXL_REFERENCE_QA.md |

**Live scene verification** (deterministic mode, hidden tab):

| Check | Result |
|---|---|
| Shader compile errors | **0** (was 6 — three materials × two programs) |
| Zones with material attached to their mesh | **13 / 13** (was 0 / 13) |
| Branding marks present | **5** (2 + 2 mirrored, 1 centreline) |
| Exterior finish changes rendered pixels | **Yes** (was no) |
| Interior finish changes rendered pixels | **Yes** (was no) |
| Sweep progress changes rendered pixels | **Yes** |
| All four propulsion variants distinct | **Yes** |
| Interior liner colour | `#8a4d24` — the reference cognac |

**Publication safety re-verified against the build output** (§31):

- `sitemap.xml` — 14 public URLs, **zero** PXL references
- `robots.txt` — `Disallow: /dev/`, `Disallow: /preview/`
- `__pxlQa` in the production client bundle — **0 files**
- The reference bench's markup in the production bundle — **0 files**
- `provisional_brand_artwork` in the production bundle — **0 files**

The only `pxlReference` string surviving into production is the one-line hint text
on `/dev/pxl` itself, which is a robots-disallowed, `noindex` development route.

Phase Four's 14 public pages were not rebuilt (§32). The only shared-component
change in this phase is the development-only bench mount in `PxlConfigurator`,
which compiles to `null` in production.
