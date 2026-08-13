"use client";

/**
 * CONFIGURATION SNAPSHOT — §34.
 *
 * A picture of the boat as it currently stands: the vessel, the chosen finish,
 * the studio, and nothing else. No interface, no swatches, no watermark.
 *
 * THE HARD PART IS NOT DRAWING IT — the renderer draws it sixty times a second
 * already. The hard part is that the canvas is created with
 * `preserveDrawingBuffer: false`, which is the right setting for a
 * full-viewport canvas on every page of a site (the alternative costs a second
 * full-size buffer and a copy per frame, permanently, so that a feature almost
 * nobody uses can work at any time). With it off, the drawing buffer is valid
 * only until the browser composites — so `toDataURL` called from an event
 * handler reliably returns a blank image, which is the failure mode §34 warns
 * about.
 *
 * The way out is not to turn the flag on. It is to read the buffer at the one
 * moment it is guaranteed to hold the frame: synchronously, inside the render
 * loop, immediately after the draw. `StageRuntime` calls `capturePxlSnapshot`
 * there; everything else here is the machinery for asking it to.
 *
 * WHAT IS CAPTURED. The PXL scene's own scissor rectangle, not the whole
 * canvas — the canvas is the viewport and most of it is transparent. The crop
 * is taken in device pixels, so a 2× display produces a 2× image, and a cap
 * keeps a very large window on a very high-DPR display from producing a
 * needlessly enormous PNG.
 *
 * IF IT DOES NOT WORK, NOTHING BREAKS. Every path resolves to null rather than
 * throwing, the request times out if no frame arrives, and the caller's
 * response to null is to not offer the action. §34: this must not block the
 * phase.
 */

import type { WebGLRenderer } from "three";
import { invalidateStageScene } from "@/webgl/stage/sceneRegistry";
import type { SlotBounds } from "@/webgl/stage/stageState";

/** Longest edge of a snapshot, in device pixels. */
const MAX_EDGE = 2400;
/** Frames to wait for a capture before giving up. Generous; nothing hangs. */
const TIMEOUT_MS = 2000;

interface PendingSnapshot {
  resolve: (blob: Blob | null) => void;
  timer: number;
}

let pending: PendingSnapshot | null = null;

/** True when the render loop should capture on its next PXL draw. */
export function pxlSnapshotPending(): boolean {
  return pending !== null;
}

/**
 * Ask for a snapshot of the next frame.
 *
 * Resolves with a PNG blob, or null if the scene is not running, the frame
 * never arrives, or the browser refuses the read. Callers must handle null —
 * see the file note.
 */
export function requestPxlSnapshot(): Promise<Blob | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  // A second request while one is outstanding replaces it. Two snapshots of
  // frames a sixtieth of a second apart is not a feature.
  settle(null);
  return new Promise<Blob | null>((resolve) => {
    const timer = window.setTimeout(() => settle(null), TIMEOUT_MS);
    pending = { resolve, timer };
    // A composed, untouched product shot is a *static* scene: the runtime draws
    // it when its box moves and not otherwise, so without this the capture
    // would wait for a frame that has no reason to happen and time out.
    invalidateStageScene("pxl-product");
  });
}

function settle(blob: Blob | null): void {
  if (!pending) return;
  const { resolve, timer } = pending;
  pending = null;
  window.clearTimeout(timer);
  resolve(blob);
}

/**
 * Copy the PXL's rectangle out of the drawing buffer. Called from the render
 * loop, immediately after the scene has been drawn, and from nowhere else.
 *
 * The copy into the 2D canvas is synchronous, which is the part that has to
 * happen inside the frame; `toBlob` afterwards is asynchronous and safe,
 * because by then the pixels are in a canvas we own.
 */
export function capturePxlSnapshot(gl: WebGLRenderer, bounds: SlotBounds): void {
  if (!pending) return;
  try {
    const source = gl.domElement;
    const dpr = gl.getPixelRatio();
    const sx = Math.round(bounds.left * dpr);
    const sy = Math.round(bounds.top * dpr);
    const sw = Math.round(bounds.width * dpr);
    const sh = Math.round(bounds.height * dpr);
    if (sw < 8 || sh < 8) return settle(null);

    const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
    const out = document.createElement("canvas");
    out.width = Math.round(sw * scale);
    out.height = Math.round(sh * scale);
    const ctx = out.getContext("2d");
    if (!ctx) return settle(null);

    // The backdrop sphere fills the scissor rectangle, so the source is opaque
    // and no ground fill is needed. Drawing one anyway would be a guess about a
    // colour the scene already decided.
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height);
    out.toBlob((blob) => settle(blob), "image/png");
  } catch {
    // A tainted or unreadable buffer is a browser policy decision, not a bug to
    // report. The caller hides the action and the configurator carries on.
    settle(null);
  }
}

/**
 * A filename that says what the picture is of, without claiming anything.
 *
 * The finish travels as its slug — the stable public identifier — rather than
 * as a working name, so a file that outlives this phase does not carry an
 * unapproved colour name into somebody's downloads folder.
 */
export function snapshotFilename(query: string): string {
  const suffix = query ? query.replace(/[^a-z0-9]+/gi, "-").toLowerCase() : "default";
  return `duna-pxl-${suffix}.png`;
}
