/**
 * PXL — THE THREE MARKS, AS GEOMETRY ON SURFACES.
 *
 * §4, §7, §8, §9 and §30. One module, because the three marks differ only in
 * their artwork, their ink and the surface they are found on — and keeping them
 * together is what makes §30's rule structural rather than aspirational: there
 * is no GLB per finish, no decal texture per hull colour and no duplicated
 * vessel geometry anywhere in here, because everything below builds ONE mesh per
 * mark per side out of authored 2D contours and lays it on whatever surface the
 * ray happens to find.
 *
 * ── THE ARTWORK LIVES ELSEWHERE, AND THAT IS THE POINT ────────────────────
 *
 * `pxlLockup` holds the PXL letterforms; `pxlScript` holds the Duna trace. Both
 * are pure modules that import nothing but each other, which is what lets
 * `npm test` assert their proportions on plain node and lets `npm run trace`
 * render them beside the delivered plates without a browser. This file is the
 * only place that knows three exists, and all it does is turn contours into
 * `Shape`s, find a surface, and build a material.
 *
 * ── WHERE EACH MARK LANDS IS FOUND, NOT ASSUMED ───────────────────────────
 *
 * The obvious implementation is a quad at a hard-coded position and rotation,
 * and it is fragile in a way that will not show up until somebody re-runs the
 * pipeline: the stern moulding is faceted, its port and starboard faces are not
 * mirror images to the millimetre, the capping is a narrow curved section whose
 * rake changes along the hull, and the screen does not exist in the asset at all.
 * A quad placed from a remembered transform ends up half-buried on one side and
 * floating on the other.
 *
 * So a hull mark is placed by raycasting inboard from outside the beam at the
 * authored (x, y), taking the surface point and the face normal, and building
 * the transform from them. The authored numbers say *where on the boat*; the
 * geometry says *where in space*, every time, on whatever model is loaded.
 *
 * The basis handles mirroring for free. `right = up × n` gives +X on the
 * starboard side and −X on the port side, so a mark reads bow-ward to starboard
 * and stern-ward to port — which is the same thing seen from either beam, and is
 * what stops the port-side mark coming out backwards.
 *
 * The plexi mark is the exception and is placed differently on purpose: §9 is
 * explicit that it must not reuse the side mark's transform, and it does not —
 * `pxlGlazing` measures the screen's own basis and the mark is laid in it
 * directly, once, on the centreline.
 */

import {
  DoubleSide,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  Raycaster,
  Shape,
  ShapeGeometry,
  Vector3,
  type Object3D,
} from "three";
import { PXL_MOUNTS } from "./pxlModel";
import { PXL_PLEXI_MARK } from "./pxlReference";
import { pxlLockup, pxlLockupBounds } from "./pxlLockup";
import { dunaBounds, dunaContours } from "./pxlScript";
import type { PxlScreenFrame } from "./pxlGlazing";
import type { PxlDecalInk } from "./pxlBranding";

/* ── Contours to shapes ───────────────────────────────────────────────────*/

/* The ink treatments, the luminance rule and the slot table live in
   `pxlBranding`, which imports nothing but the reference constants. §12's
   contrast threshold is the part worth asserting — a change to either the ink or
   the moulding could quietly put a mark on a ground it cannot be read against —
   and the test harness runs on plain node. Re-exported here so a consumer of the
   branding still has one import. */
export {
  PXL_CENTRELINE_MARKS,
  PXL_DECAL_SLOTS,
  PXL_DECAL_SLOT_BY_ID,
  PXL_INK_DARK,
  PXL_INK_LIGHT,
  PXL_INK_PLEXI,
  PXL_MAX_HULL_MARKS_PER_SIDE,
  groundLuminance,
  inkForGround,
  type PxlDecalGround,
  type PxlDecalInk,
  type PxlDecalSlot,
} from "./pxlBranding";

/** A closed contour as a `Shape`, with no curves in it. */
function contourShape(points: readonly (readonly [number, number])[]): Shape {
  const shape = new Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  return shape;
}

/**
 * The PXL lockup as shapes, centred on its own origin at cap height 1.
 *
 * Counters go on as `holes` rather than as separate shapes, so each glyph is one
 * triangulated surface and the P cannot separate from its own bowl at any
 * distance. `THREE.Shape` does not care about a hole's winding, which is why
 * `pxlLockup` leaves the direction alone and lets each consumer apply its own.
 */
function lockupShapes(): Shape[] {
  return pxlLockup().map((glyph) => {
    const shape = contourShape(chunk(glyph.outline));
    for (const hole of glyph.holes) shape.holes.push(contourShape(chunk(hole)));
    return shape;
  });
}

/** A flat `[x, y, x, y, …]` run as pairs. */
function chunk(flat: readonly number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
  return out;
}

/**
 * The Duna script as shapes.
 *
 * The trace's outlines are separate filled components — the entry flourish, the
 * body, the swash — so they are separate shapes rather than one shape with
 * holes. `ShapeGeometry` triangulates each independently and the result is one
 * geometry, which is what keeps the mark at one draw call.
 */
function scriptShapes(): Shape[] {
  const { outlines, counters } = dunaContours();
  const shapes = outlines.map((c) => contourShape(c));
  /* Counters are attached to the largest outline. There are none today — see
     `dunaContours` for why the plate does not produce any — and when a better
     source does produce them, the largest outline is the D's, which is the only
     component in this mark that has ever had a counter in it. */
  for (const counter of counters) shapes[0]?.holes.push(contourShape(counter));
  return shapes;
}

/**
 * Geometry for a mark, scaled so its overall LENGTH is `length` metres and
 * centred on its own middle.
 *
 * Length rather than height, for both marks, because length is the better
 * measured dimension in both cases: the PXL lockup is 100 plate pixels long and
 * 19 tall, the script 147 and 28. Anchoring on the five-times-better reading and
 * letting the other follow from the artwork's own aspect is what stops a
 * one-pixel error becoming a 5% size error. See `PXL_MOUNTS.pxlMark.length`.
 */
function markGeometry(
  shapes: Shape[],
  bounds: { x0: number; y0: number; x1: number; y1: number },
  length: number,
): ShapeGeometry {
  /* Curve segments: 6. Nothing in either mark is a curve — the lockup is
     straight-edged by construction and the trace is a simplified polyline — so
     this only affects the cost of the triangulation, and the default of 12
     doubles it for no visible change. */
  const geometry = new ShapeGeometry(shapes, 6);
  const width = bounds.x1 - bounds.x0;
  const height = bounds.y1 - bounds.y0;
  const scale = length / width;
  geometry.translate(-(bounds.x0 + width / 2), -(bounds.y0 + height / 2), 0);
  geometry.scale(scale, scale, 1);
  return geometry;
}

/* ── Placement ─────────────────────────────────────────────────────────────*/

export interface PxlDecalPlacement {
  /** Which slot in `PXL_DECAL_SLOTS` this is. */
  slot: string;
  mesh: Mesh;
  material: MeshPhysicalMaterial;
  /**
   * True when the mark's ink follows a configurable ground.
   *
   * False for the plexi mark, whose ground is glazing and whose ink is therefore
   * fixed — so `inkWordmark` can re-ink the hull marks on a finish change and
   * leave the screen alone without knowing which mark is which.
   */
  inkFollowsGround: boolean;
}

const _ray = new Raycaster();
const _origin = new Vector3();
const _direction = new Vector3();
const _normal = new Vector3();
const _right = new Vector3();
const _up = new Vector3();
const _worldUp = new Vector3(0, 1, 0);
const _basis = new Matrix4();

function decalMaterial(ink: PxlDecalInk, name: string): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    color: ink.colour,
    roughness: ink.roughness,
    metalness: ink.metalness,
    clearcoat: ink.clearcoat,
    clearcoatRoughness: 0.14,
    /* Double-sided because a mark is a zero-thickness surface and the orbit can
       bring the camera almost edge-on to the panel it is on, where a one-sided
       quad flickers out of existence for a few degrees. */
    side: DoubleSide,
    /* Belt as well as braces. The stand-off is what actually keeps the mark off
       the surface; the polygon offset covers the grazing angles where a few
       millimetres is less than a depth-buffer step at a 400 m far plane. */
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  material.name = name;
  return material;
}

/**
 * Lay one mark on a target mesh by raycasting for its surface.
 *
 * Returns one placement per side, or an empty array when the ray misses on both
 * — which is the honest outcome for a model whose surfaces have moved: a mark at
 * a fallback position would be a mark in the wrong place, and an absent mark is
 * something `npm run model` and the configurator tests can catch.
 */
function placeOnHull(
  target: Mesh,
  slot: string,
  anchor: { x: number; y: number; rayFrom: number; length: number; standoff: number },
  shapes: Shape[],
  bounds: { x0: number; y0: number; x1: number; y1: number },
  ink: PxlDecalInk,
): PxlDecalPlacement[] {
  const placements: PxlDecalPlacement[] = [];
  target.updateWorldMatrix(true, false);

  for (const side of [1, -1] as const) {
    _origin.set(anchor.x, anchor.y, side * anchor.rayFrom);
    _direction.set(0, 0, -side);
    _ray.set(_origin, _direction);
    _ray.far = anchor.rayFrom * 2;
    const hit = _ray.intersectObject(target, false)[0];
    if (!hit?.face) continue;

    // Object → world for the face normal. The vessel is unrotated today, so
    // this is the identity; doing it anyway costs nothing and means an
    // editorial scene that tilts the boat does not silently skew the mark.
    _normal.copy(hit.face.normal).transformDirection(target.matrixWorld).normalize();
    // The ray travels inboard, so a normal pointing the same way is the far
    // face of a double-sided shell. Flip it rather than discarding the hit.
    if (_normal.dot(_direction) > 0) _normal.negate();

    _right.crossVectors(_worldUp, _normal).normalize();
    _up.crossVectors(_normal, _right).normalize();

    const geometry = markGeometry(shapes, bounds, anchor.length);
    const material = decalMaterial(ink, slot);

    const mesh = new Mesh(geometry, material);
    mesh.name = `${slot}_${side > 0 ? "starboard" : "port"}`;
    _basis.makeBasis(_right, _up, _normal);
    mesh.quaternion.setFromRotationMatrix(_basis);
    mesh.position.copy(hit.point).addScaledVector(_normal, anchor.standoff);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    placements.push({ slot, mesh, material, inkFollowsGround: true });
  }

  return placements;
}

/** §8 — the PXL lockup on the stern moulding, one per side. */
export function placeWordmark(target: Mesh, ink: PxlDecalInk): PxlDecalPlacement[] {
  return placeOnHull(
    target,
    "pxl_wordmark",
    PXL_MOUNTS.pxlMark,
    lockupShapes(),
    pxlLockupBounds(),
    ink,
  );
}

/** §4 — the Duna script on the gunwale capping, one per side. */
export function placeDunaScript(target: Mesh, ink: PxlDecalInk): PxlDecalPlacement[] {
  return placeOnHull(
    target,
    "duna_script",
    PXL_MOUNTS.dunaScript,
    scriptShapes(),
    dunaBounds(),
    ink,
  );
}

/**
 * §9, §10 — the PXL mark on the plexi.
 *
 * NOT A RAYCAST, AND NOT THE SIDE MARK'S TRANSFORM. §9 asks for both of those
 * explicitly and the reason is the same in each case: the screen is authored
 * geometry whose basis `pxlGlazing` already knows exactly, so raycasting it
 * would be asking a question whose answer is already in hand — and rediscovering
 * a known basis by ray is how a mark ends up on the frame instead of the glass.
 *
 * The mark is laid in the screen's own 2D frame at the fractions the studies
 * measure, proud of the glass's forward face by half its thickness plus a
 * stand-off. ONE INSTANCE, on the centreline: a screen is a single surface seen
 * from both sides, and a mirrored pair would put two marks on it.
 *
 * WHY IT SURVIVES THE GLASS. The plexi is a transmission material rather than an
 * alpha blend, so it writes depth — see `pxlGlazing`. That is what makes a
 * decal in front of it behave: the mark depth-tests against the screen and is
 * hidden when the screen is between it and the camera, which is precisely what a
 * print on the outboard face should do.
 */
export function placePlexiMark(frame: PxlScreenFrame, ink: PxlDecalInk): PxlDecalPlacement {
  const capHeight = frame.height * PXL_PLEXI_MARK.capHeight;
  const bounds = pxlLockupBounds();
  const aspect = (bounds.x1 - bounds.x0) / (bounds.y1 - bounds.y0);
  const geometry = markGeometry(lockupShapes(), bounds, capHeight * aspect);

  const material = decalMaterial(ink, "pxl_plexi");
  const mesh = new Mesh(geometry, material);
  mesh.name = "pxl_plexi";

  /* The screen's basis, unrotated: the mark lies in the glass's plane, so its
     own +X is the screen's `right` and its +Y the screen's `up`. */
  _basis.makeBasis(frame.right, frame.up, frame.normal);
  mesh.quaternion.setFromRotationMatrix(_basis);

  /* Fractions are measured from the screen's FORWARD edge and its TOP, which is
     how the studies read; the frame's own basis has +Z to starboard and +Y up,
     so `across` becomes an offset along −right from the forward edge. On this
     boat the screen's forward edge is its starboard one seen from ahead, and the
     mark is on the centreline in the beam direction — so `across` positions it
     along the screen's width and `down` along its height. */
  const u = (PXL_PLEXI_MARK.across - 0.5) * frame.width;
  const v = (0.5 - PXL_PLEXI_MARK.down) * frame.height;

  mesh.position
    .copy(frame.centre)
    .addScaledVector(frame.right, u)
    .addScaledVector(frame.up, v)
    .addScaledVector(frame.normal, 0.0012 + 0.0002);

  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  /* After the glass, so the print composites over what the glass transmitted. */
  mesh.renderOrder = 3;

  return { slot: "pxl_plexi", mesh, material, inkFollowsGround: false };
}

/** Free everything a placement owns. Called from the vessel's own teardown. */
export function disposePlacement(placement: PxlDecalPlacement): void {
  placement.mesh.removeFromParent();
  placement.mesh.geometry.dispose();
  placement.material.dispose();
}

/** Kept for callers that only want to know whether a mark can be built. */
export function markVertexCount(): number {
  const lockup = markGeometry(lockupShapes(), pxlLockupBounds(), 1);
  const script = markGeometry(scriptShapes(), dunaBounds(), 1);
  const count =
    lockup.getAttribute("position").count + script.getAttribute("position").count;
  lockup.dispose();
  script.dispose();
  return count;
}

/** Unused by the scene; kept so a debug surface can inspect a mark's extent. */
export function markBounds(slot: string): { x0: number; y0: number; x1: number; y1: number } {
  return slot === "duna_script" ? dunaBounds() : pxlLockupBounds();
}

export type { Object3D };
