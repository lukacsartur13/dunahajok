/**
 * PXL — turning a preset into a camera.
 *
 * The preset *table* lives in `pxlPresets`, which imports nothing and can
 * therefore be tested without a renderer. This file is the half that needs
 * three and the site's easing curve: resolving a composition for a viewport
 * width, blending two of them, and writing the result onto a camera.
 *
 * Everything the table exports is re-exported here, so existing imports of
 * `pxlCamera` keep working and no consumer has to know about the split.
 */

import { MathUtils, Vector3, type PerspectiveCamera } from "three";
import { gsap } from "@/lib/motion";
import { PXL_MODEL } from "./pxlModel";
import {
  DESKTOP_MIN,
  MOBILE_MAX,
  PXL_FAR,
  PXL_NEAR,
  type PxlCameraState,
  type PxlPreset,
} from "./pxlPresets";

export {
  DESKTOP_MIN,
  MOBILE_MAX,
  PXL_CONFIGURATOR_VIEWS,
  PXL_CONFIGURATOR_VIEW_CONTROLS,
  PXL_DEFAULT_PRESET,
  PXL_FAR,
  PXL_NEAR,
  PXL_ORBIT_LIMITS,
  PXL_PRESETS,
  PXL_PRESET_BY_ID,
} from "./pxlPresets";
export type { PxlCameraState, PxlPreset, PxlPresetId } from "./pxlPresets";

const between = gsap.parseEase("glide");

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Resolve a preset for a viewport of the given width.
 *
 * Between the two authored ends the states are blended rather than switched, so
 * a tablet in the middle of the range gets a composition that belongs to it and
 * a window being dragged across the breakpoint does not jump.
 */
export function resolvePreset(preset: PxlPreset, width: number): PxlCameraState {
  const raw = MathUtils.clamp((width - MOBILE_MAX) / (DESKTOP_MIN - MOBILE_MAX), 0, 1);
  const t = between(raw);
  const m = { ...preset.desktop, ...preset.mobile };
  const d = preset.desktop;
  return {
    azimuth: mix(m.azimuth, d.azimuth, t),
    elevation: mix(m.elevation, d.elevation, t),
    distance: mix(m.distance, d.distance, t),
    hfov: mix(m.hfov, d.hfov, t),
    minVfov: mix(m.minVfov, d.minVfov, t),
    target: [
      mix(m.target[0], d.target[0], t),
      mix(m.target[1], d.target[1], t),
      mix(m.target[2], d.target[2], t),
    ],
  };
}

export function blendStates(a: PxlCameraState, b: PxlCameraState, t: number,
                            out: PxlCameraState): PxlCameraState {
  const e = between(MathUtils.clamp(t, 0, 1));
  out.azimuth = mix(a.azimuth, b.azimuth, e);
  out.elevation = mix(a.elevation, b.elevation, e);
  out.distance = mix(a.distance, b.distance, e);
  out.hfov = mix(a.hfov, b.hfov, e);
  out.minVfov = mix(a.minVfov, b.minVfov, e);
  out.target[0] = mix(a.target[0], b.target[0], e);
  out.target[1] = mix(a.target[1], b.target[1], e);
  out.target[2] = mix(a.target[2], b.target[2], e);
  return out;
}

/**
 * How long a move between two compositions should take.
 *
 * §15 asks for 700–1200 ms "depending on angular change", and explicitly says
 * not to obey the number blindly. So it is scaled rather than fixed: a nudge
 * from the hero shot to the bow quarter is 28° of azimuth and should not take
 * as long as the 94° swing from bow to stern, which passes the whole boat
 * across the frame. Distance change counts too — a preset that mostly dollies
 * reads as slow at any duration, so it contributes at a lower weight.
 *
 * The floor is deliberately not zero: even a tiny move gets 0.62 s, because an
 * almost-instant camera cut is the thing §15 rules out first.
 */
export function presetDuration(a: PxlCameraState, b: PxlCameraState): number {
  const swing = Math.abs(a.azimuth - b.azimuth) + Math.abs(a.elevation - b.elevation);
  const dolly = Math.abs(a.distance - b.distance);
  const t = MathUtils.clamp(swing / 120 + dolly / 24, 0, 1);
  return mix(0.62, 1.18, t);
}

/* ── Application ───────────────────────────────────────────────────────────*/

const _target = new Vector3();

export function applyPxlCamera(
  camera: PerspectiveCamera,
  state: PxlCameraState,
  aspect: number,
): void {
  const az = MathUtils.degToRad(state.azimuth);
  const el = MathUtils.degToRad(state.elevation);
  _target.set(state.target[0], state.target[1], state.target[2]);

  const horizontal = Math.cos(el) * state.distance;
  camera.position.set(
    _target.x + Math.sin(az) * horizontal,
    _target.y + Math.sin(el) * state.distance,
    _target.z + Math.cos(az) * horizontal,
  );
  camera.lookAt(_target);

  const hfov = MathUtils.degToRad(state.hfov);
  const vfov = 2 * Math.atan(Math.tan(hfov / 2) / Math.max(aspect, 0.05));
  // The vertical floor. Raising the angle rather than pulling the camera back
  // is deliberate: distance is what a preset *composes* with — it sets how much
  // perspective the hull is seen under — and changing it to recover a crop
  // would change the shot's character on exactly the viewports where it is
  // hardest to check. Widening the lens keeps the geometry of the composition
  // and only gives it more room.
  camera.fov = MathUtils.clamp(
    Math.max(MathUtils.radToDeg(vfov), state.minVfov),
    12,
    62,
  );
  camera.aspect = aspect;
  camera.near = PXL_NEAR;
  camera.far = PXL_FAR;
  camera.updateProjectionMatrix();
}

/** A distance that frames the whole vessel at a given horizontal field of view. */
export function framingDistance(hfov: number): number {
  return (PXL_MODEL.loa * 0.62) / Math.tan(MathUtils.degToRad(hfov) / 2);
}
