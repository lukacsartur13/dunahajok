/** PHASE 4.4 — characterise geometry forward of a station, in MODEL axes. */
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const file = process.argv[2];
const XCUT = Number(process.argv[3] ?? 1.6);
const only = process.argv[4] ?? null;
const bytes = await readFile(file);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
gltf.scene.updateWorldMatrix(true, true);

// glTF (x, y-up, z) → model (x, y-lateral, z-up)
const toModel = (v) => new THREE.Vector3(v.x, -v.z, v.y);

const rows = [];
gltf.scene.traverse((o) => {
  if (!o.isMesh) return;
  if (only && o.name !== only) return;
  const g = o.geometry, pos = g.attributes.position, idx = g.index, m = o.matrixWorld;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
  let fwdArea = 0, fwdUp = 0, fwdSide = 0, tot = 0, nFwd = 0;
  const bb = new THREE.Box3(), fb = new THREE.Box3();
  const zs = [];
  const count = idx ? idx.count : pos.count;
  for (let i = 0; i < count; i += 3) {
    const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i+1) : i+1, i2 = idx ? idx.getX(i+2) : i+2;
    a.copy(toModel(new THREE.Vector3().fromBufferAttribute(pos, i0).applyMatrix4(m)));
    b.copy(toModel(new THREE.Vector3().fromBufferAttribute(pos, i1).applyMatrix4(m)));
    c.copy(toModel(new THREE.Vector3().fromBufferAttribute(pos, i2).applyMatrix4(m)));
    ab.subVectors(b, a); ac.subVectors(c, a); n.crossVectors(ab, ac);
    const area = n.length() / 2; tot += area;
    bb.expandByPoint(a); bb.expandByPoint(b); bb.expandByPoint(c);
    const cx = (a.x + b.x + c.x) / 3;
    if (cx >= XCUT) {
      fwdArea += area; nFwd += 1;
      fb.expandByPoint(a); fb.expandByPoint(b); fb.expandByPoint(c);
      zs.push((a.z + b.z + c.z) / 3);
      n.normalize();
      if (Math.abs(n.z) > 0.6) fwdUp += area; else if (Math.abs(n.y) > 0.6) fwdSide += area;
    }
  }
  zs.sort((p, q) => p - q);
  const f = (v) => v.toFixed(3).padStart(7);
  rows.push({ name: o.name, tot, fwdArea, fwdUp, fwdSide, nFwd,
    bb: `x${f(bb.min.x)}..${f(bb.max.x)}  y${f(bb.min.y)}..${f(bb.max.y)}  z${f(bb.min.z)}..${f(bb.max.z)}`,
    fb: nFwd ? `x${f(fb.min.x)}..${f(fb.max.x)}  y${f(fb.min.y)}..${f(fb.max.y)}  z${f(fb.min.z)}..${f(fb.max.z)}` : "-",
    med: zs.length ? zs[zs.length >> 1] : NaN });
});
rows.sort((p, q) => q.fwdUp - p.fwdUp);
console.log(`\nMODEL axes (x fore, y lateral, z up) — forward of x=${XCUT}\n`);
for (const r of rows) {
  if (!only && r.fwdArea < 1e-6) continue;
  console.log(`${r.name.padEnd(24)} area ${r.tot.toFixed(2).padStart(6)}  fwd ${r.fwdArea.toFixed(3).padStart(7)} (${r.nFwd} tri)  UP ${r.fwdUp.toFixed(3).padStart(7)}  SIDE ${r.fwdSide.toFixed(3).padStart(7)}  medZ ${r.med.toFixed(3)}`);
  console.log(`    all  ${r.bb}`);
  console.log(`    fwd  ${r.fb}`);
}
