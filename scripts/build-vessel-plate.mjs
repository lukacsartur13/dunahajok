/**
 * Duna Boats — vessel plate extraction (Phase Two).
 *
 * Until a production GLB of the Duna 6.1 exists, the hero's vessel is the
 * approved studio profile photograph, composited into the WebGL scene as a
 * correctly-scaled plate standing on the water surface. For that to read as a
 * plate rather than as a picture pasted on top, it needs:
 *
 *   • a real alpha channel — no white studio box,
 *   • a hard, slightly-feathered cut at the vessel's waterline, so the water
 *     shader owns everything below it (and the plinth and drive leg, which
 *     belong to a photograph of a boat on a plinth, simply cease to exist),
 *   • known real-world scale, so the wake, the water wavelengths and the
 *     camera all agree that this object is 6.1 metres long.
 *
 * The source is a studio shot on a smooth, slowly-varying light wall. So the
 * matte is not a naive luma key (the topsides are white and a global threshold
 * eats the bow). Instead the wall itself is modelled — per column from the
 * clean rows above the vessel, per row from the clean margins at each side —
 * and the matte is the distance from that prediction. That survives both the
 * vignette and the wall's vertical falloff.
 *
 *   node scripts/build-vessel-plate.mjs
 *   node scripts/build-vessel-plate.mjs --debug   # also writes a QA contact sheet
 *
 * Output: public/media/vessel/*.png + src/lib/vessel.generated.ts
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, "scripts", ".cache");
const OUT = path.join(ROOT, "public", "media", "vessel");
const MANIFEST = path.join(ROOT, "src", "lib", "vessel.generated.ts");
const DEBUG = process.argv.includes("--debug");

/**
 * Working resolution for the matte. The plate is only ever drawn a few hundred
 * CSS pixels tall in the hero, so 1600px of source is already generous; going
 * higher only costs texture memory and decode time on mobile.
 */
const WORK_WIDTH = 1600;

/** Vessel plates to derive. `waterline` is a fraction of the source height. */
const PLATES = [
  {
    id: "duna61-cabin-profile",
    /** Same media-library path the Phase One pipeline uses. */
    source: "2022/05/S2j.jpg",
    label: "Duna 6.1 Cabin, studio profile",
    /** Heading the photographed vessel faces: bow towards +x in image space. */
    facing: "right",
    /**
     * Where the water surface crosses the hull, as a fraction of source height.
     * Set against the hull's own geometry: below this the photograph contains
     * a concrete plinth and a drive leg shot in air, neither of which belongs
     * in the composite. Everything below is discarded and the water shader
     * takes over.
     */
    waterline: 0.582,
    /** Soft edge on that cut, in working pixels — the hull dissolves in. */
    waterlineFeather: 9,
    /**
     * Length overall of what remains visible, in metres. The 6.1 in the name
     * is the hull; the plate also carries the teak bathing platform, so the
     * matte is wider than the hull LOA.
     */
    metres: 6.72,
    /** Matte thresholds, in RGB distance from the modelled background. */
    key: { soft: 14.5, hard: 36 },
  },
];

async function readSource(src) {
  const file = path.join(CACHE, createHash("sha1").update(src).digest("hex") + path.extname(src));
  try {
    return await readFile(file);
  } catch {
    const res = await fetch("https://dunahajok.hu/wp-content/uploads/" + encodeURI(src));
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${src}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await mkdir(CACHE, { recursive: true });
    await writeFile(file, buf);
    return buf;
  }
}

/** Cell edge, in working pixels, of the background model's grid. */
const CELL = 20;
/** RGB distance from the crude global wall estimate that is certainly vessel. */
const BLOB_THRESHOLD = 46;

const median = (values) => {
  values.sort((a, b) => a - b);
  return values[values.length >> 1];
};

/**
 * Model the studio wall behind the vessel, as a smooth 2D field.
 *
 * A separable row×column model is not enough here: the lens vignette is
 * radial, so the corners come out several levels darker than either margin
 * predicts, and the key then reads the corners as foreground. Instead the wall
 * is fitted on a coarse grid and the cells the vessel covers are inpainted:
 *
 *   1. crude key against the global wall median → a definitely-vessel blob,
 *      dilated and hole-filled so the black hull interior counts as covered;
 *   2. per-cell upper-percentile colour, kept only where the blob is absent;
 *   3. Laplacian relaxation fills the covered cells from their neighbours —
 *      the wall behind the boat is smooth, so diffusion is the right model;
 *   4. bilinear sampling gives bg(x, y) at full resolution.
 */
function modelBackground(data, w, h, ch) {
  /* 1 — crude blob ------------------------------------------------------- */
  const globalWall = [0, 0, 0];
  {
    const border = [[], [], []];
    const SIDE = Math.round(w * 0.02);
    for (let y = 0; y < h; y += 3) {
      for (let c = 0; c < 3; c++) {
        border[c].push(data[(y * w + 0) * ch + c], data[(y * w + (w - 1)) * ch + c]);
      }
    }
    for (let c = 0; c < 3; c++) globalWall[c] = median(border[c]);
    void SIDE;
  }

  const gw = Math.ceil(w / CELL);
  const gh = Math.ceil(h / CELL);
  const covered = new Uint8Array(gw * gh);

  for (let cy = 0; cy < gh; cy++) {
    for (let cx = 0; cx < gw; cx++) {
      let hits = 0;
      let total = 0;
      for (let y = cy * CELL; y < Math.min(h, (cy + 1) * CELL); y += 2) {
        for (let x = cx * CELL; x < Math.min(w, (cx + 1) * CELL); x += 2) {
          const i = (y * w + x) * ch;
          let d = 0;
          for (let c = 0; c < 3; c++) {
            const diff = data[i + c] - globalWall[c];
            d += diff * diff;
          }
          total++;
          if (Math.sqrt(d) > BLOB_THRESHOLD) hits++;
        }
      }
      covered[cy * gw + cx] = hits / Math.max(1, total) > 0.12 ? 1 : 0;
    }
  }

  // Fill horizontal spans between the first and last covered cell in a row,
  // so the wall is never sampled from inside the hull, and dilate by one.
  for (let cy = 0; cy < gh; cy++) {
    let first = -1;
    let last = -1;
    for (let cx = 0; cx < gw; cx++) {
      if (covered[cy * gw + cx]) {
        if (first < 0) first = cx;
        last = cx;
      }
    }
    for (let cx = first; cx >= 0 && cx <= last; cx++) covered[cy * gw + cx] = 1;
  }
  const dilated = Uint8Array.from(covered);
  for (let cy = 0; cy < gh; cy++) {
    for (let cx = 0; cx < gw; cx++) {
      if (!covered[cy * gw + cx]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = cy + dy;
          const nx = cx + dx;
          if (ny >= 0 && ny < gh && nx >= 0 && nx < gw) dilated[ny * gw + nx] = 1;
        }
      }
    }
  }

  /* 2 — per-cell wall colour where the vessel is absent -------------------- */
  const grid = new Float32Array(gw * gh * 3);
  const known = new Uint8Array(gw * gh);
  for (let cy = 0; cy < gh; cy++) {
    for (let cx = 0; cx < gw; cx++) {
      if (dilated[cy * gw + cx]) continue;
      for (let c = 0; c < 3; c++) {
        const s = [];
        for (let y = cy * CELL; y < Math.min(h, (cy + 1) * CELL); y++) {
          for (let x = cx * CELL; x < Math.min(w, (cx + 1) * CELL); x++) {
            s.push(data[(y * w + x) * ch + c]);
          }
        }
        // Upper quartile, not the median: a cell clipped by the silhouette
        // still reports the wall rather than the average of wall and hull.
        s.sort((a, b) => a - b);
        grid[(cy * gw + cx) * 3 + c] = s[Math.floor(s.length * 0.78)];
      }
      known[cy * gw + cx] = 1;
    }
  }

  /* 3 — relax the unknown cells ------------------------------------------- */
  let seedCount = 0;
  for (let i = 0; i < gw * gh; i++) if (known[i]) seedCount++;
  if (seedCount < 8) throw new Error("background model has too few clean cells");

  const mean = [0, 0, 0];
  for (let i = 0; i < gw * gh; i++) {
    if (!known[i]) continue;
    for (let c = 0; c < 3; c++) mean[c] += grid[i * 3 + c] / seedCount;
  }
  for (let i = 0; i < gw * gh; i++) {
    if (known[i]) continue;
    for (let c = 0; c < 3; c++) grid[i * 3 + c] = mean[c];
  }

  const next = new Float32Array(grid.length);
  for (let pass = 0; pass < 600; pass++) {
    next.set(grid);
    for (let cy = 0; cy < gh; cy++) {
      for (let cx = 0; cx < gw; cx++) {
        const i = cy * gw + cx;
        if (known[i]) continue;
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let n = 0;
          if (cx > 0) (sum += grid[(i - 1) * 3 + c]), n++;
          if (cx < gw - 1) (sum += grid[(i + 1) * 3 + c]), n++;
          if (cy > 0) (sum += grid[(i - gw) * 3 + c]), n++;
          if (cy < gh - 1) (sum += grid[(i + gw) * 3 + c]), n++;
          next[i * 3 + c] = sum / n;
        }
      }
    }
    grid.set(next);
  }

  /* 4 — bilinear sampler --------------------------------------------------- */
  const at = (cx, cy, c) =>
    grid[(Math.min(gh - 1, Math.max(0, cy)) * gw + Math.min(gw - 1, Math.max(0, cx))) * 3 + c];

  return function sample(x, y, out) {
    const fx = x / CELL - 0.5;
    const fy = y / CELL - 0.5;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    for (let c = 0; c < 3; c++) {
      const a = at(x0, y0, c) * (1 - tx) + at(x0 + 1, y0, c) * tx;
      const b = at(x0, y0 + 1, c) * (1 - tx) + at(x0 + 1, y0 + 1, c) * tx;
      out[c] = a * (1 - ty) + b * ty;
    }
    return out;
  };
}

/** Largest 4-connected run of opaque pixels; everything else is sensor noise. */
function keepLargestComponent(alpha, w, h) {
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let best = null;
  let bestSize = 0;

  for (let start = 0; start < w * h; start++) {
    if (seen[start] || alpha[start] < 24) continue;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    const members = [];

    while (top > 0) {
      const i = stack[--top];
      members.push(i);
      const x = i % w;
      const y = (i / w) | 0;
      if (x > 0 && !seen[i - 1] && alpha[i - 1] >= 24) (seen[i - 1] = 1), (stack[top++] = i - 1);
      if (x < w - 1 && !seen[i + 1] && alpha[i + 1] >= 24) (seen[i + 1] = 1), (stack[top++] = i + 1);
      if (y > 0 && !seen[i - w] && alpha[i - w] >= 24) (seen[i - w] = 1), (stack[top++] = i - w);
      if (y < h - 1 && !seen[i + w] && alpha[i + w] >= 24) (seen[i + w] = 1), (stack[top++] = i + w);
    }

    if (members.length > bestSize) {
      bestSize = members.length;
      best = members;
    }
  }

  if (!best) return alpha;
  const kept = new Uint8Array(w * h);
  for (const i of best) kept[i] = alpha[i];
  return kept;
}

/** Separable box blur on the alpha channel — softens the key's staircase. */
function blurAlpha(alpha, w, h, radius) {
  const tmp = new Float32Array(w * h);
  const out = new Uint8Array(w * h);
  const n = radius * 2 + 1;

  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += alpha[y * w + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / n;
      const add = Math.min(w - 1, x + radius + 1);
      const sub = Math.max(0, x - radius);
      sum += alpha[y * w + add] - alpha[y * w + sub];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = Math.round(Math.min(255, Math.max(0, sum / n)));
      const add = Math.min(h - 1, y + radius + 1) * w + x;
      const sub = Math.max(0, y - radius) * w + x;
      sum += tmp[add] - tmp[sub];
    }
  }
  return out;
}

async function derive(plate) {
  const buf = await readSource(plate.source);
  const { data, info } = await sharp(buf)
    .rotate()
    .resize({ width: WORK_WIDTH, kernel: "lanczos3" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const sampleBackground = modelBackground(data, w, h, ch);

  const cutY = plate.waterline * h;
  const feather = plate.waterlineFeather;

  let alpha = new Uint8Array(w * h);
  const predicted = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    // Below the waterline the photograph is discarded outright: the water
    // shader is the truth there, not a studio floor.
    let vertical = 1;
    if (y > cutY) vertical = Math.max(0, 1 - (y - cutY) / feather);
    if (vertical <= 0) continue;

    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      sampleBackground(x, y, predicted);
      let d = 0;
      for (let c = 0; c < 3; c++) {
        const diff = data[i + c] - predicted[c];
        d += diff * diff;
      }
      d = Math.sqrt(d);

      const t = (d - plate.key.soft) / (plate.key.hard - plate.key.soft);
      const a = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
      alpha[y * w + x] = Math.round(a * vertical * 255);
    }
  }

  alpha = keepLargestComponent(alpha, w, h);
  alpha = blurAlpha(alpha, w, h, 1);

  // Re-assert the hard waterline the blur just softened, then crop to content.
  for (let y = Math.ceil(cutY + feather); y < h; y++) alpha.fill(0, y * w, y * w + w);

  let minX = w;
  let maxX = -1;
  let minY = h;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] < 8) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error(`${plate.id}: matte is empty — check the key thresholds`);

  const pad = 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const chh = maxY - minY + 1;

  /**
   * Edge decontamination. A matte cut out of a bright wall carries a light
   * fringe: at 50% alpha the pixel is half wall. Un-mixing it exactly needs
   * the true foreground, which we don't have — but subtracting the modelled
   * background in proportion to transparency is the standard approximation,
   * and it is the difference between a hull that sits in the frame and one
   * that glows.
   */
  const rgba = Buffer.alloc(cw * chh * 4);
  for (let y = 0; y < chh; y++) {
    for (let x = 0; x < cw; x++) {
      const sx = minX + x;
      const sy = minY + y;
      const a = alpha[sy * w + sx] / 255;
      const si = (sy * w + sx) * ch;
      const di = (y * cw + x) * 4;
      sampleBackground(sx, sy, predicted);
      for (let c = 0; c < 3; c++) {
        const observed = data[si + c];
        const unmixed = a > 0.02 ? (observed - (1 - a) * predicted[c]) / a : observed;
        rgba[di + c] = Math.round(Math.min(255, Math.max(0, unmixed)));
      }
      rgba[di + 3] = alpha[sy * w + sx];
    }
  }

  await mkdir(OUT, { recursive: true });
  const png = await sharp(rgba, { raw: { width: cw, height: chh, channels: 4 } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
  await writeFile(path.join(OUT, `${plate.id}.png`), png);

  if (DEBUG) {
    // QA sheet: the plate over the site's river-dark, where every fringe shows.
    await sharp({
      create: { width: cw, height: chh, channels: 4, background: "#0a0e0f" },
    })
      .composite([{ input: png }])
      .png()
      .toFile(path.join(OUT, `${plate.id}.debug.png`));
  }

  const metrics = {
    id: plate.id,
    label: plate.label,
    src: `/media/vessel/${plate.id}.png`,
    width: cw,
    height: chh,
    facing: plate.facing,
    metres: plate.metres,
    /** Metres per pixel — the scale the 3D plate is built at. */
    metresPerPixel: plate.metres / cw,
    /** Height above the water, in metres, of the top of the matte. */
    heightMetres: (chh / cw) * plate.metres,
    bytes: png.length,
  };

  console.log(
    `  ${plate.id.padEnd(26)} ${cw}×${chh}  ${(png.length / 1024).toFixed(0)} kB  ` +
      `${metrics.heightMetres.toFixed(2)} m above waterline`,
  );

  return metrics;
}

async function main() {
  const results = [];
  for (const plate of PLATES) results.push(await derive(plate));

  const body = `// GENERATED by scripts/build-vessel-plate.mjs — do not edit by hand.
// Run \`npm run vessel\` to regenerate.

export interface VesselPlate {
  readonly id: string;
  readonly label: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** Which way the photographed bow points in image space. */
  readonly facing: "left" | "right";
  /** Visible length overall of the matte, in metres. */
  readonly metres: number;
  readonly metresPerPixel: number;
  /** Distance from the waterline to the top of the matte, in metres. */
  readonly heightMetres: number;
}

export const VESSEL_PLATES = {
${results
  .map(
    (r) => `  ${JSON.stringify(r.id)}: {
    id: ${JSON.stringify(r.id)},
    label: ${JSON.stringify(r.label)},
    src: ${JSON.stringify(r.src)},
    width: ${r.width},
    height: ${r.height},
    facing: ${JSON.stringify(r.facing)},
    metres: ${r.metres},
    metresPerPixel: ${r.metresPerPixel.toFixed(8)},
    heightMetres: ${r.heightMetres.toFixed(4)},
  },`,
  )
  .join("\n")}
} as const satisfies Record<string, VesselPlate>;

export type VesselPlateId = keyof typeof VESSEL_PLATES;
`;

  await writeFile(MANIFEST, body);
  console.log(`\n  → ${path.relative(ROOT, MANIFEST)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
