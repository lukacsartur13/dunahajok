# Asset requirements — Duna Hajók

Updated for **Phase 4.1**: the site is fourteen public pages plus the PXL
configurator. Phase 4.1 closed the branding gaps with *provisional* artwork and
opened two new geometry requirements (F-07, F-08) that only the yard can close.
§B28.

**Priorities.** `P0` blocks launch quality — a page that cannot be finished, or
a claim that cannot be made honestly, without it. `P1` is a major improvement to
a section that is currently working harder than its photography. `P2` is
optional enhancement. The Phase One/Two `P1–P3` sections below are retained
unchanged where they are still accurate; the Phase Four table supersedes them
where they conflict.

---

## PHASE FOUR — WHAT THE NEW PAGES NEED

### P0 — required for launch quality

| # | Asset | Page · section | Subject | Camera / orientation | Resolution | Type | Notes |
|---|---|---|---|---|---|---|---|
| F-01 | **Duna script logotype, vector** | PXL configurator — gunwale capping | The "Duna" script mark shown on the capping in both delivered PXL renders | — | SVG or AI outlines | vector | **Phase 4.1: the slot is no longer empty.** It carries a mechanical threshold trace of the largest delivered instance (147 × 28 px), marked `provisional_brand_artwork: true` and disclaimed in `pxlScript.ts`. Placement, scale, baseline and ink are measured and correct — **only the letterforms are a reconstruction**. Supplying the vector replaces one generated file (`pxlDunaTrace.generated.ts`) and flips the flag; no scene architecture changes. Still P0: a published surface must not show a traced logotype. |
| F-02 | **PXL model re-exported with a UV set** | PXL configurator | The same GLB, unwrapped | — | — | 3D | No mesh has a `uv` attribute — the source is an STL. Unblocks a real branding decal and any albedo/roughness map. Worked around today with triplanar projection. |
| F-03 | **PXL brand artwork** | PXL configurator — stern moulding **and windscreen** | The PXL wordmark as delivered by the studio | — | SVG | vector | The mark is authored geometry re-proportioned in Phase 4.1 from the plate's own 100 × 19 px lockup, with the ink measured off 889 plate pixels (`#d6703c`). It is **not** claimed to be Duna's logotype. Now used in **two** places — the stern moulding and the plexi (`pxl_plexi`), which take different inks and different transforms; one vector serves both. |
| F-07 | **Production console geometry** | PXL configurator — console, screen, helm | The console as shown in the colour studies — the glazed tower, not the STL revision | — | STEP or GLB | 3D | **P0, and the largest remaining perceptual gap.** The delivered STL's console is a superseded revision, and the two delivered plates disagree about its station (July 0.47–0.55 LOA from the transom, August 0.25–0.35; the model follows August). §29 forbids substituting generic geometry, so the mismatch is documented instead. `PXL_CONSOLE_ZONES` names exactly the three zones a replacement swaps: `console_body`, `console_trim`, `helm_wheel`. |
| F-08 | **Revised hull STL with the stern moulding** | PXL configurator — transom | The rubbing moulding aft of the transom | — | STL or STEP | 3D | The side plate carries **774 mm of moulding abaft where its sheer ends**; the delivered mesh's transom is vertical within 18 mm. The single largest silhouette difference between plate and model, and a geometry difference rather than a material one. See PXL_REFERENCE_QA.md row 5. |
| F-04 | **Award photography — 4 items** | `/story/awards` | BIG SEE 2023 (Ljubljana, accepted by Péter and Szilvia Győrffy-Domokos), Budapest Boat Show 2023, two Hungarian Design Award selections | Any — trophy, certificate, ceremony or the boat on the stand | 3000px+ long edge | photo | The page ships with **no imagery at all**, because the library contains none and §B29 rules out generic stock. It is typographic by necessity as much as by design. |
| F-05 | **Workshop photography — 8–12 frames** | `/craft/manufacturing` | Hull laminating, teak laying, joinery bench, fit-out, a boat mid-build, people at work | Mixed: two wide establishing, four process mid-shots, four detail | 4000px+ long edge, landscape and 4:5 | photo | The page is three movements because two usable workshop photographs is what exists. It should be six. |
| F-06 | **Verified project case study — 1 minimum** | `/projects` | Any completed renovation or custom commission the yard is willing to publish, with client consent | Before / during / after, 6–10 frames | 3000px+ | photo + facts | `PROJECTS` is an empty typed array and the detail template is built. The page currently describes the capability and says plainly that individual commissions have not been published. |

### P1 — major improvement

| # | Asset | Page · section | Subject | Camera / orientation | Resolution | Type | Notes |
|---|---|---|---|---|---|---|---|
| F-07 | **Materials macros — glass, composite, paint** | `/craft/materials` | Windscreen edge and fitting; a laminate section or gelcoat surface; a sprayed topcoat | Macro, 100mm+, raking light | 4000px+ | photo | The page covers **four** surfaces because glass and composite have no photography and no statement from the yard. §B9 lists five. |
| F-08 | **Cabin interior — three additional frames** | `/boats/duna-61-cabin` — reveal + gallery | The saloon from the helm position, the berth made up, the table folded | Same eye height as `cabin-studio-profile` for the reveal pair | 4000px+ | photo | The pinned reveal transitions between an exterior and an interior shot; it is strongest when the two share a camera position. |
| F-09 | **Kadét profile, studio** | `/boats/duna-61-kadet` — racing line | Dead abeam, whole boat, neutral ground | Profile, 0° azimuth, sheer at frame centre | 5000px+ landscape | photo | The scroll-drawn sheer line is authored to the 6.1's profile. It lands best over a true profile frame; `kadet-underway` is a three-quarter. |
| F-10 | **Suzuki showroom, Győr** | `/suzuki-marine` | The joint boat and engine showroom interior | Wide, eye level | 4000px+ | photo | The section currently reuses `suzuki-engine` and `kadet-underway`. **No Suzuki brand assets may be added** without written permission — see `SUZUKI_BLOCKERS`. |
| F-11 | **Portrait — Péter Győrffy** | `/contact`, `/contact/private-viewing` | The managing director, at the workshop | Environmental portrait, 3:4 | 3000px+ | photo | The private-viewing page names him as the person who answers. A face makes that a promise rather than a line. |
| F-12 | **Journal launch content — 3 articles** | `/journal` | Anything real: a build note, a boat show, a design decision | Per article: 1 hero + 3–6 supporting | 3000px+ | photo + copy | The index and the article template are built and exercised by the empty case. Publishing is adding objects to `JOURNAL`. |

### P2 — optional enhancement

| # | Asset | Page · section | Subject | Camera / orientation | Duration | Type | Notes |
|---|---|---|---|---|---|---|---|
| F-13 | **Hero video loop** | `/` | The 6.1 underway on the Danube | Tracking, from a chase boat | 8–12 s, seamless | video, H.264 + AV1 | Would replace the still hero. Must loop without a visible cut. |
| F-14 | **Workshop process video** | `/craft/manufacturing` | Teak being laid, hands only | Locked-off, overhead | 6–10 s, silent, looping | video | One loop, one movement. Not a corporate film. |
| F-15 | **Heritage archive scans** | `/story/heritage` | Anything from 1991–2015: the joinery shop, early vessel work, the first Duna drawings | Flatbed scans acceptable | 300 dpi | scan | The chronicle's first two dates currently borrow `heritage-salon` and `design-render`. Genuine archive material would make the page. |
| F-16 | **PXL interior render, cognac** | PXL configurator fallback | The cockpit in each interior option | Cockpit preset | 2400px+ | render | The no-WebGL fallback shows the six exterior colour studies. There is no reference render of any interior option. |

### What was deliberately NOT solved with stock — §B29

Three sections are visibly restrained rather than filled:

- **Awards** carries no imagery.
- **Manufacturing** is three movements rather than six.
- **Materials** covers four surfaces rather than six.

Each of those is a decision, recorded here, in preference to a generic yacht or
workshop photograph that would make the page look finished and the company look
like somebody else's.

---

## PHASE ONE / TWO — retained

The sections below were written for the homepage and the WebGL groundwork. They
remain accurate; where a priority letter here conflicts with the Phase Four
table above, the table above is current.

---

# (Phase One → Phase Two)

Everything the Phase One homepage ships today is derived from the existing
dunahajok.hu media library (see `scripts/build-assets.mjs` for the exact source
file behind every asset). That library is good — the studio set in particular is
genuinely strong — but it was shot for a WordPress theme, not for a full-bleed
art-directed site. This document lists what has to be produced to take the site
from *very good with what exists* to *SOTD-grade*.

Items are ordered by impact. **P1** blocks the site from looking finished at
retina resolution; **P2** unlocks a section that is currently working harder
than its photography; **P3** is Phase Two groundwork.

---

## Systemic problems with the current library

These affect many files at once and are worth fixing at the source.

### S-1 · Burned-in marketing typography — **P1**
Most of the recent riverside photography carries baked-in captions
(`DUNA 6.1 KADÉT`, `DUNA HAJÓK — DESIGN ›`, `BALATON BOAT SHOW`, gallery
badges). The pipeline crops them off, which costs composition — `kadet-exterior`
loses 31% of its frame, `design-render` 31%, `pair-onshore` 19%.

**Required:** clean masters of every library image, with the type on a separate
layer or simply absent. No new photography needed — just the originals.

### S-2 · Resolution ceiling — **P1**
The library tops out at 1920–2048px on the long edge. A full-bleed hero on a
1440pt retina display needs 2880px; on a 1728pt MacBook Pro, 3456px. Everything
full-bleed is currently soft on high-DPI screens.

**Required:** re-export from camera originals at ≥3840px on the long edge,
sRGB, minimal sharpening. If the originals are gone, the affected frames need
re-shooting (see HERO-01, CRAFT-01).

### S-3 · No colour-managed house grade
The library mixes phone snaps, event coverage and professional studio work.
`scripts/build-assets.mjs` applies a per-asset saturation/brightness nudge to
pull them together, which is a patch, not a grade.

**Required:** one LUT or grade recipe applied at export. Reference: the studio
set (`S2j`, `S5`, `S3`) — cool neutral shadows, restrained saturation, no
crushed blacks.

---

## P1 — Blocking

### HERO-01 · Hero plate
- **Subject:** Duna 6.1 Cabin under way on the Danube, three-quarter bow, wake
  fully formed and reading across at least half the frame.
- **Framing:** boat occupying 40–55% of frame width, positioned left of centre;
  clean water to the right for the wake to run into. Horizon out of frame or in
  the top 15%.
- **Aspect:** 16:9 master, safe for a 3.6:1 centre crop (the hero plate is a
  letterboxed band). Deliver the uncropped 16:9.
- **Resolution:** ≥4000px wide.
- **Lighting:** overcast or the last 90 minutes before sunset. Avoid midday —
  the current hero has specular blowout on the water.
- **Section:** 01 Hero. Also becomes the OG image.
- **Device:** desktop and mobile (mobile uses a taller crop of the same frame,
  so keep vertical headroom).
- **Replaces:** `hero-danube`.

### HERO-02 · Hero motion loop
- **Subject:** the same boat, same conditions, running at a steady 8–10 km/h.
- **Camera movement:** locked off on a long lens, or an extremely slow dolly
  left-to-right. No handheld, no drone orbit — the hero must feel still.
- **Duration:** 8–12 s, cut to loop seamlessly (match first and last frame).
- **Delivery:** H.265 and VP9/AV1, 1920×1080 and 2560×1440, ≤2.5 MB for the
  1080 version, no audio.
- **Section:** 01 Hero, replacing the still plate inside the existing
  `SceneSlot scene="hero-vessel"`.
- **Device:** desktop only; mobile keeps the still (see PERFORMANCE note in
  README).

### CRAFT-01 · Teak macro
- **Subject:** hand-finished teak decking or a gunwale cap, close enough that
  the grain and the caulking seam are the whole subject.
- **Framing:** the plank running diagonally, ideally near the site's 6.5° rake.
- **Aspect:** 3:2, **≥6000px wide** — this frame is scaled to 155% at the start
  of the section-05 pull-back and must stay sharp at that scale.
- **Lighting:** raking side light to bring up the grain; no direct reflections
  in the varnish.
- **Section:** 05 Craft, first plate of the dissolve.
- **Device:** both.
- **Replaces:** `teak-rail`, which is a phone snapshot and is the weakest link
  in an otherwise strong section.

### BRAND-01 · Open Graph image
- 1200×630, the hero frame with the DUNA wordmark and
  "Born on the Danube. Built beyond convention." set in the site's own type.
- Currently the OG image is the raw hero plate with no typography.

### BRAND-02 · Favicon / app icons
- Source SVG of the `D` mark, plus 32/180/192/512 PNG and `site.webmanifest`.
- Currently absent — the browser tab shows the default document icon.

---

## P2 — Section-unlocking

### PRODUCT-01 · Kadét studio profile
- **Subject:** Duna 6.1 Kadét, dead-side profile, on the same concrete plinth,
  in the same studio, with the same lens and light as the existing Cabin set
  (`2022/05/S2j.jpg`).
- **Why:** section 02 compares two boats, and section 03 dimensions one of
  them. The Cabin has a gallery-grade studio set; the Kadét has none, so the
  comparison is currently made with two riverside photographs instead of two
  isolated products, and the dimensioned drawing can only ever show the Cabin.
- **Aspect:** 16:10, ≥4000px. Match the Cabin's camera height and distance
  exactly so the two can be cross-faded.
- **Section:** 02, 03, 09.
- **Device:** both.

### PRODUCT-02 · Kadét studio bow + helm
- The Kadét equivalents of `S5` (bow-on) and `S3` (helm detail). Same studio,
  same session as PRODUCT-01.

### WORKSHOP-01 · Hands on the work
- **Subject:** a joiner's hands laying, clamping or fairing teak. Faces
  optional; hands and material are the subject.
- **Framing:** three or four frames — close on the hands, medium at the bench,
  wide of the shop floor.
- **Aspect:** mixed; supply at least one 4:5 and one 3:2.
- **Lighting:** available workshop light. Do not light it like a catalogue.
- **Section:** 04 Tradition, 06 Made in Győr.
- **Device:** both.
- **Note:** the brief's "hands / workshop / craft" imagery does not exist in the
  library at all. Section 06 currently carries the manufacturing story with a
  building exterior, a maker's plate, a boat on a trailer and a Suzuki service
  bench — competent, but it never shows a person making anything.

### WORKSHOP-02 · Hull under construction
- **Subject:** a bare hull in the shop — lay-up, fairing, or the moment before
  the deck goes on.
- **Aspect:** 3:2 and 16:9, ≥3000px.
- **Section:** 06, and the 2016/2020 milestones in section 07.

### WORKSHOP-03 · Launch
- **Subject:** a finished boat going into the water — crane, slipway or trailer.
- **Format:** stills plus 6–10 s of video, locked off.
- **Section:** 06 Made in Győr, closing frame.

### POWER-01 · Electric drivetrain
- **Subject:** the e-motor, its mounting, the battery bay, the controller.
- **Framing:** one clean isolated product shot on seamless, plus two detail
  frames in situ.
- **Aspect:** 4:3, ≥3000px.
- **Lighting:** studio, matching the existing boat studio set.
- **Section:** 09 Power, Electric panel — which currently borrows the Cabin bow
  studio shot because there is no photograph of the electric drive anywhere in
  the library. It is the single largest content gap on the page.
- **Device:** both.

### STORY-01 · Design drawings
- **Subject:** the actual GA drawing, lines plan or early sketches for the 6.1.
- **Delivery:** vector (PDF/AI/SVG) if it exists — the design chapter is built
  to draw line work, not to display a raster.
- **Section:** 04 Design, 07 (2016 milestone).
- **Note:** no engineering diagram has been fabricated for Phase One. The
  Design chapter uses the existing marketing render and an abstract measurement
  grid instead. Nothing on the page claims to be a technical drawing that isn't.

### PEOPLE-01 · Portrait
- **Subject:** Péter Győrffy, and a group frame of the workshop team.
- **Framing:** environmental, in the works. Half-length, natural light.
- **Aspect:** 4:5, ≥2400px.
- **Section:** 06, and a future Story page.

### AWARDS-01 · Award photography
- **Subject:** the BIG SEE ceremony in Ljubljana, the award object itself, and
  the boat as exhibited.
- **Why:** section 08 is deliberately typographic and needs no logos, but a
  future Awards page will.

---

## P3 — Phase Two (WebGL)

### 3D-01 · Duna 6.1 hull model
- **Delivery:** GLB, ≤8 MB draco-compressed, real-world scale in metres, Y-up,
  origin at the waterline amidships.
- **Topology:** one mesh per material group (hull, teak deck, joinery, glass,
  stainless, upholstery, outboard). Cabin and Kadét as morph targets or as two
  meshes sharing a hull, so the `product-morph` scene can transition between
  them.
- **Maps:** 2K PBR (base colour, ORM, normal), 4K for the teak deck only.
- **Consumes:** `SceneSlot scene="hero-vessel"`, `"product-morph"`.

### 3D-02 · Material scans
- Teak, lacquered hull, upholstery leather, stainless — photographed flat under
  cross-polarised light for tiling PBR sets.
- **Consumes:** `SceneSlot scene="material-explorer"`.

### 3D-03 · Drivetrain model
- Simplified electric drivetrain — motor, shaft, propeller, battery — as a
  separate GLB for the cutaway.
- **Consumes:** `SceneSlot scene="drivetrain"`.

### 3D-04 · HDRI
- Two environments captured on site: overcast river, and the Győr workshop.
- 4K equirectangular HDR.

---

## Delivery spec (all photography)

| | |
|---|---|
| Colour space | sRGB (deliver ProPhoto/AdobeRGB masters separately if available) |
| Bit depth | 16-bit masters, 8-bit web derivatives |
| Format in | TIFF or full-quality JPEG. **Not** screenshots, not re-saved web JPEGs |
| Format out | Handled by `npm run assets` — do not pre-optimise |
| Naming | `duna-<section>-<subject>-<nn>.tif` |
| Typography | **None burned in.** Ever. |
| Retouching | Remove registration numbers and third-party branding where it is not Suzuki |

Drop new masters into `scripts/.cache/` or point `ASSETS` in
`scripts/build-assets.mjs` at a local path, then run `npm run assets`.
