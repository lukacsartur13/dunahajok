/**
 * Overlay a labelled pixel grid on a crop, so landmarks can be read off an
 * image by coordinate instead of estimated.  PHASE 4.4, §17.
 *
 *     node scripts/pxl/_grid.mjs <src> <x,y,w,h> <scale> <step> <out>
 *
 * §17 asks for the stern landmarks — transom top, cowling top and bottom,
 * propeller centre, plate, lowest point — as NORMALISED vertical positions.
 * Normalising needs two readings taken in the same frame, and "about here" is
 * not a reading. The grid is how the numbers in PHASE_4_4_REPORT §F were taken.
 */

import sharp from "sharp";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const [src, box, scaleArg, stepArg, out] = process.argv.slice(2);
const [left, top, width, height] = box.split(",").map(Number);
const scale = Number(scaleArg);
const step = Number(stepArg);

const W = Math.round(width * scale);
const H = Math.round(height * scale);

const lines = [];
for (let x = 0; x <= width; x += step) {
  const px = x * scale;
  const major = (x / step) % 5 === 0;
  lines.push(
    `<line x1="${px}" y1="0" x2="${px}" y2="${H}" stroke="${major ? "#e11" : "#e118"}" stroke-width="${major ? 1.4 : 0.7}"/>`,
  );
  if (major) {
    lines.push(
      `<text x="${px + 3}" y="14" font-family="monospace" font-size="13" fill="#e11">${left + x}</text>`,
    );
  }
}
for (let y = 0; y <= height; y += step) {
  const py = y * scale;
  const major = (y / step) % 5 === 0;
  lines.push(
    `<line x1="0" y1="${py}" x2="${W}" y2="${py}" stroke="${major ? "#07e" : "#07e8"}" stroke-width="${major ? 1.4 : 0.7}"/>`,
  );
  if (major) {
    lines.push(
      `<text x="3" y="${py - 4}" font-family="monospace" font-size="13" fill="#07e">${top + y}</text>`,
    );
  }
}

const overlay = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${lines.join("")}</svg>`,
);

await sharp(path.join(ROOT, src))
  .extract({ left, top, width, height })
  .resize({ width: W, kernel: "lanczos3" })
  .composite([{ input: overlay, top: 0, left: 0 }])
  .png()
  .toFile(path.join(ROOT, out));

console.log(`wrote ${out}  (${W}×${H}, grid ${step}px source, labels in SOURCE coords)`);
