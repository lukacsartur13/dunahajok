"use client";

/**
 * The bridge between the page and the renderer.
 *
 * Everything that changes per frame — scroll progress, the measured position
 * of a SceneSlot, the size of the viewport — lives in this plain mutable
 * object, not in React state. A `setState` per frame would re-render the tree
 * sixty times a second to move a camera, which is the single most common way
 * a React 3D scene ends up janky. GSAP writes here; `useFrame` reads here;
 * React is only told about things that change a handful of times per session
 * (visibility, quality tier, whether a scene is mounted at all).
 */

import type { SceneId } from "@/components/scene/SceneSlot";
import type { QualityTier } from "./quality";

export interface SlotBounds {
  /** Slot top edge, in CSS pixels from the top of the viewport. */
  top: number;
  left: number;
  width: number;
  height: number;
  /** True once the slot has been measured at a usable size. */
  measured: boolean;
  /** Inside the viewport, plus a margin — see `measureSlot`. */
  visible: boolean;
}

/** How the vessel is currently represented. This governs the camera limits. */
export type VesselSource = "plate" | "model" | "loading" | "error";

/** Why the renderer is, or isn't, running. Surfaced by the debug panel. */
export type WebGLStatus = "boot" | "running" | "unsupported" | "lost" | "failed";

export interface StageState {
  /** 0 → 1 across the hero's scroll range. The scene's master clock. */
  heroProgress: number;
  /** Seconds since the stage started, paused when nothing is visible. */
  time: number;
  /** Viewport, in CSS pixels. */
  viewportWidth: number;
  viewportHeight: number;
  /** Device pixel ratio actually handed to the renderer, after clamping. */
  dpr: number;
  /** Measured bounds of each registered SceneSlot, refreshed every frame. */
  slots: Partial<Record<SceneId, SlotBounds>>;
  /** Set by the renderer once it has drawn a frame the visitor can trust. */
  ready: boolean;

  quality: QualityTier;
  reducedMotion: boolean;
  status: WebGLStatus;
  vesselSource: VesselSource;

  /** Rolling frame time in milliseconds. Debug only — nothing renders off it. */
  frameMs: number;
  /** Read back from the renderer's own counters after the last frame. */
  drawCalls: number;
  triangles: number;
}

export const stage: StageState = {
  heroProgress: 0,
  time: 0,
  viewportWidth: 0,
  viewportHeight: 0,
  dpr: 1,
  slots: {},
  ready: false,
  quality: "high",
  reducedMotion: false,
  status: "boot",
  vesselSource: "loading",
  frameMs: 0,
  drawCalls: 0,
  triangles: 0,
};

const EMPTY: SlotBounds = {
  top: 0,
  left: 0,
  width: 0,
  height: 0,
  measured: false,
  visible: false,
};

export function slotBounds(scene: SceneId): SlotBounds {
  return stage.slots[scene] ?? EMPTY;
}

/**
 * Measure a slot against the viewport.
 *
 * `visible` carries a generous margin: a scene one third of a screen away is
 * about to arrive, and the first frame the visitor sees should not be the one
 * where the water is still composing itself. Outside that margin the scene is
 * skipped entirely — no camera update, no draw call.
 */
export function measureSlot(scene: SceneId, el: HTMLElement): SlotBounds {
  const rect = el.getBoundingClientRect();
  const margin = stage.viewportHeight * 0.35;
  const usable = rect.width > 1 && rect.height > 1;
  const next: SlotBounds = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    measured: usable,
    visible: usable && rect.bottom > -margin && rect.top < stage.viewportHeight + margin,
  };
  stage.slots[scene] = next;
  return next;
}

export function readViewport(): void {
  stage.viewportWidth = window.innerWidth;
  stage.viewportHeight = window.innerHeight;
}
