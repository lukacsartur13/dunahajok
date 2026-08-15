import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
const bytes = await readFile(process.argv[2]);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
gltf.scene.updateWorldMatrix(true, true);
const toM = (v) => new THREE.Vector3(v.x, -v.z, v.y);
for (const name of process.argv.slice(3)) {
  let m; gltf.scene.traverse((o) => { if (o.isMesh && o.name === name) m = o; });
  if (!m) { console.log(name, "missing"); continue; }
  const pos = m.geometry.attributes.position, idx = m.geometry.index;
  const n = idx ? idx.count : pos.count;
  const h = new Map();
  for (let i = 0; i < n; i += 3) {
    const p = [];
    for (let k = 0; k < 3; k++) { const j = idx ? idx.getX(i + k) : i + k; p.push(toM(new THREE.Vector3().fromBufferAttribute(pos, j).applyMatrix4(m.matrixWorld))); }
    const zc = (p[0].z + p[1].z + p[2].z) / 3;
    const k = Math.floor(zc * 20) / 20;
    const b = h.get(k) ?? { n: 0, y: 0, x0: Infinity, x1: -Infinity };
    b.n++; b.y = Math.max(b.y, ...p.map((q) => Math.abs(q.y)));
    b.x0 = Math.min(b.x0, ...p.map((q) => q.x)); b.x1 = Math.max(b.x1, ...p.map((q) => q.x));
    h.set(k, b);
  }
  console.log(`\n${name}`);
  for (const [k, b] of [...h].sort((a, c) => a[0] - c[0])) {
    console.log(`  z ${k.toFixed(2)}..${(k + 0.05).toFixed(2)}  ${String(b.n).padStart(5)} tris  x ${b.x0.toFixed(2)}..${b.x1.toFixed(2)}  max|y| ${b.y.toFixed(3)}`);
  }
}
