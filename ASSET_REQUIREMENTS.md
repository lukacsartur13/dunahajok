# Asset requirements — Duna Hajók, Phase One → Phase Two

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
