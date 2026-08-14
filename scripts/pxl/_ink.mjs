/**
 * Isolate a light-on-dark (or dark-on-light) mark inside a crop and report its
 * bounding box in SOURCE pixel coordinates, plus an ASCII raster for tracing.
 *
 *   node scripts/pxl/_ink.mjs <src> <left,top,w,h> <mode:light|dark> <threshold>
 */
import sharp from "sharp";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const [src, box, mode = "light", thresholdArg, cols = "96"] = process.argv.slice(2);
const [left, top, width, height] = box.split(",").map(Number);

const { data, info } = await sharp(path.join(ROOT, src))
  .extract({ left, top, width, height })
  .raw()
  .toBuffer({ resolveWithObject: true });
const C = info.channels;
const L = new Float64Array(width * height);
for (let i = 0; i < width * height; i++) {
  L[i] = 0.2126 * data[i * C] + 0.7152 * data[i * C + 1] + 0.0722 * data[i * C + 2];
}
let lo = 1e9, hi = -1e9, sum = 0;
for (const v of L) { lo = Math.min(lo, v); hi = Math.max(hi, v); sum += v; }
const mean = sum / L.length;
console.log(`crop ${width}x${height} lum min=${lo.toFixed(1)} max=${hi.toFixed(1)} mean=${mean.toFixed(1)}`);

const threshold = thresholdArg ? Number(thresholdArg) : mean;
const ink = (i) => (mode === "light" ? L[i] > threshold : L[i] < threshold);

let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, n = 0;
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  if (!ink(y * width + x)) continue;
  n++;
  minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  minY = Math.min(minY, y); maxY = Math.max(maxY, y);
}
console.log(`ink px=${n} threshold=${threshold.toFixed(1)}`);
console.log(`bbox in crop  x[${minX},${maxX}] y[${minY},${maxY}]  w=${maxX - minX + 1} h=${maxY - minY + 1}`);
console.log(`bbox in source x[${left + minX},${left + maxX}] y[${top + minY},${top + maxY}]`);

// ASCII raster over the ink bbox, `cols` wide.
const W = Number(cols);
const bw = maxX - minX + 1, bh = maxY - minY + 1;
const rows = Math.max(1, Math.round((W * bh) / bw / 2));
let art = "";
for (let r = 0; r < rows; r++) {
  let line = "";
  for (let c = 0; c < W; c++) {
    let cover = 0, tot = 0;
    const x0 = minX + Math.floor((c * bw) / W), x1 = minX + Math.floor(((c + 1) * bw) / W);
    const y0 = minY + Math.floor((r * bh) / rows), y1 = minY + Math.floor(((r + 1) * bh) / rows);
    for (let y = y0; y < Math.max(y1, y0 + 1); y++) for (let x = x0; x < Math.max(x1, x0 + 1); x++) {
      tot++; if (ink(y * width + x)) cover++;
    }
    const f = tot ? cover / tot : 0;
    line += f > 0.66 ? "#" : f > 0.33 ? "+" : f > 0.08 ? "." : " ";
  }
  art += line + "\n";
}
console.log(art);
