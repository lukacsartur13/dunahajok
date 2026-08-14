import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const file = process.argv[2];
const bytes = await readFile(file);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await new Promise((res, rej) =>
  loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "", res, rej));

gltf.scene.updateWorldMatrix(true, true);
const meshes = [];
gltf.scene.traverse((n) => { if (n.isMesh) meshes.push(n); });

const f = (v) => v.toFixed(4).padStart(9);
console.log("== world bounding boxes ==");
for (const m of meshes) {
  const b = new THREE.Box3().setFromObject(m);
  console.log(`${m.name.padEnd(26)} x[${f(b.min.x)},${f(b.max.x)}] y[${f(b.min.y)},${f(b.max.y)}] z[${f(b.min.z)},${f(b.max.z)}]`);
}

// Raycast probes: fire inboard at a grid on the port/starboard side to map the
// outer surface of specific zones.
const ray = new THREE.Raycaster();
function probe(meshName, xs, ys, side = 1) {
  const mesh = meshes.find((m) => m.name === meshName);
  if (!mesh) return console.log(`  (no ${meshName})`);
  console.log(`\n-- ray probe on ${meshName} (side ${side}) --`);
  for (const y of ys) {
    let row = `  y=${y.toFixed(3)}  `;
    for (const x of xs) {
      ray.set(new THREE.Vector3(x, y, side * 2.6), new THREE.Vector3(0, 0, -side));
      ray.far = 6;
      const hit = ray.intersectObject(mesh, false)[0];
      if (!hit) { row += `x=${x.toFixed(2)}:—        `; continue; }
      const n = hit.face.normal.clone();
      if (n.dot(new THREE.Vector3(0, 0, -side)) > 0) n.negate();
      row += `x=${x.toFixed(2)}:z=${hit.point.z.toFixed(3)} n=(${n.x.toFixed(2)},${n.y.toFixed(2)},${n.z.toFixed(2)})  `;
    }
    console.log(row);
  }
}

probe("hull_accent", [-1.5, -0.8, 0, 0.8, 1.5], [0.55, 0.60, 0.65, 0.70, 0.75, 0.80]);
probe("hull_primary", [-1.5, -0.8, 0, 0.8, 1.5], [0.35, 0.45, 0.55, 0.65]);
probe("transom_black", [-2.5, -2.3, -2.1, -1.9], [0.10, 0.25, 0.40, 0.55]);

// Console: vertical section along the centreline-ish
const console_ = meshes.find((m) => m.name === "console_body");
if (console_) {
  console.log("\n-- console_body: down-ray heights on a grid --");
  const cb = new THREE.Box3().setFromObject(console_);
  console.log("  box", JSON.stringify(cb));
  for (let z = -0.3; z <= 0.31; z += 0.15) {
    let row = `  z=${z.toFixed(2)} `;
    for (let x = cb.min.x; x <= cb.max.x + 1e-6; x += (cb.max.x - cb.min.x) / 6) {
      ray.set(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0));
      ray.far = 6;
      const hit = ray.intersectObject(console_, false)[0];
      row += hit ? ` x=${x.toFixed(2)}:${hit.point.y.toFixed(3)}` : ` x=${x.toFixed(2)}:—`;
    }
    console.log(row);
  }
  console.log("\n-- console_body: fore-aft ray at heights (from bow, aimed aft) --");
  for (const y of [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.05]) {
    ray.set(new THREE.Vector3(3, y, 0), new THREE.Vector3(-1, 0, 0));
    ray.far = 8;
    const hits = ray.intersectObject(console_, false);
    console.log(`  y=${y.toFixed(2)}  ${hits.map((h) => h.point.x.toFixed(3)).join(", ") || "—"}`);
  }
}
for (const nm of ["console_trim", "helm_wheel", "rails", "deck_trim", "deck_main"]) {
  const m = meshes.find((x) => x.name === nm);
  if (!m) continue;
  const b = new THREE.Box3().setFromObject(m);
  console.log(`\n${nm}: min ${b.min.toArray().map((v)=>v.toFixed(4))} max ${b.max.toArray().map((v)=>v.toFixed(4))}`);
}
