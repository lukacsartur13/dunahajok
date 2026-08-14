#!/usr/bin/env node
/**
 * BRANDING TRACE PROOF — Phase 4.1, §6 and §8.
 *
 *   node --experimental-strip-types --import ./scripts/pxl/ts-resolve.mjs \
 *        scripts/pxl/trace-proof.mjs
 *   npm run trace
 *
 * Renders the two authored marks — the traced Duna script and the PXL lockup —
 * into a PNG beside the delivered plate's own crop of the same mark, at the same
 * pixel size, so the reconstruction can be judged against the thing it is a
 * reconstruction of rather than against a memory of it.
 *
 * WHY A SOFTWARE RASTERISER. The marks are 2D filled outlines and the question
 * is whether they are the right SHAPE, which needs no lighting, no camera and no
 * GPU. Doing it here means the comparison runs in `npm run qa` on a headless
 * machine, and it means the proof is generated from the same authored numbers
 * the scene uses rather than screenshotted out of a browser and cropped by hand.
 *
 * The polygons are filled by even-odd scanline coverage at 3× and downsampled,
 * which is the cheapest antialiasing that does not misrepresent a hairline: a
 * 16-pixel-tall script has strokes two pixels wide, and a hard-edged fill of one
 * would either drop them or double them.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { dunaAspect, dunaBounds, dunaContours, dunaVertexCount } from
  "../../src/webgl/scenes/pxl/pxlScript.ts";
import { pxlLockupOutlines, pxlLockupAspect } from
  "../../src/webgl/scenes/pxl/pxlLockup.ts";
import { PXL_DUNA_PLATE, PXL_MARK_PLATE, PXL_SIDE_PLATE } from
  "../../src/webgl/scenes/pxl/pxlReference.ts";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OUT = path.join(ROOT, ".qa");

/** Supersampling factor. 3× is enough for a two-pixel stroke. */
const SS = 3;

/**
 * Fill a set of closed polygons into a coverage buffer.
 *
 * NON-ZERO WINDING, NOT EVEN-ODD. The script's strokes overlap — the D's stem
 * crosses its own sweep, and the wedge terminal is laid across the end of it —
 * and under even-odd every overlap would punch a hole. Non-zero is also what
 * `THREE.ShapeGeometry` produces for separate shapes, so the proof and the scene
 * agree about what the mark looks like.
 */
function fill(polygons, width, height, transform) {
  const cover = new Float32Array(width * height);
  const edges = [];
  for (const poly of polygons) {
    const n = poly.length / 2;
    for (let i = 0; i < n; i += 1) {
      const a = transform(poly[i * 2], poly[i * 2 + 1]);
      const j = (i + 1) % n;
      const b = transform(poly[j * 2], poly[j * 2 + 1]);
      if (a[1] !== b[1]) edges.push([a[0], a[1], b[0], b[1]]);
    }
  }
  for (let y = 0; y < height; y += 1) {
    const sy = y + 0.5;
    const crossings = [];
    for (const [x0, y0, x1, y1] of edges) {
      if ((sy >= y0 && sy < y1) || (sy >= y1 && sy < y0)) {
        const t = (sy - y0) / (y1 - y0);
        crossings.push([x0 + (x1 - x0) * t, y1 > y0 ? 1 : -1]);
      }
    }
    crossings.sort((a, b) => a[0] - b[0]);
    let winding = 0;
    for (let i = 0; i < crossings.length - 1; i += 1) {
      winding += crossings[i][1];
      if (winding === 0) continue;
      const from = Math.max(0, Math.ceil(crossings[i][0] - 0.5));
      const to = Math.min(width - 1, Math.floor(crossings[i + 1][0] - 0.5));
      for (let x = from; x <= to; x += 1) cover[y * width + x] = 1;
    }
  }
  return cover;
}

/** Downsample a supersampled coverage buffer to 8-bit grey. */
function resolve(cover, width, height) {
  const w = Math.round(width / SS);
  const h = Math.round(height / SS);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let sum = 0;
      for (let j = 0; j < SS; j += 1) {
        for (let i = 0; i < SS; i += 1) {
          sum += cover[(y * SS + j) * width + (x * SS + i)] ?? 0;
        }
      }
      out[y * w + x] = Math.round((sum / (SS * SS)) * 255);
    }
  }
  return { data: out, width: w, height: h };
}

/**
 * One mark, rendered at a target pixel width, light-on-dark.
 *
 * Light on dark rather than dark on light because that is how the highest-
 * contrast delivered instance shows it, and comparing a positive against a
 * negative is a comparison nobody can make.
 */
function renderMark(polygons, bounds, pixelWidth) {
  const aspect = (bounds.x1 - bounds.x0) / (bounds.y1 - bounds.y0);
  const pixelHeight = Math.round(pixelWidth / aspect);
  const W = pixelWidth * SS;
  const H = pixelHeight * SS;
  const sx = W / (bounds.x1 - bounds.x0);
  const sy = H / (bounds.y1 - bounds.y0);
  // y flips: the artwork is authored y-up, a raster is y-down.
  const transform = (x, y) => [(x - bounds.x0) * sx, H - (y - bounds.y0) * sy];
  return resolve(fill(polygons, W, H, transform), W, H);
}

/** A grey buffer as a PNG-able RGB buffer. */
function grey(mark, ink = [232, 236, 240], ground = [18, 19, 22]) {
  const rgb = Buffer.alloc(mark.width * mark.height * 3);
  for (let i = 0; i < mark.width * mark.height; i += 1) {
    const a = mark.data[i] / 255;
    for (let c = 0; c < 3; c += 1) {
      rgb[i * 3 + c] = Math.round(ground[c] + (ink[c] - ground[c]) * a);
    }
  }
  return sharp(rgb, { raw: { width: mark.width, height: mark.height, channels: 3 } });
}

await mkdir(OUT, { recursive: true });

/* ── The Duna script ──────────────────────────────────────────────────────*/

const dunaPlateWidth = PXL_DUNA_PLATE.x1 - PXL_DUNA_PLATE.x0 + 1;
const dunaPlateHeight = PXL_DUNA_PLATE.y1 - PXL_DUNA_PLATE.y0 + 1;
/** Enlargement. 12× puts a 27-row mark at 324 rows, which is judgeable. */
const ZOOM = 12;

const dunaBox = dunaBounds();
const { outlines: dunaOutlines, counters: dunaCounters } = dunaContours();
const duna = renderMark(
  [
    ...dunaOutlines.map((c) => Float64Array.from(c.flat())),
    // Counters wound the other way, so non-zero winding punches them out.
    ...dunaCounters.map((c) => Float64Array.from([...c].reverse().flat())),
  ],
  dunaBox,
  dunaPlateWidth * ZOOM,
);

const dunaReference = await sharp(path.join(ROOT, PXL_SIDE_PLATE.file))
  .extract({
    left: PXL_DUNA_PLATE.x0,
    top: PXL_DUNA_PLATE.y0,
    width: dunaPlateWidth,
    height: dunaPlateHeight,
  })
  .resize({ width: dunaPlateWidth * ZOOM, kernel: "lanczos3" })
  .toBuffer();

const dunaTraced = await grey(duna).png().toBuffer();
const dunaRefMeta = await sharp(dunaReference).metadata();
const dunaTraceMeta = await sharp(dunaTraced).metadata();

await sharp({
  create: {
    width: dunaPlateWidth * ZOOM,
    height: dunaRefMeta.height + dunaTraceMeta.height + 24,
    channels: 3,
    background: { r: 10, g: 11, b: 13 },
  },
})
  .composite([
    { input: dunaReference, left: 0, top: 0 },
    { input: dunaTraced, left: 0, top: dunaRefMeta.height + 24 },
  ])
  .png()
  .toFile(path.join(OUT, "duna-trace-proof.png"));

/* ── The PXL lockup ───────────────────────────────────────────────────────*/

const pxlPlateWidth = PXL_MARK_PLATE.x1 - PXL_MARK_PLATE.x0 + 1;
const pxlPlateHeight = PXL_MARK_PLATE.y1 - PXL_MARK_PLATE.y0 + 1;
const PXL_ZOOM = 14;

const lockup = pxlLockupOutlines();
let lx0 = Infinity, ly0 = Infinity, lx1 = -Infinity, ly1 = -Infinity;
for (const poly of lockup) {
  for (let i = 0; i < poly.length; i += 2) {
    lx0 = Math.min(lx0, poly[i]); lx1 = Math.max(lx1, poly[i]);
    ly0 = Math.min(ly0, poly[i + 1]); ly1 = Math.max(ly1, poly[i + 1]);
  }
}
const pxl = renderMark(lockup, { x0: lx0, y0: ly0, x1: lx1, y1: ly1 }, pxlPlateWidth * PXL_ZOOM);

const pxlReference = await sharp(path.join(ROOT, PXL_SIDE_PLATE.file))
  .extract({
    left: PXL_MARK_PLATE.x0,
    top: PXL_MARK_PLATE.y0,
    width: pxlPlateWidth,
    height: pxlPlateHeight,
  })
  .resize({ width: pxlPlateWidth * PXL_ZOOM, kernel: "lanczos3" })
  .toBuffer();

const pxlTraced = await grey(pxl, [214, 112, 60], [26, 27, 30]).png().toBuffer();
const pxlRefMeta = await sharp(pxlReference).metadata();
const pxlTraceMeta = await sharp(pxlTraced).metadata();

await sharp({
  create: {
    width: pxlPlateWidth * PXL_ZOOM,
    height: pxlRefMeta.height + pxlTraceMeta.height + 24,
    channels: 3,
    background: { r: 10, g: 11, b: 13 },
  },
})
  .composite([
    { input: pxlReference, left: 0, top: 0 },
    { input: pxlTraced, left: 0, top: pxlRefMeta.height + 24 },
  ])
  .png()
  .toFile(path.join(OUT, "pxl-trace-proof.png"));

/* ── Report ───────────────────────────────────────────────────────────────*/

const plateDunaAspect = dunaPlateWidth / dunaPlateHeight;
const platePxlAspect = pxlPlateWidth / pxlPlateHeight;

console.log(`\n  BRANDING TRACE PROOF`);
console.log(`  Duna script`);
console.log(`    plate     ${dunaPlateWidth} × ${dunaPlateHeight} px   aspect ${plateDunaAspect.toFixed(3)}`);
console.log(`    traced    aspect ${dunaAspect().toFixed(3)}   (${(((dunaAspect() / plateDunaAspect) - 1) * 100).toFixed(1)}%)`);
console.log(`    contours  ${dunaOutlines.length} outlines, ${dunaCounters.length} counters, ${dunaVertexCount()} vertices`);
console.log(`    wrote     .qa/duna-trace-proof.png  (reference above, trace below)`);
console.log(`  PXL lockup`);
console.log(`    plate     ${pxlPlateWidth} × ${pxlPlateHeight} px   aspect ${platePxlAspect.toFixed(3)}`);
console.log(`    authored  aspect ${pxlLockupAspect().toFixed(3)}   (${(((pxlLockupAspect() / platePxlAspect) - 1) * 100).toFixed(1)}%)`);
console.log(`    wrote     .qa/pxl-trace-proof.png\n`);
