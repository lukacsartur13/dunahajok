/**
 * PXL — THE PROXY DRIVES.
 *
 * §A13 asks the preview configurator to communicate the difference between
 * motor sizes, and §A14 insists the difference be visible in the 3D boat rather
 * than stated in a label. §A15 then rules out the cheap way of doing it: three
 * copies of one object at three scales.
 *
 * ── WHY THESE ARE BUILT RATHER THAN EXPORTED ───────────────────────────────
 *
 * The delivered STL contains one outboard, 346 triangles, unidentified. §A14
 * permits modifying it, and that was the first thing tried. It fails on both
 * counts that matter:
 *
 *   • Scaling it is exactly §A15's failure. An outboard's cowling, leg,
 *     gearcase and propeller do not grow together — a large engine is a much
 *     bigger powerhead on a leg that is only somewhat longer, turning a
 *     propeller that is only somewhat larger. Multiply one mesh by 1.4 and the
 *     propeller becomes comic and the leg reaches the riverbed.
 *   • It is somebody's product. Nobody has told us whose. Stretching an
 *     unidentified manufacturer's silhouette into three "sizes" and putting
 *     them in front of a customer is a stronger claim than leaving it alone,
 *     not a weaker one.
 *
 * So the four drives are authored here, from primitives, at proportions taken
 * from the general anatomy of outboards rather than from any particular one.
 * They are neutral: no branding, no badge, no decal, no model number, no vent
 * pattern anybody could recognise, no colour scheme belonging to a manufacturer.
 * §B36's "no fake branded engine models" is satisfied by there being nothing on
 * them to fake a brand with.
 *
 * ── WHAT MAKES THEM READ AS DIFFERENT SIZES ────────────────────────────────
 *
 * Not one number. `PXL_DRIVE_SPECS` in `pxlCatalog` authors eleven dimensions
 * per drive and they move at different rates — the cowling gains 71% in length
 * across the range while gaining 34% in width, the gearcase lengthens by a
 * fifth while the shaft lengthens by a third, and the corner radius *tightens*
 * as the drive grows because a larger moulding carries a proportionally
 * smaller radius. That divergence is what the eye reads as "a bigger engine"
 * rather than "the same engine, closer".
 *
 * ── THE ELECTRIC ONE ───────────────────────────────────────────────────────
 *
 * §A17 asks for clean, compact, technical and modern, and rules out every
 * shortcut: no blue, no neon, no lightning, no glowing battery, no sci-fi. What
 * is left is the only honest difference — the object itself. An electric drive
 * has no engine block, no airbox and no exhaust, so its cowling is a shell
 * rather than a cover: narrower, shorter, and machined to a much tighter radius
 * (0.10 against 0.26–0.30). It also has no cooling intake grille and no
 * powerhead vent, so it does not get one. The result reads as more refined
 * because it is simpler, which is what §A17 actually asks for.
 *
 * ── COST ───────────────────────────────────────────────────────────────────
 *
 * One drive is built at a time, on demand, and cached. Each is 1,520
 * triangles across eight meshes and two materials — measured by
 * `npm run vessel`, not estimated — against 7,187 for the hull bottom alone.
 * Switching drives reuses the cached group, so a viewer stepping through all
 * four pays for each one once and the four together cost about a third of the
 * hull.
 */

import {
  Box3,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  Shape,
  type Object3D,
} from "three";
import { PXL_DRIVE_SPECS, type PxlDriveSpec, type PxlDriveVariant } from "./pxlCatalog";
import { PXL_MOUNTS } from "./pxlModel";
import { finish, type PxlFinish } from "./pxlPalette";

/* ── Profile helpers ───────────────────────────────────────────────────────*/

/**
 * A rounded rectangle, centred on the origin, as a `Shape`.
 *
 * Everything on these drives is an extruded profile, because that is how the
 * objects are actually made: an outboard cowling is a moulding with a constant
 * cross-section through most of its height, and a gearcase is a section swept
 * along a line. Extruding a silhouette with a bevel produces a form with
 * genuine radii on every edge, which is what separates these from a stack of
 * boxes — and it does it at a triangle count a box stack could not match.
 */
function roundedRect(width: number, height: number, radius: number): Shape {
  const r = Math.min(radius, width / 2, height / 2);
  const w = width / 2;
  const h = height / 2;
  const shape = new Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w, -h + r);
  return shape;
}

/**
 * The gearcase silhouette: a torpedo, blunt forward and tapering aft.
 *
 * Authored as an explicit outline rather than as a rounded rectangle because
 * the asymmetry is the recognisable part — a gearcase is a bulb with a nose,
 * and a symmetrical lozenge reads as a fairing. `length` runs fore-aft with the
 * nose at +x, matching the model's own bow-forward convention.
 */
function gearcaseProfile(length: number, depth: number): Shape {
  const l = length / 2;
  const d = depth / 2;
  const shape = new Shape();
  // Nose, forward and slightly low — a gearcase leans into the water.
  shape.moveTo(l, -d * 0.15);
  shape.quadraticCurveTo(l * 0.92, -d, l * 0.5, -d);
  shape.lineTo(-l * 0.62, -d);
  // Aft taper to the propeller boss, which is where the hub picks up.
  shape.quadraticCurveTo(-l, -d * 0.86, -l, -d * 0.34);
  shape.lineTo(-l, d * 0.34);
  shape.quadraticCurveTo(-l, d * 0.9, -l * 0.6, d);
  shape.lineTo(l * 0.42, d);
  shape.quadraticCurveTo(l * 0.95, d, l, -d * 0.15);
  return shape;
}

/**
 * Extrude a profile across the beam and orient it in the model's frame.
 *
 * `ExtrudeGeometry` builds along +Z with the shape in XY, which is exactly the
 * orientation these drives want: the profile is the side view (x fore-aft,
 * y up) and the extrusion is the width (z athwartships). No rotation is needed
 * anywhere, which is one class of mistake removed.
 */
function extrude(shape: Shape, width: number, bevel: number): BufferGeometry {
  /* SEGMENT COUNTS ARE A BUDGET, AND THE BUDGET IS MEASURED.
     The first pass used `curveSegments: 10` and `bevelSegments: 4` and built
     drives of 7,100 triangles each — four of those cached is 28,000, which is
     more than the hull, the deck, the console and the rails put together for
     an object the size of a suitcase. `npm run vessel` is what caught it.

     Three and two are where the picture stops changing. The cowling's corner
     radius is 30 mm on a part seen from three metres away at the closest
     preset; past three segments across it the silhouette is smooth and the
     extra triangles are describing a curve nobody can resolve. The bevel is
     smaller again. */
  const geometry = new ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 3,
    steps: 1,
  });
  geometry.translate(0, 0, -(width - bevel * 2) / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/* ── Materials ─────────────────────────────────────────────────────────────*/

/**
 * One material per finish per drive.
 *
 * Not shared between drives, and deliberately: the crossfade in §A18 animates
 * `opacity`, and two drives sharing a material would fade in and out together
 * — which is the one thing a crossfade must not do.
 */
function driveMaterial(spec: PxlFinish): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    color: spec.base,
    roughness: spec.roughness,
    metalness: spec.metalness,
    clearcoat: spec.clearcoat,
    clearcoatRoughness: spec.clearcoatRoughness,
    /**
     * TRANSPARENT FROM BIRTH, AT OPACITY 1.
     *
     * Toggling `transparent` at the moment a crossfade starts would flip a
     * shader define and force a program recompile on exactly the frame the
     * transition begins — a stall on the one interaction that has to feel
     * smooth, and the same mistake `PxlVessel` avoids by installing the sweep
     * at load. Declaring it here costs the drive a place in the transparent
     * pass and nothing else: `depthWrite` stays on, so an opaque drive sorts
     * and occludes exactly as it would otherwise.
     */
    transparent: true,
    opacity: 1,
    depthWrite: true,
  });
  material.name = `pxl_drive_${spec.id}`;
  return material;
}

/* ── The build ─────────────────────────────────────────────────────────────*/

/**
 * Where the drive hangs, in the model's own metres.
 *
 * The transom plane and the top of the transom moulding, both measured off the
 * delivered GLB rather than estimated — see `PXL_MOUNTS`. Everything below is
 * expressed relative to those two numbers, so a re-exported model moves the
 * whole drive with it instead of leaving it hanging in the air.
 */
const MOUNT = PXL_MOUNTS.transom;

/**
 * How far the anti-ventilation plate sits below the transom top.
 *
 * §A16, and the reason `shaft` is authored per drive rather than derived. A
 * plate has to end up at roughly the same depth relative to the hull whatever
 * engine it belongs to — that is hydrodynamics, not size — so a large drive
 * gets a longer leg to put its bigger gearcase at the right depth rather than a
 * proportionally longer one that would put it on the riverbed.
 *
 * The measured targets: the plate lands between 0.03 m above and 0.13 m below
 * the waterline across the four drives, and every propeller sits fully
 * submerged and clear of the keel line at y = −0.2206. The configurator tests
 * assert both, so re-tuning a `shaft` value cannot silently beach a drive.
 */
function plateHeight(spec: PxlDriveSpec): number {
  return MOUNT.y - spec.shaft;
}

/** A propeller: hub plus three blades, turning about the fore-aft axis. */
function buildPropeller(spec: PxlDriveSpec, material: MeshPhysicalMaterial): Object3D {
  const group = new Group();
  group.name = "pxl_drive_propeller";

  const radius = spec.propeller / 2;
  const hub = new Mesh(
    new CylinderGeometry(radius * 0.28, radius * 0.24, spec.leg.width * 0.9, 14),
    material,
  );
  // CylinderGeometry is built along +Y; the propeller shaft runs fore-aft.
  hub.rotation.z = Math.PI / 2;
  group.add(hub);

  /* Three blades. Not four: three is what a small outboard turns, and a
     four-blade wheel on a compact drive would be a specification claim. Each
     blade is a rounded rectangle extruded thin, tilted to a pitch angle and
     rotated about the shaft — so the propeller has a real pitch rather than
     being a flat pinwheel, which is visible the moment the camera moves. */
  for (let i = 0; i < 3; i += 1) {
    // The profile is authored in the blade's own terms: chord across X, radial
    // span up Y, thickness through Z. The two rotations then put that frame on
    // the shaft — Y about the shaft to lay the blade across it, X to space the
    // three around it — and the local translate lifts the blade clear of the
    // hub rather than growing it out of the centre.
    const blade = new Mesh(
      extrude(roundedRect(radius * 0.5, radius * 0.8, radius * 0.16), 0.013, 0.004),
      material,
    );
    blade.geometry.translate(0, radius * 0.56, 0);
    blade.rotation.x = (i * Math.PI * 2) / 3;
    blade.rotation.y = Math.PI / 2;
    // The pitch, about the blade's OWN radial axis — `rotateY` post-multiplies
    // and is therefore a local-axis rotation, which is what makes this a pitch
    // rather than a sweep. A flat pinwheel is visible the instant the camera
    // moves, and it is the detail that gives a proxy away.
    blade.rotateY(0.38);
    group.add(blade);
  }
  return group;
}

/**
 * Build one drive, complete, positioned at the transom.
 *
 * Returns a `Group` whose origin is the transom mount, so the caller adds it to
 * the vessel root and does nothing else — and so the transition in
 * `tickPropulsion` can move the whole assembly by translating one object.
 */
export function buildDrive(variant: PxlDriveVariant): DriveHandle {
  const spec = PXL_DRIVE_SPECS[variant];
  const cowlMaterial = driveMaterial(finish(spec.cowlFinishId));
  const alloyMaterial = driveMaterial(finish("pxl_drive_alloy"));

  const group = new Group();
  group.name = `pxl_drive_${variant}`;
  group.position.set(MOUNT.x, 0, MOUNT.z);

  const plateY = plateHeight(spec);

  /* ── Bracket ────────────────────────────────────────────────────────────
     The clamp, flush to the transom and standing proud of it by `bracket`.
     Its forward face is the transom plane exactly, so the drive touches the
     boat and never enters it — §A16's first clearance, satisfied by
     construction rather than by inspection.                                */
  const bracket = new Mesh(
    extrude(
      roundedRect(spec.bracket, spec.cowl.height * 0.52, spec.bracket * 0.34),
      spec.leg.width * 1.45,
      spec.bracket * 0.12,
    ),
    alloyMaterial,
  );
  bracket.position.set(-spec.bracket / 2, MOUNT.y - spec.cowl.height * 0.12, 0);
  group.add(bracket);

  /* ── Cowling ────────────────────────────────────────────────────────────
     The visible mass, and the part the eye actually measures a drive by. Its
     underside sits on the transom top so that the whole range shares one datum
     — a drive whose cowling floated would read as a mounting error long before
     it read as a size.                                                      */
  const cowl = new Mesh(
    extrude(
      roundedRect(
        spec.cowl.length,
        spec.cowl.height,
        Math.min(spec.cowl.length, spec.cowl.height) * spec.radius,
      ),
      spec.cowl.width,
      Math.min(spec.cowl.length, spec.cowl.height) * spec.radius * 0.34,
    ),
    cowlMaterial,
  );
  cowl.position.set(-spec.bracket - spec.cowl.length / 2, MOUNT.y + spec.cowl.height / 2, 0);
  group.add(cowl);

  /* ── Midsection ─────────────────────────────────────────────────────────
     The leg. A narrow rounded strut, and the one part that is genuinely just a
     shape — everything characterful about an outboard is above it or below it. */
  const shaftLength = MOUNT.y + spec.cowl.height * 0.06 - plateY;
  const leg = new Mesh(
    extrude(
      roundedRect(spec.leg.caseLength * 0.5, shaftLength, spec.leg.width * 0.42),
      spec.leg.width,
      spec.leg.width * 0.16,
    ),
    alloyMaterial,
  );
  leg.position.set(
    -spec.bracket - spec.cowl.length * 0.5,
    plateY + shaftLength / 2,
    0,
  );
  group.add(leg);

  /* ── Anti-ventilation plate ─────────────────────────────────────────────
     Thin, wide, and the drive's most recognisable single feature after the
     cowling. It is also the datum §A16 is really about: get this to the right
     depth and the rest of the leg follows.                                  */
  const plate = new Mesh(
    extrude(
      roundedRect(spec.plate.length, 0.016, 0.006),
      spec.plate.width,
      0.004,
    ),
    alloyMaterial,
  );
  plate.position.set(-spec.bracket - spec.cowl.length * 0.5, plateY, 0);
  group.add(plate);

  /* ── Gearcase and propeller ─────────────────────────────────────────────*/
  const gearcase = new Mesh(
    extrude(
      gearcaseProfile(spec.leg.caseLength, spec.leg.caseDepth),
      spec.leg.width * 1.15,
      spec.leg.width * 0.14,
    ),
    alloyMaterial,
  );
  const gearcaseY = plateY - spec.leg.caseDepth / 2;
  gearcase.position.set(
    -spec.bracket - spec.cowl.length * 0.5 + spec.leg.caseLength * 0.06,
    gearcaseY,
    0,
  );
  group.add(gearcase);

  const propeller = buildPropeller(spec, alloyMaterial);
  propeller.position.set(
    -spec.bracket - spec.cowl.length * 0.5 - spec.leg.caseLength * 0.52,
    gearcaseY,
    0,
  );
  group.add(propeller);

  for (const child of group.children) {
    child.traverse((node) => {
      if (node instanceof Mesh) {
        node.castShadow = false;
        node.receiveShadow = false;
        node.frustumCulled = false;
      }
    });
  }

  /* §A16 — SEAT THE ASSEMBLY AGAINST THE TRANSOM, MEASURED.
     The bracket is authored with its forward face at the mount, and that is
     not quite where it ends up: `ExtrudeGeometry` grows a bevelled profile
     OUTWARD by `bevelSize` in the shape plane, so every part finishes a few
     millimetres proud of the numbers that produced it. Twelve millimetres of
     bracket inside the transom is invisible — the hull hides it — which is
     exactly why it needs measuring rather than eyeballing; `npm run vessel`
     found it on the first run.

     Measured and corrected rather than compensated for in the bracket's own
     position, because the bevel is not the only thing that could ever push a
     part forward, and a correction that reads the real bounding box stays
     right when somebody adds a cowling vent. */
  const bounds = new Box3().setFromObject(group);
  const intrusion = bounds.max.x - MOUNT.x;
  if (intrusion > 0) group.position.x -= intrusion;

  return {
    variant,
    group,
    materials: [cowlMaterial, alloyMaterial],
    /** The lowest point the drive reaches. Asserted against the keel in tests. */
    depth: gearcaseY - spec.propeller / 2,
    plateY,
  };
}

export interface DriveHandle {
  variant: PxlDriveVariant;
  group: Group;
  materials: MeshPhysicalMaterial[];
  depth: number;
  plateY: number;
}

/* ── The transition ────────────────────────────────────────────────────────*/

/**
 * §A18 — CHANGING DRIVE IS A CROSSFADE PLUS A SHORT LIFT, AND NOTHING ELSE.
 *
 * §A18 lists fade, dissolve, mask and crossfade as acceptable and rules out
 * popping and morphing unrelated geometry. Two proxy outboards have no
 * meaningful correspondence between their vertices — different topology,
 * different part counts — so morphing them is not available and would look
 * like melting if it were.
 *
 * What is here instead: the outgoing drive fades down and settles 60 mm, the
 * incoming one fades up out of the same 60 mm, and the two overlap for the
 * middle third. The vertical movement is the part that makes it read as one
 * object being *changed* rather than two images being blended — the eye is
 * given a direction, and 60 mm at this scale is enough to be felt and too
 * little to be watched.
 *
 * Both drives are drawn during the overlap, which is the only frame budget this
 * costs: about 3,800 triangles for a third of a second.
 */
export const DRIVE_TRANSITION = 0.42;
/** Metres the incoming drive rises through, and the outgoing one settles into. */
const DRIVE_LIFT = 0.06;

export interface PropulsionState {
  /** The drive on screen, or the one arriving while `t` runs. */
  current: DriveHandle | null;
  /** The drive leaving, if a change is in flight. */
  previous: DriveHandle | null;
  /** 0 → 1. At 1 the change is complete and `previous` has been detached. */
  t: number;
  /** Every drive built so far, so stepping back to one is free. */
  cache: Map<PxlDriveVariant, DriveHandle>;
}

export function createPropulsionState(): PropulsionState {
  return { current: null, previous: null, t: 1, cache: new Map() };
}

/**
 * Fit a drive, animating the change unless told not to.
 *
 * `immediate` is the first paint and reduced motion, for the same reasons the
 * finish system has the same flag: there is nothing to transition *from* on the
 * first frame, and somebody who has asked for less motion still has to be able
 * to see which drive they picked.
 */
export function setDrive(
  state: PropulsionState,
  root: Object3D,
  variant: PxlDriveVariant,
  immediate = false,
): boolean {
  if (state.current?.variant === variant && state.t >= 1) return false;

  let next = state.cache.get(variant);
  if (!next) {
    next = buildDrive(variant);
    state.cache.set(variant, next);
  }
  if (next === state.current) return false;

  // A change interrupted mid-flight resolves the one already leaving rather
  // than chaining a third object into the fade. Three overlapping drives is
  // never a picture anybody wants, and at 0.42 s it takes deliberate effort.
  if (state.previous && state.previous !== next) detach(root, state.previous);

  state.previous = state.current;
  state.current = next;
  root.add(next.group);

  if (immediate) {
    if (state.previous) detach(root, state.previous);
    state.previous = null;
    state.t = 1;
    apply(next, 1, 0);
    return true;
  }

  state.t = 0;
  apply(next, 0, DRIVE_LIFT);
  if (state.previous) apply(state.previous, 1, 0);
  return true;
}

function detach(root: Object3D, handle: DriveHandle): void {
  root.remove(handle.group);
}

function apply(handle: DriveHandle, opacity: number, lift: number): void {
  for (const material of handle.materials) material.opacity = opacity;
  handle.group.position.y = lift;
  handle.group.visible = opacity > 0.002;
}

/** Advance the change by one frame. True while it is still running. */
export function tickPropulsion(
  state: PropulsionState,
  root: Object3D,
  delta: number,
): boolean {
  if (state.t >= 1) return false;
  state.t = Math.min(1, state.t + delta / DRIVE_TRANSITION);

  // Smoothstep on both halves, offset so the incoming drive is already at a
  // third of its opacity when the outgoing one reaches two thirds. A linear
  // crossfade dips in the middle — two half-opaque objects read as one
  // quarter-opaque one — and the dip is exactly where the eye is looking.
  const e = state.t * state.t * (3 - 2 * state.t);
  if (state.current) apply(state.current, Math.min(1, e * 1.35), DRIVE_LIFT * (1 - e));
  if (state.previous) {
    apply(state.previous, Math.max(0, 1 - e * 1.6), -DRIVE_LIFT * e);
  }

  if (state.t >= 1) {
    if (state.previous) {
      detach(root, state.previous);
      state.previous = null;
    }
    if (state.current) apply(state.current, 1, 0);
    return false;
  }
  return true;
}

/** Release every drive this state has built. Called when the vessel unmounts. */
export function disposePropulsion(state: PropulsionState, root: Object3D): void {
  for (const handle of state.cache.values()) {
    detach(root, handle);
    handle.group.traverse((node) => {
      if (node instanceof Mesh) node.geometry.dispose();
    });
    for (const material of handle.materials) material.dispose();
  }
  state.cache.clear();
  state.current = null;
  state.previous = null;
}
