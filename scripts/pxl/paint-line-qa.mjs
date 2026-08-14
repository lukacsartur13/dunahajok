/**
 * PXL — the lower-hull paint division, plate against model.  PHASE 4.6, §24.
 *
 *     node scripts/pxl/paint-line-qa.mjs
 *     npm run paint
 *
 * §24: "Create a matched-scale side reference comparison specifically for the
 * lower paint division. Compare at multiple longitudinal locations: stern,
 * quarter, midship, forward quarter, bow. Report normalized vertical deviation."
 *
 * ── WHY THIS EXISTS RATHER THAN `npm run reference` ────────────────────────
 *
 * `reference-qa.mjs` already reports a "band edge" figure, and it agreed with
 * the plate to 1.3 percentage points while the line was visibly wrong. It could:
 * it reduces the whole division to ONE number — the mean band edge as a
 * percentage of local depth — and a line that is 0.10 m too low aft and 0.30 m
 * too high forward averages out to very nearly the right answer. §45 is a
 * complaint about a SHAPE, so this samples the shape, station by station.
 *
 * ── ONE SIDE IS TRACED, THE OTHER IS MEASURED ──────────────────────────────
 *
 * The plate has to be traced: it is a JPEG and there is nothing else to read.
 * The model does not, and the first version of this file traced a render of it
 * anyway — which was a mistake worth recording, because it failed twice for two
 * unrelated reasons. Chroma separates the plate's paint perfectly and cannot
 * separate the render's at all (the scene's warm key puts the dark lower hull at
 * 22 levels of chroma and the teal topside at 23). And the render's own
 * reflection continues below the keel in the same colour as the hull, so the
 * silhouette scan that establishes the normalising depth runs off the bottom of
 * the boat and compresses every reading above it.
 *
 * Both are properties of the picture rather than of the boat. The GLB has the
 * answer exactly — which faces carry `hull_lower` and which carry
 * `hull_primary` is not an inference — so the model side is read from the asset
 * and only the plate is traced. The side-by-side eyeball check that §24 also
 * asks for is row B of `.qa/PHASE_4_6_details.png`.
 *
 * ── NORMALISATION ──────────────────────────────────────────────────────────
 *
 * Both are reduced to the same two axes before anything is compared:
 *
 *     u   0 at the transom, 1 at the stem
 *     v   0 at the sheer, 1 at the keel, per station
 *
 * so neither the plate's scale nor the model's units enter the answer.
 */

import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PLATE = path.join(ROOT, "assets/source/pxl/pxl-side-20240719.jpg");
const GLB = path.join(ROOT, "assets/derived/pxl/PXL.production.glb");

/** Where §24 asks for readings, as fractions of the waterline length. */
const STATIONS = [
  ["stern", 0.10],
  ["quarter", 0.28],
  ["midship", 0.50],
  ["forward quarter", 0.72],
  ["bow", 0.88],
];

/* ── The plate ─────────────────────────────────────────────────────────────*/

async function tracePlate() {
  const { data, info } = await sharp(PLATE).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const at = (x, y) => {
    const i = (y * W + x) * C;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const lum = (x, y) => { const [r, g, b] = at(x, y); return (r + g + b) / 3; };
  /* 195, not a difference from the paper. The drop shadow under the boat is a
     flat grey around 210 and the hull's own bottom is black, so a threshold
     between them separates the boat from its shadow — which the first version
     did not do, and which put the "keel" 90 px low and compressed every v. */
  const isBoat = (x, y) => lum(x, y) < 195;
  /* Chroma, for the paint. On the PLATE it is the better classifier by a wide
     margin: the teal topsides carry 20–30 levels and the black bottom under 8,
     and the gloss highlights that defeat a brightness threshold leave the
     chroma alone. */
  const neutral = (x, y) => {
    const [r, g, b] = at(x, y);
    return lum(x, y) < 120 && Math.max(r, g, b) - Math.min(r, g, b) < 14;
  };

  const columns = [];
  for (let x = 0; x < W; x += 1) {
    let top = null; let bottom = null;
    for (let y = 600; y < 1290; y += 1) {
      if (!isBoat(x, y)) continue;
      if (top === null) top = y;
      bottom = y;
    }
    columns.push(top === null ? null : { top, bottom });
  }
  const present = columns
    .map((c, i) => (c && c.bottom - c.top > 60 ? i : -1))
    .filter((i) => i >= 0);
  const first = present[0];
  const last = present[present.length - 1];

  /* THE SHEER IS FITTED, NOT SAMPLED. The plate's superstructure — the console,
     the screen, the grab rails and the standing figure — is the topmost thing in
     its own columns, so `top` is the deck edge at most stations and something
     else at some. A running lower envelope over ±60 columns discards the
     intrusions and keeps the deck line. */
  const sheer = columns.map((c, i) => {
    if (!c) return null;
    let best = c.top;
    for (let k = Math.max(0, i - 60); k < Math.min(columns.length, i + 60); k += 1) {
      if (columns[k] && columns[k].top > best) best = columns[k].top;
    }
    return best;
  });

  return STATIONS.map(([label, u]) => {
    const x = Math.round(first + (last - first) * u);
    const col = columns[x];
    if (!col) return { label, u, v: null };
    const top = sheer[x];
    const depth = col.bottom - top;

    /* SCANNED DOWNWARD FOR THE FIRST SUSTAINED NEUTRAL RUN, not upward from the
       keel. Walking up stops at the first coloured pixel it meets, and near the
       bow the last few rows of the hull are the antialiased edge against the
       paper — a blend of black and white, which is neither neutral nor dark
       enough to pass. Three stations came back empty for that reason alone.
       Requiring a run of 2% of the depth ignores the edge and finds the paint.

       The scan starts at 0.45 of the depth. 0.30 was the first choice and it is
       too high: forward of midship the dark band UNDER THE SHEER — the one the
       Duna script lies in — reaches down past a third of the local depth, and at
       u 0.72 the scan found that instead and reported the division half a depth
       too high. Everything below 0.45 is topside or bottom paint at every
       station on both the plate and the model. */
    const RUN = Math.max(4, Math.round(depth * 0.02));
    let found = null;
    for (let y = Math.round(top + depth * 0.45); y <= col.bottom - RUN; y += 1) {
      let dark = true;
      for (let k = 0; k < RUN; k += 1) {
        if (!neutral(x, y + k)) { dark = false; break; }
      }
      if (dark) { found = y; break; }
    }
    /* A column with no division in it: the moulding runs from the sheer to the
       keel, which is true of both the plate and the model near the transom.
       Decided on how much of the column is neutral rather than on where the
       first run starts — a single dark reflection at the top of the scan is not
       an absent division, and testing the start alone called one at u 0.72.  */
    let neutralRows = 0; let total = 0;
    for (let v = 0.45; v <= 0.92; v += 0.01) {
      total += 1;
      if (neutral(x, Math.round(top + depth * v))) neutralRows += 1;
    }
    const allDark = neutralRows / total > 0.75;
    return { label, u, v: allDark || found === null ? null : (found - top) / depth, allDark };
  });
}

/* ── The model ─────────────────────────────────────────────────────────────*/

async function measureModel() {
  const bytes = await readFile(GLB);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "",
  );
  gltf.scene.updateWorldMatrix(true, true);
  /* glTF is Y-up; the model's own frame is Z-up with the bow at +X. */
  const toModel = (v) => new THREE.Vector3(v.x, -v.z, v.y);

  const STEP = 0.04;
  const bins = new Map();
  const bin = (x) => Math.round(x / STEP);
  const touch = (k) => {
    if (!bins.has(k)) {
      bins.set(k, {
        sheer: -9, keel: 9, lowerTop: -9, primaryLow: 9,
      });
    }
    return bins.get(k);
  };

  for (const name of ["hull_primary", "hull_lower", "hull_accent"]) {
    const mesh = gltf.scene.getObjectByName(name);
    if (!mesh) continue;
    const pos = mesh.geometry.attributes.position;
    const idx = mesh.geometry.index;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const vs = [0, 1, 2].map((k) => {
        const j = idx ? idx.getX(i + k) : i + k;
        return toModel(new THREE.Vector3().fromBufferAttribute(pos, j)
          .applyMatrix4(mesh.matrixWorld));
      });
      const n = new THREE.Vector3()
        .subVectors(vs[1], vs[0])
        .cross(new THREE.Vector3().subVectors(vs[2], vs[0]))
        .normalize();
      const cy = (vs[0].y + vs[1].y + vs[2].y) / 3;
      const cx = (vs[0].x + vs[1].x + vs[2].x) / 3;
      const cz = (vs[0].z + vs[1].z + vs[2].z) / 3;
      const b = touch(bin(cx));
      /* The sheer and the keel come from every hull face; the division comes
         only from the OUTWARD-FACING starboard skin, which is the surface the
         plate is a picture of. */
      b.sheer = Math.max(b.sheer, ...vs.map((v) => v.z));
      b.keel = Math.min(b.keel, ...vs.map((v) => v.z));
      /* 0.18, not 0.35. Near the bow the topside has turned so far forward
         that its normal is mostly +X, and a 0.35 gate sampled no faces at all in
         the last fifth of the boat — the bow station came back empty on a band
         that is 80 mm tall and plainly present. The gate exists to keep the
         hull's INSIDE out of the reading, and 0.18 still does that. */
      /* THE EXTERIOR SKIN, decided by which way the face looks rather than by
         how far outboard it is.
         A fixed "starboard of y 0.25" gate is right amidships, where the boat is
         2 m wide, and wrong at the bow, where it is 0.4 m and every face
         carrying the band sits inside it — the bow station came back empty on a
         band the plate plainly draws and the asset plainly has (`hull_lower`
         runs to x 2.036, within 65 mm of where the reference closes it out).
         Replacing it with a fraction of the local beam was worse, because the
         local beam is set by the topsides and the band is on the turn of the
         bilge under them.
         What actually separates the skin from the liner is the NORMAL: a
         topside face looks outboard, a bottom face looks down, and every face
         on the inside of the shell looks the other way. */
      const outward = (n.y * cy > 0 && Math.abs(n.y) > 0.18) || n.z < -0.3;
      if (!outward) continue;
      if (name === "hull_lower") b.lowerTop = Math.max(b.lowerTop, cz);
      if (name === "hull_primary") b.primaryLow = Math.min(b.primaryLow, cz);
    }
  }

  const keys = [...bins.keys()].sort((a, b) => a - b);
  const x0 = keys[0] * STEP;
  const x1 = keys[keys.length - 1] * STEP;

  return STATIONS.map(([label, u]) => {
    const x = x0 + (x1 - x0) * u;
    const b = bins.get(bin(x));
    if (!b) return { label, u, v: null };
    if (b.lowerTop < -8 || b.primaryLow > 8) return { label, u, v: null };
    /* The division is between the two, which is where the cut runs. Taking the
       midpoint rather than either edge is what makes this comparable with a
       traced boundary, which also lands between the last dark pixel and the
       first coloured one. */
    const edge = (b.lowerTop + b.primaryLow) / 2;
    return { label, u, v: (b.sheer - edge) / (b.sheer - b.keel) };
  });
}

/* ── The report ────────────────────────────────────────────────────────────*/

const plate = await tracePlate();
const model = await measureModel();

console.log("\n  PXL — LOWER-HULL PAINT DIVISION, PLATE vs PHASE 4.6  (§24)\n");
console.log("  v = the division's height, from the sheer (0) to the keel (1),");
console.log("  as a fraction of the LOCAL depth at that station.\n");
console.log("  station               u     plate v    model v    deviation");
console.log("  " + "-".repeat(60));

let sum = 0; let worst = 0; let n = 0;
for (let i = 0; i < STATIONS.length; i += 1) {
  const p = plate[i];
  const m = model[i];
  const fmt = (v) => (v === null ? "    —   " : v.toFixed(3).padStart(8));
  let dev = "      —  ";
  if (p.v !== null && m.v !== null) {
    const d = m.v - p.v;
    dev = `${d >= 0 ? "+" : ""}${d.toFixed(3)}`.padStart(9);
    sum += Math.abs(d); worst = Math.max(worst, Math.abs(d)); n += 1;
  } else if (p.allDark) {
    dev = "  no line";
  }
  console.log(`  ${p.label.padEnd(19)}${p.u.toFixed(2)}  ${fmt(p.v)}   ${fmt(m.v)}  ${dev}`);
}

console.log("  " + "-".repeat(60));
if (n) {
  console.log(`\n  mean |deviation|   ${(sum / n).toFixed(3)} of local depth  (n=${n})`);
  console.log(`  max  |deviation|   ${worst.toFixed(3)} of local depth`);
}
console.log("");
