# PHASE 5 — HOMEPAGE REINVENTION

**Status: INCOMPLETE. Steps 1–3 of the required implementation order (§75) are
done. Steps 4–17 are not built.**

This report is written against §80's headings. Sections that describe work that
has not happened say so plainly rather than describing what is planned as though
it shipped.

| §75 step | State |
|---|---|
| 1. Audit the current homepage | **Done** |
| 2. Establish new storyboards | **Done** — `HOMEPAGE_STORYBOARD.md` |
| 3. Rebuild hero composition | **Done** — desktop verified, mobile unverified |
| 4. Wake → line transition | Not started |
| 5. Line → Duna 6.1 reveal | Not started |
| 6. Cabin/Kadét chapter | Not started |
| 7. Craft/material chapter | Not started |
| 8. Győr/manufacturing chapter | Not started |
| 9. Propulsion chapter | Not started |
| 10. Heritage/awards compression | Not started |
| 11. Final water/CTA | Not started |
| 12. Footer handoff | Not started |
| 13. Mobile adaptation | Hero only, and unverified |
| 14. Reduced motion | Hero only |
| 15. Performance | Not measured |
| 16. Visual QA | Partial — see §T |
| 17. Refinement pass | Not started |

The homepage as it stands today is therefore **a new hero attached to nine
Phase One sections**. It is not the Phase 5 homepage, and it should not be
reviewed as one.

---

## A. HOMEPAGE AUDIT

Conducted by reading every section's source and by inspecting the running page
in a browser at 1440x900 and 375x812.

Full section-by-section KEEP/REWORK/REPLACE/REMOVE table is in
`HOMEPAGE_STORYBOARD.md` under *Audit verdict on the existing page*. The
summary judgement:

The page was **technically competent and creatively inert**. Its problems were
not spacing or easing, which is why a refinement pass would not have fixed it:

1. **The hero did not show the product.** The vessel lived in a
   `clamp(11rem, 34vh, 26rem)` strip at the bottom of the frame, cropped
   through the middle of the hull, under a `--fs-mega` wordmark. The upper 60%
   of the first screen was empty `--depth` with a left-aligned type stack in
   it. That is not authored silence; it is an unbalanced composition.
2. **The organising idea did not survive contact with the asset.** The hero's
   entire concept is a waterline. The plate it was drawn over (`hero-danube`)
   is a three-quarter snapshot with no horizon in it, so the hairline had
   nothing to continue and read as a stray rule.
3. **Nothing connected to anything.** WOOD → LINE → HULL → WATER → WAKE existed
   as section headings, never as transitions. Every section began and ended at
   a hard edge.
4. **Three of ten sections were the exact constructions the brief forbids** —
   an alternating image/text sequence (`StorySequence`), a horizontally-pinned
   timeline component (`Timeline`), and a tab widget (`PowerSelector`).
5. **The strongest idea on the page was buried in section 02.** The raked,
   pointer-driven Cabin/Kadét divide is genuinely Duna-specific and is the one
   interaction that passes §74's uniqueness test. It is 1,200 px down the page.

### Defects found while auditing

Two real bugs, both found by looking rather than by testing:

- **The header collides with the H1** during its scroll transition — the nav
  links pass through "BORN ON THE DANUBE." Reproducible at ~100–200 px of
  scroll on desktop. **Not yet fixed.**
- **A `filter` on the full-bleed hero image stopped the layer painting** in
  Chromium in some compositing states, rendering the hero black while the DOM
  reported the image loaded, visible and opacity 1. Found during the rebuild.
  **Fixed** — the grade is done with blend layers instead, which is also
  cheaper on a layer the scroll sequence is scaling.

## B. WHAT WAS REMOVED

From the hero only, since nothing else has been rebuilt yet:

- The two-register layout (type block above, photo strip below).
- The twin CTA row (`Explore Duna 6.1` + `Discover the story`).
- The `--fs-mega` wordmark, reduced to `clamp(2.5rem, 7.5vw, 7.5rem)`.
- `hero-danube` as the hero plate.
- The `filter`-based image grade.

## C. WHAT WAS PRESERVED

Everything else. Specifically: the token system, the rake geometry, the motion
vocabulary, `WakeLine`, `CinematicMedia`, `SceneSlot`, `Type`, `ActionLink`,
the single-root WebGL stage and its `hero-vessel` contract (`trackHeroProgress`
still drives `heroProgress` from this section's own range), Lenis +
ScrollTrigger, the whole of `src/content`, `Header`, `Footer`, `MenuOverlay`,
route transitions, and every PXL boundary.

**PXL (§50):** untouched. The configurator has had no feature, schema, model or
cosmetic change. The homepage makes zero PXL requests and does not preload the
GLB — the `PxlProductScene` import remains lazy and gated on a `pxl-product`
slot, which the homepage does not contain.

## D. THE NEW NARRATIVE

Documented in full in `HOMEPAGE_STORYBOARD.md`: eleven chapters from ARRIVAL to
DEPARTURE, four signature transitions, exactly three pins, WebGL confined to
three moments. **Written, not built.**

## E. HERO REBUILD

The only chapter that exists.

**Composition.** The river is now the whole frame. The waterline is a line
drawn *across* the photograph rather than a border between a photograph and a
void, and it is set to `70%` — the height at which the hull actually meets the
water in the plate — so the drawn line continues the photographed one. Type is
distributed rather than stacked: label top-left, claim set right and low,
wordmark resting its baseline on the waterline at the left, scroll cue
bottom-left. The frame reads as a diagonal instead of a column.

**Plate.** Switched to `hero-danube-alt`: a full profile with the sheer running
the width of the frame, the wake trailing astern, and a real horizon. It is
also the silhouette chapter 03 will draw.

**Grade.** The source is a bright summer snapshot — measured across an 8×6
luminance grid it peaks at 210 in the top row against a `#0a0e0f` ground. It is
graded in three layers: a `saturation` blend plate at 0.55 (greens and blues
out, teak kept), a luminance-weighted scrim heavy over the sky and light over
the vessel, and a cool cast lifted from the WebGL scene's own horizon colour so
the canvas and the photograph grade as one river. **The boat itself is never
scrimmed.**

**Arrival (§7, §8).** Loader and hero are one moment. The page opens near-black
with one hairline on it. A disturbance — a bright segment of the line, not a
particle — travels along the line; the wake opens out of it; and the veil lifts
*while the wake is still opening*, so there is no seam between loading and
experience. The structural grade and the arrival blackout are deliberately two
elements: the first version had one element doing both jobs and the arrival
tween took the type's legibility ground with it.

**Choreography (§11).** One scrubbed timeline over the section's own range,
unpinned, with the storyboard's beats as positions: type separates at 0.30,
plate pushes at 0.45, wake develops at 0.60, wordmark leaves *along* the
waterline rather than upward. The same range drives the WebGL camera, so the
DOM sequence and `heroConfig`'s authored camera states are two halves of one
choreography.

**Mobile (§52, §53).** `cover` on a 375×812 viewport crops a 1920×1081 plate to
mid-hull — the vessel becomes unrecognisable. So mobile is a different edit: the
river is a lower band from 42%, proportioned so a landscape hull fits, with the
type on dark ground above it. **This is written but not visually verified — see
§T.**

## F–M. WAKE→LINE, LINE→PRODUCT, CABIN/KADÉT, CRAFT, GYŐR, PROPULSION, HERITAGE, CTA

**Not built.** All eight chapters are still the Phase One sections audited in
§A. Their designs are specified in `HOMEPAGE_STORYBOARD.md`.

## N. TYPOGRAPHY

Hero only. The `--fs-mega` wordmark was cut to roughly a quarter of its former
size, because at the mega step over a full-bleed vessel it lands squarely
across the helm and the crew — the most valuable part of the product shot. §9
asks that type not dominate the vessel; §42 asks for typographic rhythm rather
than everything being enormous. The monumental moment on this page is reserved
for the Duna 6.1 reveal, which has a plate composed around it. **The
site-wide type pass (§41) has not been done.**

## O. MOTION SYSTEM

The motion contract is specified in the storyboard. The hero obeys it. Nothing
else has been re-authored against it.

## P. WEBGL INTEGRATION

Unchanged and intact. One canvas, no new contexts. The `hero-vessel` slot now
wraps a full-bleed field rather than a 26 rem strip, which means the scene's
scissor rect is the viewport in this chapter — **this needs review against
`heroConfig`'s camera states, which were authored for a 3.5:1 letterbox band.
It has not been reviewed.**

## Q. MOBILE

Hero only, and unverified.

## R. ACCESSIBILITY

Hero preserves: one `<h1>` (visually hidden, carrying the full claim), the
decorative wordmark as `aria-hidden`, real links, no essential text on canvas,
and an authored reduced-motion end state rather than a hidden one. **No
keyboard, focus or contrast pass has been run over the page.**

## S. PERFORMANCE

Production build passes. Homepage first-load JS is **173 kB** (13.8 kB route +
103 kB shared), against 22 statically prerendered routes. The image `filter`
was removed from the scaled hero layer, which is a real saving on a
full-viewport composited element. **No measurement of LCP, CLS, long tasks,
draw calls, DPR or memory has been taken. §58 explicitly says do not guess, so
these are recorded as unmeasured rather than estimated.**

## T. VISUAL QA

**This is the weakest part of this report and the honest headline is that
Phase 5's visual QA is not in place.**

Three things obstructed it, all found by trying:

1. **Programmatic scrolling does not repaint in the review browser.** Setting
   `window.scrollTo` moves `window.scrollY` and moves the DOM, but a screenshot
   taken afterwards shows the previous frame. Verified by confirming
   `elementFromPoint` at the viewport centre reported the footer wordmark while
   the capture was still showing the hero. Only real input events composite.
2. **Lenis owns the scroll position** and rewrites `window.scrollY` from its own
   rAF, so programmatic scrolls are undone a frame later. A dev-only
   `window.__duna` handle was added to `SmoothScroll` to drive the real
   instance. This works; it does not fix (1).
3. **rAF is throttled while the review pane is hidden**, so GSAP timelines apply
   their from-values and never advance — the hero holds at its arrival frame
   with the veil opaque. Every "the page is black" result during this session
   traced back to (1) or (3), not to the page.

**Captured and judged:** the desktop hero at 1440×900, before and after, at
rest. That is the basis for §E's claims and nothing more.

**Not captured:** the ten frames §70 requires, any mobile frame in a settled
state, and any reduced-motion frame.

`?motion=reduce` already exists and disables Lenis and settles every reveal —
it is the right basis for a deterministic capture harness, but a harness that
does not depend on this browser's compositing still needs to be built.

## U. THREE WEAKEST INTERNAL ROUTES

**Not assessed.** §77 places this after the homepage reaches the required bar,
and it has not.

## V. IMPROVEMENTS MADE TO THEM

None.

## W. REMAINING AWWWARDS BLOCKERS

1. **Ten of eleven chapters are unbuilt.** Everything below the hero is the
   page that was rejected.
2. **All four signature moments are unbuilt.** These are what the submission
   would actually be judged on.
3. **The hero photography is a lifestyle snapshot.** Three passengers, a flag,
   harsh midday light. Grading gets it into the Duna palette; it does not make
   it industrial-design photography. Logged in `ASSET_REQUIREMENTS.md`.
4. **No visual QA harness**, so no claim about how the page looks at any scroll
   position can currently be verified.
5. **The header/H1 collision is unfixed.**
6. **The hero SceneSlot is now full-bleed** against camera states authored for
   a letterbox band. Unreviewed.
7. **No performance measurement.**

## §81 — FINAL ACCEPTANCE

§81 requires these to be answered by looking at the finished homepage. The
homepage is not finished, and eight of the twelve questions concern chapters
that do not exist. Answering them would be fabrication. What can be answered
from what was actually looked at:

| Question | Answer |
|---|---|
| Does the first view feel like a distinct Duna experience? | **Yes** — the arrival frame and the graded full-bleed river are specific to this brand. |
| Is the hero strong enough to be a portfolio hero on its own? | **No.** The composition is right; the photograph is not good enough. |
| Is the wake → line transition memorable and Duna-specific? | **Not built.** |
| Does the Duna 6.1 reveal feel like premium product design? | **Not built.** |
| Do Cabin and Kadét feel like two distinct characters? | **No** — unchanged from Phase One, where they are labelled differently but art-directed identically. |
| Does the craft section feel tactile and physical? | **No** — unchanged. |
| Does the homepage communicate the boats are built in Győr? | **Partially** — unchanged Phase One section. |
| Clear narrative from still water to departure? | **No.** One chapter of eleven. |
| Is mobile intentionally art-directed? | **Hero only, and unverified.** |
| Does the homepage still work without WebGL/motion? | **Hero: yes**, by construction. Rest: unchanged, unverified. |
| Is the new homepage far stronger than the previous one? | **The hero is. The homepage is not** — it is one rebuilt chapter on nine old ones. |
| Credible for an Awwwards submission? | **No.** Continue iterating, per §81. |
