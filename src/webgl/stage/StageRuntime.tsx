"use client";

/**
 * The master render loop.
 *
 * One `useFrame` at priority 1 takes rendering away from react-three-fiber
 * entirely (any subscriber above priority 0 does), so nothing is drawn except
 * from here. Every scene component's own `useFrame` runs at the default
 * priority 0, which R3F guarantees to execute first — so cameras and uniforms
 * are always current by the time this callback draws them.
 *
 * Per frame:
 *
 *   1. re-measure every registered slot against the viewport,
 *   2. clear the whole canvas to transparent — the parts of the page that
 *      have no scene must show the DOM through,
 *   3. for each scene whose slot is on screen, set the viewport *and* the
 *      scissor to that slot's rectangle, clear depth, and render.
 *
 * The scissor is what keeps a single full-viewport canvas honest: the hero
 * water can only ever paint inside the band the hero's own layout gave it.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { getSceneSlot } from "@/components/scene/SceneSlot";
import { capturePxlSnapshot, pxlSnapshotPending } from "@/webgl/scenes/pxl/pxlSnapshot";
import { rendersWhenHidden } from "./quality";
import { stageScenes } from "./sceneRegistry";
import { measureSlot, readViewport, stage } from "./stageState";

/** Frame-time smoothing for the debug readout. Nothing renders off this. */
const FRAME_SMOOTHING = 0.09;

/** Identity of a slot's box on screen, to the pixel. */
function boxKey(b: { left: number; top: number; width: number; height: number }): string {
  return `${Math.round(b.left)}:${Math.round(b.top)}:${Math.round(b.width)}:${Math.round(
    b.height,
  )}:${Math.round(stage.dpr * 100)}`;
}

export function StageRuntime() {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);

  /** Last drawn rect per scene, so a static scene knows when it must redraw. */
  const drawn = useRef(new Map<string, string>());
  /** Whether the canvas currently holds pixels that will need clearing. */
  const painted = useRef(false);
  /** Development QA only — see `rendersWhenHidden`. Resolved once. */
  const ignoreHidden = useRef(false);

  useEffect(() => {
    ignoreHidden.current = rendersWhenHidden();
  }, []);

  useEffect(() => {
    readViewport();
    stage.dpr = gl.getPixelRatio();
  }, [gl, size]);

  useFrame((_, delta) => {
    const started = performance.now();

    // A hidden tab still services rAF in some browsers; there is nothing to
    // draw and no reason to spend a frame finding that out twice.
    if (document.hidden && !ignoreHidden.current) return;

    readViewport();
    stage.dpr = gl.getPixelRatio();
    if (!stage.reducedMotion) stage.time += Math.min(delta, 1 / 20);

    const entries = stageScenes();

    // Measure first: the visibility test below has to agree for every scene
    // in a frame, and getBoundingClientRect is the only source of truth once
    // Lenis is translating the document.
    let anyVisible = false;
    for (const entry of entries) {
      const slot = getSceneSlot(entry.id);
      if (!slot) continue;
      const bounds = measureSlot(entry.id, slot.el);
      if (bounds.visible) anyVisible = true;
    }

    if (!anyVisible) {
      // One last clear on the way out, and only one.
      //
      // Skipping the frame is what makes an off-screen scene free — but a
      // canvas that is not drawn to keeps showing the last frame it presented.
      // Leave without this and the hero's band of water stays painted where it
      // was when it went out of view, frozen over whatever section has scrolled
      // into its place. Costing one clear to leave the canvas genuinely empty
      // is the whole difference between "cheap" and "broken".
      if (painted.current) {
        gl.setScissorTest(false);
        gl.clear(true, true, true);
        painted.current = false;
      }
      return;
    }

    // Clearing is global, so a frame is all-or-nothing: if one visible scene
    // redraws, every visible scene must, or the clear would erase the others.
    // A frame in which nothing has changed issues no GL calls at all, and the
    // canvas simply keeps the image it last presented — which is what makes
    // the reduced-motion scene cost one render rather than sixty a second.
    let needsDraw = false;
    for (const entry of entries) {
      const bounds = stage.slots[entry.id];
      if (!bounds?.visible) continue;
      if (entry.animated || entry.dirty || drawn.current.get(entry.id) !== boxKey(bounds)) {
        needsDraw = true;
        break;
      }
    }
    if (!needsDraw) return;

    const canvasH = size.height;
    let cleared = false;

    for (const entry of entries) {
      const bounds = stage.slots[entry.id];
      if (!bounds?.visible) continue;
      drawn.current.set(entry.id, boxKey(bounds));
      entry.dirty = false;

      if (!cleared) {
        // Transparent everywhere. Sections with no scene show the DOM through.
        gl.setScissorTest(false);
        gl.clear(true, true, true);
        cleared = true;
      }

      // WebGL's origin is bottom-left; the DOM's is top-left.
      const x = bounds.left;
      const y = canvasH - (bounds.top + bounds.height);
      gl.setViewport(x, y, bounds.width, bounds.height);
      gl.setScissor(x, y, bounds.width, bounds.height);
      gl.setScissorTest(true);
      gl.clear(false, true, false); // depth only — the colour clear was global

      gl.render(entry.scene, entry.camera);

      /* The one moment a snapshot can be taken.
         The canvas has `preserveDrawingBuffer: false`, so these pixels exist
         until the browser composites and not one instruction longer — a
         `toDataURL` from a click handler reads a blank buffer. Reading here,
         synchronously, immediately after the draw, is the whole technique. See
         `pxlSnapshot`. Costs nothing on every frame nobody asked. */
      if (entry.id === "pxl-product" && pxlSnapshotPending()) {
        capturePxlSnapshot(gl, bounds);
      }
    }

    if (cleared) {
      painted.current = true;
      gl.setScissorTest(false);
      if (!stage.ready) stage.ready = true;
      stage.drawCalls = gl.info.render.calls;
      stage.triangles = gl.info.render.triangles;
    }

    const elapsed = performance.now() - started;
    stage.frameMs += (elapsed - stage.frameMs) * FRAME_SMOOTHING;
  }, 1);

  return null;
}
