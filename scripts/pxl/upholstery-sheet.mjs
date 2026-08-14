/**
 * PXL — THE UPHOLSTERY CORRECTION, SIDE BY SIDE.  PHASE 4.7.2, §22.
 *
 *     node scripts/pxl/upholstery-sheet.mjs
 *     npm run upholstery:sheet
 *
 * §25: matched-scale REFERENCE / PHASE 4.7 WRONG / CORRECTED, for the cockpit
 * three-quarter, the plan and the bow detail — plus §26's debug view and §9's
 * mask comparison, which are the two rows that carry an argument rather than
 * an impression.
 *
 * It composites files rather than rendering them: the two render columns come
 * out of the browser through `window.__pxlQa.capture()` and land in `.qa/` via
 * `scripts/pxl/qa-sink.mjs`, and the reference column is a JPEG. The subject
 * finder and the matched-height fitting are Phase 4.6's — see
 * `comparison-sheet.mjs`, which this deliberately does not modify, so the 4.6
 * sheet stays reproducible beside the phase that produced it.
 *
 * ── THE THREE VIEWS ARE NOT ALL COMPARABLE IN THE SAME WAY ────────────────
 *
 * §20 asks for a TOP row, and the delivered material has no plan view: the
 * views sheet carries a side, a cockpit three-quarter and a stern
 * three-quarter, and nothing orthographic from above. So the top row's
 * reference cell is the cockpit three-quarter — the nearest thing the yard
 * supplied — and the label says so rather than implying a plan exists. The
 * other two rows are like for like.
 *
 * The bow row crops both render columns to the SAME fractional region of the
 * SAME camera preset, so the two are directly comparable to each other even
 * though neither is comparable pixel-for-pixel to the plate beside them.
 */

import sharp from "sharp";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const QA = path.join(ROOT, ".qa");
const OUT = path.join(QA, "PHASE_4_7_2_comparison.png");

const CELL_W = 900;
const CELL_H = 450;
const PAD = 18;
const HEAD = 54;
const LABEL = 50;

const VIEWS = "assets/source/pxl/pxl-views-20240815c.jpg";

/** `crop` and `beforeCrop`/`afterCrop` are [x, y, w, h] as fractions. */
const ROWS = [
  {
    title: "A · TOP — §3, §9, §25: one continuous dark floor where the side bench was",
    plate: VIEWS,
    crop: [0.03, 0.38, 0.60, 0.58],
    note: "no orthographic plan was delivered; the plate cell is the cockpit three-quarter",
    before: "p471-plan.png",
    after: "p472-plan.png",
  },
  {
    title: "B · COCKPIT THREE-QUARTER — §5: rear seat · open dark cockpit · forward pads",
    plate: VIEWS,
    crop: [0.03, 0.38, 0.60, 0.58],
    before: "p471-cockpit3q.png",
    after: "p472-cockpit3q.png",
  },
  {
    title: "C · BOW — §17 and the height brief: they meet level, and the bow is not filled",
    plate: VIEWS,
    crop: [0.14, 0.52, 0.24, 0.26],
    beforeCrop: [0.585, 0.375, 0.26, 0.28],
    afterCrop: [0.585, 0.375, 0.26, 0.28],
    before: "p471-cockpit3q.png",
    after: "p472-cockpit3q.png",
  },
  {
    /* §21's clay test, which is the row that answers §24. Two greys and no
       materials: if a long raised strip is still standing beside the cockpit,
       it is visible here and nowhere to hide. */
    title: "D · §21 CLAY — all geometry one grey, the sole one darker, no materials",
    columns: ["TOP", "COCKPIT THREE-QUARTER", "BOW, LOOKING AFT"],
    cells: ["p472-clay-top.png", "p472-clay-cockpit3q.png", "p472-clay-bow.png"],
  },
  {
    /* §23's silhouette view, and §9 of the height brief. The side cell is the
       upholstery alone against a dashed guide at its own measured maximum
       height: a level top lies on the guide for its whole length. */
    title: "E · §23 SILHOUETTE — floor BLACK · liner WHITE · rear seat YELLOW · port RED · starboard BLUE",
    columns: ["TOP", "COCKPIT THREE-QUARTER", "SIDE — the upholstery alone, against a level guide"],
    cells: ["p472-debug-top.png", "p472-debug-cockpit3q.png", "p472-debug-side.png"],
  },
];

const COLUMNS = ["DELIVERED REFERENCE", "PHASE 4.7.1", "CORRECTED — 4.7.2"];

/**
 * Find the subject inside a frame, so the cells can be filled rather than
 * letterboxed. Phase 4.6 §39's version: each pixel is compared with the LEFT
 * EDGE OF ITS OWN ROW, which removes the studio backdrop's vertical gradient
 * exactly rather than tolerating it.
 */
async function subjectBox(input) {
  const image = sharp(input);
  const { data, info } = await image
    .clone()
    .resize(360, null, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;
  const at = (x, y) => {
    const i = (y * w + x) * channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const rowGround = [];
  for (let y = 0; y < h; y += 1) rowGround.push(at(0, y));
  const differs = (p, y) => {
    const g = rowGround[y];
    return Math.abs(p[0] - g[0]) + Math.abs(p[1] - g[1]) + Math.abs(p[2] - g[2]) > 10;
  };

  let x0 = w; let y0 = h; let x1 = -1; let y1 = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!differs(at(x, y), y)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const meta = await image.metadata();
  if (x1 < 0) return { left: 0, top: 0, width: meta.width, height: meta.height };

  const scale = meta.width / w;
  const pad = 0.03;
  const bw = (x1 - x0 + 1) * scale * (1 + pad * 2);
  const bh = (y1 - y0 + 1) * scale * (1 + pad * 2);
  const cx = ((x0 + x1) / 2) * scale;
  const cy = ((y0 + y1) / 2) * scale;
  const left = Math.max(0, Math.round(cx - bw / 2));
  const top = Math.max(0, Math.round(cy - bh / 2));
  return {
    left,
    top,
    width: Math.min(Math.round(bw), meta.width - left),
    height: Math.min(Math.round(bh), meta.height - top),
  };
}

/** Crop an image to a fractional window. */
async function window_(file, crop) {
  const meta = await sharp(file).metadata();
  const [x, y, w, h] = crop;
  return sharp(file)
    .extract({
      left: Math.round(x * meta.width),
      top: Math.round(y * meta.height),
      width: Math.round(w * meta.width),
      height: Math.round(h * meta.height),
    })
    .toBuffer();
}

/** A cell, cropped to its subject and fitted to the common height. */
async function cell(input) {
  const box = await subjectBox(input);
  return sharp(input)
    .extract(box)
    .resize(CELL_W, CELL_H, { fit: "contain", background: { r: 22, g: 26, b: 29, alpha: 1 } })
    .toBuffer();
}

function text(content, width, size, colour = "#d8dde0", weight = 600) {
  const escaped = content.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svg = `<svg width="${width}" height="${size + 12}" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="${size}" font-family="Helvetica, Arial, sans-serif"
          font-size="${size}" font-weight="${weight}" letter-spacing="1.6"
          fill="${colour}">${escaped}</text></svg>`;
  return Buffer.from(svg);
}

const missing = [];
for (const row of ROWS) {
  for (const f of row.cells ?? [row.before, row.after]) {
    if (!existsSync(path.join(QA, f))) missing.push(f);
  }
}
if (missing.length) {
  console.error(`\n  missing capture(s): ${missing.join(", ")}`);
  console.error("  the p47-* frames come from window.__pxlQa via qa-sink.mjs;");
  console.error("  the p47-debug-* frames come from `npm run upholstery`\n");
  process.exit(1);
}

const width = PAD + (CELL_W + PAD) * 3;
const rowHeight = LABEL + CELL_H + PAD;
const height = HEAD + LABEL + rowHeight * ROWS.length + PAD;

const layers = [];
layers.push({
  input: text("PXL — PHASE 4.7.2 · THE SIDE BENCH DELETED, THE SEAT LEVELLED", width - PAD * 2, 26, "#f2f4f5", 700),
  left: PAD,
  top: 14,
});
for (let c = 0; c < 3; c += 1) {
  layers.push({
    input: text(COLUMNS[c], CELL_W, 15, "#8f9aa0", 700),
    left: PAD + (CELL_W + PAD) * c,
    top: HEAD,
  });
}

for (let r = 0; r < ROWS.length; r += 1) {
  const row = ROWS[r];
  const top = HEAD + LABEL + rowHeight * r;

  layers.push({ input: text(row.title, CELL_W * 2, 15, "#c9a06a", 700), left: PAD, top });
  if (row.columns) {
    for (let c = 0; c < 3; c += 1) {
      layers.push({
        input: text(row.columns[c], CELL_W, 13, "#8f9aa0", 700),
        left: PAD + (CELL_W + PAD) * c,
        top: top + 24,
      });
    }
  }
  if (row.note) {
    layers.push({
      input: text(row.note, CELL_W, 12, "#6f7a80", 500),
      left: PAD,
      top: top + 24,
    });
  }

  const cells = row.cells
    ? await Promise.all(row.cells.map(async (f) => cell(row.cellCrop
      ? await window_(path.join(QA, f), row.cellCrop)
      : path.join(QA, f))))
    : [
      await cell(await window_(path.join(ROOT, row.plate), row.crop)),
      await cell(row.beforeCrop
        ? await window_(path.join(QA, row.before), row.beforeCrop)
        : path.join(QA, row.before)),
      await cell(row.afterCrop
        ? await window_(path.join(QA, row.after), row.afterCrop)
        : path.join(QA, row.after)),
    ];
  for (let c = 0; c < 3; c += 1) {
    layers.push({ input: cells[c], left: PAD + (CELL_W + PAD) * c, top: top + LABEL });
  }
}

await sharp({
  create: { width, height, channels: 3, background: { r: 16, g: 19, b: 21 } },
})
  .composite(layers)
  .png()
  .toFile(OUT);

console.log(`\n  ${path.relative(ROOT, OUT)}  ${width} x ${height}, ${ROWS.length} rows\n`);
