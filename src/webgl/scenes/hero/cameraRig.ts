"use client";

/**
 * CAMERA RIG.
 *
 * Two jobs, and keeping them separate is the whole point of the file:
 *
 *   1. resolve the authored `CameraState` list into a single blended state at
 *      the current hero progress, and
 *   2. turn that state into a camera — a position, a target and a field of
 *      view that respects the shape of the box it is rendering into.
 *
 * Nothing else in the scene is allowed to touch the camera. Water, wake and
 * vessel all *read* the blended state, so there is exactly one description of
 * where the sequence is at any moment, and reversing the scroll reverses all
 * of it identically.
 */

import { gsap } from "@/lib/motion";
import type { PerspectiveCamera } from "three";
import { MathUtils, Vector3 } from "three";
import type { CameraState } from "./heroConfig";

/**
 * The site's own easing, reused rather than reinvented.
 *
 * Phase One registered `glide` as the curve for anything that travels under
 * scroll. Applying it *between* keyframes means the camera accelerates out of
 * one composition and settles into the next instead of sliding linearly
 * through both, which is the single clearest tell of a scrubbed 3D camera.
 */
const between = gsap.parseEase("glide");

const lerp = MathUtils.lerp;

/** Blend two authored states. Every field interpolates; none are switched. */
function blend(a: CameraState, b: CameraState, t: number, out: CameraState): CameraState {
  out.at = lerp(a.at, b.at, t);
  out.azimuth = lerp(a.azimuth, b.azimuth, t);
  out.height = lerp(a.height, b.height, t);
  out.distance = lerp(a.distance, b.distance, t);
  out.hfov = lerp(a.hfov, b.hfov, t);
  out.targetY = lerp(a.targetY, b.targetY, t);
  out.targetOffset = lerp(a.targetOffset, b.targetOffset, t);
  out.vesselAlong = lerp(a.vesselAlong, b.vesselAlong, t);
  out.speed = lerp(a.speed, b.speed, t);
  out.waveAmp = lerp(a.waveAmp, b.waveAmp, t);
  out.wakeLength = lerp(a.wakeLength, b.wakeLength, t);
  out.wakeLift = lerp(a.wakeLift, b.wakeLift, t);
  out.lineify = lerp(a.lineify, b.lineify, t);
  out.fade = lerp(a.fade, b.fade, t);
  return out;
}

/**
 * Sample the authored sequence at `progress`, into a reused object.
 *
 * Allocating a state per frame would hand the garbage collector sixty objects
 * a second for no reason, and a collection pause during a scroll-driven camera
 * move is exactly the kind of hitch that reads as "the site is struggling".
 */
export function sampleStates(
  states: readonly CameraState[],
  progress: number,
  out: CameraState,
): CameraState {
  const p = MathUtils.clamp(progress, 0, 1);

  if (p <= states[0].at) return Object.assign(out, states[0]);
  const last = states[states.length - 1];
  if (p >= last.at) return Object.assign(out, last);

  for (let i = 0; i < states.length - 1; i++) {
    const a = states[i];
    const b = states[i + 1];
    if (p > b.at) continue;
    const span = b.at - a.at;
    const t = span > 1e-6 ? (p - a.at) / span : 0;
    return blend(a, b, between(t), out);
  }
  return Object.assign(out, last);
}

const _target = new Vector3();

/**
 * Apply a blended state to a camera, inside a box of the given aspect.
 *
 * The authored field of view is horizontal, so the vertical angle is derived
 * from the slot's own proportions. It is then clamped: an extremely wide, very
 * short band would otherwise resolve to a two-degree vertical view — optically
 * correct and completely unusable — and a tall one to a fisheye. Between those
 * limits the framing is the authored one.
 */
export function applyState(
  camera: PerspectiveCamera,
  state: CameraState,
  aspect: number,
  vesselX: number,
  azimuthScale: number,
): void {
  const az = MathUtils.degToRad(state.azimuth * azimuthScale);

  _target.set(vesselX + state.targetOffset, state.targetY, 0);

  camera.position.set(
    _target.x + Math.sin(az) * state.distance,
    state.height,
    _target.z + Math.cos(az) * state.distance,
  );
  camera.lookAt(_target);

  const hfov = MathUtils.degToRad(state.hfov);
  const vfov = 2 * Math.atan(Math.tan(hfov / 2) / Math.max(aspect, 0.05));
  camera.fov = MathUtils.clamp(MathUtils.radToDeg(vfov), 9, 58);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}
