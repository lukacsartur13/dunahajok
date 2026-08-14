/**
 * Sample a colour off any image, averaged over a 7×7 patch.  PHASE 4.3.
 *
 *     node scripts/pxl/_sample.mjs <file> <x,y> [<x,y> …]
 *
 * §23 asks that each finish be tuned against the closest supplied reference,
 * and §22 warns that the failure to avoid is a render that is "flatter and more
 * pastel". Neither is answerable by eye: the sage looked plausible and measured
 * 34% saturated against a plate running 8–13%, and the cognac looked like
 * cognac and measured #ca7d48 against a reference #985127.
 *
 * So the material work in PHASE_4_3_REPORT §L and §M was done by sampling the
 * plate and the live frame at the same semantic point and reading the two
 * numbers. This is that tool. The patch average is what keeps a single
 * anti-aliased pixel or a JPEG artefact out of the answer.
 */

import sharp from "sharp";

const [file, ...points] = process.argv.slice(2);
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });

for (const point of points) {
  const [x, y] = point.split(",").map(Number);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let dy = -3; dy <= 3; dy += 1) {
    for (let dx = -3; dx <= 3; dx += 1) {
      const px = Math.min(Math.max(x + dx, 0), info.width - 1);
      const py = Math.min(Math.max(y + dy, 0), info.height - 1);
      const i = (py * info.width + px) * info.channels;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n += 1;
    }
  }
  const hex = (v) => Math.round(v / n).toString(16).padStart(2, "0");
  console.log(`  ${file.split("/").pop()} @${x},${y}  #${hex(r)}${hex(g)}${hex(b)}`);
}
