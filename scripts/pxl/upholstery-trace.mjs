/**
 * PXL — TRACING THE REFERENCE UPHOLSTERY INTO MODEL COORDINATES.  PHASE 4.7.1.
 *
 *     node scripts/pxl/upholstery-trace.mjs
 *     npm run upholstery:trace
 *
 * §28: "Do not interpret the upholstery anymore. TRACE IT."
 *
 * ── WHAT THIS DOES ────────────────────────────────────────────────────────
 *
 * A pixel in the delivered cockpit three-quarter is a RAY in model space, and a
 * ray that meets the cockpit's floor meets it at one point. So the plate's
 * cognac region can be turned into (x, y) stations on the boat rather than into
 * another verbal description of where it looks like it starts.
 *
 *   1. classify the plate's cognac by chroma, and open it to drop the rails,
 *      the coaming inlay and the cleats, which are the same colour and are not
 *      upholstery
 *   2. label what survives; the console and the open sole between the rear seat
 *      and the forward padding separate the regions on their own
 *   3. SOLVE for the camera the plate was drawn from, by silhouette
 *   4. render the model through it into a G-BUFFER — every pixel carries the
 *      model-space point the eye met there
 *   5. read the cognac pixels' model positions out of the G-buffer
 *
 * ── WHY THE CAMERA IS SOLVED AND NOT TAKEN FROM `pxlPresets` ──────────────
 *
 * `reference_top_3q` was the obvious place to start and it is wrong for this
 * job, which is worth recording because the preset is not wrong for its own.
 * Rendered at its azimuth 48° and elevation 34°, the model's silhouette is
 * 1034 × 687 — an aspect of 1.50. The plate's is 1637 × 660, an aspect of 2.48.
 * The preset is a COMPOSITION, tuned by eye against the plate so that a person
 * comparing the two sees the same boat; it was never a photogrammetric
 * solution and nothing in this project previously needed it to be. Measuring a
 * footprint through it would have put every station out by the better part of
 * a metre — which is roughly the size of the error this phase exists to fix.
 *
 * So the camera is fitted: azimuth, elevation, focal length and principal point
 * are searched for maximum silhouette overlap, and the residual is reported
 * rather than assumed. Distance is held at the preset's 13.4 m because at this
 * range it trades against focal length almost exactly and letting both float
 * buys a slower search and nothing else.
 *
 * ── WHAT IT IS NOT ────────────────────────────────────────────────────────
 *
 * It is not a claim of millimetres. The plate is a design rendering, its lens
 * is unknown, and its hull is not this hull to the last curve. Read the station
 * numbers as good to a few centimetres — and read the AFT END, which is what §4
 * is about, as the number this file exists to produce.
 */

import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const QA = path.join(ROOT, ".qa");
/* The model to measure. Defaults to the production export; a path can be
   given so an earlier phase's export can be scored on the same reference —
   which is the only way "better" means anything. */
const MODEL = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, "assets", "derived", "pxl", "PXL.production.glb");
const TAG = process.argv[3] ?? "p471";
const PLATE = path.join(ROOT, "assets", "source", "pxl", "pxl-views-20240815c.jpg");

/** `PXL_REFERENCE_PLATES` → `top_3q`. The cockpit three-quarter's quadrant. */
const CROP = [0.03, 0.38, 0.60, 0.58];

/** Where the camera stands, in metres from the look-at point. Held. */
const DISTANCE = 13.4;
/** What it looks at, in MODEL axes (x fore, y to starboard, z up). */
const TARGET = new THREE.Vector3(-0.35, 0, 0.30);

/* ── The plate ────────────────────────────────────────────────────────────*/

const meta = await sharp(PLATE).metadata();
const box = {
  left: Math.round(CROP[0] * meta.width),
  top: Math.round(CROP[1] * meta.height),
  width: Math.round(CROP[2] * meta.width),
  height: Math.round(CROP[3] * meta.height),
};
const plate = await sharp(PLATE).extract(box).removeAlpha().raw()
  .toBuffer({ resolveWithObject: true });
const PW = plate.info.width, PH = plate.info.height;
const px = (i) => [plate.data[i * 3], plate.data[i * 3 + 1], plate.data[i * 3 + 2]];

/**
 * Cognac, by chroma rather than by brightness.
 *
 * The cushions run about #985127 in shadow to #c07a45 in the light and the hull
 * is a desaturated teal, so red-over-green-over-blue with real chroma separates
 * them at every exposure on the plate. A luminance threshold does not: the lit
 * teal deck and the shadowed cognac overlap.
 */
const isCognac = (r, g, b) =>
  r > g && g > b && r - b > 50 && r - g > 30 && g - b > 10 && r > 70 && r < 240;

/**
 * The boat, for the silhouette fit — by luminance, and it is that simple.
 *
 * The plate is a design rendering on a near-white field: the background runs
 * 236–255, the lightest thing on the boat is the sunlit teal deck at about 106
 * and the soft ground shadow under the hull is 154. One threshold at 175 takes
 * the whole vessel and neither the field nor the shadow.
 */
const isBoat = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b < 175;

const cognac0 = new Uint8Array(PW * PH);
const boat = new Uint8Array(PW * PH);
for (let i = 0; i < PW * PH; i += 1) {
  const [r, g, b] = px(i);
  if (isCognac(r, g, b)) cognac0[i] = 1;
  if (isBoat(r, g, b)) boat[i] = 1;
}

/**
 * THE HELMSMAN IS NOT PART OF THE BOAT, and the fit has to be told so.
 *
 * The plate draws a figure at the wheel; the model has no figure, so every
 * pixel of it scores as a miss and the search answers by tilting the camera to
 * cover it. The rectangle below is the figure's extent in plate pixels, found
 * by eye and drawn in `p471-trace-plate.png` so it can be checked. It is
 * excluded from BOTH sides, so nothing inside it can pull the fit either way.
 */
const IGNORE = { x0: 440, y0: 80, x1: 700, y1: 480 };
const ignored = (u, v) =>
  u >= IGNORE.x0 && u <= IGNORE.x1 && v >= IGNORE.y0 && v <= IGNORE.y1;

/** Binary morphology on a mask. */
function morph(mask, w, h, radius, grow) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let hit = grow ? 0 : 1;
      for (let dy = -radius; dy <= radius && hit === (grow ? 0 : 1); dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx, ny = y + dy;
          const v = (nx < 0 || ny < 0 || nx >= w || ny >= h) ? 0 : mask[ny * w + nx];
          if (grow ? v === 1 : v === 0) { hit = grow ? 1 : 0; break; }
        }
      }
      out[y * w + x] = hit;
    }
  }
  return out;
}

/**
 * OPENING, AND THE RADIUS IS THE WHOLE OF IT.
 *
 * The grab rails, the coaming inlay and the two bow cleats are the same cognac
 * as the cushions and are not upholstery. In this projection they are 4–9 px
 * across and the cushions are 60–200, so an erosion of 7 removes every one of
 * them and takes 7 px off the padding's edge, which the dilation puts back.
 */
const OPEN = 7;
const cognac = morph(morph(cognac0, PW, PH, OPEN, false), PW, PH, OPEN, true);

/** Connected components, 4-connected, above a minimum area, largest first. */
function label(mask, w, h, min) {
  const seen = new Uint8Array(w * h);
  const groups = [];
  for (let s = 0; s < w * h; s += 1) {
    if (!mask[s] || seen[s]) continue;
    const stack = [s], cells = [];
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop();
      cells.push(i);
      const x = i % w, y = (i / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (mask[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    if (cells.length >= min) groups.push(cells);
  }
  return groups.sort((a, b) => b.length - a.length);
}

const regions = label(cognac, PW, PH, 900);
/* The crop's right edge clips a corner of the sheet's OTHER view; the largest
   component is the boat and everything out there is not. */
const boatMain = new Uint8Array(PW * PH);
for (const i of label(boat, PW, PH, 1)[0]) boatMain[i] = 1;

/* ── The model ────────────────────────────────────────────────────────────*/

const bytes = await readFile(MODEL);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
gltf.scene.updateWorldMatrix(true, true);
const toModel = (v) => new THREE.Vector3(v.x, -v.z, v.y);

/* The outboard STAYS VISIBLE here. It is switched off in the product because
   `pxlPropulsion` draws four proxies instead, but the plate has an engine on
   the transom and this is a silhouette comparison — leaving it out would ask
   the search to match a boat with an engine to a boat without one. The
   platform is not in the plate; the cushions are what is being measured. */
const HIDE = new Set(["upholstery_primary", "accessory_cockpit_cover",
  "platform_deck", "platform_frame"]);

const tris = [];
/** The live cushions, kept aside for the §9 mask comparison. */
const cushionTris = [];
gltf.scene.traverse((o) => {
  if (!o.isMesh) return;
  if (o.name === "upholstery_primary") {
    const pos = o.geometry.attributes.position, idx = o.geometry.index;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const p = [];
      for (let k = 0; k < 3; k += 1) {
        const j = idx ? idx.getX(i + k) : i + k;
        p.push(toModel(new THREE.Vector3().fromBufferAttribute(pos, j)
          .applyMatrix4(o.matrixWorld)));
      }
      /* Forward of the bench only: §9 compares the FORWARD padding, and the
         rear seating is a separate system with its own cognac region. */
      if ((p[0].x + p[1].x + p[2].x) / 3 >= -0.90) cushionTris.push({ p, zone: o.name });
    }
    return;
  }
  if (HIDE.has(o.name)) return;
  const pos = o.geometry.attributes.position, idx = o.geometry.index;
  const count = idx ? idx.count : pos.count;
  for (let i = 0; i < count; i += 3) {
    const p = [];
    for (let k = 0; k < 3; k += 1) {
      const j = idx ? idx.getX(i + k) : i + k;
      p.push(toModel(new THREE.Vector3().fromBufferAttribute(pos, j)
        .applyMatrix4(o.matrixWorld)));
    }
    tris.push({ p, zone: o.name });
  }
});

/** A camera basis from an azimuth and elevation about `TARGET`. */
function basis(azDeg, elDeg) {
  const az = (azDeg * Math.PI) / 180, el = (elDeg * Math.PI) / 180;
  const horiz = Math.cos(el) * DISTANCE;
  /* Azimuth 0 is dead abeam and swings toward the bow, as in `pxlPresets`; the
     plate looks at the boat from off the PORT side, so the lateral term is
     negative. */
  const eye = new THREE.Vector3(
    TARGET.x + Math.sin(az) * horiz,
    TARGET.y - Math.cos(az) * horiz,
    TARGET.z + Math.sin(el) * DISTANCE,
  );
  const fwd = new THREE.Vector3().subVectors(TARGET, eye).normalize();
  /* SCREEN RIGHT IS `fwd × up`, WHICH IS THREE'S CONVENTION AND NOT THE OTHER
     ONE. `PerspectiveCamera.lookAt` builds its X axis as `up × (eye − target)`,
     and `eye − target` is −fwd, so its X is `fwd × up`. Using `up × fwd` here
     renders the boat MIRRORED — and because a hull is symmetric port to
     starboard, a mirrored render still fits the plate's silhouette almost as
     well. The first solve did exactly that: it returned a plausible 80% overlap
     with the bow where the transom is, and the only symptom was that the rear
     seat traced to x +1.2 and the forward padding to x −2.1. */
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 0, 1)).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  return { eye, fwd, right, up };
}

/** Project with an explicit focal length in pixels and principal point. */
function projector(cam, f, cx, cy) {
  const d = new THREE.Vector3();
  return (p) => {
    d.subVectors(p, cam.eye);
    const z = d.dot(cam.fwd);
    if (z <= 1e-4) return null;
    return [cx + (d.dot(cam.right) / z) * f, cy - (d.dot(cam.up) / z) * f, z];
  };
}

/** Rasterise a silhouette, and optionally a model-space G-buffer, at w × h. */
function raster(project, w, h, wantG) {
  const mask = new Uint8Array(w * h);
  const depth = wantG ? new Float32Array(w * h).fill(Infinity) : null;
  const g = wantG
    ? {
      x: new Float32Array(w * h).fill(NaN), y: new Float32Array(w * h).fill(NaN),
      z: new Float32Array(w * h).fill(NaN), zone: new Array(w * h).fill(null),
    }
    : null;
  for (const { p: t, zone } of tris) {
    const p = [project(t[0]), project(t[1]), project(t[2])];
    if (!p[0] || !p[1] || !p[2]) continue;
    const minX = Math.max(0, Math.floor(Math.min(p[0][0], p[1][0], p[2][0])));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(p[0][0], p[1][0], p[2][0])));
    const minY = Math.max(0, Math.floor(Math.min(p[0][1], p[1][1], p[2][1])));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(p[0][1], p[1][1], p[2][1])));
    if (minX > maxX || minY > maxY) continue;
    const d = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1])
      - (p[2][0] - p[0][0]) * (p[1][1] - p[0][1]);
    if (Math.abs(d) < 1e-9) continue;
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const ux = x + 0.5, uy = y + 0.5;
        const w1 = ((ux - p[0][0]) * (p[2][1] - p[0][1])
          - (p[2][0] - p[0][0]) * (uy - p[0][1])) / d;
        const w2 = ((p[1][0] - p[0][0]) * (uy - p[0][1])
          - (ux - p[0][0]) * (p[1][1] - p[0][1])) / d;
        if (w1 < 0 || w2 < 0 || w1 + w2 > 1) continue;
        const i = y * w + x;
        mask[i] = 1;
        if (!wantG) continue;
        const zz = p[0][2] + w1 * (p[1][2] - p[0][2]) + w2 * (p[2][2] - p[0][2]);
        if (zz >= depth[i]) continue;
        depth[i] = zz;
        g.x[i] = t[0].x + w1 * (t[1].x - t[0].x) + w2 * (t[2].x - t[0].x);
        g.y[i] = t[0].y + w1 * (t[1].y - t[0].y) + w2 * (t[2].y - t[0].y);
        g.z[i] = t[0].z + w1 * (t[1].z - t[0].z) + w2 * (t[2].z - t[0].z);
        g.zone[i] = zone;
      }
    }
  }
  return { mask, g };
}

/* ── Solving the camera ───────────────────────────────────────────────────*/

/** Downscale a mask by an integer factor; majority wins. */
function shrink(mask, w, h, k) {
  const nw = Math.floor(w / k), nh = Math.floor(h / k);
  const out = new Uint8Array(nw * nh);
  for (let y = 0; y < nh; y += 1) {
    for (let x = 0; x < nw; x += 1) {
      let n = 0;
      for (let dy = 0; dy < k; dy += 1) {
        for (let dx = 0; dx < k; dx += 1) n += mask[(y * k + dy) * w + x * k + dx];
      }
      out[y * nw + x] = n * 2 >= k * k ? 1 : 0;
    }
  }
  return { mask: out, w: nw, h: nh };
}

function bbox(mask, w, h, skip) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!mask[y * w + x] || (skip && skip[y * w + x])) continue;
      n += 1;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return { x0, y0, x1, y1, n, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const K = 3;
const small = shrink(boatMain, PW, PH, K);
const SW = small.w, SH = small.h;
const smallIgnore = new Uint8Array(SW * SH);
for (let y = 0; y < SH; y += 1) {
  for (let x = 0; x < SW; x += 1) if (ignored(x * K, y * K)) smallIgnore[y * SW + x] = 1;
}
const target = bbox(small.mask, SW, SH, smallIgnore);

/**
 * Score one (azimuth, elevation).
 *
 * Focal length and principal point are NOT searched here: for a given
 * direction they follow from making the model's own projected extent land on
 * the plate's bounding box, which is one division and two subtractions and
 * lands within a few pixels of their optimum. Only the two angles need a sweep,
 * and the framing is refined at the end at full resolution.
 */
function evaluate(azDeg, elDeg) {
  const cam = basis(azDeg, elDeg);
  const unit = projector(cam, 1000, 0, 0);
  let ux0 = Infinity, uy0 = Infinity, ux1 = -Infinity, uy1 = -Infinity;
  for (const { p } of tris) {
    for (const v of p) {
      const q = unit(v);
      if (!q) continue;
      if (q[0] < ux0) ux0 = q[0]; if (q[0] > ux1) ux1 = q[0];
      if (q[1] < uy0) uy0 = q[1]; if (q[1] > uy1) uy1 = q[1];
    }
  }
  const f = 1000 * Math.min(target.w / (ux1 - ux0), target.h / (uy1 - uy0));
  const cx = target.x0 - (ux0 * f) / 1000;
  const cy = target.y0 - (uy0 * f) / 1000;
  const { mask } = raster(projector(cam, f, cx, cy), SW, SH, false);
  let inter = 0, only = 0;
  for (let i = 0; i < SW * SH; i += 1) {
    if (smallIgnore[i]) continue;
    const a = small.mask[i], b = mask[i];
    if (a && b) inter += 1; else if (a || b) only += 1;
  }
  return { score: inter / Math.max(1, inter + only), f, cx, cy, az: azDeg, el: elDeg };
}

/* THE SWEEP GOES ALL THE WAY ROUND. Which side of the boat the plate is drawn
   from is a fact to be found, not one to be assumed — and assuming it is how
   the mirrored solve above got as far as a printed table. */
let best = null;
for (let az = -180; az < 180; az += 6) {
  for (let el = 6; el <= 45; el += 3) {
    const r = evaluate(az, el);
    if (!best || r.score > best.score) best = r;
  }
}
for (const step of [2, 0.8, 0.3]) {
  let moved = true;
  while (moved) {
    moved = false;
    for (const [da, de] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const r = evaluate(best.az + da, best.el + de);
      if (r.score > best.score + 1e-5) { best = r; moved = true; }
    }
  }
}

/** And the framing, refined at full plate resolution where a pixel is a pixel. */
const cam = basis(best.az, best.el);
let fit = { ...best, f: best.f * K, cx: best.cx * K, cy: best.cy * K };
const frame = (f, cx, cy) => {
  const { mask } = raster(projector(cam, f, cx, cy), PW, PH, false);
  let inter = 0, only = 0;
  for (let v = 0; v < PH; v += 2) {
    for (let u = 0; u < PW; u += 2) {
      if (ignored(u, v)) continue;
      const i = v * PW + u;
      const a = boatMain[i], b = mask[i];
      if (a && b) inter += 1; else if (a || b) only += 1;
    }
  }
  return inter / Math.max(1, inter + only);
};
fit.score = frame(fit.f, fit.cx, fit.cy);
for (const step of [14, 6, 2]) {
  let moved = true;
  while (moved) {
    moved = false;
    for (const [df, dx, dy] of [
      [step * 2, 0, 0], [-step * 2, 0, 0],
      [0, step, 0], [0, -step, 0], [0, 0, step], [0, 0, -step],
    ]) {
      const s = frame(fit.f + df, fit.cx + dx, fit.cy + dy);
      if (s > fit.score + 1e-5) {
        fit = { ...fit, f: fit.f + df, cx: fit.cx + dx, cy: fit.cy + dy, score: s };
        moved = true;
      }
    }
  }
}

const project = projector(cam, fit.f, fit.cx, fit.cy);
const { mask: renderMask } = raster(project, PW, PH, false);

/**
 * THE G-BUFFER IS RENDERED OFF A FLOOR RAISED BY THE CUSHION'S OWN THICKNESS.
 *
 * The plate's cognac is the TOP of a cushion, and the model has no cushion in
 * this pass — so a ray through a cognac pixel carries on past where the padding
 * would be and lands on the floor beyond it, displaced away from the camera.
 * At this elevation the error is (0.075 / tan 35°) ≈ 0.11 m, all of it in one
 * direction, which on a 0.35 m cushion is not a rounding error.
 *
 * Lifting the interior's own surfaces by 75 mm before the G-buffer pass puts
 * the intersection where a cushion top would actually be. It is an
 * approximation — the padding is not a constant height above every surface —
 * but it removes the sign of the bias rather than tolerating it.
 */
const LIFT = 0.075;
const LIFTED = new Set(["cockpit_sole", "interior_hard_liner"]);
for (const t of tris) if (LIFTED.has(t.zone)) for (const v of t.p) v.z += LIFT;
const { g } = raster(project, PW, PH, true);
for (const t of tris) if (LIFTED.has(t.zone)) for (const v of t.p) v.z -= LIFT;

/* ── Reading the regions back ─────────────────────────────────────────────*/

const f3 = (v) => (Number.isFinite(v) ? v.toFixed(3).padStart(7) : "      —");
const q = (arr, t) => arr[Math.min(arr.length - 1, Math.floor(arr.length * t))];

console.log(`\n  PXL — REFERENCE UPHOLSTERY, TRACED   §7, §8, §9\n`);
console.log(`  plate crop        ${PW} x ${PH} px of ${meta.width} x ${meta.height}`);
console.log(`  cognac            ${cognac0.reduce((a, b) => a + b, 0)} px raw, `
  + `${cognac.reduce((a, b) => a + b, 0)} px after an opening of ${OPEN}`);
console.log(`  camera solved     azimuth ${fit.az.toFixed(1)}°  elevation `
  + `${fit.el.toFixed(1)}°  focal ${fit.f.toFixed(0)} px at ${DISTANCE} m`);
console.log(`                    the preset composes this view at 48.0° / 34.0°`);
console.log(`  silhouette IoU    ${(fit.score * 100).toFixed(1)}%`);
console.log(`  regions           ${regions.length} above 900 px\n`);

console.log("  region     px    plate bbox (u,v)          model x          model y     "
  + "  med z   lands on");
const traced = [];
for (const [n, cells] of regions.entries()) {
  let u0 = PW, u1 = -1, v0 = PH, v1 = -1;
  const pts = [];
  const zones = new Map();
  for (const i of cells) {
    const u = i % PW, v = (i / PW) | 0;
    if (u < u0) u0 = u; if (u > u1) u1 = u;
    if (v < v0) v0 = v; if (v > v1) v1 = v;
    if (!Number.isFinite(g.x[i])) continue;
    pts.push([g.x[i], g.y[i], g.z[i]]);
    zones.set(g.zone[i], (zones.get(g.zone[i]) ?? 0) + 1);
  }
  if (!pts.length) continue;
  const xs = pts.map((p) => p[0]).sort((a, b) => a - b);
  const ys = pts.map((p) => p[1]).sort((a, b) => a - b);
  const zs = pts.map((p) => p[2]).sort((a, b) => a - b);
  const top = [...zones].sort((a, b) => b[1] - a[1])[0];
  traced.push({ n: n + 1, px: cells.length, pts, x: [q(xs, 0.02), q(xs, 0.98)] });
  console.log(`  ${String(n + 1).padStart(6)} ${String(cells.length).padStart(6)}  `
    + `${String(u0).padStart(4)},${String(v0).padStart(4)} → ${String(u1).padStart(4)},${String(v1).padStart(4)}  `
    + `${f3(q(xs, 0.02))}..${f3(q(xs, 0.98))} ${f3(q(ys, 0.02))}..${f3(q(ys, 0.98))} `
    + `${f3(q(zs, 0.5))}   ${top?.[0] ?? "—"}`);
}

/**
 * The forward padding, station by station.
 *
 * §7 asks for the clearly visible side traced and the other mirrored, and in
 * this projection that is the PORT side: the camera stands off the port bow, so
 * the port padding is seen across the open cockpit while the starboard padding
 * is behind its own gunwale for most of its length.
 */
const CONSOLE_X = -0.50;
const forward = traced.filter((r) => r.x[1] > CONSOLE_X + 0.2);
/* WHICHEVER SIDE THE PLATE RESOLVES, rather than whichever side was expected.
   §7 asks for the clearly visible side to be traced and the other mirrored,
   and which one that is follows from the camera the fit found — not from a
   guess made before it ran. */
const sideA = [], sideB = [];
for (const r of forward) for (const p of r.pts) (p[1] < 0 ? sideA : sideB).push(p);
const near = sideA.length > sideB.length ? sideA : sideB;
const side = sideA.length > sideB.length ? "y < 0" : "y > 0";

console.log(`\n  FORWARD PADDING — the resolved side (${side}, `
  + `${near.length} px against ${Math.min(sideA.length, sideB.length)} on the other)\n`);
console.log("      x    inboard  outboard    width      n");
const stations = [];
for (let x = -1.4; x <= 2.5; x += 0.1) {
  const at = near.filter((p) => Math.abs(p[0] - x) < 0.06).map((p) => Math.abs(p[1]));
  if (at.length < 8) continue;
  at.sort((a, b) => a - b);
  const lo = q(at, 0.05), hi = q(at, 0.95);
  stations.push({ x: Math.round(x * 100) / 100, lo, hi });
  console.log(`  ${x.toFixed(2).padStart(6)}  ${lo.toFixed(3).padStart(7)}  `
    + `${hi.toFixed(3).padStart(7)}  ${(hi - lo).toFixed(3).padStart(7)}  ${String(at.length).padStart(5)}`);
}
if (stations.length) {
  const a = stations[0].x, b = stations[stations.length - 1].x;
  console.log(`\n  AFT END  x ${a.toFixed(2)}      FWD END  x ${b.toFixed(2)}`
    + `      LENGTH ${(b - a).toFixed(2)} m`);
}

/* ── §8, §9 — THE MASK COMPARISON, IN IMAGE SPACE ─────────────────────────*/

/**
 * §8: "validate the cushion silhouette IN IMAGE SPACE … the projected brown
 * silhouette must substantially overlap the reference brown silhouette." §9:
 * report bounding box, start, end, projected area, overlap and mismatch.
 *
 * The live cushions are drawn through the CAMERA SOLVED ABOVE — the same one
 * the trace used — with the boat in front of them, so a cushion hidden behind
 * a gunwale is hidden here too and the comparison is of what is visible rather
 * than of what exists. The reference side is region 1 of the classified plate,
 * which is the forward padding and not the rear seat.
 */
const forwardRef = new Uint8Array(PW * PH);
if (forward.length) {
  for (const cells of [regions[traced.indexOf(forward[0])]]) {
    for (const i of cells) forwardRef[i] = 1;
  }
}

const live = (() => {
  const mask = new Uint8Array(PW * PH);
  const depth = new Float32Array(PW * PH).fill(Infinity);
  const owner = new Uint8Array(PW * PH);
  const draw = (list, tag) => {
    for (const { p: t } of list) {
      const p = [project(t[0]), project(t[1]), project(t[2])];
      if (!p[0] || !p[1] || !p[2]) continue;
      const minX = Math.max(0, Math.floor(Math.min(p[0][0], p[1][0], p[2][0])));
      const maxX = Math.min(PW - 1, Math.ceil(Math.max(p[0][0], p[1][0], p[2][0])));
      const minY = Math.max(0, Math.floor(Math.min(p[0][1], p[1][1], p[2][1])));
      const maxY = Math.min(PH - 1, Math.ceil(Math.max(p[0][1], p[1][1], p[2][1])));
      if (minX > maxX || minY > maxY) continue;
      const d = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1])
        - (p[2][0] - p[0][0]) * (p[1][1] - p[0][1]);
      if (Math.abs(d) < 1e-9) continue;
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const ux = x + 0.5, uy = y + 0.5;
          const w1 = ((ux - p[0][0]) * (p[2][1] - p[0][1])
            - (p[2][0] - p[0][0]) * (uy - p[0][1])) / d;
          const w2 = ((p[1][0] - p[0][0]) * (uy - p[0][1])
            - (ux - p[0][0]) * (p[1][1] - p[0][1])) / d;
          if (w1 < 0 || w2 < 0 || w1 + w2 > 1) continue;
          const zz = p[0][2] + w1 * (p[1][2] - p[0][2]) + w2 * (p[2][2] - p[0][2]);
          const i = y * PW + x;
          if (zz >= depth[i]) continue;
          depth[i] = zz;
          owner[i] = tag;
        }
      }
    }
  };
  draw(tris, 1);            // the boat, so it can occlude
  draw(cushionTris, 2);     // the cushions, in front of it where they are
  for (let i = 0; i < PW * PH; i += 1) if (owner[i] === 2) mask[i] = 1;
  return mask;
})();

function stats(mask) {
  let x0 = PW, y0 = PH, x1 = -1, y1 = -1, n = 0;
  for (let v = 0; v < PH; v += 1) {
    for (let u = 0; u < PW; u += 1) {
      if (!mask[v * PW + u]) continue;
      n += 1;
      if (u < x0) x0 = u; if (u > x1) x1 = u;
      if (v < y0) y0 = v; if (v > y1) y1 = v;
    }
  }
  return { x0, y0, x1, y1, n };
}
const sRef = stats(forwardRef);
const sLive = stats(live);
let inter = 0, onlyRef = 0, onlyLive = 0;
for (let i = 0; i < PW * PH; i += 1) {
  const a = forwardRef[i], b = live[i];
  if (a && b) inter += 1; else if (a) onlyRef += 1; else if (b) onlyLive += 1;
}

console.log("\n  §9 — UPHOLSTERY MASK, REFERENCE against LIVE, in the fitted camera\n");
const row = (k, r, l) => console.log(`  ${k.padEnd(22)}${String(r).padStart(12)}`
  + `${String(l).padStart(12)}`);
console.log(`  ${"".padEnd(22)}${"REFERENCE".padStart(12)}${"LIVE".padStart(12)}`);
row("projected area, px", sRef.n, sLive.n);
row("bbox left (u)", sRef.x0, sLive.x0);
row("bbox right (u)", sRef.x1, sLive.x1);
row("bbox top (v)", sRef.y0, sLive.y0);
row("bbox bottom (v)", sRef.y1, sLive.y1);
console.log(`\n  overlap (IoU)         ${(100 * inter / Math.max(1, inter + onlyRef + onlyLive)).toFixed(1)}%`);
console.log(`  of the reference      ${(100 * inter / Math.max(1, sRef.n)).toFixed(1)}% is covered`);
console.log(`  of the live cushions  ${(100 * inter / Math.max(1, sLive.n)).toFixed(1)}% lands on it`);
console.log(`  area ratio            live / reference = ${(sLive.n / Math.max(1, sRef.n)).toFixed(3)}`);

/* ── Pictures, so the numbers can be disbelieved ──────────────────────────*/

await mkdir(QA, { recursive: true });
const COL = [[255, 60, 40], [60, 140, 255], [255, 210, 40], [180, 60, 255], [40, 255, 160]];

const overlay = Buffer.alloc(PW * PH * 3);
for (let i = 0; i < PW * PH; i += 1) {
  const [r, gg, b] = px(i);
  overlay[i * 3] = r * 0.42; overlay[i * 3 + 1] = gg * 0.42; overlay[i * 3 + 2] = b * 0.42;
}
for (const [n, cells] of regions.entries()) {
  const c = COL[n % COL.length];
  for (const i of cells) {
    overlay[i * 3] = c[0]; overlay[i * 3 + 1] = c[1]; overlay[i * 3 + 2] = c[2];
  }
}
/* The fitted model's own silhouette edge, in white. THIS IS THE CHECK: if it
   does not lie on the plate's boat, no number above means anything. */
for (let v = 1; v < PH - 1; v += 1) {
  for (let u = 1; u < PW - 1; u += 1) {
    const i = v * PW + u;
    if (renderMask[i] === renderMask[i + 1] && renderMask[i] === renderMask[i + PW]) continue;
    overlay[i * 3] = 255; overlay[i * 3 + 1] = 255; overlay[i * 3 + 2] = 255;
  }
}
/* And the excluded rectangle, so it is visible rather than only documented. */
for (let u = IGNORE.x0; u <= IGNORE.x1; u += 6) {
  for (const v of [IGNORE.y0, IGNORE.y1]) {
    const i = v * PW + u;
    overlay[i * 3] = 90; overlay[i * 3 + 1] = 220; overlay[i * 3 + 2] = 255;
  }
}
await sharp(overlay, { raw: { width: PW, height: PH, channels: 3 } })
  .png().toFile(path.join(QA, `${TAG}-trace-plate.png`));

/** The traced footprint in plan, mirrored, over the boat's own outline. */
const PLAN_W = 1700, PLAN_H = 660;
const plan = Buffer.alloc(PLAN_W * PLAN_H * 3, 18);
const toPlan = (x, y) => [
  Math.round((x + 3.3) / 6.6 * PLAN_W),
  Math.round((y + 1.28) / 2.56 * PLAN_H),
];
for (const { p, zone } of tris) {
  if (!["gunwale_capping", "cockpit_sole", "interior_hard_liner"].includes(zone)) continue;
  for (const v of p) {
    const [a, b] = toPlan(v.x, v.y);
    if (a < 0 || b < 0 || a >= PLAN_W || b >= PLAN_H) continue;
    const i = (b * PLAN_W + a) * 3;
    plan[i] = 70; plan[i + 1] = 74; plan[i + 2] = 78;
  }
}
for (const [n, r] of traced.entries()) {
  const c = COL[n % COL.length];
  for (const p of r.pts) {
    for (const s of [1, -1]) {
      const [a, b] = toPlan(p[0], s * Math.abs(p[1]));
      if (a < 1 || b < 1 || a >= PLAN_W - 1 || b >= PLAN_H - 1) continue;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const i = ((b + dy) * PLAN_W + a + dx) * 3;
        plan[i] = c[0]; plan[i + 1] = c[1]; plan[i + 2] = c[2];
      }
    }
  }
}
await sharp(plan, { raw: { width: PLAN_W, height: PLAN_H, channels: 3 } })
  .png().toFile(path.join(QA, `${TAG}-trace-plan.png`));

/** §9's picture: the two masks over the plate. Reference in red, live in
 *  blue, the overlap in white — so a shortfall and an overshoot look
 *  different rather than both looking like "not quite". */
const maskPic = Buffer.alloc(PW * PH * 3);
for (let i = 0; i < PW * PH; i += 1) {
  const [r, gg, b] = px(i);
  const a = forwardRef[i], l = live[i];
  if (a && l) { maskPic[i * 3] = 250; maskPic[i * 3 + 1] = 250; maskPic[i * 3 + 2] = 250; }
  else if (a) { maskPic[i * 3] = 235; maskPic[i * 3 + 1] = 55; maskPic[i * 3 + 2] = 40; }
  else if (l) { maskPic[i * 3] = 45; maskPic[i * 3 + 1] = 120; maskPic[i * 3 + 2] = 245; }
  else {
    maskPic[i * 3] = r * 0.34; maskPic[i * 3 + 1] = gg * 0.34; maskPic[i * 3 + 2] = b * 0.34;
  }
}
await sharp(maskPic, { raw: { width: PW, height: PH, channels: 3 } })
  .png().toFile(path.join(QA, `${TAG}-mask.png`));

console.log(`\n  .qa/${TAG}-trace-plate.png   regions painted; the fitted model's edge in white`);
console.log(`  .qa/${TAG}-mask.png          reference RED · live BLUE · overlap WHITE`);
console.log(`  .qa/${TAG}-trace-plan.png    the same pixels, unprojected and mirrored\n`);
