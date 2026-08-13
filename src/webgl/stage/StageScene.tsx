"use client";

/**
 * One scene, portalled into its own THREE.Scene and pointed at one SceneSlot.
 *
 * The portal is what makes the single-canvas architecture actually modular:
 * children below this component render into an isolated graph with their own
 * camera, so `hero-vessel` cannot leak a light, a fog setting or a render
 * order into `product-morph`. R3F's loop, its resize handling and its
 * disposal all still apply, because the portal shares the root store.
 *
 * Nothing here draws. `StageRuntime` collects registered scenes once a frame
 * and renders each into its slot's scissor rectangle.
 */

import { createPortal } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { PerspectiveCamera, Scene } from "three";
import type { SceneId } from "@/components/scene/SceneSlot";
import { registerStageScene } from "./sceneRegistry";
import { slotBounds, type SlotBounds } from "./stageState";

const CAMERA_NEAR = 0.4;
const CAMERA_FAR = 6000;

interface StageSceneContext {
  id: SceneId;
  camera: PerspectiveCamera;
  /** Live bounds of this scene's slot, in CSS pixels. Read inside useFrame. */
  bounds: () => SlotBounds;
}

const Ctx = createContext<StageSceneContext | null>(null);

export function useStageScene(): StageSceneContext {
  const value = useContext(Ctx);
  if (!value) throw new Error("useStageScene must be used inside <StageScene>");
  return value;
}

interface StageSceneProps {
  id: SceneId;
  children: ReactNode;
  priority?: number;
  /** False under reduced motion: the scene is a still frame, drawn on demand. */
  animated?: boolean;
}

export function StageScene({ id, children, priority = 0, animated = true }: StageSceneProps) {
  const scene = useMemo(() => {
    const s = new Scene();
    s.name = id;
    return s;
  }, [id]);

  const camera = useMemo(
    () => new PerspectiveCamera(35, 1, CAMERA_NEAR, CAMERA_FAR),
    [],
  );

  useEffect(
    () => registerStageScene({ id, scene, camera, priority, animated, dirty: true }),
    [id, scene, camera, priority, animated],
  );

  const ctx = useMemo<StageSceneContext>(
    () => ({ id, camera, bounds: () => slotBounds(id) }),
    [id, camera],
  );

  return (
    <Ctx.Provider value={ctx}>
      {createPortal(children, scene, { camera })}
    </Ctx.Provider>
  );
}
