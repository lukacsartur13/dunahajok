/**
 * PXL — the before / reference / after sheet.  PHASE 4.3, §31.
 *
 *     node scripts/pxl/comparison-sheet.mjs
 *     npm run sheet
 *
 * §31 requires one inspectable artefact: three columns — the delivered
 * reference, the Phase 4.2 render, the Phase 4.3 render — across at least the
 * side, cockpit three-quarter and stern three-quarter views. §30 sets the bar
 * it exists to test: "if side-by-side screenshots before and after look nearly
 * the same, the phase has failed."
 *
 * It composites files rather than rendering them, because the two render
 * columns come from a browser and the reference column comes from a JPEG. The
 * frames are captured through `window.__pxlQa.capture()` into `.qa/` — see
 * `scripts/pxl/qa-sink.mjs` — and this puts them beside their plate at a
 * common height with the crop each reference camera was composed against.
 *
 * The reference crops are `PXL_REFERENCE_PLATES`' own, so the plate region in
 * column one is the region the camera in columns two and three was authored to
 * match. Choosing a flattering crop here would defeat the whole point.
 */

import sharp from "sharp";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const QA = path.join(ROOT, ".qa");
const OUT = path.join(QA, "PHASE_4_6_comparison.png");

/** Row height, and the width each cell is fitted into. */
const CELL_W = 900;
const CELL_H = 430;
const PAD = 18;
const HEAD = 54;
const LABEL = 34;

/** `crop` is [x, y, w, h] as fractions, from `PXL_REFERENCE_PLATES`. */
/* PHASE 4.4 §34 — the four comparisons the brief names, in its own order:
   TOP / COCKPIT 3Q, SIDE, STERN 3Q, and STERN 3Q with the platform off and on.

   ROW A'S "BEFORE" IS NOT FROM `reference_plan`, AND CANNOT BE. The preset was
   added in this phase precisely because §6 says the model had been validated
   from the side and that was no longer sufficient — so Phase 4.3 has no plan
   capture to put beside this one. `p43b-top.png` is 4.3's own top view, taken
   from a free camera at a similar elevation. It answers §35's question ("does
   the boat now have the thick, continuous upper perimeter") and it is not a
   pixel-comparable pair; the label says so rather than implying otherwise.

   ROW E's two columns are both Phase 4.4. It is the option's before/after
   rather than the phase's, which is what §34's fourth item asks for. */
const ROWS = [
  {
    title: "A · SIDE — §19–§24, the lower-hull paint division",
    plate: "assets/source/pxl/pxl-side-20240719.jpg",
    crop: [0.10, 0.24, 0.78, 0.36],
    before: "p44-side.png",
    after: "p46-side.png",
  },
  {
    title: "B · PLAN — §34, the primary QA view for this phase",
    plate: "assets/source/pxl/pxl-views-20240815c.jpg",
    crop: [0.03, 0.38, 0.60, 0.58],
    before: "p44-plan.png",
    after: "p46-plan.png",
  },
  {
    title: "C · COCKPIT THREE-QUARTER — §12–§18, the forward padded architecture",
    plate: "assets/source/pxl/pxl-views-20240815c.jpg",
    crop: [0.03, 0.38, 0.60, 0.58],
    before: "p44-cockpit3q.png",
    after: "p46-cockpit3q.png",
  },
  {
    title: "D · STERN THREE-QUARTER — §2–§6, the motor's lower unit",
    plate: "assets/source/pxl/pxl-views-20240815c.jpg",
    crop: [0.58, 0.36, 0.42, 0.52],
    before: "p44-stern3q.png",
    after: "p46-stern3q.png",
  },
  {
    title: "E · BOW THREE-QUARTER — §7–§11, the bow interior",
    plate: "assets/source/pxl/pxl-views-20240815c.jpg",
    crop: [0.28, 0.52, 0.36, 0.42],
    before: "p44-bow3q.png",
    after: "p46-bow3q.png",
  },
];

const COLUMNS = ["DELIVERED REFERENCE", "PHASE 4.4", "PHASE 4.6"];

/**
 * Find the subject inside a frame, so the cells can be filled rather than
 * letterboxed.
 *
 * §27 asks that the framing be "aligned closely enough that differences can be
 * judged directly", and the first sheet was not: the reference crops carry a
 * wide white margin and the renders come off a nearly square development slot
 * whose camera is composed for a wide one, so the boat occupied about a third
 * of every cell and the sheet was mostly background.
 *
 * THIS CROPS EMPTY GROUND, NOT COMPOSITION. The subject's own bounding box is
 * found by comparing against the corner pixel — white paper on a plate, the
 * studio's dark field on a render — and the crop is expanded to the row's
 * common aspect about that box's centre, so no cell is stretched and none is
 * re-composed. What is removed is sky.
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
  /* PHASE 4.6 §39 — THE GROUND IS SAMPLED PER ROW, NOT ONCE AT THE CORNER.
     A single corner sample plus a loose threshold was the 4.4 version, and §39
     is a complaint about what it produced: "Do not generate comparison sheets
     where the production boat is half the size of the reference." The studio
     backdrop is a vertical gradient running about 30 levels top to bottom, so a
     threshold loose enough not to call the gradient content (16, against a
     corner) is also loose enough to call the TOP of the gradient content when
     the corner is sampled at the bottom — and the box became the whole frame.
     The boat then filled a third of its cell while the plate, on flat white,
     filled all of one.

     Comparing each pixel with the LEFT EDGE OF ITS OWN ROW removes a vertical
     gradient exactly rather than tolerating it, which lets the threshold come
     down to 10 and makes the box the boat. */
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
  let bw = (x1 - x0 + 1) * scale * (1 + pad * 2);
  let bh = (y1 - y0 + 1) * scale * (1 + pad * 2);
  const cx = ((x0 + x1) / 2) * scale;
  const cy = ((y0 + y1) / 2) * scale;
  /* NO ASPECT MATCHING HERE, and the first version had it. Growing the box to
     the cell's aspect re-adds exactly the margin the crop just removed: the
     side plate's subject is 3.3:1 in a 2.1:1 cell, so growing put the white
     back and the boat came out a third of the cell again. `fit: contain` on the
     resize letterboxes whichever axis is short, which is the same answer
     without the padding. */

  const left = Math.max(0, Math.round(cx - bw / 2));
  const top = Math.max(0, Math.round(cy - bh / 2));
  return {
    left,
    top,
    width: Math.min(Math.round(bw), meta.width - left),
    height: Math.min(Math.round(bh), meta.height - top),
  };
}

/** A cell, cropped to its subject and fitted. */
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
  for (const f of [row.before, row.after]) {
    if (!existsSync(path.join(QA, f))) missing.push(f);
  }
}
if (missing.length) {
  console.error(`\n  missing capture(s): ${missing.join(", ")}`);
  console.error("  capture them through window.__pxlQa into .qa/ first — see qa-sink.mjs\n");
  process.exit(1);
}

const width = PAD + (CELL_W + PAD) * 3;
const rowHeight = LABEL + CELL_H + PAD;
const height = HEAD + LABEL + rowHeight * ROWS.length + PAD;

const layers = [];

layers.push({
  input: text("PXL — PHASE 4.6 · REFERENCE / BEFORE / AFTER", width - PAD * 2, 26, "#f2f4f5", 700),
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
  /* A row may override the column headings — row E compares an OPTION rather
     than a phase, and labelling its two renders "4.3" and "4.4" would be a
     caption that says something untrue about what changed. */
  if (row.columns) {
    for (let c = 1; c < 3; c += 1) {
      layers.push({
        input: text(row.columns[c], CELL_W, 13, "#8f9aa0", 700),
        left: PAD + (CELL_W + PAD) * c,
        top,
      });
    }
  }
  if (row.note) {
    layers.push({
      input: text(row.note, CELL_W * 2, 12, "#6f7a80", 500),
      left: PAD + (CELL_W + PAD),
      top: top + 1,
    });
  }

  const meta = await sharp(path.join(ROOT, row.plate)).metadata();
  const [cx, cy, cw, ch] = row.crop;
  const cropped = await sharp(path.join(ROOT, row.plate))
    .extract({
      left: Math.round(cx * meta.width),
      top: Math.round(cy * meta.height),
      width: Math.round(cw * meta.width),
      height: Math.round(ch * meta.height),
    })
    .toBuffer();

  const cells = [
    await cell(cropped),
    await cell(path.join(QA, row.before)),
    await cell(path.join(QA, row.after)),
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

console.log(`\n  wrote ${path.relative(ROOT, OUT)}  ${width} × ${height}\n`);
