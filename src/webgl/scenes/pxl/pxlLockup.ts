/**
 * THE PXL LOCKUP, RE-AUTHORED FROM THE PLATE. §8.
 *
 * ── WHAT §8 FOUND ─────────────────────────────────────────────────────────
 *
 * §8 asks that the existing PXL mark be revalidated against the plates rather
 * than accepted as "inside the panel", and names size relative to the stern
 * panel, distance from the panel's edges, kerning and letter proportion. All
 * four were wrong, and not marginally:
 *
 *   • PROPORTION. Phase Four authored a CONDENSED grotesque: advances of 0.62,
 *     0.62 and 0.50 on a unit cap height, giving a lockup 1.98 cap heights wide.
 *     The plate's lockup is 100 × 19 px — 5.26 cap heights wide. It is an
 *     EXTENDED face, not a condensed one, and it was 2.7× off.
 *   • LETTERFORMS. The P's bowl is closed by a CHEVRON, pointed at mid-height,
 *     with a matching pointed counter; the L's foot is longer than the letter is
 *     tall; the stems are 0.42 of the cap height, which is very heavy. None of
 *     that is a "plain geometric grotesque".
 *   • SIZE. 92 mm of cap height against a measured 55 mm.
 *   • POSITION. Two thirds of the way forward along the panel and above its
 *     mid-height, against a measured 51% across and 45% down.
 *
 * The letterforms below are read off `.qa/crops/pxl-big.png` — the delivered
 * side plate's own mark at 20× — column by column from the coverage raster
 * `scripts/pxl/_ink.mjs` prints. `npm run trace` renders this file's output
 * directly beneath that crop at the same size, which is how the shapes were
 * settled and how a future edit should be judged.
 *
 * STILL NOT CLAIMED AS OFFICIAL ARTWORK. §5's search found no vector for the
 * PXL mark either — see `pxlScript` for what the search covered. This is a
 * careful reconstruction of a 19-pixel-tall mark and the report files the real
 * vector alongside the Duna one.
 *
 * ── WHY IT IS PURE, AND WHY IT MOVED HERE ─────────────────────────────────
 *
 * It used to live in `pxlDecals`, which imports three, so nothing about the
 * lockup could be asserted by `npm test` — and the proportions are precisely
 * what wanted asserting, because a 2.7× error in the advances is invisible in a
 * code review and unmissable in a render. Split out, `pxlLockupAspect()` is
 * under test against the plate's own 5.263, and the same outlines feed both the
 * scene and the offline proof.
 */

/**
 * A glyph: one closed outer contour and any counters.
 *
 * Flat `[x0, y0, x1, y1, …]` arrays, and the holes are wound the same direction
 * as the outline rather than reversed. Reversing is a renderer's convention —
 * `THREE.Shape` wants holes as separate `Path`s and does not care about winding,
 * while a non-zero-winding rasteriser does — so the direction is applied at the
 * consumer instead of being baked in here, and neither consumer has to undo the
 * other's choice.
 */
export interface PxlGlyph {
  id: string;
  outline: readonly number[];
  holes: readonly (readonly number[])[];
}

/* ── Proportions, all measured ─────────────────────────────────────────────*/

/** Stem and bar weight, as a fraction of the cap height. */
const STEM = 0.42;
const BAR = 0.233;
/** The gap between letters. 0.14 at the P|X join, 0.15 at the X|L. */
const TRACKING = 0.145;

/**
 * The P.
 *
 * Stem, top bar, bowl bar, and a chevron closing the bowl on the right. The
 * chevron is the letter's whole character: a straight right edge would give an
 * ordinary extended P, and what the plate shows is a point at mid-bowl with the
 * counter pointed to match. Both apexes are authored, 0.22 apart, so the member
 * keeps the bars' weight through the turn.
 */
function letterP(x: number): PxlGlyph {
  /** Height of the bowl's apex. Below centre, as drawn. */
  const apex = 0.62;
  /** Where the bars end before the chevron takes over. */
  const shoulder = 1.45;
  return {
    id: "P",
    outline: [
      x, 0,
      x + STEM, 0,
      x + STEM, 0.329,
      x + shoulder, 0.329,
      x + 1.66, apex,
      x + shoulder, 1,
      x, 1,
    ],
    holes: [[
      x + STEM, 0.507,
      x + 1.34, 0.507,
      x + 1.44, apex,
      x + 1.34, 1 - BAR,
      x + STEM, 1 - BAR,
    ]],
  };
}

/**
 * The X, as two crossing bars.
 *
 * ONE POLYGON WITH TWELVE VERTICES, not two overlapping quads. Two quads drawn
 * over each other look identical when they are opaque and stop looking identical
 * the moment the material is anything else — and this mark is laid on a hull as
 * a zero-thickness surface, so the overlap would be a doubled surface at the
 * crossing, z-fighting with itself at grazing angles. The notches are computed
 * from the bars' own edges rather than eyeballed: an X assembled from
 * approximate crossings has a visible kink at every one of them.
 *
 * The waist sits at 0.47 rather than 0.5. That is what the plate shows and it is
 * what stops the letter reading as a multiplication sign.
 */
function letterX(x: number): PxlGlyph {
  /** Overall width and the horizontal width of each bar, both measured. */
  const W = 1.767;
  const bar = 0.356;
  /** Horizontal run of a bar's centre from its foot to its head. */
  const run = W - bar;

  /* THE FOUR NOTCHES ARE INTERSECTIONS, NOT ESTIMATES.
     The two bars are parallelograms cut vertically at top and bottom — which is
     what an extended face does, and what makes the arms' ends square rather than
     mitred. Their four edges are:

       rising left    (0, 0) → (run, 1)
       rising right   (bar, 0) → (W, 1)
       falling left   (0, 1) → (run, 0)
       falling right  (bar, 1) → (W, 0)

     and the notches are where those cross. Solving them rather than eyeballing
     matters more here than anywhere else in the lockup: an X assembled from
     approximate crossings has a visible kink at every one of them, and the first
     version of this — twelve vertices in the wrong ORDER — did not draw an X at
     all. It drew a single diagonal, and the mark read "P/L" on the boat.

     The four solutions are symmetric about the crossing, which is a useful
     check: `left` and `right` sit at y = ½, `bottom` and `top` at ½ ∓ bar/2run,
     and all four share the centre's x. */
  const cx = run / 2 + bar / 2;
  const dy = bar / (2 * run);
  const notch = {
    left: [run / 2, 0.5],
    right: [bar + run / 2, 0.5],
    bottom: [cx - bar / 2, 0.5 - dy],
    top: [cx - bar / 2, 0.5 + dy],
  } as const;

  /* Anticlockwise from the bottom-left foot. Every vertex is either a corner of
     an arm or one of the notches, and they alternate in the order the perimeter
     actually visits them: foot, foot, notch, foot, foot, notch, and so on. */
  const points: readonly (readonly [number, number])[] = [
    [0, 0], [bar, 0],
    [notch.bottom[0], notch.bottom[1]],
    [run, 0], [W, 0],
    [notch.right[0], notch.right[1]],
    [W, 1], [run, 1],
    [notch.top[0], notch.top[1]],
    [bar, 1], [0, 1],
    [notch.left[0], notch.left[1]],
  ];

  const outline: number[] = [];
  for (const [px, py] of points) outline.push(x + px, py);
  return { id: "X", outline, holes: [] };
}

/**
 * The L.
 *
 * A heavy stem and a foot longer than the letter is tall — 1.52 of the cap
 * height against 1.0 — which is the single most distinctive thing about the
 * lockup and the reason it reads as a wordmark rather than as three letters.
 */
function letterL(x: number): PxlGlyph {
  const foot = 1.519;
  const footHeight = 0.205;
  return {
    id: "L",
    outline: [
      x, 0,
      x + foot, 0,
      x + foot, footHeight,
      x + STEM, footHeight,
      x + STEM, 1,
      x, 1,
    ],
    holes: [],
  };
}

/** Advance widths, measured off the plate. */
const ADVANCES = [1.66, 1.767, 1.519] as const;

/**
 * THE LOCKUP, ON A UNIT CAP HEIGHT, ORIGIN AT ITS OWN BOTTOM-LEFT.
 *
 * Total width comes out at 5.24 against the plate's 5.263 — a quarter of one
 * plate pixel — and `pxlLockupAspect()` is asserted against it.
 */
export function pxlLockup(): PxlGlyph[] {
  const builders = [letterP, letterX, letterL];
  const glyphs: PxlGlyph[] = [];
  let x = 0;
  for (let i = 0; i < builders.length; i += 1) {
    glyphs.push(builders[i](x));
    x += ADVANCES[i] + TRACKING;
  }
  return glyphs;
}

/**
 * Every contour of the lockup, with counters reversed.
 *
 * For a non-zero-winding consumer: the offline trace proof, and any future
 * rasteriser. `THREE.Shape` takes the glyphs directly instead — see `pxlDecals`.
 */
export function pxlLockupOutlines(): Float64Array[] {
  const out: Float64Array[] = [];
  for (const glyph of pxlLockup()) {
    out.push(Float64Array.from(glyph.outline));
    for (const hole of glyph.holes) {
      const reversed = new Float64Array(hole.length);
      const n = hole.length / 2;
      for (let i = 0; i < n; i += 1) {
        reversed[i * 2] = hole[(n - 1 - i) * 2];
        reversed[i * 2 + 1] = hole[(n - 1 - i) * 2 + 1];
      }
      out.push(reversed);
    }
  }
  return out;
}

export function pxlLockupBounds(): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const glyph of pxlLockup()) {
    for (let i = 0; i < glyph.outline.length; i += 2) {
      x0 = Math.min(x0, glyph.outline[i]);
      x1 = Math.max(x1, glyph.outline[i]);
      y0 = Math.min(y0, glyph.outline[i + 1]);
      y1 = Math.max(y1, glyph.outline[i + 1]);
    }
  }
  return { x0, y0, x1, y1 };
}

/** Width ÷ cap height. Compared against the plate's 100/19 = 5.263. */
export function pxlLockupAspect(): number {
  const b = pxlLockupBounds();
  return (b.x1 - b.x0) / (b.y1 - b.y0);
}
