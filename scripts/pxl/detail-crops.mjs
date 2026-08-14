/**
 * PXL — the detail-crop sheet.  PHASE 4.6, §40.
 *
 *     node scripts/pxl/detail-crops.mjs
 *     npm run crops
 *
 * §40 asks for seven crops "large enough to judge", in addition to the
 * whole-boat comparisons `comparison-sheet.mjs` builds:
 *
 *     A. BOW TOP                    E. PXL PLEXI MARK
 *     B. LOWER HULL PAINT LINE      F. MOTOR LOWER UNIT
 *     C. DUNA BADGE                 G. FORWARD THREE-PART PADDING
 *     D. PXL HULL BADGE
 *
 * WHY A SEPARATE SHEET RATHER THAN MORE ROWS. The whole-boat sheet crops each
 * cell to the SUBJECT and fits it, which is what §39 wants there and exactly
 * wrong here: a detail crop is a region of the picture, and finding it
 * automatically would find the boat again. So every rectangle below is authored
 * — as fractions of its own image, so it survives a change of render size — and
 * the two columns are scaled to a common height rather than to a common subject.
 *
 * BOTH COLUMNS ARE PINNED TO THE SAME REAL-WORLD SUBJECT, not to the same
 * pixels. The reference rectangles are the ones this phase's measurements were
 * taken through — the badge crops are `_mark.mjs`'s own region, the motor crop
 * is the one the row readings in `PXL_STERN_REFERENCE.hullNormalised` came off —
 * so a disagreement in the sheet is a disagreement with the number that was
 * measured, rather than with a rectangle chosen afterwards to flatter the render.
 */

import sharp from "sharp";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const QA = path.join(ROOT, ".qa");
const OUT = path.join(QA, "PHASE_4_6_details.png");

const SIDE_PLATE = "assets/source/pxl/pxl-side-20240719.jpg";
const VIEWS_PLATE = "assets/source/pxl/pxl-views-20240815c.jpg";

/** Cell size. Wide, because six of the seven subjects are wider than they are tall. */
const CELL_W = 820;
const CELL_H = 400;
const PAD = 16;
const HEAD = 50;
const LABEL = 32;

/** `[x, y, w, h]` as fractions of the image they belong to. */
const ROWS = [
  {
    title: "A · BOW TOP — §7–§11, §43. The interior continues and narrows; no closing panel, no end wall.",
    plate: VIEWS_PLATE,
    plateCrop: [0.428, 0.542, 0.190, 0.190],
    render: "p46-top3q.png",
    renderCrop: [0.50, 0.30, 0.42, 0.34],
  },
  {
    title: "B · LOWER HULL PAINT LINE — §19–§24, §45. The knuckle at x +0.78 and the level run forward of it.",
    plate: SIDE_PLATE,
    plateCrop: [0.400, 0.470, 0.360, 0.160],
    render: "p46-side.png",
    renderCrop: [0.30, 0.42, 0.46, 0.20],
  },
  {
    title: "C · DUNA BADGE — §27, §28. Fine script, 0.7 mm relief, brushed metal.",
    plate: SIDE_PLATE,
    plateCrop: [0.510, 0.398, 0.095, 0.052],
    render: "p46-side.png",
    renderCrop: [0.44, 0.375, 0.26, 0.075],
  },
  {
    title: "D · PXL HULL BADGE — §26, §28, §29. Shallow relief, clean bevel, metallic response.",
    plate: SIDE_PLATE,
    plateCrop: [0.180, 0.420, 0.105, 0.075],
    render: "p46-side.png",
    renderCrop: [0.045, 0.455, 0.20, 0.11],
  },
  {
    title: "E · PXL PLEXI MARK — §31. Unchanged: a print on the glazing, NOT a metal badge.",
    plate: VIEWS_PLATE,
    plateCrop: [0.300, 0.055, 0.170, 0.140],
    render: "p46-bow3q.png",
    renderCrop: [0.30, 0.25, 0.26, 0.20],
  },
  {
    title: "F · MOTOR LOWER UNIT — §2–§6, §42. Midsection, plate, gearcase, skeg, propeller, all below the hull.",
    plate: VIEWS_PLATE,
    plateCrop: [0.620, 0.466, 0.185, 0.281],
    render: "p46-stern3q.png",
    renderCrop: [0.135, 0.40, 0.26, 0.46],
  },
  {
    title: "G · FORWARD THREE-PART PADDING — §13–§17. Three pieces, real gaps, hard liner between and around.",
    plate: VIEWS_PLATE,
    plateCrop: [0.290, 0.522, 0.290, 0.211],
    render: "p46-plan.png",
    renderCrop: [0.36, 0.31, 0.48, 0.32],
  },
];

const COLUMNS = ["DELIVERED REFERENCE", "PHASE 4.6"];

async function cell(file, crop) {
  const image = sharp(file);
  const meta = await image.metadata();
  const [fx, fy, fw, fh] = crop;
  return image
    .extract({
      left: Math.round(meta.width * fx),
      top: Math.round(meta.height * fy),
      width: Math.max(2, Math.round(meta.width * fw)),
      height: Math.max(2, Math.round(meta.height * fh)),
    })
    .resize(CELL_W, CELL_H, {
      fit: "contain",
      background: { r: 22, g: 26, b: 29, alpha: 1 },
      kernel: "lanczos3",
    })
    .toBuffer();
}

function text(content, width, size, colour = "#d8dde0", weight = 600) {
  const escaped = content.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svg = `<svg width="${width}" height="${size + 12}" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="${size}" font-family="Helvetica, Arial, sans-serif"
          font-size="${size}" font-weight="${weight}" letter-spacing="1.2"
          fill="${colour}">${escaped}</text></svg>`;
  return Buffer.from(svg);
}

const missing = ROWS.map((r) => r.render)
  .filter((f) => !existsSync(path.join(QA, f)));
if (missing.length) {
  console.error(`\n  missing capture(s): ${[...new Set(missing)].join(", ")}`);
  console.error("  capture them through window.__pxlQa into .qa/ first\n");
  process.exit(1);
}

const width = PAD + (CELL_W + PAD) * 2;
const rowHeight = LABEL + CELL_H + PAD;
const height = HEAD + LABEL + rowHeight * ROWS.length + PAD;

const layers = [
  {
    input: text("PXL — PHASE 4.6 · DETAIL CROPS (§40)", width - PAD * 2, 24, "#f2f4f5", 700),
    left: PAD,
    top: 13,
  },
];

for (let c = 0; c < 2; c += 1) {
  layers.push({
    input: text(COLUMNS[c], CELL_W, 14, "#8f9aa0", 700),
    left: PAD + (CELL_W + PAD) * c,
    top: HEAD,
  });
}

for (let r = 0; r < ROWS.length; r += 1) {
  const row = ROWS[r];
  const top = HEAD + LABEL + rowHeight * r;
  layers.push({ input: text(row.title, width - PAD * 2, 14, "#c9a06a", 700), left: PAD, top });
  layers.push({
    input: await cell(path.join(ROOT, row.plate), row.plateCrop),
    left: PAD,
    top: top + LABEL,
  });
  layers.push({
    input: await cell(path.join(QA, row.render), row.renderCrop),
    left: PAD + CELL_W + PAD,
    top: top + LABEL,
  });
}

await sharp({
  create: { width, height, channels: 3, background: { r: 14, g: 17, b: 19 } },
})
  .composite(layers)
  .png()
  .toFile(OUT);

console.log(`\n  wrote ${path.relative(ROOT, OUT)}  ${width} × ${height}\n`);
