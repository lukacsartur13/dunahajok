/**
 * PXL — production optimisation and compression.
 *
 *   node scripts/pxl/compress-pxl.mjs
 *
 * Reads the archival master written by `build_pxl.py` and produces the file
 * the site actually loads. Three passes, in this order, because each one
 * depends on the last:
 *
 *   1. SIMPLIFY. Quadric-error edge collapse with a hard error ceiling, per
 *      mesh, with borders locked. This is not a polygon-count target — it is a
 *      *tolerance*: collapse anything that moves the surface by less than the
 *      zone's budget, and stop. On this model that empties out the transom,
 *      which SketchUp tessellated into eleven thousand triangles for a panel
 *      that is very nearly flat, and leaves the chines, the sheer and the bow
 *      almost exactly as they were, because collapsing those costs far more
 *      than the ceiling allows. Borders are locked so the zones stay welded to
 *      each other along their shared edges — a configurator that can recolour
 *      the topsides independently of the bottom must not be able to open a
 *      crack between them.
 *
 *      The error is measured over *normals as well as positions*. On a painted
 *      hull the thing that gives a cheap model away is not a displaced surface
 *      — four millimetres on a five-metre boat is invisible — it is a highlight
 *      that crawls across the topsides in flat bands, because the collapse that
 *      cost almost nothing in position cost a great deal in curvature. Feeding
 *      the normals in as weighted attributes makes the quadric price that
 *      directly, so triangles survive where the surface is turning and vanish
 *      where it is flat, which is exactly the distribution a reflective
 *      surface wants.
 *
 *   2. REORDER. Vertex-cache and vertex-fetch optimisation. Free at build
 *      time, and worth a few per cent of GPU time on every frame the
 *      configurator draws.
 *
 *   3. ENCODE. EXT_meshopt_compression over the vertex and index streams.
 *
 * WHY MESHOPT AND NOT DRACO. The decoder is already in the bundle: drei's
 * `useGLTF` wires `MeshoptDecoder` from three-stdlib into every GLTFLoader it
 * makes, unconditionally, so a meshopt-encoded file costs zero extra network
 * requests and zero extra runtime assets. Draco would mean either a call out to
 * Google's CDN — a third-party request on a page whose whole point is a
 * controlled first impression — or self-hosting ~180 kB of WASM to save a few
 * tens of kB over meshopt. Meshopt also decodes several times faster, which
 * matters on the phones this has to open on.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { MeshoptSimplifier } from "meshoptimizer/meshopt_simplifier.module.js";
import { MeshoptEncoder } from "meshoptimizer/meshopt_encoder.module.js";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
/**
 * THE CORRECTED ASSET, NOT THE ARCHIVAL MASTER. Changed in Phase 4.2.
 *
 * `build_pxl.py` still writes `PXL.source.glb` and it is still the honest STL
 * recovery — nothing edits it. `pxl_blender.py` reads that and writes
 * `PXL.production.glb`, which is the same hull surface with its zone partition
 * corrected, its inverted deck faces turned upright and the interior split into
 * the three materials the references show. That is the file the site ships.
 *
 * Falls back to the master if the Blender stage has never been run, so a fresh
 * clone that only has Python still produces a loadable boat — an out-of-date
 * one, and it says so.
 */
const CORRECTED = path.join(ROOT, "assets", "derived", "pxl", "PXL.production.glb");
const MASTER = path.join(ROOT, "assets", "derived", "pxl", "PXL.source.glb");
const { existsSync } = await import("node:fs");
const SOURCE = existsSync(CORRECTED) ? CORRECTED : MASTER;
if (SOURCE === MASTER) {
  console.warn("  ! PXL.production.glb missing — compressing the uncorrected " +
               "master. Run `npm run pxl:blender` first.");
}
const OUT = path.join(ROOT, "public", "models", "PXL.glb");

/**
 * Simplification tolerance, in **metres**.
 *
 * 4 mm on a 5.25 m hull: under a thousandth of LOA, and well below the
 * smallest feature the design actually has — the gunwale capping is 40 mm
 * across. Raising this is the wrong dial to reach for if the file is too big.
 * The geometry is already close to its irreducible silhouette and the next win
 * is in what the *scene* draws, not in the model.
 *
 * Note that meshoptimizer's own `target_error` is a fraction of each mesh's
 * extent, not a distance, so the budget is converted per mesh below. Passing
 * this number straight through would give the 5.25 m hull a 21 mm tolerance
 * and the 0.37 m steering wheel a 1.5 mm one — the two surfaces where those
 * are respectively far too loose and needlessly tight.
 */
const MAX_ERROR_M = 0.004;

/**
 * Tighter budget, for two different reasons that happen to want the same number.
 *
 * REFLECTIVE SURFACES. The topsides, the bottom and the transom are sprayed,
 * clear-coated panels: they are the reason this is a product visualisation and
 * not a diagram, and they are the place where a millimetre of surface error is
 * cheaper than the reflection it disturbs.
 *
 * SMALL AUTHORED PARTS. §32 of the 4.3 brief lists what optimisation may not
 * damage — silhouette, cushion shapes, console, plexi, rails, design edges —
 * and every one of those is now a part measuring tens of millimetres in at
 * least one direction. At the general 4 mm budget a quadric collapse eats them,
 * because losing a 27 mm tube or a 22 mm cushion fillet costs almost nothing in
 * position and everything in what the boat looks like. The 30 mm coaming inlay
 * was the first casualty of exactly this, in Phase 4.2.
 *
 * It is not "protect everything": the hull's two big shells still carry 11,000
 * faces apiece into the collapse and come out at a fifth of that.
 */
const TIGHT_ERROR_M = 0.0012;
const TIGHT = new Set([
  "hull_primary", "hull_lower", "hull_accent", "transom_black",
  "motor",
  "coaming_inlay", "bow_fitting",
  /* Phase 4.3 — the authored upper boat, all of it. */
  "upholstery_primary", "console_body", "console_detail", "windshield",
  "helm_wheel", "rails",
  /* 4.9 — the driver's squab, which is upholstery that happens to be a lid and
     takes upholstery's budget for the same reason: it is a 75 mm section with a
     22 mm edge radius, and the general 4 mm allowance ate the radius and 69% of
     the triangles at a measured 3.84 mm. The three forward squabs joined it
     when they became lids too — the general budget took 89% of the side runs. */
  "seat_lid", "cushion_lid_starboard", "cushion_lid_port", "cushion_lid_nose",
  /* PHASE 4.4. The capping is a 46 mm section on a 5.25 m sweep and the whole
     point of it is that its top surface has width and its edges are chamfered
     — a general-budget collapse would spend the 4 mm it is allowed on exactly
     those chamfers and hand back the thin edge §4 exists to remove. The
     platform's teak is laid in 92 mm planks with 8 mm seams between them,
     which is under the general budget by an order of magnitude. */
  "gunwale_capping", "platform_frame", "platform_deck",
  /* PHASE 4.7.2 REBUILT THE INTERIOR AND PUT THESE TWO BACK IN REACH OF THE
     COLLAPSE. The note that used to stand here said the sole and the liner fell
     under MIN_TRIANGLES and were therefore never touched; that stopped being
     true when the one-level deck and the wall around it replaced the recovered
     interior, and the sole came into the collapse at 6,791 triangles.

     WHAT THAT COST, and it is the reason the two are named here. The deck is
     one strip of quads spanning the full beam — 1.8 m across and 30 mm apart —
     and a quadric collapse on a strip that thin in one direction and that long
     in the other is free to slide a vertex along the strip for almost no
     measured error. It did: the compressed sole carried a single triangle
     running the whole 4.65 m from the transom to the bow, 18 mm above the deck
     and about 100 mm off the centreline, which drew a hairline down the middle
     of the cockpit floor in every plan and interior view. Nothing was wrong
     with the model — `PXL.production.glb` has no such face — and nothing was
     wrong with the 4 mm budget as a number; it was the wrong budget for a
     surface whose triangles are long. */
  "cockpit_sole", "interior_hard_liner",
]);

/**
 * How much the collapse cares about the normal field relative to position.
 * At 1.0 a degree of curvature is priced about as dearly as a millimetre of
 * displacement on this model, which is roughly the trade a glossy surface
 * actually makes.
 */
const NORMAL_WEIGHT = 1.0;

/** Below this a mesh is left alone; the collapse cannot pay for itself. */
const MIN_TRIANGLES = 400;

const GL = {
  5120: Int8Array, 5121: Uint8Array, 5122: Int16Array,
  5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array,
};
const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

/* ── GLB container ─────────────────────────────────────────────────────────*/

function readGlb(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error("not a GLB");
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < view.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (type === 0x4e4f534a) json = JSON.parse(buffer.subarray(start, start + length).toString("utf8"));
    if (type === 0x004e4942) bin = buffer.subarray(start, start + length);
    offset = start + length + ((4 - (length % 4)) % 4);
  }
  if (!json || !bin) throw new Error("GLB missing a chunk");
  return { json, bin };
}

function writeGlb(json, bin) {
  const jsonBytes = Buffer.from(JSON.stringify(json), "utf8");
  const jsonPad = Buffer.concat([jsonBytes, Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20)]);
  const binPad = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4, 0)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonPad.length + 8 + binPad.length, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonPad.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binPad.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, jsonPad, binHeader, binPad]);
}

/* ── Accessor access ───────────────────────────────────────────────────────*/

function readAccessor(json, bin, index) {
  const accessor = json.accessors[index];
  const view = json.bufferViews[accessor.bufferView];
  const Type = GL[accessor.componentType];
  const size = COMPONENTS[accessor.type];
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride;
  const out = new Type(accessor.count * size);
  if (!stride || stride === Type.BYTES_PER_ELEMENT * size) {
    out.set(new Type(bin.buffer, bin.byteOffset + offset, accessor.count * size));
  } else {
    for (let i = 0; i < accessor.count; i++) {
      out.set(new Type(bin.buffer, bin.byteOffset + offset + i * stride, size), i * size);
    }
  }
  return out;
}

/* ── Main ──────────────────────────────────────────────────────────────────*/

const source = await readFile(SOURCE);
const { json, bin } = readGlb(source);

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
// `simplifyWithAttributes` is behind meshoptimizer's experimental flag and its
// signature may change on a major bump. It is worth the opt-in — see the note
// on normals above — but not worth a broken build, so the call below falls
// back to the stable position-only simplifier if it ever stops matching.
MeshoptSimplifier.useExperimentalFeatures = true;

const chunks = [];
let cursor = 0;
const bufferViews = [];
const accessors = [];

/** Append a stream to the new buffer, meshopt-encoded. */
function encode(bytes, mode, count, stride, filter) {
  const encoded = mode === "TRIANGLES"
    ? MeshoptEncoder.encodeIndexBuffer(bytes, count, stride)
    : MeshoptEncoder.encodeVertexBuffer(bytes, count, stride);
  while (cursor % 4) {
    chunks.push(Buffer.alloc(1));
    cursor += 1;
  }
  const offset = cursor;
  chunks.push(Buffer.from(encoded));
  cursor += encoded.byteLength;
  const view = {
    buffer: 0,
    byteOffset: offset,
    byteLength: encoded.byteLength,
    extensions: {
      EXT_meshopt_compression: {
        buffer: 0,
        byteOffset: offset,
        byteLength: encoded.byteLength,
        byteStride: stride,
        count,
        mode,
      },
    },
  };
  if (mode === "ATTRIBUTES") view.byteStride = stride;
  if (filter) view.extensions.EXT_meshopt_compression.filter = filter;
  bufferViews.push(view);
  return bufferViews.length - 1;
}

const report = [];
let beforeTris = 0;
let afterTris = 0;

for (const mesh of json.meshes) {
  for (const primitive of mesh.primitives) {
    const position = readAccessor(json, bin, primitive.attributes.POSITION);
    const normal = readAccessor(json, bin, primitive.attributes.NORMAL);
    let indices = Uint32Array.from(readAccessor(json, bin, primitive.indices));
    const vertexCount = position.length / 3;
    const before = indices.length / 3;
    beforeTris += before;

    // meshoptimizer measures error against the mesh's own extent, so convert
    // the metre budget into this mesh's units before asking.
    let extent = 0;
    for (let a = 0; a < 3; a++) {
      let lo = Infinity, hi = -Infinity;
      for (let i = a; i < position.length; i += 3) {
        if (position[i] < lo) lo = position[i];
        if (position[i] > hi) hi = position[i];
      }
      extent = Math.max(extent, hi - lo);
    }

    const budget = TIGHT.has(mesh.name) ? TIGHT_ERROR_M : MAX_ERROR_M;
    let achieved = 0;
    if (before >= MIN_TRIANGLES && extent > 0) {
      const target = budget / extent;
      let result;
      try {
        result = MeshoptSimplifier.simplifyWithAttributes(
          indices, position, 3,
          normal, 3,
          [NORMAL_WEIGHT, NORMAL_WEIGHT, NORMAL_WEIGHT],
          null,
          3,                                // no count target: the error rules
          target,
          ["LockBorder"],
        );
      } catch (error) {
        console.warn(`  ! attribute-aware simplify unavailable (${error.message}); ` +
                     "falling back to position-only");
        result = MeshoptSimplifier.simplify(indices, position, 3, 3, target, ["LockBorder"]);
      }
      indices = result[0];
      achieved = result[1] * extent;
    }
    const after = indices.length / 3;
    afterTris += after;

    // Drop vertices the collapse orphaned, then order for the GPU's caches.
    const remap = MeshoptEncoder.reorderMesh(indices, true, true);
    const kept = remap[1];
    const order = remap[0];
    const newPosition = new Float32Array(kept * 3);
    const newNormal = new Float32Array(kept * 3);
    for (let i = 0; i < vertexCount; i++) {
      const target = order[i];
      if (target === 0xffffffff || target >= kept) continue;
      newPosition.set(position.subarray(i * 3, i * 3 + 3), target * 3);
      newNormal.set(normal.subarray(i * 3, i * 3 + 3), target * 3);
    }

    const wide = kept > 65535;
    const indexBytes = wide
      ? new Uint8Array(Uint32Array.from(indices).buffer)
      : new Uint8Array(Uint16Array.from(indices).buffer);

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < kept; i++) {
      for (let a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], newPosition[i * 3 + a]);
        max[a] = Math.max(max[a], newPosition[i * 3 + a]);
      }
    }

    const positionView = encode(new Uint8Array(newPosition.buffer), "ATTRIBUTES", kept, 12);
    accessors.push({ bufferView: positionView, componentType: 5126, count: kept, type: "VEC3", min, max });
    primitive.attributes.POSITION = accessors.length - 1;

    const normalView = encode(new Uint8Array(newNormal.buffer), "ATTRIBUTES", kept, 12);
    accessors.push({ bufferView: normalView, componentType: 5126, count: kept, type: "VEC3" });
    primitive.attributes.NORMAL = accessors.length - 1;

    const indexView = encode(indexBytes, "TRIANGLES", indices.length, wide ? 4 : 2);
    accessors.push({
      bufferView: indexView,
      componentType: wide ? 5125 : 5123,
      count: indices.length,
      type: "SCALAR",
    });
    primitive.indices = accessors.length - 1;

    report.push({ mesh: mesh.name, before, after, vertices: kept, achieved });
  }
}

const binary = Buffer.concat(chunks);
json.bufferViews = bufferViews;
json.accessors = accessors;
json.buffers = [{ byteLength: binary.length }];
json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), "EXT_meshopt_compression"])];
json.extensionsRequired = [...new Set([...(json.extensionsRequired ?? []), "EXT_meshopt_compression"])];
json.asset.extras = {
  ...json.asset.extras,
  optimisation: { simplifyErrorM: MAX_ERROR_M, encoder: "EXT_meshopt_compression" },
};

await mkdir(path.dirname(OUT), { recursive: true });
const out = writeGlb(json, binary);
await writeFile(OUT, out);

const pad = (s, n) => String(s).padEnd(n);
console.log(`  ${pad("mesh", 26)}${"tris in".padStart(9)}${"tris out".padStart(10)}${"verts".padStart(9)}${"error".padStart(9)}`);
for (const row of report) {
  const drop = row.before ? `  −${Math.round((1 - row.after / row.before) * 100)}%` : "";
  const err = row.achieved ? `${(row.achieved * 1000).toFixed(2)} mm` : "—";
  console.log(`  ${pad(row.mesh, 26)}${String(row.before).padStart(9)}${String(row.after).padStart(10)}${String(row.vertices).padStart(9)}${err.padStart(9)}${drop}`);
}
console.log(`  ${pad("TOTAL", 26)}${String(beforeTris).padStart(9)}${String(afterTris).padStart(10)}`);
console.log(
  `\n  ${path.relative(ROOT, SOURCE)}  ${(source.length / 1e6).toFixed(2)} MB` +
  `\n  ${path.relative(ROOT, OUT)}  ${(out.length / 1e6).toFixed(2)} MB` +
  `  (${Math.round((1 - out.length / source.length) * 100)}% smaller, ` +
  `${Math.round((1 - afterTris / beforeTris) * 100)}% fewer triangles)`,
);
