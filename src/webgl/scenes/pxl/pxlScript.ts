/**
 * THE DUNA SCRIPT — PROVENANCE AND GEOMETRY-FACING SHAPE. §4, §5, §6.
 *
 * ── WHAT WAS SEARCHED FOR FIRST, AND WHAT WAS FOUND ────────────────────────
 *
 * §5 asks for the repository and the source delivery to be searched for real
 * Duna artwork before anything is drawn, and to prefer vector if it exists. The
 * search covered every SVG, PDF, AI/EPS-derived file, PNG, WebP, font and media
 * asset in the tree and in `assets/source`. What exists is:
 *
 *   • `assets/source/pxl/PXL-3D.stl` — geometry, with no branding on it;
 *   • seven raster design renders, in which the script appears at 147 × 28 px
 *     at its largest;
 *   • `public/media/brand-mark.webp` — a PHOTOGRAPH of the yard's own workshop
 *     signage, not a logo file;
 *   • no SVG, no PDF, no vector of any kind, no font, no brand sheet.
 *
 * So there is no official artwork, and §6 applies instead: reconstruct it for
 * the unpublished preview, from the plates, and mark it provisional. That is
 * what `pxlDunaTrace.generated.ts` is, and this file is the two things that
 * cannot be generated — the provenance that has to travel with it, and the
 * shape the scene consumes.
 *
 * ── WHY THE TRACE IS MECHANICAL, WHICH IS THE SECOND ANSWER TO THIS ────────
 *
 * The first implementation traced it BY HAND: five pen paths with width
 * profiles, sixty numbers read off a 12× enlargement, chosen to look like the
 * strokes a signature is made of. Its aspect ratio came out within 2.3% of the
 * plate's and it was still wrong — `npm run trace` renders the reconstruction
 * directly beneath the plate's own crop, and side by side the letters simply
 * were not the letters. The `una` came out as a zigzag where the reference has
 * arches; the D's bowl was too round; the swash had a kink in it that existed
 * only because two authored nodes were out of order.
 *
 * The lesson is worth writing down, because it will apply to the next mark
 * somebody has to reconstruct: a signature carries information at a scale a
 * person cannot eyeball off a 28-pixel image, and every place a hand trace is
 * wrong is a place it has quietly become a drawing of what the mark OUGHT to
 * look like. So the trace is now a threshold and a boundary walk over the
 * highest-contrast delivered instance — see `scripts/pxl/build-duna-trace.mjs`
 * — and nothing about the shape is anybody's opinion.
 *
 * ── WHY THIS MODULE IS PURE ───────────────────────────────────────────────
 *
 * `npm test` compiles the pure modules to CommonJS and runs them on plain node,
 * and the artwork's proportions are exactly what should be under test rather
 * than under review: the placement in `pxlModel` scales the mark's own bounding
 * box into a measured footprint on the hull, so a regenerated trace whose aspect
 * had shifted would silently move the lockup on the boat. The tests assert the
 * aspect against the plate's 5.25 and assert that the provisional flag is still
 * true.
 */

import {
  PXL_DUNA_COUNTERS,
  PXL_DUNA_OUTLINES,
  PXL_DUNA_RECTIFY,
  type PxlTraceContour,
} from "./pxlDunaTrace.generated";

export type { PxlTraceContour };

/**
 * PROVENANCE, TRAVELLING WITH THE ARTWORK.
 *
 * §6 asks for the reconstruction to be marked internally as provisional brand
 * artwork. This is that mark, and it is on the artwork rather than in a document
 * so that it cannot be separated from what it describes: the debug bench prints
 * it, the configurator tests assert it is still true, and the day an official
 * vector arrives the flag going false is the same commit that replaces the
 * generated file.
 */
export const PXL_DUNA_ARTWORK = {
  /** §6. True until Duna supply their own vector. */
  provisional_brand_artwork: true,
  /** The instance the contours were traced from. */
  tracedFrom: "assets/source/pxl/pxl-colours-04.jpg",
  /** The plate its undistorted proportions were taken from. */
  proportionedFrom: "assets/source/pxl/pxl-side-20240719.jpg",
  /** Largest instance available anywhere in the delivery, in plate pixels. */
  sourceResolution: "147 × 28 px",
  /** Single-axis correction applied to undo the study's foreshortening. */
  rectify: PXL_DUNA_RECTIFY,
  /**
   * What this is NOT.
   *
   * Printed on the bench verbatim, because the single most expensive mistake
   * available in this phase is somebody treating a trace as the identity and
   * putting it on something that gets printed.
   */
  disclaimer:
    "Traced reconstruction for the unpublished PXL preview. NOT Duna Hajók's " +
    "official logotype and not to be used as one. Replace with the supplied " +
    "vector before any published surface shows it.",
} as const;

/**
 * The mark's filled contours and its counters.
 *
 * Two lists rather than one, because a renderer needs to know which is which:
 * `THREE.Shape` takes counters as `holes` on the shape that contains them, and a
 * flat list would leave the consumer doing point-in-polygon tests to find out.
 *
 * THE COUNTER LIST IS CURRENTLY EMPTY, AND THAT IS THE PLATE'S ANSWER RATHER
 * THAN A GAP. At the resolution the mark exists at, the D's bowl and the a's
 * bowl are both open — the sweep passes below the bowl with a visible gap on the
 * left, exactly as a written signature does — so there is no enclosed background
 * in the mask to make a counter from. The list stays in the contract because a
 * higher-resolution source would produce them and nothing should have to change
 * on the day it does.
 */
export function dunaContours(): {
  outlines: readonly PxlTraceContour[];
  counters: readonly PxlTraceContour[];
} {
  return { outlines: PXL_DUNA_OUTLINES, counters: PXL_DUNA_COUNTERS };
}

/**
 * The mark's own bounding box, over every contour.
 *
 * Computed rather than declared, because it is what the placement scales
 * against: `pxlModel` authors the script's footprint on the hull in metres and
 * the geometry builder fits this box into it. Declaring it would mean a
 * regenerated trace could disagree with its own placement.
 */
export function dunaBounds(): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const contour of [...PXL_DUNA_OUTLINES, ...PXL_DUNA_COUNTERS]) {
    for (const [x, y] of contour) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { x0, y0, x1, y1 };
}

/** Length ÷ height of the traced mark. Asserted against the plate's 5.25. */
export function dunaAspect(): number {
  const b = dunaBounds();
  return (b.x1 - b.x0) / (b.y1 - b.y0);
}

/** Total vertices in the mark. Quoted in the phase report's cost table. */
export function dunaVertexCount(): number {
  return [...PXL_DUNA_OUTLINES, ...PXL_DUNA_COUNTERS].reduce((n, c) => n + c.length, 0);
}
