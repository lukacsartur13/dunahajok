import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
const bytes = await readFile(process.argv[2]);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
gltf.scene.updateWorldMatrix(true, true);
const toM = (v) => new THREE.Vector3(v.x, -v.z, v.y);
const key = (p) => `${Math.round(p.x * 4000)},${Math.round(p.y * 4000)},${Math.round(p.z * 4000)}`;
for (const name of process.argv.slice(3)) {
  let m; gltf.scene.traverse((o) => { if (o.isMesh && o.name === name) m = o; });
  if (!m) continue;
  const pos = m.geometry.attributes.position, idx = m.geometry.index;
  const n = idx ? idx.count : pos.count;
  const faces = [];
  for (let i = 0; i < n; i += 3) {
    const p = [];
    for (let k = 0; k < 3; k++) { const j = idx ? idx.getX(i + k) : i + k; p.push(toM(new THREE.Vector3().fromBufferAttribute(pos, j).applyMatrix4(m.matrixWorld))); }
    const nn = new THREE.Vector3().subVectors(p[1], p[0]).cross(new THREE.Vector3().subVectors(p[2], p[0])).normalize();
    faces.push({ p, n: nn, c: p[0].clone().add(p[1]).add(p[2]).multiplyScalar(1 / 3) });
  }
  const edges = new Map();
  faces.forEach((f, i) => {
    for (let e = 0; e < 3; e++) {
      const a = key(f.p[e]), b = key(f.p[(e + 1) % 3]);
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      const g = edges.get(k) ?? []; g.push(i); edges.set(k, g);
    }
  });
  const bins = new Array(19).fill(0);
  let over = 0; const steep = [];
  for (const [, g] of edges) {
    if (g.length !== 2) continue;
    const ang = THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.max(-1, faces[g[0]].n.dot(faces[g[1]].n)))));
    const b = Math.min(18, Math.floor(ang / 5)); bins[b]++;
    if (ang > Number(process.env.LO ?? 15) && ang < Number(process.env.HI ?? 40)) { over++; steep.push({ ang, c: faces[g[0]].c }); }
  }
  console.log(`\n${name}: ${faces.length} faces, ${edges.size} edges`);
  bins.forEach((v, i) => { if (v) console.log(`  ${String(i * 5).padStart(3)}–${String(i * 5 + 5).padStart(3)}°  ${v}`); });
  steep.sort((a, b) => b.ang - a.ang);
  console.log("  steepest 15–40° edges, by location:");
  console.log(steep.slice(0, Number(process.env.N ?? 12)).map((r) => `    ${r.ang.toFixed(1)}° at x ${r.c.x.toFixed(2)} y ${r.c.y.toFixed(2)} z ${r.c.z.toFixed(2)}`).join("\n"));
}
