import sharp from "sharp";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..", "..");
// argv: src  x,y,w,h (px)  scale  out
const [src, box, scale, out] = process.argv.slice(2);
const [left, top, width, height] = box.split(",").map(Number);
await sharp(path.join(ROOT, src))
  .extract({ left, top, width, height })
  .resize({ width: Math.round(width * Number(scale)), kernel: "lanczos3" })
  .png()
  .toFile(path.join(ROOT, out));
console.log("wrote", out);
