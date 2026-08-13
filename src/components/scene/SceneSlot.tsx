"use client";

/**
 * SceneSlot — the seam for the Phase Two WebGL layer.
 *
 * Phase One ships zero 3D dependencies. But every place a real-time scene is
 * planned is already declared here, with:
 *
 *   • a measured, positioned box the renderer can project into,
 *   • the static art direction that currently occupies it (children), which
 *     doubles as the permanent no-WebGL / reduced-motion / low-power fallback,
 *   • a stable `scene` id, published on the DOM as `data-scene`.
 *
 * Phase Two built that renderer. <WebGLStage> mounts one fixed canvas at the
 * document root, subscribes here to find every registered box, and drives
 * cameras from their bounding rects. Nothing in the sections had to change: a
 * slot that gains a renderer hides its fallback via `data-scene-active`.
 */

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./SceneSlot.module.css";

/** Every scene the experience is being designed towards. */
export type SceneId =
  | "hero-vessel" // cinematic 3D Duna 6.1, scroll-controlled camera
  | "pxl-product" // Duna PXL — the real GLB, studio-lit, configurable
  | "product-morph" // Cabin ↔ Kadét transformation
  | "material-explorer" // teak / lacquer / upholstery close inspection
  | "drivetrain" // electric drivetrain cutaway
  | "wake-water"; // wake shader / water simulation

export interface SceneSlotMeta {
  id: SceneId;
  el: HTMLElement;
  /** Scroll progress 0–1 across the slot, maintained by the future renderer. */
  priority: number;
}

const registry = new Map<SceneId, SceneSlotMeta>();
const listeners = new Set<() => void>();

function publish(): void {
  listeners.forEach((fn) => fn());
}

/** Phase Two entry point: every slot currently mounted, in document order. */
export function getSceneSlots(): SceneSlotMeta[] {
  return [...registry.values()].sort((a, b) => a.priority - b.priority);
}

export function getSceneSlot(scene: SceneId): SceneSlotMeta | undefined {
  return registry.get(scene);
}

/**
 * Notified whenever a slot mounts or unmounts. The renderer lives outside
 * <main> and mounts independently of the sections, so it cannot assume a slot
 * exists when it starts — it waits to be told.
 */
export function subscribeSceneSlots(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Hand a slot over to the renderer, or give it back. Setting this fades out
 * the static art direction; clearing it (on WebGL failure, or a lost context)
 * brings the Phase One visual straight back.
 */
export function setSceneActive(scene: SceneId, active: boolean): void {
  const meta = registry.get(scene);
  if (!meta) return;
  if (active) meta.el.dataset.sceneActive = "true";
  else delete meta.el.dataset.sceneActive;
}

interface SceneSlotProps {
  scene: SceneId;
  /** Static art direction shown until (and unless) a renderer claims the slot. */
  children: ReactNode;
  /** Document-order hint for the renderer's scheduling. */
  priority?: number;
  /**
   * The slot takes pointer input, and a scene reads it from this element.
   *
   * The canvas cannot: it is one element covering every section of the site
   * and is `pointer-events: none` so that the document underneath keeps
   * working. A scene that wants to be turned by hand therefore listens on its
   * own slot, which is a normal box in normal flow — and needs the box to stop
   * behaving like text while it is being dragged.
   */
  interactive?: boolean;
  className?: string;
  /**
   * Accessible name for the box, when it is a product visualisation rather
   * than decoration. Set it and the slot becomes a single `img` node carrying
   * that sentence — which is what a screen reader should meet here, instead of
   * either a canvas it cannot read or a fallback photograph's alt text
   * describing a still that sighted users are no longer looking at.
   */
  label?: string;
}

export function SceneSlot({
  scene,
  children,
  priority = 0,
  interactive = false,
  className,
  label,
}: SceneSlotProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registry.set(scene, { id: scene, el, priority });
    publish();
    return () => {
      registry.delete(scene);
      publish();
    };
  }, [scene, priority]);

  return (
    <div
      ref={ref}
      className={[styles.slot, interactive && styles.interactive, className]
        .filter(Boolean)
        .join(" ")}
      data-scene={scene}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <div className={styles.fallback} aria-hidden={label ? true : undefined}>
        {children}
      </div>
    </div>
  );
}
