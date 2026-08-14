/** PHASE 4.7 — what covers the interior in plan, mesh by mesh, station by
 *  station. Answers two questions the pad rework depends on: how wide the
 *  opening is at every station, and whether anything at all is under the
 *  padding where the delivered sole runs out. */
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const file = process.argv[2];
const mode = process.argv[3] ?? "band";
const bytes = await readFile(file);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
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
      p.push(toModel(new THREE.Vector3().fromBufferAttribute(pos, j)
        .applyMatrix4(o.matrixWorld)));
    }
    out.push(p);
  }
  meshes.set(o.name, out);
});

/** Highest up-facing surface at (x, y), and which mesh carries it. */
function surface(x, y) {
  let best = null;
  for (const [name, tris] of meshes) {
    if (SKIP.has(name)) continue;
    for (const [a, b, c] of tris) {
      const d = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
      if (Math.abs(d) < 1e-12) continue;
      const u = ((x - a.x) * (c.y - a.y) - (c.x - a.x) * (y - a.y)) / d;
      const v = ((b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y)) / d;
      if (u < 0 || v < 0 || u + v > 1) continue;
      const z = a.z + u * (b.z - a.z) + v * (c.z - a.z);
      if (!best || z > best.z) best = { z, name };
    }
  }
  return best;
}

const SKIP = new Set((process.env.SKIP ?? "").split(",").filter(Boolean));
const f = (v) => v.toFixed(3).padStart(6);

if (mode === "band") {
  function band(tris, x, side) {
    let lo = Infinity, hi = -Infinity;
    for (const p of tris) {
      const xs = p.map((v) => v.x);
      if (Math.min(...xs) > x || Math.max(...xs) < x) continue;
      for (const v of p) {
        if (side > 0 ? v.y < 0.002 : v.y > -0.002) continue;
        lo = Math.min(lo, Math.abs(v.y)); hi = Math.max(hi, Math.abs(v.y));
      }
    }
    return lo === Infinity ? null : [lo, hi];
  }
  const g = (b, i) => (b ? f(b[i]) : "   -  ");
  console.log("\n  x    cap.in   uph.S lo..hi     uph.P lo..hi     sole lo..hi     liner lo..hi");
  for (let x = -1.2; x <= 2.45; x += 0.1) {
    const c = band(meshes.get("gunwale_capping"), x, 1);
    const us = band(meshes.get("upholstery_primary"), x, 1);
    const up = band(meshes.get("upholstery_primary"), x, -1);
    const s = band(meshes.get("cockpit_sole"), x, 1);
    const l = band(meshes.get("interior_hard_liner"), x, 1);
    console.log(`${x.toFixed(2).padStart(5)}  ${g(c, 0)}  ${g(us, 0)}..${g(us, 1)}  `
      + `${g(up, 0)}..${g(up, 1)}  ${g(s, 0)}..${g(s, 1)}  ${g(l, 0)}..${g(l, 1)}`);
  }
} else {
  // What the eye meets looking straight down, across the interior.
  for (const x of (process.argv.slice(4).map(Number))) {
    const row = [];
    for (let y = 0.0; y <= 0.95; y += 0.05) {
      const s = surface(x, y);
      row.push(`${y.toFixed(2)}:${s ? s.name.slice(0, 7) + "@" + s.z.toFixed(2) : "-----"}`);
    }
    console.log(`x ${x.toFixed(2)}  ${row.join("  ")}`);
  }
}
