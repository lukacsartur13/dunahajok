/**
 * PXL — the landmark error table.  PHASE 4.3, §28 and §29.
 *
 *     node scripts/pxl/landmarks.mjs            # print the table
 *     node scripts/pxl/landmarks.mjs --write    # …and write the JSON
 *     npm run landmarks
 *
 * §30 of the brief is that Phase 4.2's numerical silhouette measurements passed
 * while the boat was visibly wrong, and §28 says why: a bounding-box comparison
 * cannot see a console. So this measures LANDMARKS — named points a person can
 * find in both the drawing and the model — instead of extents.
 *
 * ── WHAT IT COMPARES ──────────────────────────────────────────────────────
 *
 * REFERENCE comes from `assets/derived/pxl/PXL.upper.json`, written by
 * `measure-upper.mjs` off the July side plate through the calibration
 * `reference-qa.mjs` already uses for the hull: 345.1 px/m, transom at column
 * 699, sheer maximum at row 796.
 *
 * LIVE comes from `public/models/PXL.glb` — the file the browser actually
 * loads, parsed through the same loader — by taking each zone's geometry and
 * asking it a specific question. Not its bounding box: "the highest point of
 * `console_detail`" is a bounding box and would answer with the screen; "the
 * highest point of `console_detail` BELOW the glazing's own base" is a
 * landmark and answers with the dash.
 *
 * ── HOW THE ERROR IS NORMALISED, AND WHY THERE ARE TWO OF THEM ────────────
 *
 * ABSOLUTE error is the straight difference in model metres, normalised by LOA
 * (5.2532 m) fore-and-aft and by hull depth (1.1634 m) vertically.
 *
 * RELATIVE error is the same landmark measured against ITS OWN LOCAL SHEER in
 * each source. That second number is the one that means something for anything
 * standing on the deck, because the model's sheer is documented as sitting
 * 58 mm below the plate's on average and up to 90 mm at the stern — an
 * absolute comparison charges every piece of deck furniture for a hull
 * difference that Phase 4.1 measured, recorded and accepted.
 *
 * Both are printed. Where they disagree the reason is the sheer, and saying so
 * is more useful than picking whichever flatters.
 *
 * ── WHAT A STATUS MEANS ───────────────────────────────────────────────────
 *
 *   MATCHED   relative error under 2% of hull depth — 23 mm
 *   CLOSE     under 5% — 58 mm, which is the sheer's own documented deviation
 *   PARTIAL   over that, and named in the report's remaining mismatches
 *   SOURCE    the two delivered sources disagree with each other; see §O
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import {
  normaliseAgainstTransom,
  sternLandmarks,
} from "../../src/webgl/scenes/pxl/pxlCatalog.ts";
import { PXL_MOUNTS, PXL_STERN_REFERENCE } from "../../src/webgl/scenes/pxl/pxlModel.ts";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MODEL = path.join(ROOT, "public", "models", "PXL.glb");
const UPPER = path.join(ROOT, "assets", "derived", "pxl", "PXL.upper.json");
const OUT = path.join(ROOT, "assets", "derived", "pxl", "PXL.landmarks.json");

const LOA = 5.2532;
const DEPTH = 1.1634;
const TRANSOM_X = -2.6266;

/* ── Load ─────────────────────────────────────────────────────────────────*/

const upper = JSON.parse(await readFile(UPPER, "utf8"));
const bytes = await readFile(MODEL);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await new Promise((resolve, reject) => {
  loader.parse(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
    resolve,
    reject,
  );
});
gltf.scene.updateMatrixWorld(true);

/**
 * Every mesh's world-space vertices, by node name.
 *
 * glTF is Y-up and the plate calibration is in the model's own Z-up metres, so
 * the axes are swapped back on the way in: the rest of this file, the Blender
 * build and `PXL.upper.json` then all speak one coordinate system.
 */
const ZONES = new Map();
gltf.scene.traverse((node) => {
  if (!node.isMesh) return;
  const position = node.geometry.getAttribute("position");
  const v = new THREE.Vector3();
  const pts = [];
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i).applyMatrix4(node.matrixWorld);
    pts.push([v.x, -v.z, v.y]);          // glTF (x, y-up, z) → model (x, y, z-up)
  }
  ZONES.set(node.name, pts);
});

const need = (name) => {
  const pts = ZONES.get(name);
  if (!pts) throw new Error(`zone missing from the model: ${name}`);
  return pts;
};

/* ── Live landmarks ───────────────────────────────────────────────────────*/

const between = (pts, key, lo, hi) =>
  pts.filter((p) => p[key] >= lo && p[key] <= hi);

const maxOf = (pts, key) => Math.max(...pts.map((p) => p[key]));
const minOf = (pts, key) => Math.min(...pts.map((p) => p[key]));

/** The hull's own sheer at a station, from the shell zones. */
const SHELL = [...need("hull_primary"), ...need("hull_accent"),
               ...need("transom_black")];
function sheerAt(x, window = 0.12) {
  const near = SHELL.filter((p) => Math.abs(p[0] - x) <= window);
  return near.length ? Math.max(...near.map((p) => p[2])) : null;
}

const consoleDetail = need("console_detail");
const windshield = need("windshield");
const wheel = need("helm_wheel");
const rails = need("rails");
const upholstery = need("upholstery_primary");

const consoleX0 = minOf(consoleDetail, 0);
const consoleX1 = maxOf(consoleDetail, 0);

/**
 * The dash's top edge at a station.
 *
 * `console_detail` also carries the screen's cap and its two posts, so the
 * question has to exclude them: the dash is the highest console surface below
 * the glazing's own foot. Asking the bounding box instead answers with the top
 * of the screen surround, which is 0.3 m out and is exactly the class of
 * mistake §28 says a bounding box makes.
 *
 * THE FOOT IS TAKEN PER STATION, NOT ONCE. The first version used the glazing's
 * global minimum, which is where the aft wing dies into the dash — so the
 * ceiling for the whole console was the dash's LOWEST point and the forward
 * dash, 0.11 m higher, was excluded from its own measurement. It reported
 * −10.9% and the geometry was right; the measurement was wrong.
 *
 * THE TOLERANCE IS 20 mm, WHICH IS ALSO NOT ARBITRARY. `pxl_upper` seats the
 * glazing 12 mm INTO the dash so no gap can open between them at any camera
 * angle, so the glass's foot is below the dash's top edge rather than level
 * with it. A ceiling of foot + 6 mm therefore excluded the very edge it was
 * trying to find; foot + 20 mm clears the seat and still sits 0.28 m under the
 * screen's cap.
 */
function dashTopAt(x, window = 0.09) {
  const nearGlass = windshield.filter((p) => Math.abs(p[0] - x) <= window);
  const foot = nearGlass.length ? Math.min(...nearGlass.map((p) => p[2])) : Infinity;
  const near = consoleDetail.filter(
    (p) => Math.abs(p[0] - x) <= window && p[2] <= foot + 0.020,
  );
  return near.length ? Math.max(...near.map((p) => p[2])) : null;
}

const live = {
  bowTip: maxOf(need("hull_primary"), 0),
  sternTip: minOf(SHELL, 0),
  sheerMax: maxOf(SHELL, 2),
  consoleAftX: consoleX0,
  consoleFwdX: consoleX1,
  /* Aft and forward thirds of the dash, so the rake is measured rather than
     collapsed into one number. */
  dashAftZ: dashTopAt(consoleX0 + 0.05),
  dashFwdZ: dashTopAt(consoleX1 - 0.05),
  screenTopZ: maxOf(windshield, 2),
  screenTopX: windshield.reduce((a, p) => (p[2] > a[2] ? p : a))[0],
  screenAftZ: maxOf(between(windshield, 0, consoleX0, consoleX0 + 0.09), 2),
  wheelTopZ: maxOf(wheel, 2),
  wheelX: (minOf(wheel, 0) + maxOf(wheel, 0)) / 2,
  railTopZ: maxOf(between(rails, 0, -0.45, -0.15), 2),
  railAftX: minOf(rails, 0),
  railFwdX: null,          // filled below: the cockpit pair, not the bow pair
  seatTopZ: maxOf(between(upholstery, 0, -2.10, -1.75), 2),
  backrestTopZ: maxOf(between(upholstery, 0, -2.30, -2.10), 2),
};

/* The cockpit rail's forward end. `rails` is four runs in one mesh, so the
   forward end of the COCKPIT pair is the largest x below the gap that
   separates it from the bow pair. */
{
  const xs = [...new Set(rails.map((p) => Math.round(p[0] * 100) / 100))].sort((a, b) => a - b);
  let cut = xs[xs.length - 1];
  for (let i = 1; i < xs.length; i += 1) {
    if (xs[i] - xs[i - 1] > 0.30) { cut = xs[i - 1]; break; }
  }
  live.railFwdX = cut;
}

/* ── The comparison ───────────────────────────────────────────────────────*/

const plateSheerAt = (x) => {
  /* The plate's own deck line, from the six stations `measure-upper` sampled
     either side of the helm. Linear between them, which over 1.25 m of a curve
     this flat is worth about 3 mm. */
  const table = [
    [-2.50, 0.778], [-2.25, 0.795], [-2.00, 0.807], [-1.25, 0.844],
    [0.00, 0.902], [0.50, 0.920], [1.00, 0.928], [1.50, 0.931],
    [2.00, 0.934], [2.50, 0.925],
  ];
  if (x <= table[0][0]) return table[0][1];
  if (x >= table[table.length - 1][0]) return table[table.length - 1][1];
  for (let i = 1; i < table.length; i += 1) {
    if (x <= table[i][0]) {
      const [x0, z0] = table[i - 1];
      const [x1, z1] = table[i];
      return z0 + ((z1 - z0) * (x - x0)) / (x1 - x0);
    }
  }
  return table[table.length - 1][1];
};

const rows = [];

/** A vertical landmark, compared both absolutely and against its local sheer. */
function vertical(name, refZ, refX, liveZ, liveX, note = "") {
  const refRel = refZ - plateSheerAt(refX);
  const liveRel = liveZ - (sheerAt(liveX) ?? 0);
  rows.push({
    name, axis: "z",
    reference: refZ, live: liveZ,
    absolute: (liveZ - refZ) / DEPTH,
    relative: (liveRel - refRel) / DEPTH,
    refRel, liveRel, note,
  });
}

/** A fore-aft landmark, normalised by LOA. */
function fore(name, refX, liveX, note = "") {
  rows.push({
    name, axis: "x",
    reference: refX, live: liveX,
    absolute: (liveX - refX) / LOA,
    relative: null, refRel: null, liveRel: null, note,
  });
}

// ── SIDE: the hull. Unchanged since Phase 4.1 and re-stated so the table is
//    complete rather than only about what moved.
fore("bow tip", 2.627, live.bowTip);
fore("stern tip", TRANSOM_X, live.sternTip,
     "the plate carries 774 mm of moulding abaft the sheer that the STL lacks");
vertical("sheer maximum", 0.9428, 2.0, live.sheerMax, 2.0);

// ── SIDE: the helm.
const CONSOLE_NOTE =
  "SOURCE CONFLICT: the July plate stations the console at 0.47–0.55 LOA from " +
  "the transom, the August views sheet and the STL at 0.24–0.35. The model " +
  "follows the two that agree; the fore-aft error below is that conflict, not " +
  "a build error. Its SIZE agrees across sources to 0.02 m.";
fore("console aft face", upper.console.x0, live.consoleAftX, CONSOLE_NOTE);
fore("console fwd face", upper.console.x1 + 0.070, live.consoleFwdX, CONSOLE_NOTE);
vertical("console dash, aft", upper.console.aftZ, upper.console.x0,
         live.dashAftZ, live.consoleAftX);
vertical("console dash, fwd", upper.console.fwdZ, upper.console.x1,
         live.dashFwdZ, live.consoleFwdX);
vertical("windshield apex", upper.screen.apexZ, upper.screen.apexX,
         live.screenTopZ, live.screenTopX);
vertical("windshield, aft wing", upper.screen.aftZ, upper.screen.x0,
         live.screenAftZ, live.consoleAftX);
vertical("steering wheel, rim top", upper.wheel.apexZ, upper.wheel.apexX,
         live.wheelTopZ, live.wheelX);

// ── SIDE: the accents. `measure-upper` groups the plate's orange runs; the
//    cockpit rail is the long one, the squab the short tall one, the bow pair
//    the forward one.
const railRun = upper.accents.find((a) => a.length > 1.2);
const squab = upper.accents.find((a) => a.x0 < -1.2 && a.length < 0.3);
const bowRail = upper.accents.find((a) => a.x0 > 1.5);

vertical("cockpit rail, top", railRun.topZ, -0.30, live.railTopZ, -0.30);
fore("cockpit rail, aft end", railRun.x0, live.railAftX);
fore("cockpit rail, fwd end", railRun.x1, live.railFwdX);
fore("bow rail, aft end", bowRail.x0, Math.min(...rails.filter((p) => p[0] > 1.6).map((p) => p[0])));
fore("bow rail, fwd end", bowRail.x1, Math.max(...rails.map((p) => p[0])));

// ── 3Q: the seating. The plate can only see the backrest; the seat top comes
//    from the human figure, which is what §26 asks it be used for.
vertical("backrest, top", squab.topZ, -1.35, live.backrestTopZ, -2.18,
         "station transposed with the console — see the conflict above");
vertical("seat cushion, top", upper.figure.lowestVisibleZ, -1.0,
         live.seatTopZ, -1.95,
         "reference is the drawn figure's own lowest point (§26); its station " +
         "is only known to about 0.5 m, and the delivered moulding fixes the " +
         "live value — the cushion sits on the platform the STL has");

/* ── Report ───────────────────────────────────────────────────────────────*/

function status(row) {
  if (row.note.startsWith("SOURCE")) return "SOURCE";
  const e = Math.abs(row.relative ?? row.absolute);
  if (e < 0.02) return "MATCHED";
  if (e < 0.05) return "CLOSE";
  return "PARTIAL";
}

const pct = (v) => (v === null ? "     —" : `${(v * 100).toFixed(1).padStart(5)}%`);
const m = (v) => (v === null ? "     —" : v.toFixed(3).padStart(7));

console.log(`\n  PXL — REFERENCE LANDMARK COMPARISON   §28, §29\n`);
console.log(`  model  ${path.relative(ROOT, MODEL)}`);
console.log(`  plate  ${upper.plate.file}  ${upper.calibration.pxPerMetre} px/m`);
console.log(`  normalised by LOA ${LOA} m (fore-aft) and depth ${DEPTH} m (vertical)\n`);
console.log("  landmark                        ax    reference       live     abs      rel  status");
console.log("  " + "─".repeat(84));
for (const row of rows) {
  row.status = status(row);
  console.log(
    `  ${row.name.padEnd(30)} ${row.axis}  ${m(row.reference)}  ${m(row.live)}  ` +
    `${pct(row.absolute)}  ${pct(row.relative)}  ${row.status}`,
  );
}

const counts = rows.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {});
console.log("\n  " + Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · "));

/* ── The stern. PHASE 4.4 §17. ───────────────────────────────────────────
 *
 * A SEPARATE TABLE, WITH A SEPARATE DATUM, AND THAT IS THE POINT. Everything
 * above is normalised against the plate's own sheer, because a console and a
 * rail stand on a deck. A drive does not: it hangs off the transom, and §17
 * asks for its landmarks "compared to their normalized vertical positions" —
 * which means against the transom's own height, in a stern three-quarter that
 * shares no calibration with the July side plate.
 *
 * THE DRIVES ARE NOT IN THE GLB. They are authored at runtime by
 * `pxlPropulsion` from `PXL_DRIVE_SPECS`, so the arithmetic is imported rather
 * than re-measured — `sternLandmarks` is the same chain the builder walks, and
 * the configurator suite asserts the two agree. What is measured off the file
 * is the transom the whole table is normalised against.
 */
const sternRows = [];
{
  const mountY = PXL_MOUNTS.transom.y;
  const H = PXL_STERN_REFERENCE.transomHeight;
  const ref = PXL_STERN_REFERENCE.normalised;
  const enforced = new Set(PXL_STERN_REFERENCE.enforced);

  console.log(`\n  PXL — STERN LANDMARKS   §17\n`);
  console.log(`  plate  ${PXL_STERN_REFERENCE.plate}  ${PXL_STERN_REFERENCE.pxPerMetre} px/m`);
  console.log(`  datum  top of the transom moulding, y ${mountY}; ` +
              `normalised by its own height ${H} m, positive DOWN\n`);
  console.log("  landmark               drive       model        ref     Δ  status");
  console.log("  " + "─".repeat(66));

  for (const variant of ["compact", "standard", "large", "electric"]) {
    const lm = sternLandmarks(variant, mountY, PXL_MOUNTS.transom.x);
    const points = [
      ["top of cowling", "cowlTop", lm.cowlTop],
      ["bottom of cowling", "cowlBottom", lm.cowlBottom],
      ["anti-ventilation plate", "plate", lm.plate],
      ["propeller centre", "propeller", lm.propeller],
      ["lowest lower-unit point", "lowest", lm.lowest],
    ];
    for (const [label, key, y] of points) {
      const model = normaliseAgainstTransom(y, mountY, H);
      const delta = model - ref[key];
      /* WHICH DRIVE A LANDMARK IS ALLOWED TO BE JUDGED ON.
         `cowlTop` is the MOUNTING, and every drive shares it — all four are
         hung so the powerhead's top lands at the capping, so all four are
         checked against the reference.
         `cowlBottom` is the ENGINE'S OWN HEIGHT, and the reference draws one
         engine: 125 plate pixels at 192 px/m is 0.651 m, which is the LARGE
         cowling's 0.615 and nothing else's. Charging a compact drive for not
         being as tall as the drawing would be asserting that the range has one
         member. So it is enforced on `large` and reported as SIZE elsewhere. */
      const judged = enforced.has(key) && (key !== "cowlBottom" || variant === "large");
      const status = !enforced.has(key)
        ? "SOURCE"
        : !judged
          ? "SIZE"
          : Math.abs(delta) < 0.10 ? "MATCHED" : "PARTIAL";
      sternRows.push({ landmark: label, variant, model, reference: ref[key], delta, status });
      console.log(
        `  ${label.padEnd(24)} ${variant.padEnd(9)} ` +
        `${model.toFixed(3).padStart(6)} ${ref[key].toFixed(3).padStart(10)} ` +
        `${delta.toFixed(3).padStart(6)}  ${status}`,
      );
    }
  }

  console.log(
    `\n  top of transom           —        0.000      0.000   0.000  MATCHED (the datum)`,
  );
  console.log(
    "\n  SIZE rows are the three drives the reference does not draw. Its cowling\n" +
    "  measures 0.651 m, which is the LARGE proxy; the others differ from it by\n" +
    "  their own heights, which is what a range of four engines means.\n" +
    "\n  SOURCE rows are the three §17 asks for that the drawing cannot be built to.\n" +
    "  It puts the anti-ventilation plate 1.96 transom-heights down — 0.88 m BELOW\n" +
    "  the static waterline — and the propeller deeper again. That is a large engine\n" +
    "  drawn nearer the camera than the transom it hangs on, and building it would\n" +
    "  put the plate on the riverbed. The two landmarks that fix how the engine READS\n" +
    "  against the boat are enforced; see PHASE_4_4_REPORT.md §O.",
  );
}

const notes = rows.filter((r) => r.note);
if (notes.length) {
  console.log();
  const seen = new Set();
  for (const row of notes) {
    if (seen.has(row.note)) continue;
    seen.add(row.note);
    console.log(`  ${row.name}: ${row.note}`);
  }
}
console.log();

if (process.argv.includes("--write")) {
  await writeFile(OUT, JSON.stringify(
    { model: path.relative(ROOT, MODEL), rows, stern: sternRows }, null, 2));
  console.log(`  wrote ${path.relative(ROOT, OUT)}\n`);
}
