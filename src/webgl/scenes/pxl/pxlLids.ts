/**
 * PXL — THE SEATS, AS THINGS THAT OPEN.  PHASE 4.9.
 *
 * Four lids: the driver's squab, the two forward side runs and the nose panel.
 * Each is the top of a locker `pxl_upper.locker_box` built under it, each is a
 * node of its own in the GLB, and each opens on a click.
 *
 * ── WHY THIS IS NOT PART OF THE CONFIGURATION ──────────────────────────────
 *
 * A finish is a CONFIGURATION: it goes in the URL, it appears in the summary,
 * it is part of what somebody would order. A lid being up is not — it is a way
 * of looking at the boat, like an orbit angle. So the state is held here, it is
 * not serialised, and a shared link opens the boat with every seat down.
 *
 * ── ONE AXIS, AND THE GEOMETRY DECIDES WHICH ───────────────────────────────
 *
 * Every lid turns about its own LOCAL X, and that is the whole contract. There
 * is not a coordinate in this file, not a hinge position, not an axis choice,
 * because `pxl_blender.hinge_on` has already put each node's origin on its
 * hinge and rotated the node so that local X *is* the hinge line. That matters
 * most for the two side runs, whose hinge is neither the boat's X nor its Y:
 * their outboard edge sweeps 560 mm inboard over two metres, and a lid hinged
 * on the boat's own axis would swing its forward half down through the plinth.
 *
 * The sign is settled at the same place: `lid_hinge` points each direction so
 * that a POSITIVE angle lifts the squab. So everything here is scalar.
 *
 * ── WHY THE MOTION IS NOT A TRANSITION LIKE THE FINISHES ───────────────────
 *
 * The finish transitions in `PxlVessel` interpolate between two material states
 * and have to survive being interrupted mid-flight, which is why they carry a
 * `from`, a `to` and a `t`. A lid is a single scalar with two endpoints and is
 * reversible at any point with nothing to resolve: a click halfway up simply
 * changes the direction of travel. `damp` gives that for nothing and is
 * frame-rate independent, so there is no easing curve here to keep in step
 * with `pxlMotion`'s.
 */

import { MathUtils, type Object3D } from "three";
import type { PxlZone } from "./pxlModel";

/**
 * How far a lid swings, in radians.
 *
 * The same 78° `pxl_upper.SPEC.seat_lid_open_deg` documents — past the point a
 * squab on a gas strut stays up at, and far enough that the locker mouth is
 * completely clear.
 *
 * IT IS A COPY, and the Python is the original. Nothing checks that the two
 * agree, because nothing can: the angle is not in the GLB — a hinge exports as
 * an origin and an orientation, and an opening angle is neither. If they drift,
 * the seats still open and only the swing differs, which is why this is a
 * comment rather than a build-time assertion. Change `SPEC.seat_lid_open_deg`
 * and change this.
 */
export const PXL_LID_OPEN = MathUtils.degToRad(78);

/** Every zone that is a lid. Order is display order in nothing; it is a set. */
export const PXL_LID_ZONES: readonly PxlZone[] = [
  "seat_lid",
  "cushion_lid_starboard",
  "cushion_lid_port",
  "cushion_lid_nose",
  /* §4.9 — the cool box's lid. Not a seat, and on the list all the same: what
     `PXL_LID_ZONES` is is "every node that hinges", and the client asked for
     this one to open the same way the seats do. */
  "cool_box_lid",
];

/** Seconds for a lid to travel most of the way. */
const SETTLE = 0.34;

/** Below this a lid is treated as arrived and the frame loop can stop. */
const EPSILON = 1e-4;

interface LidState {
  /** What the viewer has asked for. */
  open: boolean;
  /** Where the lid actually is, in radians. */
  angle: number;
  /** The node's orientation with the lid shut, captured once. */
  shut: number[] | null;
}

export type PxlLidStates = Map<PxlZone, LidState>;

export function createLidStates(): PxlLidStates {
  return new Map(PXL_LID_ZONES.map((zone) => [zone, { open: false, angle: 0, shut: null }]));
}

/** Whether any lid is open. */
export function anyLidOpen(states: PxlLidStates): boolean {
  for (const state of states.values()) if (state.open) return true;
  return false;
}

/** Ask a lid to open or shut. Returns false if the zone is not a lid. */
export function toggleLid(states: PxlLidStates, zone: PxlZone): boolean {
  const state = states.get(zone);
  if (!state) return false;
  state.open = !state.open;
  return true;
}

/**
 * Record where every lid sits with the boat delivered, and shut them.
 *
 * THE SHUT ORIENTATION IS RECORDED, NOT ASSUMED. `hinge_on` gives each node a
 * rotation of its own — that is how local X came to be the hinge line — so
 * writing an absolute rotation would throw the hinge away and lay the lid flat
 * in the boat's own axes. The delivered quaternion is the zero of the angle,
 * and every frame turns that by `angle` about local X.
 *
 * CALLED WHEN THE MODEL RESOLVES, and deliberately not lazily on first use.
 * Reading the zero the first time a lid happens to move means whatever state
 * the node is in at that moment BECOMES shut — so anything that touched it
 * first, a debug poke or a future animation, would silently redefine the
 * closed seat. Once, at a known moment, is the only version of this that
 * cannot be got wrong by something else arriving earlier.
 */
export function primeLids(states: PxlLidStates, node: (zone: PxlZone) => Object3D | null): void {
  for (const [zone, state] of states) {
    const lid = node(zone);
    if (!lid) continue;
    state.shut = lid.quaternion.toArray();
    state.open = false;
    state.angle = 0;
  }
}

function place(lid: Object3D, state: LidState): void {
  if (!state.shut) state.shut = lid.quaternion.toArray();
  lid.quaternion.fromArray(state.shut);
  lid.rotateX(state.angle);
}

/**
 * Move every lid toward its target and write them onto their nodes.
 *
 * Returns true while any is still moving, in the same currency as the rest of
 * the scene's tick functions: the frame loop keeps running only while something
 * in it says it needs to.
 */
export function tickLids(
  states: PxlLidStates,
  node: (zone: PxlZone) => Object3D | null,
  delta: number,
): boolean {
  let moving = false;
  for (const [zone, state] of states) {
    const target = state.open ? PXL_LID_OPEN : 0;
    const lid = node(zone);
    if (Math.abs(state.angle - target) < EPSILON) {
      if (state.angle !== target) {
        state.angle = target;
        if (lid) place(lid, state);
      }
      continue;
    }
    state.angle = MathUtils.damp(state.angle, target, 1 / SETTLE, delta);
    if (lid) place(lid, state);
    moving = true;
  }
  return moving;
}

/** Put a lid where it belongs with no animation. For reduced motion. */
export function settleLid(
  states: PxlLidStates,
  zone: PxlZone,
  lid: Object3D | null,
  open: boolean,
): void {
  const state = states.get(zone);
  if (!state) return;
  state.open = open;
  state.angle = open ? PXL_LID_OPEN : 0;
  if (lid) place(lid, state);
}
