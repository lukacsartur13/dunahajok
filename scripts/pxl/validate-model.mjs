/**
 * Production model validation.
 *
 *   node scripts/pxl/validate-model.mjs [file.glb] [--dump <dir>]
 *   npm run model                                  # the QA entry point
 *
 * Loads the GLB through the *same* loader the site uses — three's GLTFLoader
 * with MeshoptDecoder attached, exactly as drei's `useGLTF` configures it — so
 * a file that passes here is a file that will parse in the browser. A schema
 * checker would not tell us that; it would tell us the JSON is well-formed
 * while an extension the runtime cannot decode sits inside it.
 *
 * Everything it reports is either a number the phase report has to quote or a
 * mistake this pipeline is capable of making: a model in the wrong units, a
 * mesh whose material went missing, a normal that came out NaN, a node name
 * the configurator addresses that is no longer there.
 *
 * Exit code is non-zero if any check fails, so it can gate a build.
 */

import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

const args = process.argv.slice(2);
const dumpAt = args.indexOf("--dump");
const dumpDir = dumpAt >= 0 ? args[dumpAt + 1] : null;
const file = args.find((a) => a.endsWith(".glb")) ?? path.join(ROOT, "public", "models", "PXL.glb");

/**
 * What the *hull* is expected to measure, from the source STL: 5.2532 m by
 * 2.0943 m. Measured over the hull zones alone, because the overall bounding
 * box also contains the outboard, which hangs half a metre astern of the
 * transom and is not part of any length a boatbuilder would quote.
 *
 * The tolerance is wide on purpose. This check exists to catch a model
 * delivered in millimetres or centimetres — off by three orders of magnitude —
 * not to police the fourth decimal place.
 */
const EXPECT = { loa: 5.25, beam: 2.09, tolerance: 0.25 };
const HULL_ZONES = new Set(["hull_primary", "hull_lower", "hull_accent", "transom_black"]);

/** Nodes the runtime addresses by name. Losing one silently breaks a channel. */
const REQUIRED_NODES = [
  "PXL_ROOT",
  "hull_primary", "hull_lower", "hull_accent", "transom_black",
  "deck_main", "console_body", "helm_wheel", "rails", "motor",
];

const failures = [];
const warnings = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

const bytes = await readFile(file);
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

/* ── Walk ──────────────────────────────────────────────────────────────────*/

const meshes = [];
const materials = new Map();
const textures = new Set();
const names = new Set();
let triangles = 0;
let vertices = 0;
let gpuBytes = 0;

gltf.scene.updateWorldMatrix(true, true);
gltf.scene.traverse((node) => {
  names.add(node.name);
  if (!node.isMesh) return;

  const geometry = node.geometry;
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const index = geometry.getIndex();
  const count = index ? index.count / 3 : position.count / 3;

  triangles += count;
  vertices += position.count;
  for (const attribute of Object.values(geometry.attributes)) {
    gpuBytes += attribute.array.byteLength;
  }
  if (index) gpuBytes += index.array.byteLength;

  check(!!node.material, `${node.name}: no material`);
  check(!!normal, `${node.name}: no NORMAL attribute`);

  if (position && !position.array.every(Number.isFinite)) {
    failures.push(`${node.name}: non-finite position`);
  }
  if (normal) {
    let bad = 0;
    for (let i = 0; i < normal.count; i++) {
      const x = normal.getX(i), y = normal.getY(i), z = normal.getZ(i);
      const length = Math.hypot(x, y, z);
      if (!Number.isFinite(length) || Math.abs(length - 1) > 0.02) bad += 1;
    }
    if (bad) failures.push(`${node.name}: ${bad} normals are not unit length`);
  }

  const material = node.material;
  if (material) {
    materials.set(material.name || material.uuid, material);
    for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap"]) {
      if (material[key]) textures.add(material[key].uuid);
    }
    const colour = material.color;
    if (colour && colour.r === 0 && colour.g === 0 && colour.b === 0) {
      warnings.push(`${node.name}: base colour is pure black — no surface detail will survive`);
    }
  }

  geometry.computeBoundingBox();
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  meshes.push({
    name: node.name,
    material: material?.name ?? "—",
    triangles: count,
    vertices: position.count,
    size,
    doubleSided: material?.side === THREE.DoubleSide,
  });
});

const box = new THREE.Box3().setFromObject(gltf.scene);
const size = box.getSize(new THREE.Vector3());
const centre = box.getCenter(new THREE.Vector3());

const hullBox = new THREE.Box3();
gltf.scene.traverse((node) => {
  if (node.isMesh && HULL_ZONES.has(node.name)) hullBox.expandByObject(node);
});
const hull = hullBox.isEmpty()
  ? { size: size.clone(), centre: centre.clone() }
  : { size: hullBox.getSize(new THREE.Vector3()), centre: hullBox.getCenter(new THREE.Vector3()) };

/* ── Checks ────────────────────────────────────────────────────────────────*/

for (const required of REQUIRED_NODES) {
  check(names.has(required), `missing node the runtime addresses: ${required}`);
}
check(
  Math.abs(hull.size.x - EXPECT.loa) < EXPECT.tolerance,
  `hull length along X is ${hull.size.x.toFixed(3)} m, expected ~${EXPECT.loa} m — ` +
  `check units (a model in millimetres reads ${(EXPECT.loa * 1000).toFixed(0)})`,
);
check(
  Math.abs(hull.size.z - EXPECT.beam) < EXPECT.tolerance,
  `beam along Z is ${hull.size.z.toFixed(3)} m, expected ~${EXPECT.beam} m`,
);
check(size.y < size.x, "the model is taller than it is long — check the up axis");
check(gltf.animations.length === 0, `${gltf.animations.length} animation(s) — none expected`);
if (Math.abs(hull.centre.x) > 0.20) {
  warnings.push(`hull origin is ${hull.centre.x.toFixed(2)} m off the longitudinal centre`);
}
if (Math.abs(hull.centre.z) > 0.05) {
  warnings.push(`hull origin is ${hull.centre.z.toFixed(2)} m off the centreline`);
}

/* ── Report ────────────────────────────────────────────────────────────────*/

const mb = (n) => `${(n / 1e6).toFixed(3)} MB`;
console.log(`\n  ${path.relative(ROOT, file)}`);
console.log(`  transfer size      ${mb(bytes.length)}`);
console.log(`  geometry in GPU    ${mb(gpuBytes)} (decompressed, positions + normals + indices)`);
console.log(`  scene nodes        ${names.size}`);
console.log(`  meshes             ${meshes.length}`);
console.log(`  materials          ${materials.size}`);
console.log(`  textures           ${textures.size}`);
console.log(`  animations         ${gltf.animations.length}`);
console.log(`  triangles          ${triangles.toLocaleString("en-GB")}`);
console.log(`  vertices           ${vertices.toLocaleString("en-GB")}`);
console.log(`  bounding box       ${size.x.toFixed(3)} × ${size.y.toFixed(3)} × ${size.z.toFixed(3)} m  (with outboard)`);
console.log(`  hull box           ${hull.size.x.toFixed(3)} × ${hull.size.y.toFixed(3)} × ${hull.size.z.toFixed(3)} m`);
console.log(`                     (length × height × beam, Y up, bow +X)`);
console.log(`  scene centre       ${centre.x.toFixed(3)}, ${centre.y.toFixed(3)}, ${centre.z.toFixed(3)} m`);
console.log(`  hull centre        ${hull.centre.x.toFixed(3)}, ${hull.centre.y.toFixed(3)}, ${hull.centre.z.toFixed(3)} m`);
console.log(`  draft below y=0    ${Math.max(0, -box.min.y).toFixed(3)} m  (hull ${Math.max(0, -hullBox.min.y).toFixed(3)} m)`);
console.log(`  extensions         ${(gltf.parser.json.extensionsUsed ?? []).join(", ") || "—"}`);

console.log(`\n  ${"mesh".padEnd(26)}${"tris".padStart(8)}${"verts".padStart(8)}  ${"material".padEnd(24)}sides`);
for (const m of meshes.sort((a, b) => b.triangles - a.triangles)) {
  console.log(
    `  ${m.name.padEnd(26)}${m.triangles.toLocaleString("en-GB").padStart(8)}` +
    `${m.vertices.toLocaleString("en-GB").padStart(8)}  ${m.material.padEnd(24)}` +
    `${m.doubleSided ? "2" : "1"}`,
  );
}

if (dumpDir) {
  await mkdir(dumpDir, { recursive: true });
  const manifest = [];
  const targets = [];
  gltf.scene.traverse((node) => { if (node.isMesh) targets.push(node); });
  for (const node of targets) {
    const geometry = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry;
    const array = Float32Array.from(geometry.getAttribute("position").array);
    await writeFile(path.join(dumpDir, `${node.name}.f32`), Buffer.from(array.buffer));
    manifest.push({ name: node.name, triangles: array.length / 9 });
  }
  await writeFile(path.join(dumpDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\n  dumped ${manifest.length} meshes to ${path.relative(ROOT, dumpDir)}`);
}

for (const w of warnings) console.log(`\n  ⚠  ${w}`);
if (failures.length) {
  console.error(`\n  ${failures.length} check(s) failed:`);
  for (const f of failures) console.error(`     ✗ ${f}`);
  process.exitCode = 1;
} else {
  console.log(`\n  ✓ all checks passed\n`);
}
