import sharp from "sharp";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const file = path.join(ROOT, process.argv[2]);
const img = sharp(file);
const meta = await img.metadata();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
console.log(`${process.argv[2]}  ${W}x${H} ch=${C}`);

const at = (x, y) => {
  const i = (y * W + x) * C;
  return [data[i], data[i + 1], data[i + 2]];
};
const lum = (x, y) => { const [r, g, b] = at(x, y); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

// Region of interest, as fractions, from argv[3..6] = x0,y0,x1,y1
const roi = (process.argv[3] ?? "0,0,1,1").split(",").map(Number);
const X0 = Math.round(roi[0] * W), Y0 = Math.round(roi[1] * H);
const X1 = Math.round(roi[2] * W), Y1 = Math.round(roi[3] * H);

// Column/row extents of "not background". Background is near-white or the
// water plate; the caller passes a luminance threshold.
const THRESH = Number(process.argv[4] ?? 235);
let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
const colTop = new Array(W).fill(-1);
const colBot = new Array(W).fill(-1);
for (let y = Y0; y < Y1; y++) {
  for (let x = X0; x < X1; x++) {
    if (lum(x, y) < THRESH) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (colTop[x] < 0) colTop[x] = y;
      colBot[x] = y;
    }
  }
}
console.log(`  subject bbox  x[${minX},${maxX}] y[${minY},${maxY}]  (w=${maxX - minX + 1} h=${maxY - minY + 1})`);
console.log(`  as fractions  x[${(minX / W).toFixed(4)},${(maxX / W).toFixed(4)}] y[${(minY / H).toFixed(4)},${(maxY / H).toFixed(4)}]`);

// Profile: for 21 stations along the subject, print top and bottom of the ink.
const N = 21;
let out = "";
for (let i = 0; i <= N; i++) {
  const x = Math.round(minX + ((maxX - minX) * i) / N);
  const t = colTop[x], b = colBot[x];
  const u = (x - minX) / (maxX - minX);
  out += `  u=${u.toFixed(3)} x=${x} top=${t} bot=${b} h=${b - t}\n`;
}
console.log(out);
