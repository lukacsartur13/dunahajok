import { readFile } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const bytes = await readFile(path.join(ROOT, "public/models/PXL.glb"));
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await new Promise((res, rej) => loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength), "", res, rej));
gltf.scene.updateWorldMatrix(true, true);
const find = (n) => { let m=null; gltf.scene.traverse(o=>{if(o.isMesh&&o.name===n)m=o;}); return m; };
const ray = new THREE.Raycaster();
function faceSpan(mesh, x, side=1) {
  let lo=null, hi=null;
  for (let y=-0.30; y<=1.05; y+=0.002) {
    ray.set(new THREE.Vector3(x,y,side*2.6), new THREE.Vector3(0,0,-side)); ray.far=6;
    const h = ray.intersectObject(mesh,false)[0];
    if (h) { if (lo===null) lo=y; hi=y; }
  }
  return [lo,hi];
}
const panel = find("transom_black");
console.log("transom_black visible outer face span, per station:");
for (let x=-2.60; x<=-1.80; x+=0.05) {
  const [lo,hi]=faceSpan(panel,x);
  console.log(`  x=${x.toFixed(3)}  y ${lo===null?"—":lo.toFixed(3)}..${hi===null?"—":hi.toFixed(3)}  h=${lo===null?"—":(hi-lo).toFixed(3)}`);
}
const cap = find("hull_accent");
console.log("\nhull_accent visible outer face span (the Duna band):");
for (let x=-0.4; x<=0.9; x+=0.1) {
  const [lo,hi]=faceSpan(cap,x);
  console.log(`  x=${x.toFixed(3)}  y ${lo===null?"—":lo.toFixed(3)}..${hi===null?"—":hi.toFixed(3)}  h=${lo===null?"—":(hi-lo).toFixed(3)}`);
}
