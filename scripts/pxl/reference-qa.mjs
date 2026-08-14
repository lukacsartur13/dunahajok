#!/usr/bin/env node
/**
 * REFERENCE FIDELITY MEASUREMENT — Phase 4.1, §3 and §36.
 *
 *   node scripts/pxl/reference-qa.mjs            # the report
 *   node scripts/pxl/reference-qa.mjs --json     # machine-readable
 *   npm run reference                            # the QA entry point
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 *
 * §3 asks a perceptual question — "would a reasonable viewer immediately
 * understand that this is the same product design" — and §36 asks for the
 * answer as a table with a DIFFERENCE column in it. A perceptual question
 * answered by eye produces a table of adjectives. This produces numbers.
 *
 * It rasterises the delivered GLB's SILHOUETTE in orthographic profile, does
 * the same to the delivered side render, aligns the two on length alone, and
 * reports how far apart the sheer line and the keel line are at twenty-one
 * stations along the hull. Everything downstream — whether the model is the
 * same boat as the renders, where the black band's edge belongs, where a decal
 * sits — is read off that alignment rather than estimated from a screenshot.
 *
 * ── WHY IT DOES NOT NEED A GPU ─────────────────────────────────────────────
 *
 * A silhouette is a coverage test, not a shading problem: project every
 * triangle to the XY plane and fill it. That is forty thousand triangles of
 * scanline rasterisation, which is milliseconds in plain JS and — crucially —
 * runs in `npm run qa` on a machine with no display, no browser and no WebGL.
 * The parts of §3's priority list this can answer (silhouette, sheer, bow,
 * stern, the major paint divisions) are exactly the parts at the top of it.
 *
 * WHAT IT CANNOT ANSWER is anything about light: material response, glass,
 * highlight travel. Those need the renderer, and they are what the
 * deterministic frame mode in `pxlQa` and the reference overlay on the bench
 * are for. The two halves are complementary and neither replaces the other.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const JSON_OUT = process.argv.includes("--json");
const WRITE_PLATE = process.argv.includes("--plate");
/**
 * `--locate x0,y0[,x1,y1]` — plate pixels to model metres.
 *
 * The mapping the branding placements were authored from. It lives here rather
 * than in a scratch script because it depends on the transom datum and the
 * sheer datum this file establishes, and a second copy of that arithmetic
 * somewhere else is a second copy that can disagree.
 */
const LOCATE = (() => {
  const at = process.argv.indexOf("--locate");
  if (at < 0) return null;
  const n = (process.argv[at + 1] ?? "").split(",").map(Number);
  if (n.length < 2 || n.some((v) => !Number.isFinite(v))) return null;
  return n;
})();

/**
 * The plate this measures against, and why it is this one.
 *
 * `pxl-side-20240719` is the only delivered image that is a true profile: the
 * six colour studies are all three-quarter views on water, where a hull's
 * apparent depth is a function of the camera rather than of the boat. A
 * silhouette comparison against a three-quarter render would measure the lens.
 */
const PLATE = "assets/source/pxl/pxl-side-20240719.jpg";

/**
 * Rows of the plate that may contain the boat.
 *
 * The plate carries a cast shadow below the hull in very nearly the same value
 * range as the black bottom, and a shadow is not a silhouette. The window ends
 * above it. Fractions of image height, measured on the delivered file.
 */
const PLATE_BAND = { top: 0.0, bottom: 0.62 };

/** Above this luminance the plate is background. The plate's ground is ~250. */
const PLATE_BACKGROUND = 235;

/**
 * Columns of the plate where something stands above the sheer.
 *
 * The plate is a design render, not a hull drawing: a human silhouette stands at
 * the helm, a console and a raked screen rise behind it, a cognac seat block and
 * a grab rail sit on the capping, and there is a second grab rail at the bow.
 * Every one of those is the topmost ink in its column and none of them is sheer.
 *
 * Spans are in u along the hull's OWN length, measured from the transom datum
 * below — not from the plate's overall span, which includes an appendage. Both
 * bounds are inclusive: the first pass of this script used `u > from` and the
 * station at exactly 0.30 landed on the figure's head, which then became the
 * vertical datum and put a 440 mm bias into every row in the table.
 */
const PLATE_OCCLUDED = [
  /** Seat block, capping rail, console, figure, screen. */
  { from: 0.20, to: 0.56 },
  /** The bow grab rail. */
  { from: 0.87, to: 1.0 },
];

const occludedAt = (u) => PLATE_OCCLUDED.some((s) => u >= s.from && u <= s.to);

/** Stations along the hull at which the two profiles are compared. */
const STATIONS = 21;

/* ── Silhouette rasterisation ──────────────────────────────────────────────*/

/**
 * Top and bottom of a mesh's orthographic profile, per column.
 *
 * Scanline fill rather than point sampling. A hull is a shell — its projected
 * outline is bounded by triangles that are nearly edge-on to the viewer, and a
 * point sample walks straight between them and reports a hole. Filling every
 * triangle's span means the coverage is exact for the outline, which is the
 * only thing being measured.
 */
function projectSilhouette(positions, columns, xMin, xMax) {
  /* NAMED IN MODEL SPACE, NOT IN SCREEN SPACE. `high` is the largest Y — the
     sheer — because the model's +Y is up and the plate's +Y is down, and a
     variable called `top` would have meant one thing in one file and the
     opposite in the other. Which is exactly the mistake this comment replaced. */
  const low = new Float64Array(columns).fill(Infinity);
  const high = new Float64Array(columns).fill(-Infinity);
  const sx = (columns - 1) / (xMax - xMin);

  const mark = (col, y) => {
    if (col < 0 || col >= columns) return;
    if (y < low[col]) low[col] = y;
    if (y > high[col]) high[col] = y;
  };

  for (let i = 0; i < positions.length; i += 9) {
    const px = [positions[i], positions[i + 3], positions[i + 6]];
    const py = [positions[i + 1], positions[i + 4], positions[i + 7]];
    // Each edge, walked in column space. Three edges cover the triangle's
    // outline; the interior cannot extend the top or bottom beyond it.
    for (let e = 0; e < 3; e++) {
      const ax = px[e], ay = py[e];
      const bx = px[(e + 1) % 3], by = py[(e + 1) % 3];
      const c0 = Math.round((ax - xMin) * sx);
      const c1 = Math.round((bx - xMin) * sx);
      const steps = Math.max(1, Math.abs(c1 - c0));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        mark(c0 + Math.round((c1 - c0) * t), ay + (by - ay) * t);
      }
    }
  }
  // Unreached columns stay Infinity; the caller treats them as absent.
  for (let c = 0; c < columns; c++) {
    if (low[c] === Infinity) { low[c] = NaN; high[c] = NaN; }
  }
  return { low, high };
}

/* ── The model ─────────────────────────────────────────────────────────────*/

async function loadModel() {
  const file = path.join(ROOT, "public", "models", "PXL.glb");
  const bytes = await readFile(file);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise((resolve, reject) =>
    loader.parse(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
      resolve,
      reject,
    ),
  );
  gltf.scene.updateWorldMatrix(true, true);
  return gltf.scene;
}

/**
 * Hull zones only.
 *
 * The outboard, the console, the rails and the helm are all real parts of the
 * boat and none of them is part of a hull profile. The delivered plate's own
 * outboard is absent from the drawing, so including ours would compare a boat
 * with an engine against a boat without one.
 */
const HULL_ZONES = new Set(["hull_primary", "hull_lower", "hull_accent", "transom_black"]);

function hullPositions(root, zones) {
  const chunks = [];
  root.traverse((node) => {
    if (!node.isMesh || !zones.has(node.name)) return;
    const geometry = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry;
    const source = geometry.getAttribute("position").array;
    const out = new Float64Array(source.length);
    const v = new THREE.Vector3();
    for (let i = 0; i < source.length; i += 3) {
      v.set(source[i], source[i + 1], source[i + 2]).applyMatrix4(node.matrixWorld);
      out[i] = v.x; out[i + 1] = v.y; out[i + 2] = v.z;
    }
    chunks.push(out);
  });
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const all = new Float64Array(total);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.length; }
  return all;
}

/* ── The plate ─────────────────────────────────────────────────────────────*/

async function loadPlate() {
  const { data, info } = await sharp(path.join(ROOT, PLATE))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const y0 = Math.round(PLATE_BAND.top * H);
  const y1 = Math.round(PLATE_BAND.bottom * H);

  const top = new Float64Array(W).fill(NaN);
  const bottom = new Float64Array(W).fill(NaN);
  for (let x = 0; x < W; x++) {
    for (let y = y0; y < y1; y++) {
      const i = (y * W + x) * C;
      const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (l >= PLATE_BACKGROUND) continue;
      if (Number.isNaN(top[x])) top[x] = y;
      bottom[x] = y;
    }
  }
  let minX = 0, maxX = W - 1;
  while (minX < W && Number.isNaN(top[minX])) minX++;
  while (maxX > 0 && Number.isNaN(top[maxX])) maxX--;
  return { top, bottom, minX, maxX, width: W, height: H, data, channels: C };
}

/**
 * The black band's upper edge, per column, in plate pixels.
 *
 * §14 calls the boundary between the topsides and the dark lower treatment
 * "an important part of the PXL visual identity", so it is measured rather
 * than described. Within the hull's own span the plate is scanned downward
 * from the sheer for the first row that is dark enough to be the band and
 * stays dark for a while — a single dark row is a reflection, twelve of them
 * in a column is a moulding.
 */
function darkBandEdge(plate, x, sheerY, keelY) {
  const { data, width: W, channels: C } = plate;
  /** The band reads 15–70 in the delivered plate; the topsides never this low. */
  const DARK = 78;
  /** Lit rows the run tolerates — a specular streak crosses the band in places. */
  const TOLERANCE = 4;

  const lum = (y) => {
    const i = (y * W + x) * C;
    return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  };

  /* SCANNED UP FROM THE KEEL, NOT DOWN FROM THE SHEER.
     Downward is the obvious direction and it is wrong here: the topsides carry
     a dark reflection of the capping along their upper edge, and a downward
     scan stops at the first dark run it meets, which is that reflection rather
     than the moulding. Upward cannot make that mistake — below the band's edge
     everything is band, all the way to the keel, which is the actual property
     being measured. */
  let lit = 0;
  let edge = NaN;
  for (let y = Math.round(keelY) - 2; y > sheerY; y--) {
    if (lum(y) > DARK) {
      lit += 1;
      if (lit > TOLERANCE) break;
    } else {
      lit = 0;
      edge = y;
    }
  }
  return edge;
}

/* ── Alignment ─────────────────────────────────────────────────────────────*/

/**
 * WHERE THE HULL IS AT LEAST HALF ITS FULL DEPTH, aft-most column.
 *
 * The datum for length, and the reason it is not simply "the aft-most pixel".
 *
 * The delivered plate's silhouette does not end at the transom. A black lower
 * moulding runs aft of and below it — visible in the plate as a thin wedge with
 * a horizontal bar in it, and present again in the top-left view of the views
 * sheet — so the plate's overall span is LOA plus an appendage, while the
 * model's hull zones span LOA exactly. Aligning the two spans end to end
 * therefore stretches the plate by the length of a part the model does not
 * have, and the error lands on DEPTH: the first pass of this script reported
 * the plate hull as 11% shallower than the model, all of which was this.
 *
 * So the datum is the transom, found the same way in both sources: walking
 * forward from the aft end, the first column where the silhouette is at least
 * `FULL` of its own maximum depth. Forward of the transom a hull is full depth;
 * aft of it only the appendage remains, and the appendage is thin. The rule is
 * geometric, it needs no feature detection, and it gives the same answer on a
 * drawing and on a mesh.
 */
const FULL = 0.55;

function transomColumn(low, high, columns) {
  let deepest = 0;
  for (let c = 0; c < columns; c++) {
    const h = high[c] - low[c];
    if (Number.isFinite(h)) deepest = Math.max(deepest, h);
  }
  for (let c = 0; c < columns; c++) {
    const h = high[c] - low[c];
    if (Number.isFinite(h) && h >= deepest * FULL) return { column: c, deepest };
  }
  return { column: 0, deepest };
}

/* ── The model's own perceived band edge ───────────────────────────────────*/

/**
 * WHERE THE DARK TREATMENT'S EDGE ACTUALLY FALLS ON THE MODEL, PER STATION.
 *
 * §14 asks for the perceived height and shape of the dark area, which is not a
 * property either zone's bounding box can answer: `hull_primary` runs down to
 * y = 0.063 and `hull_lower` runs up to y = 0.357, so they overlap over
 * 294 mm of the side and the boundary a viewer sees is wherever the *outboard*
 * one of them is — which changes along the hull as the flare does.
 *
 * So it is raycast. At each station a fan of rays is fired inboard from outside
 * the beam and the nearest hit's zone is recorded; the edge is the height at
 * which the answer changes from topsides to bottom. Same measurement the eye
 * makes, and it moves with the model rather than with a remembered number.
 */
function modelBandEdge(root, x, sheerY, keelY, samples = 240) {
  const ray = new THREE.Raycaster();
  const targets = [];
  root.traverse((n) => {
    if (n.isMesh && (n.name === "hull_primary" || n.name === "hull_lower")) targets.push(n);
  });
  if (targets.length < 2) return null;

  const direction = new THREE.Vector3(0, 0, -1);
  let edge = null;
  let previous = null;
  for (let i = 0; i <= samples; i++) {
    const y = keelY + ((sheerY - keelY) * i) / samples;
    ray.set(new THREE.Vector3(x, y, 2.6), direction);
    ray.far = 6;
    const hit = ray.intersectObjects(targets, false)[0];
    const zone = hit?.object.name ?? null;
    // Walking up from the keel: the edge is the last height at which the
    // outboard surface was still the bottom moulding.
    if (previous === "hull_lower" && zone === "hull_primary") edge = y;
    if (zone) previous = zone;
  }
  return edge;
}

/* ── Report ────────────────────────────────────────────────────────────────*/

const model = await loadModel();
const positions = hullPositions(model, HULL_ZONES);
const box = new THREE.Box3();
model.traverse((n) => { if (n.isMesh && HULL_ZONES.has(n.name)) box.expandByObject(n); });

const plate = await loadPlate();

/* Both profiles are resampled onto the same station grid, in their own units,
   before anything is compared. `COLUMNS` is a working resolution rather than a
   measurement: it is finer than the station count by two orders of magnitude,
   so the transom detection lands within a millimetre of hull length. */
const COLUMNS = 2048;

function resample(source, from, to, columns) {
  const out = new Float64Array(columns).fill(NaN);
  for (let c = 0; c < columns; c++) {
    const at = from + Math.round(((to - from) * c) / (columns - 1));
    out[c] = source[at];
  }
  return out;
}

const shape = projectSilhouette(positions, COLUMNS, box.min.x, box.max.x);
// The plate's rows increase downward, so its "high" edge is its smaller value.
// Negated on the way in, which is the one place the two conventions meet.
const plateHigh = resample(plate.top, plate.minX, plate.maxX, COLUMNS).map((v) => -v);
const plateLow = resample(plate.bottom, plate.minX, plate.maxX, COLUMNS).map((v) => -v);

const modelTransom = transomColumn(shape.low, shape.high, COLUMNS);
const plateTransom = transomColumn(plateLow, plateHigh, COLUMNS);

/* Length. Model metres per plate pixel, from transom to bow tip in both. */
const modelLength = ((COLUMNS - 1 - modelTransom.column) / (COLUMNS - 1)) * (box.max.x - box.min.x);
const platePixels =
  ((COLUMNS - 1 - plateTransom.column) / (COLUMNS - 1)) * (plate.maxX - plate.minX);
const pxPerMetre = platePixels / modelLength;

/* Vertical datum: each source's own highest sheer, over the columns where the
   plate is not occluded by the figure, the console or the screen. */
function sheerDatum(high, transom, skip) {
  let best = -Infinity;
  for (let c = transom; c < COLUMNS; c++) {
    const u = (c - transom) / (COLUMNS - 1 - transom);
    if (skip && occludedAt(u)) continue;
    if (Number.isFinite(high[c])) best = Math.max(best, high[c]);
  }
  return best;
}
const plateSheer = sheerDatum(plateHigh, plateTransom.column, true);
const modelSheer = box.max.y;

/** A station's column in each source, from u along the hull's own length. */
function columnFor(u, transom) {
  return Math.round(transom + u * (COLUMNS - 1 - transom));
}

const rows = [];
for (let s = 0; s < STATIONS; s++) {
  const u = s / (STATIONS - 1);
  const mc = columnFor(u, modelTransom.column);
  const pc = columnFor(u, plateTransom.column);
  const plateCol = plate.minX + Math.round(((plate.maxX - plate.minX) * pc) / (COLUMNS - 1));

  const occluded = occludedAt(u);
  const pHigh = plateHigh[pc];
  const pLow = plateLow[pc];

  /* Metres below each source's own sheer datum, so the two are directly
     comparable without either being reported in pixels. */
  const plateSheerM = Number.isFinite(pHigh) ? (plateSheer - pHigh) / pxPerMetre : null;
  const plateKeelM = Number.isFinite(pLow) ? (plateSheer - pLow) / pxPerMetre : null;
  const modelSheerM = Number.isFinite(shape.high[mc]) ? modelSheer - shape.high[mc] : null;
  const modelKeelM = Number.isFinite(shape.low[mc]) ? modelSheer - shape.low[mc] : null;

  let band = null;
  if (Number.isFinite(pHigh) && Number.isFinite(pLow)) {
    const edge = darkBandEdge(plate, plateCol, -pHigh, -pLow);
    if (!Number.isNaN(edge)) band = (plateSheer - -edge) / pxPerMetre;
  }

  /* The model's own band edge at this station, in metres below its sheer, so
     it can be set beside the plate's without either being in pixels. */
  let modelBand = null;
  if (modelSheerM !== null && modelKeelM !== null) {
    const edge = modelBandEdge(
      model, rows.length === 0 ? box.min.x + 0.02 : (box.min.x + modelTransom.column / (COLUMNS - 1) * (box.max.x - box.min.x) + u * modelLength),
      modelSheer - modelSheerM, modelSheer - modelKeelM,
    );
    if (edge !== null) modelBand = modelSheer - edge;
  }

  const round = (v) => (v === null ? null : Number(v.toFixed(4)));
  rows.push({
    u: Number(u.toFixed(3)),
    x: Number((box.min.x + modelTransom.column / (COLUMNS - 1) * (box.max.x - box.min.x)
      + u * modelLength).toFixed(4)),
    sheer: { plate: round(plateSheerM), model: round(modelSheerM), occluded },
    keel: { plate: round(plateKeelM), model: round(modelKeelM) },
    /* The band edge as a fraction of the local sheer-to-keel depth, which is
       what the eye actually reads — §14. Null where the plate has no band. */
    band: {
      plate: round(band),
      model: round(modelBand),
      plateFraction:
        band !== null && plateKeelM ? Number((band / plateKeelM).toFixed(4)) : null,
      modelFraction:
        modelBand !== null && modelKeelM ? Number((modelBand / modelKeelM).toFixed(4)) : null,
    },
  });
}

function deviation(pick) {
  const values = rows.map(pick).filter((d) => d !== null && Number.isFinite(d));
  if (!values.length) return { n: 0, mean: null, max: null, bias: null };
  const abs = values.map(Math.abs);
  return {
    n: values.length,
    mean: Number((abs.reduce((a, b) => a + b, 0) / abs.length).toFixed(4)),
    max: Number(Math.max(...abs).toFixed(4)),
    bias: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(4)),
  };
}

const sheerDeviation = deviation((r) =>
  r.sheer.occluded || r.sheer.plate === null || r.sheer.model === null
    ? null
    : r.sheer.plate - r.sheer.model,
);
const keelDeviation = deviation((r) =>
  r.keel.plate === null || r.keel.model === null ? null : r.keel.plate - r.keel.model,
);

const plateDepth = Math.max(...rows.map((r) => r.keel.plate ?? -Infinity));
const modelDepth = Math.max(...rows.map((r) => r.keel.model ?? -Infinity));
const bands = rows.filter((r) => r.band.plateFraction !== null);
const modelBands = rows.filter((r) => r.band.modelFraction !== null);

function fractionStats(values) {
  const list = values.filter((v) => v !== null && Number.isFinite(v));
  if (!list.length) return { stations: 0, mean: null, min: null, max: null };
  return {
    stations: list.length,
    mean: Number((list.reduce((a, b) => a + b, 0) / list.length).toFixed(4)),
    min: Number(Math.min(...list).toFixed(4)),
    max: Number(Math.max(...list).toFixed(4)),
  };
}

const report = {
  plate: PLATE,
  model: "public/models/PXL.glb",
  alignment: {
    plateSheerRow: Math.round(-plateSheer),
    rule: `aft-most column at ${FULL} of maximum silhouette depth, in both sources`,
    plateTransomPx: plate.minX + Math.round(
      ((plate.maxX - plate.minX) * plateTransom.column) / (COLUMNS - 1),
    ),
    plateAppendageAftOfTransomM: Number(
      ((plateTransom.column / (COLUMNS - 1)) * (plate.maxX - plate.minX) / pxPerMetre
        - (modelTransom.column / (COLUMNS - 1)) * (box.max.x - box.min.x)).toFixed(4),
    ),
    pxPerMetre: Number(pxPerMetre.toFixed(2)),
    loaM: Number(modelLength.toFixed(4)),
  },
  depth: {
    plate: Number(plateDepth.toFixed(4)),
    model: Number(modelDepth.toFixed(4)),
    deltaPercent: Number((((plateDepth / modelDepth) - 1) * 100).toFixed(1)),
  },
  sheerDeviation,
  keelDeviation,
  band: {
    plate: fractionStats(bands.map((b) => b.band.plateFraction)),
    model: fractionStats(modelBands.map((b) => b.band.modelFraction)),
    deviation: deviation((r) =>
      r.band.plate === null || r.band.model === null ? null : r.band.plate - r.band.model,
    ),
  },
  rows,
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const m = (v) => (v === null ? "—" : v.toFixed(3));
  console.log(`\n  REFERENCE PROFILE COMPARISON`);
  console.log(`  plate   ${PLATE}`);
  console.log(`  model   public/models/PXL.glb`);
  console.log(`  datum   ${report.alignment.rule}`);
  console.log(`  scale   ${report.alignment.pxPerMetre} px/m over ${report.alignment.loaM.toFixed(3)} m of hull`);
  console.log(`  plate carries ${report.alignment.plateAppendageAftOfTransomM.toFixed(3)} m of moulding aft of the transom that the model does not\n`);
  console.log(`  hull depth   plate ${report.depth.plate.toFixed(3)} m   model ${report.depth.model.toFixed(3)} m   (${report.depth.deltaPercent > 0 ? "+" : ""}${report.depth.deltaPercent}%)\n`);
  console.log(`  ${"u".padEnd(7)}${"x (m)".padStart(9)}` +
    `${"sheer".padStart(9)}${"sheer".padStart(9)}` +
    `${"keel".padStart(9)}${"keel".padStart(9)}${"band".padStart(9)}${"band".padStart(9)}`);
  console.log(`  ${"".padEnd(7)}${"".padStart(9)}` +
    `${"plate".padStart(9)}${"model".padStart(9)}` +
    `${"plate".padStart(9)}${"model".padStart(9)}${"plate".padStart(9)}${"model".padStart(9)}`);
  for (const r of rows) {
    console.log(
      `  ${String(r.u).padEnd(7)}${r.x.toFixed(3).padStart(9)}` +
      `${(r.sheer.occluded ? "occl" : m(r.sheer.plate)).padStart(9)}${m(r.sheer.model).padStart(9)}` +
      `${m(r.keel.plate).padStart(9)}${m(r.keel.model).padStart(9)}` +
      `${m(r.band.plate).padStart(9)}${m(r.band.model).padStart(9)}`,
    );
  }
  console.log(`\n  sheer deviation   mean ${sheerDeviation.mean} m   max ${sheerDeviation.max} m   bias ${sheerDeviation.bias} m  (n=${sheerDeviation.n})`);
  console.log(`  keel  deviation   mean ${keelDeviation.mean} m   max ${keelDeviation.max} m   bias ${keelDeviation.bias} m  (n=${keelDeviation.n})`);
  const frac = (f) => (f.mean === null ? "—" :
    `${(f.mean * 100).toFixed(1)}% of local depth (${(f.min * 100).toFixed(0)}–${(f.max * 100).toFixed(0)}%), n=${f.stations}`);
  console.log(`  band edge plate   ${frac(report.band.plate)}`);
  console.log(`  band edge model   ${frac(report.band.model)}`);
  console.log(`  band  deviation   mean ${report.band.deviation.mean} m   max ${report.band.deviation.max} m   bias ${report.band.deviation.bias} m  (n=${report.band.deviation.n})\n`);
}

if (LOCATE) {
  /* Plate pixel → model metre, on the datums above: the transom column is
     model x = −LOA/2, and the sheer datum row is model y = the model's own
     sheer maximum. */
  const toModel = (px, py) => ({
    x: Number((box.min.x + (px - report.alignment.plateTransomPx) / pxPerMetre).toFixed(4)),
    y: Number((modelSheer - (py - -plateSheer) / pxPerMetre).toFixed(4)),
  });
  const a = toModel(LOCATE[0], LOCATE[1]);
  console.log(`\n  plate (${LOCATE[0]}, ${LOCATE[1]})  →  model x ${a.x}  y ${a.y}`);
  if (LOCATE.length >= 4) {
    const b = toModel(LOCATE[2], LOCATE[3]);
    console.log(`  plate (${LOCATE[2]}, ${LOCATE[3]})  →  model x ${b.x}  y ${b.y}`);
    console.log(`  span  ${(b.x - a.x).toFixed(4)} m along the hull, ${(a.y - b.y).toFixed(4)} m tall\n`);
  }
}

if (WRITE_PLATE) {
  const dir = path.join(ROOT, ".qa");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "reference-qa.json"), JSON.stringify(report, null, 2));
  console.log(`  wrote .qa/reference-qa.json`);
}
