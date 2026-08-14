/**
 * PHASE FOUR — VALIDATION OF THE PARTS THAT ARE BUILT RATHER THAN EXPORTED.
 *
 *   node scripts/pxl/validate-vessel.mjs      # or `npm run vessel`
 *
 * `validate-model.mjs` checks the GLB. This checks everything Phase Four hangs
 * ON the GLB — the four proxy drives and the PXL wordmark — and it exists
 * because those are the only parts of the vessel that no build step and no test
 * could otherwise see.
 *
 * WHY IT IS NOT A UNIT TEST. `configurator.test.ts` asserts the DIMENSIONS: it
 * knows a large cowling is longer than a compact one and that the authored
 * shaft lengths put every plate near the waterline. What it cannot know is
 * where the geometry those dimensions produce actually ends up, because that
 * needs three — extrusion, bevels, the bracket's own transform, and a raycast
 * against the real stern moulding. Those are exactly the steps a number can be
 * right and a result still be wrong: a bevel that eats a bracket, a propeller
 * placed off the gearcase, a mark whose ray misses the panel and silently
 * places nothing.
 *
 * So this builds the real objects with the real code against the real model and
 * measures the result. It needs no GPU — geometry construction, bounding boxes
 * and raycasting are all CPU work in three — which is what lets it run in CI
 * beside the model validator.
 *
 * Exit code is non-zero if any check fails.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

/* The measured facts this validates against. Kept here rather than imported so
   that the check is independent of the module under test — a drive that has
   drifted and a constant that has drifted with it would otherwise agree. */
const HULL = { loa: 5.2532, beam: 2.0943, keel: -0.2206 };
const TRANSOM_X = -2.6266;
/** The stern moulding's own box, from `npm run model`. */
const MOULDING = { minX: -2.6266, maxX: -1.8108, minY: -0.2034, maxY: 0.6275 };

let failures = 0;
let checks = 0;

function ok(condition, what) {
  checks += 1;
  if (condition) return;
  failures += 1;
  console.error(`  ✗ ${what}`);
}

function box(object) {
  object.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(object);
}

function fmt(n) {
  return n.toFixed(3).padStart(7);
}

/* ── The modules under test ────────────────────────────────────────────────
   Imported through the TypeScript sources, which node strips natively. The
   PXL modules use extensionless relative imports, so they are resolved here by
   a tiny loader hook rather than by rewriting the source — see `--import`
   below and the note in package.json.                                       */
const { buildDrive } = await import("../../src/webgl/scenes/pxl/pxlPropulsion.ts");
const { placeWordmark } = await import("../../src/webgl/scenes/pxl/pxlDecals.ts");
const { PXL_INK_LIGHT } = await import("../../src/webgl/scenes/pxl/pxlBranding.ts");
const { PXL_DRIVE_SPECS } = await import("../../src/webgl/scenes/pxl/pxlCatalog.ts");

/* ── Drives ────────────────────────────────────────────────────────────────*/

console.log("\n  PROXY DRIVES — §A14 to §A17\n");
console.log("  drive       tris     len     hgt     wid    fwd-most   deepest");

const built = [];
for (const variant of ["compact", "standard", "large", "electric"]) {
  const handle = buildDrive(variant);
  const b = box(handle.group);
  let tris = 0;
  handle.group.traverse((node) => {
    if (!node.isMesh) return;
    const g = node.geometry;
    tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
  });

  const length = b.max.x - b.min.x;
  const height = b.max.y - b.min.y;
  const width = b.max.z - b.min.z;
  built.push({ variant, b, tris, length, height, width, spec: PXL_DRIVE_SPECS[variant] });

  console.log(
    `  ${variant.padEnd(10)} ${String(Math.round(tris)).padStart(5)} ` +
      `${fmt(length)} ${fmt(height)} ${fmt(width)} ${fmt(b.max.x)}  ${fmt(b.min.y)}`,
  );

  /* §A16 — MOUNTING AND CLEARANCE. The first is the one that matters most: a
     drive whose forward face reaches past the transom is a drive inside the
     boat, and it is invisible from every camera preset the configurator
     offers because the hull hides it. */
  ok(
    b.max.x <= TRANSOM_X + 1e-3,
    `${variant}: nothing reaches forward of the transom (max x ${b.max.x.toFixed(3)})`,
  );
  ok(b.min.y < 0, `${variant}: the drive reaches the water`);
  ok(
    b.min.y > HULL.keel - 0.2,
    `${variant}: and does not hang absurdly below the keel (${b.min.y.toFixed(3)})`,
  );
  ok(
    Math.abs(b.max.z + b.min.z) < 1e-3,
    `${variant}: the drive is centred on the boat's centreline`,
  );
  ok(
    b.max.z - b.min.z < HULL.beam * 0.45,
    `${variant}: the drive is narrower than a fifth of the beam either side`,
  );
  ok(tris > 400 && tris < 6000, `${variant}: ${Math.round(tris)} triangles is a proxy, not a hero`);

  /* Every part has to have survived its bevel. An `ExtrudeGeometry` whose
     bevel exceeds half its depth collapses to nothing and disappears without
     an error — which on a propeller blade is a detail nobody notices until a
     close orbit. */
  handle.group.traverse((node) => {
    if (!node.isMesh) return;
    const nb = box(node);
    const size = nb.getSize(new THREE.Vector3());
    ok(
      size.x > 1e-3 && size.y > 1e-3 && size.z > 1e-3,
      `${variant}/${node.name || node.type}: the part has volume`,
    );
    const position = node.geometry.attributes.position.array;
    ok(
      position.every((v) => Number.isFinite(v)),
      `${variant}/${node.name || node.type}: no NaN vertices`,
    );
  });
}

/* §A15 — THE PROGRESSION IS VISIBLE AND IT IS NOT UNIFORM.
   Asserted on the BUILT boxes rather than on the authored numbers, because it
   is the built result a visitor sees and the two can diverge — a bevel is a
   dimension nobody typed. */
console.log("");
const [compact, standard, large] = built;
ok(compact.length < standard.length && standard.length < large.length,
   "the three combustion drives grow in length");
ok(compact.height < standard.height && standard.height < large.height,
   "and in height");
ok(compact.width < standard.width && standard.width < large.width,
   "and in width");

const lengthRatio = large.length / compact.length;
const widthRatio = large.width / compact.width;
ok(
  Math.abs(lengthRatio - widthRatio) > 0.08,
  `the growth is not uniform — length ×${lengthRatio.toFixed(2)}, width ×${widthRatio.toFixed(2)} (§A15)`,
);
ok(
  large.length / compact.length > 1.2,
  "the largest drive is at least a fifth longer than the smallest — the difference is legible",
);

/* §A17 — the electric drive is a different object rather than a smaller one. */
const electric = built[3];
ok(
  electric.width < compact.width,
  "the electric drive carries less bulk than the smallest combustion drive",
);
ok(
  electric.b.min.y < compact.b.min.y,
  "while reaching deeper — the mass is in the leg, not on the transom",
);

/* ── The wordmark ──────────────────────────────────────────────────────────*/

console.log("\n  PXL WORDMARK — §A10 to §A12\n");

const glb = await readFile(path.join(ROOT, "public", "models", "PXL.glb"));
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(
  glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength),
  "",
);

let moulding = null;
gltf.scene.traverse((node) => {
  if (node.isMesh && node.name === "transom_black") moulding = node;
});
ok(Boolean(moulding), "the stern moulding is in the model");

if (moulding) {
  const placements = placeWordmark(moulding, PXL_INK_LIGHT);
  ok(placements.length === 2, `the mark places on both sides (got ${placements.length})`);

  console.log("  side        x       y       z    width   normal·z");
  for (const placement of placements) {
    const mesh = placement.mesh;
    const b = box(mesh);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion);
    const side = mesh.name.includes("starboard") ? "starboard" : "port";
    console.log(
      `  ${side.padEnd(10)}${fmt(mesh.position.x)} ${fmt(mesh.position.y)} ` +
        `${fmt(mesh.position.z)} ${fmt(b.max.x - b.min.x)}  ${fmt(normal.z)}`,
    );

    /* THE MARK IS ON THE MOULDING. The whole point of placing it by raycast is
       that this is checkable rather than remembered. */
    ok(
      mesh.position.x > MOULDING.minX - 0.05 && mesh.position.x < MOULDING.maxX + 0.05,
      `${side}: the mark lands within the stern panel fore-aft`,
    );
    ok(
      mesh.position.y > MOULDING.minY && mesh.position.y < MOULDING.maxY,
      `${side}: and within it vertically`,
    );
    ok(mesh.position.y > 0, `${side}: and above the waterline`);
    ok(
      Math.abs(mesh.position.z) > 0.2 && Math.abs(mesh.position.z) <= HULL.beam / 2 + 0.02,
      `${side}: it sits on the topsides, not on the centreline`,
    );
    /* The normal has to point OUTBOARD. A mark facing inboard is a mark drawn
       on the inside of the hull, which is invisible and looks like nothing at
       all went wrong. */
    ok(
      Math.sign(normal.z) === Math.sign(mesh.position.z),
      `${side}: the mark faces outboard`,
    );
    /* Legibility. Wider than a hand and narrower than the panel it is on. */
    const width = b.max.x - b.min.x;
    ok(width > 0.1 && width < 0.4, `${side}: the lockup is ${width.toFixed(3)} m wide`);
    ok(
      width < MOULDING.maxX - MOULDING.minX,
      `${side}: and fits inside the panel's own length`,
    );

    const position = mesh.geometry.attributes.position.array;
    ok(position.every((v) => Number.isFinite(v)), `${side}: no NaN vertices in the lockup`);
    const tris = mesh.geometry.index
      ? mesh.geometry.index.count / 3
      : mesh.geometry.attributes.position.count / 3;
    ok(tris > 10 && tris < 400, `${side}: ${tris} triangles — lightweight geometry`);
  }

  /* Mirrored, not duplicated. Two marks at the same z would be one mark and a
     hole; two facing the same way would put a backwards lockup on one beam. */
  if (placements.length === 2) {
    const [a, c] = placements;
    ok(
      Math.sign(a.mesh.position.z) !== Math.sign(c.mesh.position.z),
      "the two marks are on opposite sides",
    );
    ok(
      Math.abs(a.mesh.position.y - c.mesh.position.y) < 0.02,
      "at the same height",
    );
  }
}

console.log("");
if (failures) {
  console.error(`  ${failures} of ${checks} checks failed.\n`);
  process.exitCode = 1;
} else {
  console.log(`  ✓ ${checks} checks passed\n`);
}
