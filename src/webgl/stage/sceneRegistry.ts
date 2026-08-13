"use client";

/**
 * The renderer's half of the SceneSlot contract.
 *
 * `components/scene/SceneSlot` publishes *boxes in the document*. This file
 * publishes *scenes for those boxes*. `StageRuntime` joins the two once a
 * frame: for every registered scene whose slot is on screen, it sets a
 * viewport and a scissor rectangle to the slot's measured bounds and draws.
 *
 * That is the whole reason there is one canvas rather than five. Each scene
 * still gets its own THREE.Scene and its own camera — they share nothing but
 * the WebGL context, the render loop and the frame budget.
 */

import type { Camera, Scene } from "three";
import type { SceneId } from "@/components/scene/SceneSlot";

export interface StageSceneEntry {
  id: SceneId;
  scene: Scene;
  camera: Camera;
  /**
   * Document order, mirroring `SceneSlot`'s own `priority`. Scenes are drawn
   * in this order so that overlapping slots — which the layout does not
   * currently produce, but a pinned section eventually might — composite
   * predictably rather than by Map insertion order.
   */
  priority: number;
  /**
   * False for scenes whose content is static (reduced motion). They are drawn
   * only when their slot moves or resizes, not sixty times a second.
   */
  animated: boolean;
  /**
   * Set by a static scene that has changed anyway.
   *
   * "Draw when the box moves" is not sufficient on its own: a still frame
   * still has to compose itself — a texture arrives, the opening fade
   * resolves, a quality tier is re-detected — and every one of those happens
   * while the box is perfectly stationary. Without this the reduced-motion
   * scene renders its very first, still-empty frame and then never again,
   * having already taken the slot away from the photograph. Which is a black
   * rectangle, and a black rectangle is the one outcome this whole layer is
   * supposed to be incapable of producing.
   */
  dirty: boolean;
}

const scenes = new Map<SceneId, StageSceneEntry>();

/** Ask for one more frame of a static scene. Cleared once it has been drawn. */
export function invalidateStageScene(id: SceneId): void {
  const entry = scenes.get(id);
  if (entry) entry.dirty = true;
}

export function registerStageScene(entry: StageSceneEntry): () => void {
  scenes.set(entry.id, entry);
  return () => {
    if (scenes.get(entry.id) === entry) scenes.delete(entry.id);
  };
}

export function stageScenes(): StageSceneEntry[] {
  return [...scenes.values()].sort((a, b) => a.priority - b.priority);
}
