import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
const bytes = await readFile(process.argv[2]);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
gltf.scene.updateWorldMatrix(true, true);
const toModel = (v) => new THREE.Vector3(v.x, -v.z, v.y);
const meshes = new Map();
gltf.scene.traverse((o) => {
  if (!o.isMesh) return;
  const pos = o.geometry.attributes.position, idx = o.geometry.index;
  const count = idx ? idx.count : pos.count;
  const out = meshes.get(o.name) ?? [];
  for (let i = 0; i < count; i += 3) {
    const p = [];
    for (let k = 0; k < 3; k += 1) {
      const j = idx ? idx.getX(i + k) : i + k;
      p.push(toModel(new THREE.Vector3().fromBufferAttribute(pos, j).applyMatrix4(o.matrixWorld)));
    }
    out.push(p);
  }
  meshes.set(o.name, out);
});
function stack(x, y) {
  const hits = [];
  for (const [name, tris] of meshes) {
    for (const [a, b, c] of tris) {
      const d = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
      if (Math.abs(d) < 1e-12) continue;
      const u = ((x - a.x) * (c.y - a.y) - (c.x - a.x) * (y - a.y)) / d;
      const v = ((b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y)) / d;
      if (u < 0 || v < 0 || u + v > 1) continue;
      const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
      hits.push({ z: a.z + u * (b.z - a.z) + v * (c.z - a.z), name, nz: n.z });
    }
  }
  return hits.sort((p, q) => q.z - p.z);
}
for (const arg of process.argv.slice(3)) {
  const [x, y] = arg.split(",").map(Number);
  const h = stack(x, y);
  console.log(`(${x}, ${y})  ` + h.map((r) => `${r.name.slice(0, 8)}@${r.z.toFixed(3)}${r.nz > 0.5 ? "^" : r.nz < -0.5 ? "v" : "|"}`).join("  "));
}
