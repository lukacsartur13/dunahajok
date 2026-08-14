"use client";

/**
 * DETERMINISTIC FRAME RENDERING. §23, §24, §25.
 *
 * ── THE PROBLEM THIS SOLVES ────────────────────────────────────────────────
 *
 * Every phase of this project has been unable to look at its own WebGL output.
 * The automated browsers available to review it report `document.hidden === true`
 * permanently — they are, as far as the page is concerned, a backgrounded tab —
 * and two separate mechanisms then conspire to leave the canvas empty:
 *
 *   1. `StageRuntime` skips every frame while `document.hidden` is true, which
 *      is correct behaviour and which `?render=always` already overrides;
 *   2. requestAnimationFrame is not serviced AT ALL in such a tab, so the loop
 *      that would honour the override never runs. `?render=always` turns off a
 *      guard inside a callback that is never called.
 *
 * That second one is the real problem and no flag can fix it, because the fix
 * has to happen outside the frame loop. Every previous phase recorded the
 * limitation and moved on; §23 says not to accept it.
 *
 * ── WHAT THIS DOES INSTEAD ────────────────────────────────────────────────
 *
 * It renders WITHOUT the frame loop. `gl.render()` is an ordinary function call
 * — nothing about three requires it to be made from rAF — so this module takes
 * the scene, the camera and the renderer that `PxlProductScene` already owns,
 * puts them into an exactly specified state, sets the viewport and the scissor
 * the way `StageRuntime` would have, and draws one frame synchronously from
 * whatever called it.
 *
 * "Exactly specified" is the other half of §23, and it is the half that makes
 * the output a RECORD rather than a screenshot. A frame drawn from the live
 * scene would carry whatever the arrival animation, the idle breath, the orbit
 * and the material transition happened to be holding. So `renderPxlFrame` sets
 * all of them:
 *
 *   configuration   parsed from a query string and applied with no transition
 *   camera          a named preset, resolved for the slot, no orbit, no idle
 *   sweep progress  written straight into the material's uniforms, 0 → 1
 *   time            fixed, so the water and the environment are reproducible
 *
 * The same inputs produce the same pixels on any machine, which is what §24's
 * matrix and §25's five sweep samples need to mean anything.
 *
 * ── WHY IT CANNOT AFFECT PRODUCTION ───────────────────────────────────────
 *
 * §23 is explicit: do not alter production behaviour. Nothing here is called
 * from the render path — `PxlProductScene` registers a bridge and that is all —
 * and every entry point is behind `process.env.NODE_ENV !== "production"`, which
 * the bundler resolves at build time. In a production build `installPxlQa` has
 * an empty body and `window.__pxlQa` is never defined.
 */

import type { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import type { SlotBounds } from "@/webgl/stage/stageState";
import { measureSlot, readViewport, stage } from "@/webgl/stage/stageState";
import { getSceneSlot, setSceneActive } from "@/components/scene/SceneSlot";
import { applyPxlCamera, resolvePreset } from "./pxlCamera";
import { PXL_PRESET_BY_ID, type PxlPresetId } from "./pxlPresets";
import { parseConfiguration } from "./pxlConfig";
import { PXL_VISUAL_CASES, PXL_VISUAL_TOLERANCE } from "./pxlVisualCases";
import { applyConfiguration, type PxlVesselHandle } from "./PxlVessel";

/** What the scene hands over. Registered once, on mount. */
export interface PxlQaBridge {
  gl: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  bounds: () => SlotBounds;
  vessel: () => PxlVesselHandle | null;
  /** Set the river's clock, when the water backdrop is on. */
  setTime: (seconds: number) => void;
}

/** One frame's complete state. Every field optional; every default stated. */
export interface PxlFrameSpec {
  /** A configurator query string — `exterior=navy&lower=body`. Default: the delivered boat. */
  configuration?: string;
  /** A preset id, including the reference compositions. Default: `reference_side`. */
  camera?: PxlPresetId;
  /**
   * Where the Duna Line's material sweep has got to, 0 → 1. §25.
   *
   * Undefined means "no sweep in progress", which is not the same as 1: at 1 the
   * boundary has left the transom and the material is uniformly the destination,
   * which is what a settled hull looks like and is what `undefined` also
   * produces. The difference is that an explicit 1 asserts the sweep ran.
   */
  sweep?: number;
  /** Scene clock, seconds. Fixed so water and drift are reproducible. */
  time?: number;
}

interface PxlQaApi {
  ready: () => boolean;
  render: (spec?: PxlFrameSpec) => { ok: boolean; width: number; height: number; reason?: string };
  capture: (spec?: PxlFrameSpec) => string | null;
  /** Render a list of frames and lay the results out as DOM images. §24. */
  sheet: (frames: { label: string; spec: PxlFrameSpec }[], columns?: number) => number;
  clearSheet: () => void;
  state: () => Record<string, unknown>;
  /** What colour every zone actually ended up. §27. */
  zones: () => PxlZoneReport[];
  /** §36 — every declared configuration pair, as a pixel diff. */
  visual: () => PxlVisualResult[];
}

/**
 * WHAT A ZONE ACTUALLY ENDED UP, as opposed to what it was asked for.
 *
 * §27 wants six finishes judged under one light, and §15 wants the interior
 * checked against the reference cognac. Both of those are questions about the
 * material a zone is WEARING, and the honest way to answer them is to read it
 * off the material rather than off the catalogue that was supposed to reach it.
 *
 * The distinction stopped being academic in Phase 4.1: three interior finishes
 * rendered to identical pixels, which looks from the outside like a colour
 * problem and was actually a zone that no finish was addressed to. A screenshot
 * cannot tell those apart. This can.
 */
export interface PxlZoneReport {
  zone: string;
  role: string;
  /** The material's live colour, as the renderer holds it. */
  colour: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  /** Triangles, so a zone reported empty is distinguishable from one unlit. */
  triangles: number;
  visible: boolean;
  /**
   * Is the material this handle repaints the one the mesh actually draws with?
   *
   * False means every configuration change is being written to an orphan, which
   * renders as a boat that ignores the configurator while every value in the
   * store reads correct. Worth a field of its own because it is invisible from
   * both ends: the catalogue is right, the handle is right, and the pixels are
   * wrong.
   */
  attached: boolean;
}

declare global {
  interface Window {
    __pxlQa?: PxlQaApi;
  }
}

let bridge: PxlQaBridge | null = null;

/**
 * Hand the renderer over. Called from the scene's mount effect, in development
 * only; the production build compiles this to nothing.
 */
export function registerPxlQa(next: PxlQaBridge | null): void {
  if (process.env.NODE_ENV === "production") return;
  bridge = next;
}

/** True when the QA surfaces should be reachable at all. */
export function pxlQaEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("pxlQa") === "1" || params.get("pxlReference") === "1";
}

/* The measurement kick that makes any of this reachable at all lives in
   `stage/quality.ts` and is fired by `WebGLStage`. It cannot live here: this
   module is inside the lazily-loaded PXL chunk, and that chunk is not fetched
   until R3F renders the element that imports it — which is precisely what the
   unmeasured canvas prevents. See `kickCanvasMeasurement` for the diagnosis. */

/* ── The frame ────────────────────────────────────────────────────────────*/

const DEFAULT_SPEC: Required<Omit<PxlFrameSpec, "sweep">> = {
  configuration: "",
  camera: "reference_side",
  /**
   * A fixed clock, and not zero.
   *
   * Zero is the one value at which several of the scene's procedural fields are
   * degenerate — the water's noise is at its lattice origin and the drift is
   * exactly nil — so a frame at t = 0 is reproducible and unrepresentative. 12.0
   * is far enough in that everything has settled and is still an integer, which
   * matters only because somebody will type it by hand.
   */
  time: 12,
};

/**
 * Put the scene into an exactly specified state and draw one frame.
 *
 * Synchronous, and deliberately so: the caller — a test, an automated browser, a
 * contact-sheet builder — needs the pixels to exist by the time the call
 * returns, because `preserveDrawingBuffer` is false and the drawing buffer is
 * valid only until the browser composites.
 */
export function renderPxlFrame(spec: PxlFrameSpec = {}): {
  ok: boolean;
  width: number;
  height: number;
  reason?: string;
} {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, width: 0, height: 0, reason: "production" };
  }
  if (!bridge) return { ok: false, width: 0, height: 0, reason: "no scene mounted" };

  const vessel = bridge.vessel();
  if (!vessel) return { ok: false, width: 0, height: 0, reason: "model not loaded" };

  /* MEASURE THE SLOT HERE, because nothing else will.
     `StageRuntime` re-measures every registered slot at the top of each frame,
     and that is the only place it happens — so in a tab where the frame loop
     never runs, `stage.slots` holds a zero-sized box that was never filled in.
     The measurement is a `getBoundingClientRect` and costs nothing; skipping it
     was worth one wasted debugging pass to learn. */
  readViewport();
  const slot = getSceneSlot("pxl-product");
  if (!slot) return { ok: false, width: 0, height: 0, reason: "no pxl-product slot" };
  const box = measureSlot("pxl-product", slot.el);
  if (box.width < 8 || box.height < 8) {
    return { ok: false, width: 0, height: 0, reason: "slot has no size" };
  }

  const camera = spec.camera ?? DEFAULT_SPEC.camera;
  const preset = PXL_PRESET_BY_ID.get(camera);
  if (!preset) return { ok: false, width: 0, height: 0, reason: `unknown preset ${camera}` };

  /* 1. Configuration, applied with `immediate` so nothing is left mid-blend.
        Parsed from a query string rather than taken as an object because that is
        the form a caller already has — it is the same string the address bar
        carries and the same one `parseConfiguration` sanitises. */
  const { configuration } = parseConfiguration(spec.configuration ?? DEFAULT_SPEC.configuration);
  applyConfiguration(vessel, configuration, true);

  /* 2. The sweep. §25.
        Written straight into the uniforms rather than driven by advancing a
        clock, because the point is to sample the effect at five exact places
        rather than to hope a timer lands near them. The arithmetic mirrors
        `tickVessel`'s: the same cubic ease and the same overshoot, so the frame
        at 0.5 is genuinely the frame the animation passes through.

        A sweep needs somewhere to travel FROM, and an immediate application has
        just erased it — so the swept zones are re-armed here from the finish the
        hull is not wearing. Without that the boundary would separate two
        identical colours and every sample would look like the settled hull. */
  if (spec.sweep !== undefined) {
    const t = Math.min(1, Math.max(0, spec.sweep));
    const eased = 1 - Math.pow(1 - t, 3);
    for (const handle of vessel.zones.values()) {
      if (!handle.sweep) continue;
      handle.sweepT = t;
      handle.sweep.uPxlSweepEdge.value.x = SWEEP_FROM + (SWEEP_TO - SWEEP_FROM) * eased;
    }
  }

  /* 3. Time. */
  const time = spec.time ?? DEFAULT_SPEC.time;
  stage.time = time;
  bridge.setTime(time);

  /* 4. Camera. Resolved for the slot's own width, exactly as the live scene
        does — the presets are responsive, so a frame rendered at a fixed camera
        state would not be the frame a viewer at this width sees. No orbit, no
        arrival, no idle: none of them is applied here at all. */
  const state = resolvePreset(preset, box.width);
  applyPxlCamera(bridge.camera, state, box.width / Math.max(box.height, 1));
  bridge.camera.updateMatrixWorld();

  /* 5. Draw, with the same viewport and scissor `StageRuntime` would have used.
        WebGL's origin is bottom-left and the DOM's is top-left, which is the one
        conversion worth writing out rather than reusing: `StageRuntime`'s copy
        lives inside its frame callback, and calling into that callback is
        precisely what this module exists to avoid. */
  const { gl, scene } = bridge;
  const canvasHeight = gl.domElement.height / gl.getPixelRatio();
  const x = box.left;
  const y = canvasHeight - (box.top + box.height);

  gl.setScissorTest(false);
  gl.clear(true, true, true);
  gl.setViewport(x, y, box.width, box.height);
  gl.setScissor(x, y, box.width, box.height);
  gl.setScissorTest(true);
  gl.clear(false, true, false);
  gl.render(scene, bridge.camera);
  gl.setScissorTest(false);

  return { ok: true, width: box.width, height: box.height };
}

/* The sweep's own travel, restated. `PxlVessel` keeps these private because
   nothing else drives the boundary; this module does, and importing them would
   mean exporting two constants from a component module purely so a development
   tool could read them. They are asserted equal by the configurator tests. */
const SWEEP_FROM = 1.09;
const SWEEP_TO = -0.09;

/**
 * Render a frame and read it back as a PNG data URL.
 *
 * THE READ HAPPENS IN THE SAME TASK AS THE DRAW, which is the whole technique —
 * see `pxlSnapshot`, which does the same thing from inside the render loop. With
 * `preserveDrawingBuffer: false` the buffer survives until the browser
 * composites and not one instruction longer, so a `toDataURL` from a later tick
 * reliably returns a blank image.
 */
export function capturePxlFrame(spec: PxlFrameSpec = {}): string | null {
  if (process.env.NODE_ENV === "production") return null;
  const result = renderPxlFrame(spec);
  if (!result.ok || !bridge) return null;

  const { gl } = bridge;
  const box = bridge.bounds();
  const dpr = gl.getPixelRatio();
  const sx = Math.round(box.left * dpr);
  const sy = Math.round(box.top * dpr);
  const sw = Math.round(box.width * dpr);
  const sh = Math.round(box.height * dpr);

  const out = document.createElement("canvas");
  out.width = sw;
  out.height = sh;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(gl.domElement, sx, sy, sw, sh, 0, 0, sw, sh);
  return out.toDataURL("image/png");
}

/* ── Visual regression ────────────────────────────────────────────────────*/

/**
 * Read the slot's pixels back into a buffer.
 *
 * `readRenderTargetPixels` is not usable here — the frame was drawn to the
 * default framebuffer, not to a target — so this goes through the same 2D
 * canvas `capturePxlFrame` uses and takes the `ImageData` instead of a data
 * URL. Both have to run before the browser composites, because
 * `preserveDrawingBuffer` is false.
 */
function readFramePixels(spec: PxlFrameSpec): ImageData | null {
  const result = renderPxlFrame(spec);
  if (!result.ok || !bridge) return null;
  const { gl } = bridge;
  const box = bridge.bounds();
  const dpr = gl.getPixelRatio();
  const sw = Math.round(box.width * dpr);
  const sh = Math.round(box.height * dpr);
  const out = document.createElement("canvas");
  out.width = sw;
  out.height = sh;
  const ctx = out.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(
    gl.domElement,
    Math.round(box.left * dpr), Math.round(box.top * dpr), sw, sh,
    0, 0, sw, sh,
  );
  return ctx.getImageData(0, 0, sw, sh);
}

export interface PxlVisualResult {
  id: string;
  requirement: string;
  /** Fraction of the frame whose pixels differ by more than the tolerance. */
  changed: number;
  /** Required floor, from `PXL_VISUAL_CASES`. */
  minChanged: number;
  /** Mean absolute per-channel difference over the whole frame, 0–255. */
  meanDelta: number;
  pass: boolean;
  reason?: string;
}

/**
 * §36 — RUN EVERY DECLARED CONFIGURATION PAIR AND COUNT WHAT MOVED.
 *
 * The two frames are drawn back to back from the same camera with the same
 * clock and no transition, so the ONLY difference between them is the
 * configuration. Anything that changes is therefore attributable, and anything
 * that does not change is a control that does nothing.
 *
 * A zero diff fails, which §36 requires — but so does a diff below the case's
 * own floor, because "not zero" is too weak a test. A single anti-aliased edge
 * moving by one pixel is not zero and is not a configurator working either.
 */
export function runPxlVisualCases(): PxlVisualResult[] {
  if (process.env.NODE_ENV === "production") return [];
  const out: PxlVisualResult[] = [];
  for (const c of PXL_VISUAL_CASES) {
    const base = { id: c.id, requirement: c.requirement, minChanged: c.minChanged };
    const a = readFramePixels({ configuration: c.a, camera: c.camera as PxlPresetId });
    const b = readFramePixels({ configuration: c.b, camera: c.camera as PxlPresetId });
    if (!a || !b || a.data.length !== b.data.length) {
      out.push({ ...base, changed: 0, meanDelta: 0, pass: false, reason: "no frame" });
      continue;
    }
    let changed = 0;
    let total = 0;
    const pixels = a.data.length / 4;
    for (let i = 0; i < a.data.length; i += 4) {
      const dr = Math.abs(a.data[i] - b.data[i]);
      const dg = Math.abs(a.data[i + 1] - b.data[i + 1]);
      const db = Math.abs(a.data[i + 2] - b.data[i + 2]);
      total += dr + dg + db;
      if (dr > PXL_VISUAL_TOLERANCE || dg > PXL_VISUAL_TOLERANCE || db > PXL_VISUAL_TOLERANCE) {
        changed += 1;
      }
    }
    const fraction = changed / pixels;
    out.push({
      ...base,
      changed: fraction,
      meanDelta: total / (pixels * 3),
      pass: fraction >= c.minChanged,
    });
  }
  return out;
}

/* ── The contact sheet ────────────────────────────────────────────────────*/

/**
 * §24 — THE MATRIX, AS DOM IMAGES RATHER THAN AS FILES.
 *
 * §24 asks for a screenshot matrix and says explicitly not to save hundreds of
 * files if that becomes wasteful. It does become wasteful, and there is a better
 * reason than economy to avoid it: a WebGL canvas in a hidden tab may never be
 * COMPOSITED even once it has been drawn, so a screenshot of the page can come
 * back showing an empty canvas over perfectly good pixels.
 *
 * An `<img>` has no such problem. So each frame is rendered, read back
 * synchronously as a data URL, and laid into an ordinary image element — after
 * which one screenshot of the page carries the whole matrix, every cell labelled
 * with the configuration that produced it.
 */
const SHEET_ID = "pxl-qa-sheet";

export function buildPxlSheet(
  frames: { label: string; spec: PxlFrameSpec }[],
  columns = 3,
): number {
  if (process.env.NODE_ENV === "production") return 0;
  clearPxlSheet();

  const sheet = document.createElement("div");
  sheet.id = SHEET_ID;
  sheet.setAttribute(
    "style",
    "position:fixed;inset:0;z-index:99999;overflow:auto;background:#0b0c0e;" +
      `display:grid;grid-template-columns:repeat(${columns},1fr);gap:6px;padding:6px;` +
      "font:11px/1.3 ui-monospace,monospace;color:#9aa3ab",
  );

  let drawn = 0;
  for (const frame of frames) {
    const cell = document.createElement("figure");
    cell.setAttribute("style", "margin:0;display:flex;flex-direction:column;gap:3px");
    const url = capturePxlFrame(frame.spec);
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.setAttribute("style", "width:100%;height:auto;display:block;background:#111");
      cell.appendChild(img);
      drawn += 1;
    } else {
      const failed = document.createElement("div");
      failed.textContent = "— not rendered —";
      failed.setAttribute("style", "aspect-ratio:16/10;display:grid;place-items:center;background:#1a1c1f");
      cell.appendChild(failed);
    }
    const caption = document.createElement("figcaption");
    caption.textContent = frame.label;
    cell.appendChild(caption);
    sheet.appendChild(cell);
  }

  document.body.appendChild(sheet);
  return drawn;
}

export function clearPxlSheet(): void {
  if (process.env.NODE_ENV === "production") return;
  document.getElementById(SHEET_ID)?.remove();
}

/**
 * Read every zone's live material. §15, §27.
 *
 * `getHexString` returns the colour in the working space three keeps it in,
 * which is linear-sRGB — so the value is comparable between zones and is NOT
 * directly comparable to a hex out of `pxlPalette`, which is authored in sRGB.
 * Reporting the raw value rather than a converted one is deliberate: the
 * conversion belongs to whoever is asking the question, and quietly applying it
 * here would hide the case where a zone is wearing a colour nobody authored.
 */
function readZones(): PxlZoneReport[] {
  const vessel = bridge?.vessel();
  if (!vessel) return [];

  return [...vessel.zones.entries()].map(([zone, handle]) => {
    const index = handle.mesh.geometry.getIndex();
    const position = handle.mesh.geometry.getAttribute("position");
    return {
      zone,
      role: handle.spec.role,
      colour: `#${handle.material.color.getHexString()}`,
      roughness: handle.material.roughness,
      metalness: handle.material.metalness,
      clearcoat: handle.material.clearcoat,
      triangles: Math.floor((index ? index.count : (position?.count ?? 0)) / 3),
      visible: handle.mesh.visible,
      attached: handle.mesh.material === handle.material,
    };
  });
}

/* ── Installation ─────────────────────────────────────────────────────────*/

/**
 * Publish the API on `window`.
 *
 * On `window` rather than as an export because the caller is not JavaScript in
 * this bundle — it is an automated browser evaluating an expression in the page,
 * or a developer at a console. Both need a name they can reach without a module
 * graph.
 *
 * CALLED AT MODULE SCOPE, not from an effect, and the difference matters. An
 * effect inside `PxlProductScene` only runs once R3F has mounted the scene —
 * which is exactly what does not happen in the environment this module exists
 * for. Installing here means `window.__pxlQa.state()` can be asked *why* the
 * scene has not mounted, instead of being undefined and leaving the caller to
 * guess. Same reason `pxlTelemetry` publishes itself at module scope.
 */
export function installPxlQa(): () => void {
  if (process.env.NODE_ENV === "production") return () => {};
  if (typeof window === "undefined") return () => {};

  window.__pxlQa = {
    ready: () => Boolean(bridge?.vessel()),
    render: (spec) => {
      /* Claiming the slot is part of rendering a QA frame, not a side effect of
         it. The scene normally takes the slot from its static fallback after a
         few rAF-driven warm-up frames — which in a hidden tab never happen — so
         without this the canvas draws correctly underneath a photograph that
         never goes away. */
      setSceneActive("pxl-product", true);
      return renderPxlFrame(spec);
    },
    capture: (spec) => {
      setSceneActive("pxl-product", true);
      return capturePxlFrame(spec);
    },
    sheet: (frames, columns) => {
      setSceneActive("pxl-product", true);
      return buildPxlSheet(frames, columns);
    },
    clearSheet: clearPxlSheet,
    state: () => {
      const vessel = bridge?.vessel();
      const box = bridge?.bounds();
      return {
        mounted: Boolean(bridge),
        loaded: Boolean(vessel),
        zones: vessel ? vessel.zones.size : 0,
        marks: vessel ? vessel.decals.map((d) => d.mesh.name) : [],
        screen: Boolean(vessel?.screen),
        slot: box ? { width: box.width, height: box.height, visible: box.visible } : null,
        dpr: bridge?.gl.getPixelRatio() ?? null,
      };
    },
    zones: readZones,
    visual: () => {
      setSceneActive("pxl-product", true);
      return runPxlVisualCases();
    },
  };

  return () => {
    delete window.__pxlQa;
  };
}

/* Installed on import, in development, in a browser. See `installPxlQa`. */
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  installPxlQa();
}
