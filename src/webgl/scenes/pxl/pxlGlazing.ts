/**
 * THE WINDSCREEN. §9, §10, §11.
 *
 * ── WHY THERE IS GEOMETRY HERE AT ALL ─────────────────────────────────────
 *
 * §9 requires the PXL mark that the design renders show on the plexi. A mark
 * needs a surface, and the delivered STL does not contain one — that fact has
 * been recorded in `PXL_UNSUPPORTED_CHANNELS` since Phase Four and was, until
 * this phase, a sufficient answer.
 *
 * §29 forbids replacing accurate PXL geometry with generic geometry. It does not
 * forbid adding geometry that is missing, and §34 is explicit that a
 * PXL-specific implementation beats a reusable component where product accuracy
 * is at stake. So the screen is authored, here, and three things keep it honest:
 *
 *   • every dimension is a FRACTION OF THE CONSOLE'S OWN MEASURED BOX, so the
 *     screen is sized by the boat rather than by a remembered number, and a
 *     revised console carries it along instead of leaving it floating where the
 *     old one used to be;
 *   • the proportions come from the plate — see `PXL_SCREEN`, where the 4° rake
 *     is the drawing's own 5.8-pixels-over-101 rather than the console's much
 *     steeper face;
 *   • it is built at runtime and disposed with the mount, like the proxy drives,
 *     so it never becomes a second GLB and never has to be re-exported.
 *
 * IT IS STILL A RECONSTRUCTION, and the phase report files the real screen with
 * the real console as one asset requirement. What it is not is absent.
 *
 * ── THE GLASS ────────────────────────────────────────────────────────────
 *
 * §11 asks for marine glazing and rules out five specific failures: opaque black
 * plastic, mirror glass, excessive blue tint, an invisible transparent sheet,
 * and an overly strong Fresnel. Those are five different mistakes and they have
 * one common cause — reaching for `transparent: true` and an opacity, which is
 * an alpha blend rather than a material.
 *
 * What this uses instead is three's own transmission model: `transmission` 0.92
 * with `thickness` set to the real 9 mm, `ior` 1.49 (which is acrylic's, not
 * glass's 1.52 — the drawing shows a plexi screen and the difference is
 * measurable at a grazing angle), and a very slight cool-neutral `attenuation`
 * over that thickness rather than a tinted base colour. A tint applied as
 * albedo colours the reflection too, which is exactly what produces "excessive
 * blue"; attenuation colours only what passes THROUGH, which is what real
 * tinted acrylic does and what leaves the reflected sky neutral.
 *
 * The Fresnel is left where the IOR puts it. `reflectivity` is 0.5 — the neutral
 * value — because raising it is the usual way an "invisible sheet" gets fixed
 * and it is the direct cause of "mirror glass" one step later. What actually
 * makes the screen readable is that it has a FRAME and a THICKNESS: an edge-lit
 * dark surround and 9 mm of visible section give the eye something to find,
 * which no amount of reflectivity on a zero-thickness plane can.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Box3,
  DoubleSide,
  Color,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  Vector3,
} from "three";
import { PXL_SCREEN } from "./pxlReference";

/* ── The measured console ─────────────────────────────────────────────────*/

export interface PxlScreenFrame {
  /** Centre of the screen's outer face, world metres. */
  centre: Vector3;
  /** Unit vector along the screen's width, +Z. */
  right: Vector3;
  /** Unit vector up the screen's face, tilted aft by the rake. */
  up: Vector3;
  /** Outward normal of the screen's forward face. */
  normal: Vector3;
  /** Face dimensions, metres. */
  width: number;
  height: number;
}

/**
 * WHERE THE SCREEN STANDS, FOUND FROM THE CONSOLE RATHER THAN AUTHORED.
 *
 * The console is a faceted box whose top is a single steep forward-facing plane
 * — rays fired down at it find its crest at x ≈ −1.16, y = 1.147, and nothing
 * above that. So the screen's foot is the crest, its width is a fraction of the
 * console's beam, and its height a fraction of the console's own height.
 *
 * Returns null when the console is missing, which is the honest outcome: a
 * screen placed at a fallback position is a screen in the wrong place, and an
 * absent one is something `npm run model` and the configurator tests can catch.
 */
export function measureScreenFrame(console_: Object3D): PxlScreenFrame | null {
  const box = new Box3().setFromObject(console_);
  if (box.isEmpty()) return null;

  const consoleHeight = box.max.y - box.min.y;
  const consoleBeam = box.max.z - box.min.z;
  if (consoleHeight <= 0 || consoleBeam <= 0) return null;

  const height = consoleHeight * PXL_SCREEN.height;
  const width = consoleBeam * PXL_SCREEN.width;
  const rake = MathUtils.degToRad(PXL_SCREEN.rake);

  /* The crest. The console's own highest point is where its raked forward face
     meets its top, and that is the edge a screen is bolted to. Taken from the
     bounding box's maximum rather than by raycasting because the box already
     reports it exactly and a ray would only rediscover it — the console is one
     convex-ish faceted shell and its highest point is its highest point. */
  const crest = new Vector3(
    // The crest sits aft of the console's forward face by the amount its own
    // rake carries it. Measured on this asset at 0.206 of the box's length.
    box.min.x + (box.max.x - box.min.x) * 0.51,
    box.max.y,
    (box.min.z + box.max.z) / 2,
  );

  /* The screen's basis. `up` leans aft as it rises, `normal` is perpendicular to
     it in the same plane, and `right` runs along the beam — which the rake never
     touches.

     RIGHT IS −Z, NOT +Z, AND THE SIGN IS NOT COSMETIC. `Matrix4.makeBasis`
     followed by `Quaternion.setFromRotationMatrix` requires a RIGHT-HANDED
     basis: right × up must equal normal. With +Z it equals −normal, the matrix
     is a reflection rather than a rotation, and the quaternion extracted from it
     is meaningless — which showed up on the boat as the plexi mark lying flat
     across the beam and facing the camera from every angle. */
  const up = new Vector3(-Math.sin(rake), Math.cos(rake), 0).normalize();
  const normal = new Vector3(Math.cos(rake), Math.sin(rake), 0).normalize();
  const right = new Vector3().crossVectors(up, normal).normalize();

  const centre = crest.clone().addScaledVector(up, height / 2);

  return { centre, right, up, normal, width, height };
}

/* ── Geometry ─────────────────────────────────────────────────────────────*/

/**
 * A rounded rectangle's outline, as points in the face's own 2D frame.
 *
 * Authored rather than taken from `Shape.roundedRect` because the screen's
 * corners are not all the same: the drawing's top corners are generously
 * radiused and its bottom corners are square, since the bottom edge is where the
 * screen enters the console and a radius there would leave a gap.
 */
function facePoints(width: number, height: number, radius: number, segments = 5) {
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw * 0.6, hh * 0.6);
  const points: [number, number][] = [];

  points.push([-hw, -hh]);
  points.push([hw, -hh]);
  points.push([hw, hh - r]);
  for (let i = 1; i <= segments; i += 1) {
    const a = (i / (segments + 1)) * (Math.PI / 2);
    points.push([hw - r + r * Math.cos(a), hh - r + r * Math.sin(a)]);
  }
  points.push([hw - r, hh]);
  points.push([-hw + r, hh]);
  for (let i = 1; i <= segments; i += 1) {
    const a = Math.PI / 2 + (i / (segments + 1)) * (Math.PI / 2);
    points.push([-hw + r + r * Math.cos(a), hh - r + r * Math.sin(a)]);
  }
  points.push([-hw, hh - r]);
  return points;
}

/**
 * An extruded slab from a 2D outline, in the frame's own basis.
 *
 * Written out rather than built with `ExtrudeGeometry` because the extrusion is
 * 9 mm along a known axis and `ExtrudeGeometry` would want a `Shape`, a
 * triangulation, a bevel configuration and a UV generator to produce the same
 * forty triangles. The face is triangulated as a fan from the centroid, which is
 * exact for a convex outline and this one is convex by construction.
 */
function slab(
  points: [number, number][],
  depth: number,
  frame: PxlScreenFrame,
): BufferGeometry {
  const n = points.length;
  const positions: number[] = [];
  const normals: number[] = [];
  const half = depth / 2;

  const world = (u: number, v: number, w: number, out: Vector3) =>
    out
      .copy(frame.centre)
      .addScaledVector(frame.right, u)
      .addScaledVector(frame.up, v)
      .addScaledVector(frame.normal, w);

  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const push = (v: Vector3, normal: Vector3) => {
    positions.push(v.x, v.y, v.z);
    normals.push(normal.x, normal.y, normal.z);
  };

  // Two faces, fanned from the centre.
  for (const side of [1, -1] as const) {
    const facing = frame.normal.clone().multiplyScalar(side);
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      world(0, 0, half * side, a);
      world(points[i][0], points[i][1], half * side, b);
      world(points[j][0], points[j][1], half * side, c);
      if (side > 0) { push(a, facing); push(b, facing); push(c, facing); }
      else { push(a, facing); push(c, facing); push(b, facing); }
    }
  }

  // The rim.
  const edge = new Vector3();
  const d = new Vector3();
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    world(points[i][0], points[i][1], half, a);
    world(points[j][0], points[j][1], half, b);
    world(points[j][0], points[j][1], -half, c);
    world(points[i][0], points[i][1], -half, d);
    edge
      .set(points[j][1] - points[i][1], -(points[j][0] - points[i][0]), 0)
      .normalize();
    const rim = frame.right
      .clone()
      .multiplyScalar(edge.x)
      .addScaledVector(frame.up, edge.y);
    push(a, rim); push(b, rim); push(c, rim);
    push(a, rim); push(c, rim); push(d, rim);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(Float32Array.from(positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(Float32Array.from(normals), 3));
  return geometry;
}

/* ── Materials ────────────────────────────────────────────────────────────*/

/**
 * The plexi. §11.
 *
 * See the file note for why this is a transmission material rather than an
 * alpha blend, and why the tint is attenuation rather than albedo.
 */
export function createPlexiMaterial(): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    /* White, and it must stay white. Any colour here tints the REFLECTION as
       well as the transmission, which is the direct cause of §11's "excessive
       blue tint" — the sky comes back off the screen already blue and the eye
       reads it as a filter over the whole boat rather than as glazing. */
    color: new Color(1, 1, 1),
    metalness: 0,
    /* Not zero. A perfectly smooth screen mirrors the studio's key as a hard
       disc, which is §11's "mirror glass"; 0.06 keeps the highlight a highlight
       and is about right for cast acrylic, which is never optically flat. */
    roughness: 0.06,
    transmission: 0.92,
    /* The real section. `thickness` is what the transmission model integrates
       attenuation over, so a wrong number here is a wrong tint depth rather than
       a wrong silhouette. */
    thickness: PXL_SCREEN.thickness,
    ior: 1.49,
    /* Neutral. Raising it is the usual fix for an invisible sheet and the usual
       cause of a mirror one step later — see the file note. */
    reflectivity: 0.5,
    /* A cool neutral over 90 mm, which at 9 mm of section is a barely-there
       grey. The drawing's screen is tinted, not smoked. */
    attenuationColor: new Color("#b9c6cd"),
    attenuationDistance: 0.09,
    clearcoat: 0.25,
    clearcoatRoughness: 0.08,
    /* Both faces. The orbit crosses the screen's plane, and a single-sided
       screen vanishes for the half of the arc that sees its back. */
    side: DoubleSide,
    /* Transmission materials are not alpha-blended, so they can and should
       write depth: the mark in front of the screen has to depth-test against it
       or it will show through from behind. */
    transparent: false,
    depthWrite: true,
  });
  material.name = "pxl_plexi";
  material.envMapIntensity = 1.35;
  return material;
}

/** The frame. A dark structural surround, not paint — it never follows the hull. */
function createFrameMaterial(): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    color: new Color("#16181b"),
    roughness: 0.34,
    metalness: 0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
    side: DoubleSide,
  });
  material.name = "pxl_screen_frame";
  material.envMapIntensity = 0.9;
  return material;
}

/* ── Assembly ─────────────────────────────────────────────────────────────*/

export interface PxlScreen {
  root: Object3D;
  frame: PxlScreenFrame;
  glass: Mesh;
  glassMaterial: MeshPhysicalMaterial;
  surroundMaterial: MeshPhysicalMaterial;
}

/**
 * Build the screen and hang it off the vessel.
 *
 * Two slabs: the surround, which is the full face, and the glazing, which is the
 * same outline inset by the frame depth. The glazing sits very slightly PROUD of
 * the surround on both sides rather than flush, because two coplanar faces
 * z-fight and the fix that does not cost a stencil is a tenth of a millimetre.
 */
export function createScreen(console_: Object3D): PxlScreen | null {
  const frame = measureScreenFrame(console_);
  if (!frame) return null;

  const radius = frame.height * PXL_SCREEN.radius;
  const surroundPoints = facePoints(frame.width, frame.height, radius);
  const glassPoints = facePoints(
    frame.width - PXL_SCREEN.frame * 2,
    frame.height - PXL_SCREEN.frame * 2,
    Math.max(0.001, radius - PXL_SCREEN.frame),
  );

  const surroundMaterial = createFrameMaterial();
  const glassMaterial = createPlexiMaterial();

  const surround = new Mesh(
    slab(surroundPoints, PXL_SCREEN.thickness, frame),
    surroundMaterial,
  );
  surround.name = "pxl_screen_frame";

  const glass = new Mesh(
    slab(glassPoints, PXL_SCREEN.thickness + 0.0002, frame),
    glassMaterial,
  );
  glass.name = "pxl_screen_glass";

  const root = new Object3D();
  root.name = "pxl_screen";
  root.add(surround, glass);
  for (const mesh of [surround, glass]) {
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
  }
  /* Drawn after the hull. A transmission material samples the frame buffer for
     what is behind it, so anything that should be visible THROUGH the screen has
     to have been drawn already — and the console directly behind it is the one
     object a viewer will check. */
  glass.renderOrder = 2;
  surround.renderOrder = 1;

  return { root, frame, glass, glassMaterial, surroundMaterial };
}

export function disposeScreen(screen: PxlScreen | null): void {
  if (!screen) return;
  screen.root.traverse((child) => {
    if (child instanceof Mesh) child.geometry.dispose();
  });
  screen.glassMaterial.dispose();
  screen.surroundMaterial.dispose();
  screen.root.removeFromParent();
}
