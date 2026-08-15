/**
 * PXL — THE UPHOLSTERY TOPOLOGY PROOF.  PHASE 4.7, §19.
 *
 *     node scripts/pxl/upholstery-qa.mjs
 *     npm run upholstery
 *
 * §19 asks for a debug render in which the port cushion is RED, the starboard
 * cushion is BLUE, the seam is a thin dark line and everything else is neutral
 * grey — "this debug image should immediately prove that there are only TWO
 * main upholstered pieces".
 *
 * ── WHY THE COLOURS ARE NOT ASSIGNED BY SIDE ──────────────────────────────
 *
 * Colouring by the sign of y would prove nothing. The two cushions are built
 * as mirror images, so a picture that says "the +y triangles are blue" is a
 * picture of its own rule; it would look exactly the same if the forward
 * padding were one piece spanning the boat, or five.
 *
 * So the pieces are found rather than declared. The exported
 * `upholstery_primary` mesh is welded by position, its triangles forward of
 * the bench are walked as a graph, and each CONNECTED COMPONENT gets a colour.
 * Two components is a pass. Three is a fail, and it draws in magenta — a
 * colour that is in this file for no other reason than to be impossible to
 * miss in a picture nobody is reading carefully.
 *
 * The seam needs no colour of its own. It is a 16 mm gap: what shows through
 * it is the sole underneath, which is grey here and graphite on the boat, and
 * that is what §6 means by a joining line rather than a groove.
 *
 * ── WHY IT RASTERISES ITSELF ──────────────────────────────────────────────
 *
 * Every other render in this project comes out of the browser, through
 * `window.__pxlQa.capture()`, because the browser is where the product is. This
 * one cannot: the two cushions are one mesh with one material by the time they
 * reach the GLB, and giving them separate materials for the sake of a debug
 * view would mean shipping a division the boat does not have. A z-buffered
 * software rasteriser over the same GLB the site loads costs about 200 lines
 * and answers the question without changing the asset to suit the question.
 *
 * Not a preview of the product. Flat Lambert shading, no environment, no
 * materials — form and topology only.
 */

import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const QA = path.join(ROOT, ".qa");
const MODEL = path.join(ROOT, "assets", "derived", "pxl", "PXL.production.glb");

/** Where the forward padded run starts — `SPEC.forward_pad_x[0]`, less a
 *  margin. Abaft it are the bench and its backrest, which are not part of the
 *  question §19 asks and are drawn grey with everything else. */
const FORWARD_X = -0.90;

/* ── Loading ──────────────────────────────────────────────────────────────*/

const bytes = await readFile(MODEL);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
gltf.scene.updateWorldMatrix(true, true);

/** glTF is y-up and z-aft; the whole project measures in x-fore, y-lateral,
 *  z-up, and every number in the reports is in those axes. */
const toModel = (v) => new THREE.Vector3(v.x, -v.z, v.y);

/** Triangles by mesh name, in model axes. */
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

/* ── Finding the pieces ───────────────────────────────────────────────────*/

/**
 * Connected components of a triangle soup, welded by position.
 *
 * BY POSITION, NOT BY INDEX, and it matters: the exported GLB is a
 * meshoptimised, quantised buffer and the two cushions were joined into one
 * `upholstery_primary` object in Blender, so index adjacency says nothing
 * about whether two triangles are the same piece of furniture. Quantising to
 * 0.1 mm is well inside the export's own 1.2 mm quantisation and well outside
 * any real gap: the narrowest one on this boat is the 16 mm seam.
 */
function components(tris) {
  const key = (v) => `${Math.round(v.x * 1e4)},${Math.round(v.y * 1e4)},${Math.round(v.z * 1e4)}`;
  const at = new Map();
  tris.forEach((t, i) => {
    for (const v of t) {
      const k = key(v);
      if (!at.has(k)) at.set(k, []);
      at.get(k).push(i);
    }
  });
  const seen = new Array(tris.length).fill(false);
  const out = [];
  for (let i = 0; i < tris.length; i += 1) {
    if (seen[i]) continue;
    const group = [];
    const stack = [i];
    seen[i] = true;
    while (stack.length) {
      const j = stack.pop();
      group.push(j);
      for (const v of tris[j]) {
        for (const n of at.get(key(v))) {
          if (!seen[n]) { seen[n] = true; stack.push(n); }
        }
      }
    }
    out.push(group);
  }
  return out;
}

/* THE UPHOLSTERY IS FIVE MESHES FROM 4.9, NOT ONE, and the check is the same
   check. Four of the cushions became lids over the lockers under them, so they
   are nodes of their own now — but what §19 asks is a question about SHAPE, not
   about export topology: is the forward padding three separate upholstered
   elements, or one sweep that crosses the boat? Walking the union answers that
   the same way it always did, and it still catches a piece that has come apart
   inside itself, which the node split does not make impossible. */
const UPHOLSTERY_ZONES = [
  "upholstery_primary", "seat_lid",
  "cushion_lid_starboard", "cushion_lid_port", "cushion_lid_nose",
];
const upholstery = UPHOLSTERY_ZONES.flatMap((zone) => meshes.get(zone) ?? []);
const forward = [];
const aft = [];
for (const t of upholstery) {
  ((t[0].x + t[1].x + t[2].x) / 3 >= FORWARD_X ? forward : aft).push(t);
}

const pieces = components(forward)
  .map((group) => {
    const box = new THREE.Box3();
    let area = 0, cy = 0;
    for (const i of group) {
      const [a, b, c] = forward[i];
      box.expandByPoint(a); box.expandByPoint(b); box.expandByPoint(c);
      const w = new THREE.Vector3().subVectors(b, a)
        .cross(new THREE.Vector3().subVectors(c, a)).length() / 2;
      area += w;
      cy += w * (a.y + b.y + c.y) / 3;
    }
    return { group, box, area, y: cy / Math.max(area, 1e-9) };
  })
  .sort((p, q) => q.area - p.area);

const f = (v) => v.toFixed(3).padStart(7);
console.log(`\n  PXL — FORWARD UPHOLSTERY TOPOLOGY   §19\n`);
console.log(`  ${forward.length} triangles forward of x ${FORWARD_X.toFixed(2)}, `
  + `${aft.length} abaft it (bench and backrest)\n`);
console.log("  piece  side       tris    area          x range            "
  + "y range            z range");
for (const [i, p] of pieces.entries()) {
  const side = p.y < 0 ? "PORT " : "STBD ";
  console.log(`  ${String(i + 1).padStart(5)}  ${side} ${String(p.group.length).padStart(6)}`
    + `  ${p.area.toFixed(3).padStart(6)} m²  ${f(p.box.min.x)}..${f(p.box.max.x)}`
    + `  ${f(p.box.min.y)}..${f(p.box.max.y)}  ${f(p.box.min.z)}..${f(p.box.max.z)}`);
}

/* ── The symmetry check §14 asks for ──────────────────────────────────────*/

let symmetry = null;
if (pieces.length === 2) {
  const [a, b] = pieces[0].y < 0 ? [pieces[0], pieces[1]] : [pieces[1], pieces[0]];
  symmetry = {
    area: Math.abs(a.area - b.area),
    x0: Math.abs(a.box.min.x - b.box.min.x),
    x1: Math.abs(a.box.max.x - b.box.max.x),
    z0: Math.abs(a.box.min.z - b.box.min.z),
    z1: Math.abs(a.box.max.z - b.box.max.z),
    /* The two inboard edges, which is where §6's seam is. */
    seam: Math.abs(a.box.max.y) + Math.abs(b.box.min.y),
    beam: Math.abs(Math.abs(a.box.min.y) - Math.abs(b.box.max.y)),
  };
  console.log(`\n  MIRROR  area Δ ${symmetry.area * 1e4 < 1 ? "0" : (symmetry.area).toFixed(5)} m²`
    + `  ·  x ends Δ ${(symmetry.x0 * 1000).toFixed(1)} / ${(symmetry.x1 * 1000).toFixed(1)} mm`
    + `  ·  z ends Δ ${(symmetry.z0 * 1000).toFixed(1)} / ${(symmetry.z1 * 1000).toFixed(1)} mm`
    + `  ·  outboard Δ ${(symmetry.beam * 1000).toFixed(1)} mm`);
  console.log(`  SEAM    ${(symmetry.seam * 1000).toFixed(1)} mm between the two inboard faces`);
}

/* THREE, NOT TWO, SINCE THE DESIGN'S OWN SEAMS WENT IN. The drawing has a run
   down each side and one panel across the nose, with a construction seam at
   each of the two joints and nothing on the centreline — so the count the
   picture asks for is three, and an earlier phase's "exactly 2" was counting
   the centre seam that the drawing does not have. */
const verdict = pieces.length === 3 ? "PASS" : "FAIL";
console.log(`\n  ${verdict}: ${pieces.length} connected forward upholstered `
  + `element${pieces.length === 1 ? "" : "s"}; two side runs and the panel in `
  + `the middle of the bow\n`);

/* ── A z-buffered software rasteriser ─────────────────────────────────────*/

/* §26's palette. The floor and the liner are told apart from each other and
   from the hull, because the question the picture answers is not only "how
   many cushions" but "how much of the interior is floor" — and a single
   neutral grey for everything hard would answer the first and hide the
   second. */
const GREY = [0.55, 0.56, 0.57];        // hull, capping, console, everything else
const LINER = [0.95, 0.95, 0.95];       // hard inner liner — white, §23
const FLOOR = [0.030, 0.032, 0.034];    // cockpit sole — black, §23
const RED = [0.86, 0.16, 0.14];         // port forward cushion
const BLUE = [0.13, 0.36, 0.86];        // starboard forward cushion
const YELLOW = [0.95, 0.78, 0.12];      // rear seating, a separate system
const EXTRA = [0.92, 0.10, 0.86];       // a third piece, if one ever appears
const BACK = [0.10, 0.11, 0.12];

/**
 * §21's CLAY PALETTE. All geometry one light grey, the cockpit sole one dark
 * grey, and nothing else.
 *
 * "Do not create the illusion of open floor merely by painting wrong geometry
 * black. Geometry silhouette must be correct first." A picture with five
 * colours in it can hide a shape; a picture with two cannot. If a long raised
 * strip is still standing beside the cockpit, this is where it shows.
 */
const CLAY = [0.72, 0.72, 0.72];
const CLAY_FLOOR = [0.115, 0.118, 0.122];

/** Every triangle in the scene, with the colour §19 assigns it. */
function scene(clay = false) {
  const out = [];
  for (const [name, tris] of meshes) {
    if (UPHOLSTERY_ZONES.includes(name)) continue;
    /* The optional equipment is not part of the boat as configured by default,
       and a cockpit cover over the cushions would defeat the whole picture. */
    if (name.startsWith("accessory_") || name.startsWith("platform_")
      || name === "motor" || name === "motor_trim") continue;
    const c = clay
      ? (name === "cockpit_sole" ? CLAY_FLOOR : CLAY)
      : name === "cockpit_sole" ? FLOOR
        : name === "interior_hard_liner" ? LINER : GREY;
    for (const t of tris) out.push({ t, c });
  }
  /* §18, §26 — the rear seating is its own system and draws as one. It is not
     connected to either forward cushion and the picture has to be able to say
     so, which a shared grey cannot. */
  for (const t of aft) out.push({ t, c: clay ? CLAY : YELLOW, soft: true });
  pieces.forEach((p, i) => {
    /* Ranked by area, so the two side runs take red and blue and the nose
       panel green — three colours because there are three panels. */
    const c = clay ? CLAY : ([RED, BLUE, [0.20, 0.72, 0.32]][i] ?? EXTRA);
    for (const j of p.group) out.push({ t: forward[j], c, soft: true });
  });
  return out;
}

let TRIS = scene();

/**
 * Draw one view.
 *
 * `eye`/`target` in model axes. `ortho` gives the plan its parallel projection,
 * which is what makes the two cushions measurable against each other rather
 * than one of them merely nearer the camera.
 */
function render(view, width, height, ss = 2) {
  const W = width * ss, H = height * ss;
  const colour = new Float32Array(W * H * 3);
  const depth = new Float32Array(W * H).fill(Infinity);
  for (let i = 0; i < W * H; i += 1) {
    colour[i * 3] = BACK[0]; colour[i * 3 + 1] = BACK[1]; colour[i * 3 + 2] = BACK[2];
  }

  const eye = new THREE.Vector3(...view.eye);
  const target = new THREE.Vector3(...view.target);
  const fwd = new THREE.Vector3().subVectors(target, eye).normalize();
  /* `up0` is the world direction that is to point UP in the picture. It is z
     for every camera that stands on the water and has to be given explicitly
     for the plan, where the view direction and world up are the same line and
     the cross product below is zero. */
  const up0 = new THREE.Vector3(...(view.up ?? [0, 0, 1])).normalize();
  /* right = up × forward, NOT forward × up. In this project's axes — x fore,
     y to starboard, z up — a camera looking at the bow has starboard on its
     right, and only one of the two orders gives that. The other mirrors every
     frame, which on a symmetrical boat is invisible until it is not. */
  const right = new THREE.Vector3().crossVectors(up0, fwd).normalize();
  const up = new THREE.Vector3().crossVectors(fwd, right).normalize();

  const aspect = W / H;
  const tan = Math.tan(((view.fov ?? 32) * Math.PI) / 360);
  const light = new THREE.Vector3(0.42, -0.55, 0.72).normalize();

  const project = (p) => {
    const d = new THREE.Vector3().subVectors(p, eye);
    const z = d.dot(fwd);
    const u = d.dot(right), v = d.dot(up);
    if (view.ortho) {
      const s = view.ortho;
      return [(u / (s * aspect) * 0.5 + 0.5) * W, (0.5 - v / s * 0.5) * H, z];
    }
    if (z <= 1e-4) return null;
    return [(u / (z * tan * aspect) * 0.5 + 0.5) * W, (0.5 - v / (z * tan) * 0.5) * H, z];
  };

  for (const { t, c, soft } of TRIS) {
    if (view.only === "upholstery" && !soft) continue;
    const p = t.map(project);
    if (p.some((q) => q === null)) continue;
    const n = new THREE.Vector3()
      .subVectors(t[1], t[0])
      .cross(new THREE.Vector3().subVectors(t[2], t[0]));
    if (n.lengthSq() < 1e-18) continue;
    n.normalize();
    /* Two-sided: the interior is an open shell and half of it faces away. */
    const lam = Math.abs(n.dot(light));
    const shade = 0.30 + 0.70 * lam;

    const minX = Math.max(0, Math.floor(Math.min(p[0][0], p[1][0], p[2][0])));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(p[0][0], p[1][0], p[2][0])));
    const minY = Math.max(0, Math.floor(Math.min(p[0][1], p[1][1], p[2][1])));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(p[0][1], p[1][1], p[2][1])));
    if (minX > maxX || minY > maxY) continue;

    const d = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1])
      - (p[2][0] - p[0][0]) * (p[1][1] - p[0][1]);
    if (Math.abs(d) < 1e-9) continue;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const px = x + 0.5, py = y + 0.5;
        const w1 = ((px - p[0][0]) * (p[2][1] - p[0][1])
          - (p[2][0] - p[0][0]) * (py - p[0][1])) / d;
        const w2 = ((p[1][0] - p[0][0]) * (py - p[0][1])
          - (px - p[0][0]) * (p[1][1] - p[0][1])) / d;
        if (w1 < 0 || w2 < 0 || w1 + w2 > 1) continue;
        const z = p[0][2] + w1 * (p[1][2] - p[0][2]) + w2 * (p[2][2] - p[0][2]);
        const i = y * W + x;
        if (z >= depth[i]) continue;
        depth[i] = z;
        colour[i * 3] = c[0] * shade;
        colour[i * 3 + 1] = c[1] * shade;
        colour[i * 3 + 2] = c[2] * shade;
      }
    }
  }

  if (view.guide && GUIDE_Z) {
    /* Where the guide's own height projects, at the centreline. */
    const p = project(new THREE.Vector3(0, 0, GUIDE_Z));
    if (p) {
      const y = Math.round(p[1]);
      for (let x = 0; x < W; x += 1) {
        for (const dy of [-1, 0, 1]) {
          const i = (y + dy) * W + x;
          if (i < 0 || i >= W * H) continue;
          if ((x >> 3) % 2 === 0) continue;         // dashed
          colour[i * 3] = 1.0; colour[i * 3 + 1] = 0.25; colour[i * 3 + 2] = 0.1;
        }
      }
    }
  }

  const px = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H * 3; i += 1) {
    px[i] = Math.round(Math.min(1, Math.max(0, colour[i] ** (1 / 2.2))) * 255);
  }
  return sharp(px, { raw: { width: W, height: H, channels: 3 } })
    .resize(width, height, { kernel: "lanczos3" });
}

/* ── The three views §20 asks the comparison to be made across ────────────*/

/**
 * §9 OF THE HEIGHT BRIEF — the horizontal guide.
 *
 * "Draw a horizontal guide through the cushion top. Verify that the cushion
 * top does not climb significantly toward the bow." The line is drawn at the
 * cushions' own measured maximum z, so it is a readout rather than a
 * decoration: if the top climbs, the line touches it at one station and the
 * rest falls away below.
 */
const GUIDE_Z = pieces.length
  ? Math.max(...pieces.flatMap((p) => p.group.map((j) =>
    Math.max(forward[j][0].z, forward[j][1].z, forward[j][2].z))))
  : 0;

const VIEWS = [
  {
    name: "p472-debug-top",
    /* Straight down, parallel, bow to the right and port at the top — the
       orientation of §3's plan diagram. §17's acceptance view. */
    eye: [0.10, 0.0, 14.0], target: [0.10, 0.0, 0.60], up: [0, -1, 0],
    /* `ortho` is a HALF-height in metres: 1.28 frames a 1.95 m beam with a
       hand's width either side, and at 2.58:1 that is 6.6 m of length — the
       5.25 m hull plus the moulding that carries aft of the transom. */
    ortho: 1.28, width: 1700, height: 660,
  },
  {
    name: "p472-debug-cockpit3q",
    /* From abaft and above the port quarter, which is the delivered cockpit
       three-quarter's own side. §18. */
    eye: [-4.20, -3.30, 3.30], target: [0.75, 0.0, 0.50], fov: 34,
    width: 1400, height: 900,
  },
  {
    name: "p472-debug-side",
    /* Straight abeam, parallel, and THE UPHOLSTERY ALONE.
       §7 of the height brief wants the cushion top read as a line, and from
       outside a boat you cannot see inside it — a side view of the whole
       model is a picture of the topsides. So the hull is dropped and what is
       left is the two cushions, the rear seat and a dashed guide at the
       cushions' own measured maximum height. If the top climbs, the guide
       touches it at one station and the rest falls away. */
    eye: [1.00, -16.0, 0.60], target: [1.00, 0.0, 0.60], up: [0, 0, 1],
    ortho: 0.43, width: 1700, height: 560, guide: true, only: "upholstery",
  },
  {
    name: "p472-debug-bow",
    /* Close over the meeting point, looking aft along the centreline: the one
       camera from which a third element could not hide behind either of the
       two that are meant to be there. */
    eye: [4.30, -0.55, 1.85], target: [1.60, 0.0, 0.66], fov: 38,
    width: 1400, height: 900,
  },
];

await mkdir(QA, { recursive: true });
for (const [suffix, clay] of [["debug", false], ["clay", true]]) {
  TRIS = scene(clay);
  for (const v of VIEWS) {
    const name = v.name.replace("-debug-", `-${suffix}-`);
    const file = path.join(QA, `${name}.png`);
    await render(v, v.width, v.height).png().toFile(file);
    console.log(`  ${path.relative(ROOT, file)}`);
  }
}
console.log(`\n  cushion top, measured        z ${GUIDE_Z.toFixed(4)}`);
const lows = pieces.flatMap((p) => p.group.map((j) =>
  Math.min(forward[j][0].z, forward[j][1].z, forward[j][2].z)));
console.log(`  cushion base, measured       z ${Math.min(...lows).toFixed(4)}`);
console.log(`  top at the aft end / the bow ${
  (() => {
    const at = (lo, hi) => {
      const zs = [];
      for (const p of pieces) {
        for (const j of p.group) {
          const t = forward[j];
          const cx = (t[0].x + t[1].x + t[2].x) / 3;
          if (cx >= lo && cx < hi) zs.push(Math.max(t[0].z, t[1].z, t[2].z));
        }
      }
      return zs.length ? Math.max(...zs) : NaN;
    };
    return `${at(0.0, 0.2).toFixed(4)} / ${at(1.85, 2.10).toFixed(4)}  `
      + `— a rise of ${((at(1.85, 2.10) - at(0.0, 0.2)) * 1000).toFixed(1)} mm`;
  })()
}\n`);

process.exitCode = pieces.length === 3 ? 0 : 1;
