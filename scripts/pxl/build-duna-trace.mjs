#!/usr/bin/env node
/**
 * TRACE THE DUNA SCRIPT OFF THE DELIVERED PLATE. §6.
 *
 *   node scripts/pxl/build-duna-trace.mjs
 *   npm run duna
 *
 * Writes `src/webgl/scenes/pxl/pxlDunaTrace.generated.ts`.
 *
 * ── WHY THIS IS GENERATED RATHER THAN AUTHORED ─────────────────────────────
 *
 * §6 sets out the process for a mark with no supplied vector: find the clearest
 * instance, rectify it, trace the silhouette carefully, produce a lightweight
 * vector. The first attempt did the tracing BY HAND — a pen path with a width
 * profile, sixty numbers read off an enlargement — and the trace proof
 * (`npm run trace`) is why it was thrown away: the aspect ratio came out within
 * 2%, and the letters still did not look like the letters. A signature has
 * information in it at a scale a person cannot eyeball off a 27-pixel image, and
 * every place the hand trace was wrong was a place it had quietly become a
 * drawing of what a script Duna *ought* to look like.
 *
 * So the trace is mechanical. Threshold the clearest instance, follow the ink's
 * own boundary, simplify, rectify. Nothing is invented, the result is
 * reproducible from the delivered file, and re-running it after a better source
 * arrives is the whole of the update.
 *
 * ── WHICH INSTANCE, AND WHY IT NEEDS RECTIFYING ────────────────────────────
 *
 * `pxl-colours-04.jpg`'s navy study has the mark light on near-black — the
 * highest contrast of any delivered instance, and the only one where a threshold
 * separates ink from ground cleanly. The side plate has it dark on dark, where no
 * threshold does.
 *
 * The cost is that the water studies are three-quarter views, so the mark is
 * foreshortened ALONG THE HULL and not across it. That is a single-axis scale,
 * which is exactly what §6's "rectify perspective if necessary" is for: the side
 * plate — the one true profile in the delivery — gives the mark's undistorted
 * aspect as 147/28 = 5.25, and x is scaled to restore it. Nothing else is
 * corrected, because nothing else is distorted: a mark lying on a near-vertical
 * capping seen from slightly above and forward is compressed in one direction
 * and rotated in-plane by an angle too small to measure at this size.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

/* ── The source window ────────────────────────────────────────────────────*/

/**
 * The mark in `pxl-colours-04.jpg`, with margin on every side.
 *
 * Located by `scripts/pxl/_ink.mjs`, which isolated 145 × 15 px of BRIGHT CORE
 * inside it. The window is deliberately much larger than that core, and both
 * directions cost a pass to learn: the entry flourish's left end and the swash's
 * right end fade into the ground over three or four columns, so a window cropped
 * to the core loses the two features that make the mark a signature; and the D's
 * bowl reaches four rows above the core, so a window cropped to the core's rows
 * decapitates the only capital in the mark.
 */
const WINDOW = { left: 1464, top: 1719, width: 152, height: 32 };

/** The undistorted aspect, from the side plate. See the file note. */
const TRUE_ASPECT = 147 / 28;

/**
 * Enlargement before thresholding.
 *
 * Lanczos to 8× first, threshold second — not the other way round. Thresholding
 * at native resolution gives a 1-pixel-quantised mask whose contour is a
 * staircase, and no amount of smoothing afterwards recovers the curve; the
 * upscale puts the threshold on an interpolated surface, so the contour lands
 * between the original pixels where the edge actually was.
 */
const ZOOM = 8;

/**
 * Luminance above which a pixel is ink.
 *
 * The mark reads 44–84 against a ground of 1–30 in this study, and 40 is not a
 * midpoint — it is the highest value at which the mark is still one connected
 * drawing. At 46 the entry flourish separates from the D; at 52 the D loses its
 * bowl entirely and the swash breaks into dashes. The thin strokes are thin
 * because they are hairlines at 28 pixels tall, so the threshold has to be set
 * by what survives rather than by where the histogram's valley is.
 */
const THRESHOLD = 40;

/**
 * Contours shorter than this many upscaled pixels are dropped.
 *
 * JPEG ringing produces a scatter of two- and three-pixel islands along the
 * capping's bright upper edge. The smallest real feature in the mark — the
 * wedge terminal — has a perimeter of about 90 at this zoom, so the cut is
 * nowhere near anything that matters.
 */
const MIN_PERIMETER = 40;

/** Douglas-Peucker tolerance, in upscaled pixels. */
const SIMPLIFY = 1.1;

/* ── Mask ─────────────────────────────────────────────────────────────────*/

const { data, info } = await sharp(path.join(ROOT, "assets/source/pxl/pxl-colours-04.jpg"))
  .extract(WINDOW)
  .resize({ width: WINDOW.width * ZOOM, kernel: "lanczos3" })
  /* One pixel of blur AT THE UPSCALED SIZE, which is an eighth of a source
     pixel — far too little to move an edge, and just enough to stop the JPEG's
     8×8 block boundaries from putting a notch in every stroke they cross. */
  .blur(1.2)
  .raw()
  .toBuffer({ resolveWithObject: true });

const W = info.width;
const H = info.height;
const C = info.channels;
const mask = new Uint8Array(W * H);
for (let i = 0; i < W * H; i += 1) {
  const l = 0.2126 * data[i * C] + 0.7152 * data[i * C + 1] + 0.0722 * data[i * C + 2];
  mask[i] = l > THRESHOLD ? 1 : 0;
}

/* No rows are masked off. An earlier window sat high enough to catch the bright
   hairline where the capping meets the deck, and was fixed by blanking the top
   quarter — which also blanked the D. The window above clears the hairline
   instead, which is the fix that does not have a second thing to get wrong. */

/* ── Boundary following ───────────────────────────────────────────────────*/

/**
 * Every closed contour in the mask, as arrays of `[x, y]` in mask pixels.
 *
 * MOORE BOUNDARY TRACING, on a labelled mask. The alternative — marching squares
 * over the whole grid — produces the same contours but hands them back as
 * unordered segments that then have to be stitched, and the stitching is where
 * a self-touching stroke (the D's stem crossing its own sweep, twice in this
 * mark) gets joined up wrongly. Following the boundary from a known start point
 * cannot make that mistake: it walks one component's edge and returns to where
 * it began.
 *
 * Holes are found the same way, by tracing the boundary of each background
 * component that is not the outer one — the counters of the D's bowl and of the
 * a, and the eyes the una's arches enclose.
 */
function traceComponents(source, width, height, foreground) {
  const seen = new Uint8Array(width * height);
  const contours = [];
  const at = (x, y) =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : source[y * width + x];

  /** Clockwise neighbourhood, starting west. */
  const N8 = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (at(x, y) !== foreground || seen[y * width + x]) continue;
      // A start pixel is one whose west neighbour is background, which
      // guarantees the trace begins on the boundary rather than inside.
      if (at(x - 1, y) === foreground) continue;

      const contour = [];
      let cx = x, cy = y;
      /**
       * Index in `N8` of the pixel we arrived FROM.
       *
       * The scan for the next boundary pixel starts one step clockwise of this,
       * which is the whole of Moore tracing and the one thing that is easy to
       * get wrong: starting two steps on — `(dir + 6) % 8`, which the first
       * version of this did — skips the neighbour that leads back the way we
       * came, so the walk can turn around, revisit the start on its fourth step
       * and report a four-pixel contour for the entire mark. Which is exactly
       * what it reported.
       *
       * Starts at west, because the start pixel was chosen for having a
       * background pixel there.
       */
      let back = 0;
      let guard = 0;
      const startX = x, startY = y;
      do {
        contour.push([cx, cy]);
        seen[cy * width + cx] = 1;
        let found = false;
        for (let k = 1; k <= 8; k += 1) {
          const d = (back + k) % 8;
          const nx = cx + N8[d][0];
          const ny = cy + N8[d][1];
          if (at(nx, ny) !== foreground) continue;
          cx = nx; cy = ny;
          // From the new pixel, the one we came from lies opposite.
          back = (d + 4) % 8;
          found = true;
          break;
        }
        if (!found) break;
        guard += 1;
      } while ((cx !== startX || cy !== startY) && guard < width * height * 4);

      // Mark the whole component so its interior is not re-entered.
      floodFill(source, seen, width, height, x, y, foreground);
      if (contour.length >= MIN_PERIMETER) contours.push(contour);
    }
  }
  return contours;
}

function floodFill(source, seen, width, height, sx, sy, value) {
  const stack = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const i = y * width + x;
    if (seen[i] === 2 || source[i] !== value) continue;
    seen[i] = 2;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

/* ── Simplification ──────────────────────────────────────────────────────*/

/** Signed area. Negative or positive tells outline from counter. */
function signedArea(points) {
  let a = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

/**
 * A light three-tap average, applied before simplification.
 *
 * The boundary walk returns a staircase at the pixel scale even after the
 * upscale, because a threshold is still a threshold. Averaging each point with
 * its neighbours removes the staircase without moving the curve — the samples
 * are eight to a source pixel, so a three-tap window is three eighths of one.
 * Douglas-Peucker afterwards then chooses vertices on a smooth path rather than
 * on the corners of a staircase, which is the difference between 40 vertices and
 * 400 for the same shape.
 */
function smooth(points, passes = 3) {
  let current = points;
  for (let p = 0; p < passes; p += 1) {
    const next = new Array(current.length);
    for (let i = 0; i < current.length; i += 1) {
      const a = current[(i - 1 + current.length) % current.length];
      const b = current[i];
      const c = current[(i + 1) % current.length];
      next[i] = [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4];
    }
    current = next;
  }
  return current;
}

/** Douglas-Peucker, on an open run. Closed contours are split at two anchors. */
function douglasPeucker(points, epsilon) {
  if (points.length < 3) return points;
  let worst = 0;
  let index = 0;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const length = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [px, py] = points[i];
    const distance = Math.abs((px - ax) * dy - (py - ay) * dx) / length;
    if (distance > worst) { worst = distance; index = i; }
  }
  if (worst <= epsilon) return [points[0], points[points.length - 1]];
  return [
    ...douglasPeucker(points.slice(0, index + 1), epsilon).slice(0, -1),
    ...douglasPeucker(points.slice(index), epsilon),
  ];
}

function simplifyClosed(points, epsilon) {
  // Split at the two most distant points so neither anchor is a place the
  // simplifier has to preserve a corner it cannot see past.
  let best = 0, ai = 0, bi = 0;
  const step = Math.max(1, Math.floor(points.length / 64));
  for (let i = 0; i < points.length; i += step) {
    for (let j = i + step; j < points.length; j += step) {
      const d = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]);
      if (d > best) { best = d; ai = i; bi = j; }
    }
  }
  const first = douglasPeucker(points.slice(ai, bi + 1), epsilon);
  const second = douglasPeucker(
    [...points.slice(bi), ...points.slice(0, ai + 1)],
    epsilon,
  );
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

/* ── Build ───────────────────────────────────────────────────────────────*/

const inkContours = traceComponents(mask, W, H, 1);

/* Counters. Traced as background components, then kept only if they are
   enclosed by ink rather than being the surrounding field. "Enclosed" is tested
   by whether the component touches the mask's border, which for a mark floating
   in a window is exact and needs no point-in-polygon test. */
const holes = [];
{
  const background = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i += 1) background[i] = mask[i] ? 0 : 1;
  const seen = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (!background[y * W + x] || seen[y * W + x]) continue;
      // Collect the component and note whether it reaches the border.
      const stack = [[x, y]];
      const cells = [];
      let touchesBorder = false;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue;
        const i = cy * W + cx;
        if (seen[i] || !background[i]) continue;
        seen[i] = 1;
        cells.push(i);
        if (cx === 0 || cy === 0 || cx === W - 1 || cy === H - 1) touchesBorder = true;
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
      if (touchesBorder || cells.length < 24) continue;
      const island = new Uint8Array(W * H);
      for (const i of cells) island[i] = 1;
      for (const contour of traceComponents(island, W, H, 1)) holes.push(contour);
    }
  }
}

/* Normalise: mask pixels → the artwork's own unit cap height, y up, origin at
   the mark's bottom-left, with x rectified to the true aspect. */
let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
for (const contour of inkContours) {
  for (const [x, y] of contour) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
}
const rawWidth = x1 - x0;
const rawHeight = y1 - y0;
/** The single-axis correction. >1 means the study had it foreshortened. */
const rectify = TRUE_ASPECT / (rawWidth / rawHeight);

const toUnit = (contour) =>
  contour.map(([x, y]) => [
    ((x - x0) / rawHeight) * rectify,
    (y1 - y) / rawHeight,
  ]);

const finish = (contour) =>
  simplifyClosed(smooth(toUnit(contour)), SIMPLIFY / rawHeight);

const outlines = inkContours
  .map(finish)
  .filter((c) => c.length >= 6)
  .sort((a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)));
const counters = holes
  .map(finish)
  .filter((c) => c.length >= 6);

const round = (v) => Number(v.toFixed(4));
/* Emitted as nested pairs rather than as a flat run of numbers. Flat is half
   the bytes and it is the wrong trade here: the type says `[number, number][]`,
   and a generated file whose shape disagrees with its own declared type fails at
   runtime in whichever consumer destructures first — which is how the first
   version of this was found. */
const emit = (contour) =>
  `[${contour.map(([x, y]) => `[${round(x)},${round(y)}]`).join(",")}]`;

const vertices =
  outlines.reduce((n, c) => n + c.length, 0) + counters.reduce((n, c) => n + c.length, 0);

const source = `/**
 * GENERATED — do not edit. \`npm run duna\` rewrites this file.
 *
 * The Duna script logotype, traced mechanically from the delivered design
 * renders by \`scripts/pxl/build-duna-trace.mjs\`. Read that file for the method,
 * the source window, and why the trace is generated rather than authored.
 *
 * PROVISIONAL BRAND ARTWORK. This is a threshold trace of a ${WINDOW.width - 4}-pixel-wide
 * instance of Duna Hajók's own logotype, reconstructed for the unpublished PXL
 * preview because no vector was supplied. It is NOT the official mark and must
 * not be used as one — see \`PXL_DUNA_ARTWORK\` in \`pxlScript.ts\`, which carries
 * the disclaimer that travels with it.
 *
 * Coordinates are on a unit cap height with y UP and the origin at the mark's
 * own bottom-left corner. x has been rectified by ×${rectify.toFixed(4)} to restore the
 * undistorted aspect the side plate measures; see the build script.
 *
 *   source      assets/source/pxl/pxl-colours-04.jpg
 *   window      ${WINDOW.left},${WINDOW.top} ${WINDOW.width}×${WINDOW.height} px
 *   traced at   ${ZOOM}× lanczos, luminance threshold ${THRESHOLD}
 *   contours    ${outlines.length} outline${outlines.length === 1 ? "" : "s"}, ${counters.length} counter${counters.length === 1 ? "" : "s"}
 *   vertices    ${vertices}
 */

/** A closed contour as \`[x, y]\` pairs, y up. */
export type PxlTraceContour = readonly (readonly [number, number])[];

/** The filled shapes of the mark, largest first. */
export const PXL_DUNA_OUTLINES: readonly PxlTraceContour[] = [
${outlines.map((c) => `  ${emit(c)},`).join("\n")}
];

/** The enclosed counters. Subtracted from whichever outline contains them. */
export const PXL_DUNA_COUNTERS: readonly PxlTraceContour[] = [
${counters.map((c) => `  ${emit(c)},`).join("\n")}
];

/** The rectification applied to x, recorded so the trace can be reproduced. */
export const PXL_DUNA_RECTIFY = ${round(rectify)};
`;

await mkdir(path.join(ROOT, "src/webgl/scenes/pxl"), { recursive: true });
await writeFile(
  path.join(ROOT, "src/webgl/scenes/pxl/pxlDunaTrace.generated.ts"),
  source,
);

console.log(`\n  DUNA SCRIPT TRACE`);
console.log(`  source     assets/source/pxl/pxl-colours-04.jpg ${WINDOW.left},${WINDOW.top} ${WINDOW.width}×${WINDOW.height}`);
console.log(`  mask       ${W} × ${H} at ${ZOOM}×, threshold ${THRESHOLD}`);
console.log(`  ink bbox   ${rawWidth} × ${rawHeight} mask px  (aspect ${(rawWidth / rawHeight).toFixed(3)})`);
console.log(`  rectify    ×${rectify.toFixed(4)} on x, to the side plate's ${TRUE_ASPECT.toFixed(3)}`);
console.log(`  contours   ${outlines.length} outlines, ${counters.length} counters, ${vertices} vertices`);
console.log(`  wrote      src/webgl/scenes/pxl/pxlDunaTrace.generated.ts\n`);
