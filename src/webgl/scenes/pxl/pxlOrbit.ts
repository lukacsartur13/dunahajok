"use client";

/**
 * PXL — controlled inspection orbit.
 *
 * Written rather than imported, and that is the point. drei's OrbitControls
 * would be quicker and would give the wrong result: it is a *viewport*
 * control, with momentum, free panning, pole-to-pole tumbling and a dolly that
 * runs to the near plane — everything that makes a 3D tool efficient and a
 * product presentation feel like homework. §21 asks for premium product
 * inspection, and the difference is entirely in what the control refuses to do.
 *
 * So this one refuses. It cannot pan. It cannot pass the poles. It cannot look
 * at the boat from underwater or push through the hull. What it can do is turn
 * the vessel and come a little closer, with the same easing the rest of the
 * site moves with, and hand back to an authored preset the moment it is asked.
 *
 * It also does not touch react-three-fiber's event system. The stage canvas is
 * `pointer-events: none` by design — one canvas covers every section of the
 * site, and a canvas that swallowed pointer events would break the document
 * under it. Input is taken from the *slot element* instead, which is a normal
 * DOM node in normal document flow, and translated into the same
 * azimuth/elevation/distance triple the presets are authored in.
 */

import { MathUtils } from "three";
import { PXL_ORBIT_LIMITS, type PxlCameraState } from "./pxlCamera";

/** Degrees of rotation per pixel dragged. Tuned so a full turn is a comfortable sweep. */
const YAW_PER_PX = 0.42;
const PITCH_PER_PX = 0.28;
/** Fraction of the zoom range per wheel notch. */
const ZOOM_PER_NOTCH = 0.055;
/** Seconds for the camera to reach a new user target. Matches the site's ease. */
const SETTLE = 0.16;

/** Zoom limits, as a multiplier on the active preset's authored distance. */
const ZOOM_MIN = 0.55;
const ZOOM_MAX = 1.5;
/** Offsets below these read as an unintentional nudge, not an exploration. */
const MOVED_ANGLE = 1.5;
const MOVED_ZOOM = 0.02;

export interface PxlOrbitState {
  /** Offsets from the active preset, in the preset's own units. */
  azimuth: number;
  elevation: number;
  /** Multiplier on the preset's distance. */
  zoom: number;
  /** True while the user is actively driving. Suspends idle behaviour. */
  engaged: boolean;
}

export interface PxlOrbit {
  state: PxlOrbitState;
  /** Ease the applied values toward the user's target. Call once a frame. */
  update(delta: number): void;
  /** Fold the current offsets into a resolved preset state, in place. */
  apply(state: PxlCameraState): void;
  /**
   * True once the viewer has meaningfully turned the boat away from the
   * authored composition. The UI reads it to stop claiming a preset is active
   * when the camera is no longer standing where that preset put it.
   */
  moved(): boolean;
  /** Ease back to the authored composition. */
  recentre(): void;
  /** Drop the offsets instantly, with no easing. See the note at the caller. */
  reset(): void;
  dispose(): void;
}

/**
 * A tap that was not a drag, and how the two are told apart. PHASE 4.9.
 *
 * The canvas is one element and it has to serve two gestures: turning the boat,
 * which is a drag, and picking something on it, which is a click. Nothing else
 * distinguishes them at `pointerdown` — the same button on the same pixel
 * begins both — so the decision is made at `pointerup`, on how far the pointer
 * actually travelled.
 *
 * 6 px, and it is a TOTAL rather than a straight-line distance from the start:
 * a slow hand that wanders out and comes back has still been dragging, and
 * measuring the endpoints would call that a click. On touch it also absorbs the
 * two or three pixels a finger rolls through while it lifts.
 *
 * Cancelled and multi-touch gestures are never taps: a pinch is not a click on
 * whatever happened to be under the first finger.
 */
const TAP_SLOP = 6;

export interface PxlOrbitHooks {
  /** A click on the canvas that was not a drag, in client coordinates. */
  onTap?: (x: number, y: number) => void;
  /** The pointer moved with no button down. For a hover affordance. */
  onHover?: (x: number, y: number) => void;
}

export function createPxlOrbit(
  element: HTMLElement,
  enabled = true,
  hooks: PxlOrbitHooks = {},
): PxlOrbit {
  const target = { azimuth: 0, elevation: 0, zoom: 1 };
  const state: PxlOrbitState = { azimuth: 0, elevation: 0, zoom: 1, engaged: false };

  /**
   * Live pointers, in order.
   *
   * A Map rather than a single id because §20 asks for pinch on touch, and
   * pinch is two pointers that have to be tracked together. The first pointer
   * down still drives rotation; the second turns the gesture into a zoom and
   * suspends rotation until one of them leaves, which is what stops a
   * two-finger pinch also spinning the boat by the drift between the fingers.
   */
  const points = new Map<number, { x: number; y: number }>();
  /** Distance between the two fingers when the pinch began, in pixels. */
  let pinchStart = 0;
  let pinchZoom = 1;
  /** How far the live gesture has travelled, and whether it can still be a tap. */
  let travel = 0;
  let tappable = false;

  const spread = (): number => {
    const [a, b] = [...points.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (points.size >= 2) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    /* TRACKED EVEN WHEN THE ORBIT IS OFF, and that is 4.9's one change to this
       handler. `enabled` is false under reduced motion, where turning the boat
       by hand is exactly the kind of movement somebody has asked not to have —
       but opening the seat is not motion, it is a fact about the boat, and the
       same argument `PxlProductScene` makes about colour applies to it. So the
       gesture is still measured; what `enabled` now gates is the CAMERA. */
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (enabled) state.engaged = true;
    element.setPointerCapture(event.pointerId);
    if (points.size === 2) {
      pinchStart = spread();
      pinchZoom = target.zoom;
      tappable = false;              // a pinch is not a click on anything
    } else {
      travel = 0;
      tappable = true;
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    const last = points.get(event.pointerId);
    if (!last) {
      // No button down. The only thing this can be is a hover, and it is the
      // caller's business whether that means anything.
      if (enabled && points.size === 0) hooks.onHover?.(event.clientX, event.clientY);
      return;
    }
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    last.x = event.clientX;
    last.y = event.clientY;
    travel += Math.hypot(dx, dy);
    if (travel > TAP_SLOP) tappable = false;
    if (!enabled) return;

    if (points.size === 2) {
      // Pinch. Zoom is a *ratio* of the current spread to the starting spread,
      // not an accumulation of per-frame deltas: a ratio comes back to exactly
      // where it started if the fingers do, and an accumulation does not.
      const now = spread();
      if (pinchStart > 8 && now > 8) {
        target.zoom = MathUtils.clamp(pinchZoom * (pinchStart / now), ZOOM_MIN, ZOOM_MAX);
      }
      return;
    }

    target.azimuth += dx * YAW_PER_PX;
    target.elevation -= dy * PITCH_PER_PX;
    // Clamping the *target* rather than the eased value is what makes the
    // limits feel like the end of the object rather than a wall the camera
    // bounces off: past the limit the drag simply stops having an effect.
    target.elevation = MathUtils.clamp(target.elevation, -80, 80);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!points.delete(event.pointerId)) return;
    if (points.size === 0) state.engaged = false;
    /* THE TAP FIRES HERE AND ONLY HERE, after the gesture is over and the
       distance is known. `pointercancel` routes to this same handler, and a
       cancelled gesture is never a tap — hence the event type check rather
       than a shared "it ended somehow" path. */
    if (tappable && points.size === 0 && event.type === "pointerup") {
      hooks.onTap?.(event.clientX, event.clientY);
    }
    tappable = false;
    // A finger lifting out of a pinch must not resume rotation from a stale
    // position — the remaining finger has moved a long way since it was last
    // treated as a drag.
    pinchStart = 0;
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
  };

  const onWheel = (event: WheelEvent) => {
    if (!enabled) return;
    // Only claim the gesture when it will actually do something, so a page
    // that happens to have the viewer in it still scrolls at the extremes.
    const next = MathUtils.clamp(
      target.zoom + Math.sign(event.deltaY) * ZOOM_PER_NOTCH,
      ZOOM_MIN,
      ZOOM_MAX,
    );
    if (next === target.zoom) return;
    event.preventDefault();
    target.zoom = next;
    state.engaged = true;
  };

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onPointerUp);
  element.addEventListener("wheel", onWheel, { passive: false });

  return {
    state,
    update(delta: number) {
      const lambda = 1 / SETTLE;
      state.azimuth = MathUtils.damp(state.azimuth, target.azimuth, lambda, delta);
      state.elevation = MathUtils.damp(state.elevation, target.elevation, lambda, delta);
      state.zoom = MathUtils.damp(state.zoom, target.zoom, lambda, delta);
    },
    apply(camera: PxlCameraState) {
      camera.azimuth += state.azimuth;
      camera.elevation = MathUtils.clamp(
        camera.elevation + state.elevation,
        PXL_ORBIT_LIMITS.minElevation,
        PXL_ORBIT_LIMITS.maxElevation,
      );
      camera.distance = MathUtils.clamp(
        camera.distance * state.zoom,
        PXL_ORBIT_LIMITS.minDistance,
        PXL_ORBIT_LIMITS.maxDistance,
      );
    },
    moved() {
      return (
        Math.abs(target.azimuth) > MOVED_ANGLE ||
        Math.abs(target.elevation) > MOVED_ANGLE ||
        Math.abs(target.zoom - 1) > MOVED_ZOOM
      );
    },
    recentre() {
      target.azimuth = 0;
      target.elevation = 0;
      target.zoom = 1;
    },
    reset() {
      target.azimuth = 0;
      target.elevation = 0;
      target.zoom = 1;
      state.azimuth = 0;
      state.elevation = 0;
      state.zoom = 1;
    },
    dispose() {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
      element.removeEventListener("wheel", onWheel);
    },
  };
}
