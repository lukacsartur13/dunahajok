/** Aft-most hull station at a range of heights, on and near the centreline. */
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
const bytes = await readFile(process.argv[2]);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const g = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
g.scene.updateMatrixWorld(true);
const pts = [];
g.scene.traverse((n) => {
  if (!n.isMesh) return;
  if (!/hull_lower|hull_primary|transom_black/.test(n.name)) return;
  const p = n.geometry.getAttribute("position"); const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld); pts.push([v.x, -v.z, v.y]); }
});
console.log("  z      aft-most x  (|y|<0.35)   (|y|<0.95)");
for (let z = -0.20; z <= 0.75; z += 0.05) {
  const near = pts.filter((p) => Math.abs(p[2] - z) < 0.03 && Math.abs(p[1]) < 0.35);
  const wide = pts.filter((p) => Math.abs(p[2] - z) < 0.03 && Math.abs(p[1]) < 0.95);
  const f = (a) => a.length ? Math.min(...a.map((p) => p[0])).toFixed(3).padStart(8) : "     -  ";
  console.log(`${z.toFixed(2).padStart(6)}  ${f(near)}  ${f(wide)}`);
}
