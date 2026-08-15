# HOMEPAGE STORYBOARD — PHASE 5

State map for the rebuilt Duna homepage. Every chapter below is authored
against one idea:

> The river creates the line. The line creates the hull. The hull becomes an
> object. The object reveals its materials and its makers. The object returns
> to the river. And the river remembers it as a wake.

Each entry records: **VISUAL STATE · TEXT · MEDIA · SCROLL · IN · OUT ·
WEBGL/DOM · MOBILE**.

Chapter numbering is the *narrative* numbering the page displays. It is not the
same as the Phase One section order, which is being dissolved.

---

## AUDIT VERDICT ON THE EXISTING PAGE

Classification of every current homepage section. This is the basis for the
rebuild; see `PHASE_5_REPORT.md` §A–C for the reasoning.

| # | Current section | Verdict | Reason |
|---|---|---|---|
| 01 | `Hero` | **REPLACE** | Composition is a top-left type stack over a letterboxed photo strip. The vessel is cropped in half and is not the subject. Two side-by-side CTAs. Upper 60% is dead black, not authored silence. |
| 02 | `ProductSplit` | **REWORK** | The raked pointer-driven divide is the single strongest idea on the page and is genuinely Duna-specific. Keep the mechanism. Rebuild the art direction around it: the two characters do not yet *feel* different, only labelled differently. |
| 03 | `TechnicalSpecs` | **REWORK** | Right instinct (oversized numerals, dimension line, no table). Wrong execution: the figures degrade into a five-item list, which is the card grid the brief forbids, wearing different clothes. |
| 04 | `StorySequence` | **REPLACE** | Three alternating image/text chapters — the most generic construction on the page. Could belong to any brand. Content survives; the format does not. |
| 05 | `CraftSection` | **REWORK** | The pinned macro→wide scale transition is the correct instinct for OBJECT → MATERIAL. It is under-committed: 180% of pin for one crossfade, and the type arrives late and small. |
| 06 | `MadeInGyor` | **REWORK** | Four-plate mosaic reads as a gallery, which §29 explicitly rules out with this little imagery. Two of the four plates are weak (`brand-mark`, `workshop-engine`). |
| 07 | `Timeline` | **REPLACE** | A horizontally-pinned timeline component dropped into the page — precisely what §34 forbids. It also eats a full pin for context, killing pace before the climax. |
| 08 | `AwardsFeature` | **REWORK** | Close to right. Compress to the single BIG SEE moment at monumental scale; demote the rest to a quiet list. |
| 09 | `PowerSelector` | **REWORK** | A `role="tablist"` widget — a control panel, not a narrative beat, and structurally a copy of the configurator's toggle (§32 forbids). Keep the verified content and the a11y rigour; change the form. |
| 10 | `EditorialCTA` | **REWORK** | Right ending, insufficient scale. The departure never happens: the boat does not leave, so the wake means nothing. |
| — | `Footer` | **KEEP** | Functional and well-built. Needs only the wake hand-off (§40). |

**Removed outright:** the `StorySequence` three-chapter format, the
`Timeline` horizontal pin, the `PowerSelector` tab widget, the hero's twin CTA
row, the `MadeInGyor` four-plate mosaic.

**Preserved wholesale:** the token system, the rake geometry (`--rake`,
`--rake-cut`), the motion vocabulary (`hull` / `glide` / `drift`), `WakeLine`,
`CinematicMedia`, `SceneSlot`, the single-root WebGL stage, `Lenis`+
`ScrollTrigger` wiring, the entire `src/content` factual layer, `Footer`,
`Header`, `MenuOverlay`, route transitions, and every PXL boundary.

---

## 00 — ARRIVAL  *(preloader and hero are one continuous moment)*

- **VISUAL** Near-black `--depth` field. One hairline waterline at 58vh, full
  bleed. Nothing else. The frame is almost empty and completely still.
- **TEXT** `DUNA`, small, mono-tracked, sitting *on* the waterline. No headline
  yet.
- **MEDIA** None. The plate is loaded but held behind a veil at opacity 0.
- **SCROLL** None — this is time-based, ~1.4 s, and does not block scrolling.
- **IN** Page paint. No spinner, no percentage, no fake progress bar.
- **OUT** A single disturbance travels left→right along the waterline. Behind
  it the `WakeLine` fan opens. As the fan reaches full width the veil lifts and
  the river resolves underneath it. **There is no loader-to-hero cut** — the
  disturbance that ends the arrival is the same wake that opens the hero.
- **WEBGL/DOM** DOM (hairline + `WakeLine` SVG + veil). The WebGL water fades
  up underneath during the veil lift, so a WebGL failure degrades to the
  photographic plate with no visible difference in the choreography.
- **MOBILE** Same beat, 0.9 s, disturbance travels a shorter arc. Waterline
  moves to 52vh.

## 01 — THE RIVER / HERO

- **VISUAL** The vessel plate is now **full-bleed**, not a bottom strip. The
  waterline is a composition line *across* the image, not a divider between
  black and photo. Type is distributed asymmetrically: label top-left, `DUNA`
  on the waterline, claim set right and low.
- **TEXT** `01 — HUNGARIAN BOATBUILDING SINCE 1991` · `BORN ON THE DANUBE.` /
  `BUILT BEYOND CONVENTION.` · `Scroll`. One entry link only.
- **MEDIA** `hero-danube`, full bleed, `objectPosition` tuned so the hull sits
  under the waterline. WebGL `hero-vessel` scene over it.
- **SCROLL** Authored 0→1 over the hero's own height. Not pinned.
  `0.00` still · `0.15` vessel emerges as the veil lifts · `0.30` claim
  separates upward · `0.45` vessel is the subject, type at 40% · `0.60` plate
  pushes forward · `0.75` wake develops strongly · `0.90` type gone ·
  `1.00` wake fills the frame and carries into 02.
- **IN** Continuous from 00.
- **OUT** Into the wake→line hand-off.
- **WEBGL/DOM** WebGL owns water, wake and camera (`heroProgress` already
  drives `heroConfig`'s authored camera states, including the existing
  `lineify` uniform). DOM owns all type. Canvas carries no text.
- **MOBILE** Vessel keeps ≥46vh of frame. Claim drops to `d3`. Waterline at
  52vh. Designed against 375 / 390 / 430.

## 02 — SIGNATURE #1 · WAKE → LINE

- **VISUAL** The wake's two arms expand until they leave the frame. Water
  detail drains out — foam, ripple and scatter fade, the arms straighten, the
  ground lightens from `--depth` to `--paper`. One arm survives the transition
  and lands as a single precise drawn line on off-white.
- **TEXT** None during the hand-off. Silence is the point.
- **MEDIA** None. This is pure geometry.
- **SCROLL** Pinned. ~140vh of travel. **Pin 1 of 3.**
- **IN** Hero progress 1.0 hands the wake geometry over at matching width,
  angle and screen position.
- **OUT** The surviving arm is already the sheer line that chapter 03 draws
  with.
- **WEBGL/DOM** Perceptual hand-off, not a crossfade: the WebGL `lineify`
  uniform straightens and desaturates the wake while an SVG path with the
  identical control points fades up beneath it. For ~12% of the pin both are
  on screen at the same geometry; then the canvas releases. **If WebGL is
  absent the SVG simply plays alone from the start** and the chapter still
  reads.
- **MOBILE** Not pinned. The same geometry plays across two viewport heights
  of ordinary scroll, at reduced arm spread.

## 03 — THE LINE

- **VISUAL** Restrained off-white. One line, developing. Enormous negative
  space — this is the quietest screen on the page and it is meant to be.
- **TEXT** `EVERY BOAT` / `BEGINS WITH A LINE.` (editorial serif) and one mono
  annotation, `02 — THE LINE`.
- **MEDIA** None until the last beat.
- **SCROLL** Scrubbed path draw, not pinned.
- **IN** From 02, already drawn.
- **OUT** The line resolves into the Duna 6.1 sheer.
- **WEBGL/DOM** DOM/SVG only. **No WebGL** — §16 and §49: nothing here is
  improved by a canvas.
- **MOBILE** Identical, single column, line rotated to use vertical space.
- **HONESTY (§15)** The path is derived from the real `duna61-cabin-profile`
  silhouette already generated in `public/media/vessel/`. It is presented as a
  design line, **never** annotated as a manufacturing drawing, and carries no
  fabricated CAD dimensions.

## 04 — SIGNATURE #2 · LINE → OBJECT · DUNA 6.1 REVEAL

- **VISUAL** The line becomes the upper hull edge. Surface fills beneath it,
  then material, then reflection, then water returns. Full-screen editorial —
  no card, no image-plus-paragraph.
- **TEXT** `DUNA` / `6.1` monumental · `A CONTEMPORARY DANUBE CLASSIC.` ·
  measurement annotations only.
- **MEDIA** `cabin-studio-profile` (the isolated studio plate) revealed
  *through* the line mask.
- **SCROLL** Pinned. ~160vh. **Pin 2 of 3.**
- **IN** From 03's completed line.
- **OUT** Ground darkens toward the character chapter.
- **WEBGL/DOM** SVG mask over DOM media. No WebGL.
- **MOBILE** Not pinned; mask reveal on ordinary scroll, portrait crop.

## 05 — PRODUCT SPEC MOMENT

- **VISUAL** The vessel with thin measurement lines drawn against it and three
  large isolated values. **Not five cards.**
- **TEXT** `6.10 m` LOA · `2.25 m` beam · `C` CE category. Verified figures
  only, from `PLATFORM_SPECS`.
- **MEDIA** Continues 04's plate.
- **SCROLL** Annotations draw in on scrub.
- **WEBGL/DOM** DOM + SVG.
- **MOBILE** Values stack; measurement lines redrawn vertically.

## 06 — TWO CHARACTERS · CABIN / KADÉT  *(SIGNATURE #3)*

- **VISUAL** One frame, one raked divide at `--rake`. Pointer shifts the
  divide. **The two sides are art-directed differently, not just labelled
  differently** — Cabin: warmer grade, slower easing, more negative space,
  serif accent. Kadét: cooler, sharper crop, faster easing, mono accent.
- **TEXT** `ONE PLATFORM.` / `TWO CHARACTERS.` · `CABIN` / `KADÉT` ·
  `EXPLORE CABIN` / `MEET KADÉT`.
- **MEDIA** `cabin-exterior` / `kadet-underway`.
- **SCROLL** Not pinned. Pointer-driven only.
- **WEBGL/DOM** DOM. `product-morph` slot retained for a future 3D morph.
- **MOBILE (§54)** No pointer dependency. Two full-bleed stacked plates, each
  with its own character grade and its own route link.

## 07 — CRAFT / MATERIAL  *(SIGNATURE #4 · OBJECT → MATERIAL)*

- **VISUAL** Macro crop pushes in until the boat is unrecognisable and the
  frame is pure teak grain. Then a few grain lines resolve into technical
  linework (§27), reconnecting to chapter 03.
- **TEXT** `CRAFTED,` / `NOT ASSEMBLED.`
- **MEDIA** `teak-rail` → `teak-bow` → `teak-deck`.
- **SCROLL** Pinned. ~180vh. **Pin 3 of 3.**
- **WEBGL/DOM** DOM. Existing `material-explorer` slot retained.
- **MOBILE** Not pinned; two-stage crop on ordinary scroll.

## 08 — DESIGNED ON THE DANUBE · BUILT IN GYŐR

- **VISUAL** Two cinematic full-bleed plates, not four. Scarcity made
  deliberate (§29): enormous type, negative space, one detail crop.
- **TEXT** `DESIGNED ON THE DANUBE.` / `BUILT IN GYŐR.`
- **MEDIA** `gyor-facility` and `gyor-boat-trailer` only. `brand-mark` and
  `workshop-engine` dropped from this chapter.
- **SCROLL** Not pinned.
- **MOBILE** Sequential full-bleed.
- **ASSET GAP (§30)** No usable hands/process photography exists. Logged in
  `ASSET_REQUIREMENTS.md` as the highest-value outstanding shoot.

## 09 — PROPULSION

- **VISUAL** Ground darkens. Water returns and is now moving. Two facing
  fields, not a tab widget.
- **TEXT** `SILENCE` / `POWER`. Verified figures only.
- **MEDIA** `cabin-studio-bow` / `suzuki-engine`.
- **SCROLL** Scroll reveals both; no widget state.
- **WEBGL/DOM** DOM. `drivetrain` slot retained.
- **A11Y** Both panels always present in the DOM — nothing hidden behind a
  control.
- **MOBILE** Stacked.

## 10 — HERITAGE + RECOGNITION  *(compressed)*

- **VISUAL** The design line from 03 returns as a chronological rule. Compact
  — one screen, not a pinned track. Flows straight into one monumental award
  statement.
- **TEXT** `1991 · 2016 · 2020 · 2022 · 2023` · then `BIG SEE` / `2023` /
  `PRODUCT DESIGN` / `WINNER`.
- **MEDIA** One plate: `cabin-exterior`.
- **SCROLL** Rule draws on scrub. Not pinned (§36 — history must not kill pace).
- **MOBILE** Vertical rule.

## 11 — THE RIVER RETURNS · DEPARTURE · CTA

- **VISUAL** Full water. The vessel begins leaving the frame. As it goes, the
  wake it leaves becomes the page's final line system and resolves directly
  into the footer.
- **TEXT** `WHERE WILL DUNA TAKE YOU?` · `ARRANGE A PRIVATE VIEWING` ·
  `EXPLORE THE BOATS`.
- **MEDIA** `hero-danube-alt`.
- **SCROLL** Scrubbed departure. Not pinned.
- **IN** From 10.
- **OUT (§40)** The wake does not stop — its lines become the footer's rules.
  No hard cut between CTA and footer.
- **WEBGL/DOM** `wake-water` slot; DOM fallback is a static departure frame.
- **MOBILE** Same beat, shorter travel.

---

## MOTION CONTRACT (§46)

One director. Every chapter obeys:

- **Easing** `hull` for arrivals, `glide` for scrubbed travel, `drift` for
  ambient. Nothing uses a GSAP default.
- **Durations** entrances 1.1 s · hand-offs 1.4 s · ambient ≥ 2.2 s.
- **Entry** always from the rake direction, never straight up.
- **Mask angle** always `--rake`. There is exactly one diagonal on this site.
- **Pins** exactly three (02, 04, 07). Nothing else pins. Desktop only.

## REDUCED MOTION (§55)

Every chapter has an authored static state. Nothing is hidden when motion is
off — masks resolve open, scrubbed paths render complete, pins release into
ordinary stacked layout, and the two propulsion fields and both characters are
fully present. `?motion=reduce` renders exactly this and is the state the QA
capture harness photographs.

## WEBGL BUDGET (§49)

WebGL appears in **three** places only: hero water/wake (01), the wake→line
hand-off (02), and the closing departure (11). Chapters 03–10 are DOM and SVG.
One canvas, no new contexts. The page is designed to read completely without it.
