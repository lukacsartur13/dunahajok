/** PHASE 4.4 — up-facing surface area per zone, in model axes. §4, §35. */
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
const bytes = await readFile(process.argv[2]);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
gltf.scene.updateWorldMatrix(true, true);
const toModel = (v) => new THREE.Vector3(v.x, -v.z, v.y);
const rows = [];
gltf.scene.traverse((o) => {
  if (!o.isMesh) return;
  const g = o.geometry, pos = g.attributes.position, idx = g.index, m = o.matrixWorld;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
  let up = 0, dn = 0, tot = 0;
  const bb = new THREE.Box3();
  const count = idx ? idx.count : pos.count;
  for (let i = 0; i < count; i += 3) {
    const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i+1) : i+1, i2 = idx ? idx.getX(i+2) : i+2;
    a.copy(toModel(new THREE.Vector3().fromBufferAttribute(pos, i0).applyMatrix4(m)));
    b.copy(toModel(new THREE.Vector3().fromBufferAttribute(pos, i1).applyMatrix4(m)));
    c.copy(toModel(new THREE.Vector3().fromBufferAttribute(pos, i2).applyMatrix4(m)));
    ab.subVectors(b, a); ac.subVectors(c, a); n.crossVectors(ab, ac);
    const area = n.length() / 2; tot += area;
    bb.expandByPoint(a); bb.expandByPoint(b); bb.expandByPoint(c);
    n.normalize();
    if (n.z > 0.7) up += area; else if (n.z < -0.7) dn += area;
  }
  const f = (v) => v.toFixed(3).padStart(7);
  rows.push([o.name, tot, up, `x${f(bb.min.x)}..${f(bb.max.x)} y${f(bb.min.y)}..${f(bb.max.y)} z${f(bb.min.z)}..${f(bb.max.z)}`]);
});
rows.sort((p, q) => q[2] - p[2]);
console.log(`\n${process.argv[2]}\n`);
console.log("zone                       area m²   UP-FACING   bbox");
for (const [n, t, u, bb] of rows) console.log(`${n.padEnd(24)} ${t.toFixed(3).padStart(8)}  ${u.toFixed(3).padStart(8)}   ${bb}`);
