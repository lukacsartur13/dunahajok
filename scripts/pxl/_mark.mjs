/** Measure the orange PXL mark and the black stern panel in the side plate. */
import sharp from "sharp";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const { data, info } = await sharp(path.join(ROOT, "assets/source/pxl/pxl-side-20240719.jpg"))
  .raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const px = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };

// 1. The orange mark. Orange is r>140, r-b>60, g between.
let box = { x0: 1e9, x1: -1, y0: 1e9, y1: -1, n: 0 };
for (let y = 850; y < 1100; y++) for (let x = 420; x < 900; x++) {
  const [r, g, b] = px(x, y);
  if (r > 150 && r - b > 70 && g > 60 && g < r - 30) {
    box.n++;
    box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x);
    box.y0 = Math.min(box.y0, y); box.y1 = Math.max(box.y1, y);
  }
}
console.log("orange PXL  ", JSON.stringify(box), `w=${box.x1 - box.x0 + 1} h=${box.y1 - box.y0 + 1}`);
// mean colour of the mark
let acc = [0, 0, 0], n = 0;
for (let y = box.y0; y <= box.y1; y++) for (let x = box.x0; x <= box.x1; x++) {
  const [r, g, b] = px(x, y);
  if (r > 150 && r - b > 70) { acc[0] += r; acc[1] += g; acc[2] += b; n++; }
}
console.log("mark colour ", acc.map((v) => Math.round(v / n)),
  "#" + acc.map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join(""));

// 2. The black stern panel. Dark (<58) and not background, in the stern region,
//    above the lower moulding. Report the bbox and, per row, the aft and
//    forward edge so the rake can be read off.
const DARK = 58;
const isDark = (x, y) => { const [r, g, b] = px(x, y); return 0.2126 * r + 0.7152 * g + 0.0722 * b < DARK; };
let p = { x0: 1e9, x1: -1, y0: 1e9, y1: -1 };
const rows = [];
for (let y = 840; y < 1060; y += 10) {
  let a = -1, f = -1;
  for (let x = 420; x < 1000; x++) if (isDark(x, y)) { if (a < 0) a = x; f = x; }
  if (a >= 0) {
    rows.push({ y, aft: a, fwd: f });
    p.x0 = Math.min(p.x0, a); p.x1 = Math.max(p.x1, f);
    p.y0 = Math.min(p.y0, y); p.y1 = Math.max(p.y1, y);
  }
}
console.log("panel bbox  ", JSON.stringify(p));
for (const r of rows) console.log(`  y=${r.y} aft=${r.aft} fwd=${r.fwd} w=${r.fwd - r.aft}`);

// 3. The gunwale capping band that carries the Duna script: at the script's
//    station, the vertical extent of the dark strip.
console.log("\ncapping at the Duna station");
for (const x of [1560, 1650, 1700, 1750, 1820]) {
  let top = -1, bot = -1;
  for (let y = 760; y < 920; y++) if (isDark(x, y)) { if (top < 0) top = y; bot = y; }
  console.log(`  x=${x}  dark strip rows ${top}..${bot}  (h=${bot - top})`);
}
