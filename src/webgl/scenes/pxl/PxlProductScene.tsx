"use client";

/**
 * PXL PRODUCT SCENE.
 *
 * The PXL is a *product*, not a mood, and this scene is composed accordingly:
 * the vessel, a studio environment, an authored camera, and a controlled orbit
 * the viewer may nudge. Where the hero scene is a sequence driven by scroll,
 * this one is a state driven by configuration.
 *
 * It reuses everything Phase Two built and rewrites none of it. It mounts
 * through `StageScene` into the same single canvas, registers into the same
 * `sceneRegistry`, is scissored to its own `SceneSlot` by the same
 * `StageRuntime`, takes the same `QualityProfile`, honours the same
 * reduced-motion flag and hands its slot back to the DOM the same way when
 * WebGL is unavailable or the model fails to arrive.
 *
 * WATER IS OPTIONAL HERE, and off by default. The Phase Two `WaterSystem` is
 * an atmospheric Danube at dusk built around the hero's choreography — it is
 * beautiful and it is the wrong light to judge paint by (see `pxlLighting`).
 * `water` turns it on for the contexts that want the boat *on the river*
 * rather than in a studio; the waterline is the same either way, because the
 * model's origin is on it.
 *
 * NOTHING HERE SETS REACT STATE PER FRAME. The configuration lives in
 * `pxlStore`, the camera in a reused object, and the frame callback compares a
 * version counter. The component renders about four times in its life.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Color,
  LinearSRGBColorSpace,
  MathUtils,
  Raycaster,
  Vector2,
  type Object3D,
  type PerspectiveCamera,
} from "three";
import { setSceneActive } from "@/components/scene/SceneSlot";
import type { QualityProfile } from "@/webgl/stage/quality";
import { invalidateStageScene } from "@/webgl/stage/sceneRegistry";
import { stage } from "@/webgl/stage/stageState";
import { useStageScene } from "@/webgl/stage/StageScene";
import { Backdrop as RiverBackdrop } from "@/webgl/scenes/hero/Backdrop";
import { WaterSystem } from "@/webgl/scenes/hero/WaterSystem";
import { createHeroUniforms } from "@/webgl/scenes/hero/heroUniforms";
import { finishForRole } from "./pxlConfig";
import { PXL_MODEL, type PxlZone } from "./pxlModel";
import { finish } from "./pxlPalette";
import { PxlBackdrop } from "./PxlBackdrop";
import {
  PxlVessel,
  applyConfiguration,
  tickVessel,
  type PxlVesselHandle,
} from "./PxlVessel";
import {
  createNightState,
  nightBackdrop,
  nightEnvironment,
  primeNightLights,
  tickNight,
} from "./pxlNight";
import { pxlStore } from "./pxlStore";
import {
  PXL_DEFAULT_PRESET,
  PXL_PRESET_BY_ID,
  applyPxlCamera,
  blendStates,
  presetDuration,
  resolvePreset,
  type PxlCameraState,
  type PxlPresetId,
} from "./pxlCamera";
import { createPxlOrbit, type PxlOrbit } from "./pxlOrbit";
import {
  PXL_LID_ZONES,
  createLidStates,
  primeLids,
  settleLid,
  tickLids,
  toggleLid,
} from "./pxlLids";
import { createStudioEnvironment } from "./pxlLighting";
import { measureFraming, pxlTelemetry } from "./pxlTelemetry";
import { registerPxlQa } from "./pxlQa";

/** Frames drawn before the scene takes the slot from its static fallback. */
const WARMUP_FRAMES = 3;

export type PxlSceneStatus = "loading" | "ready" | "failed";

interface PxlProductSceneProps {
  quality: QualityProfile;
  reducedMotion: boolean;
  /** Which authored composition to hold. Changing it animates the move. */
  preset?: PxlPresetId;
  /** Let the viewer turn the boat. Off in editorial contexts. */
  interactive?: boolean;
  /**
   * Put the boat on the Phase Two river instead of in the studio. Same
   * vessel, same origin, same waterline — only the world around it changes.
   */
  water?: boolean;
  /**
   * §42's compositional arrival, and §15's idle.
   *
   * On for the configurator, off in editorial contexts. When it is on the
   * vessel does not simply appear at its preset: the camera resolves into the
   * composition from a slightly wider, higher stand-off, and then breathes once
   * and stops. Both are suppressed under reduced motion, and both are one-shot
   * — §15 is explicit that the default state is stillness, and a boat that
   * turns forever is a boat nobody can look at.
   */
  arrival?: boolean;
  /**
   * Let the studio answer the hull's own luminance. §17, §55.
   *
   * Off in editorial contexts, where the water and the sky are the subject and
   * a background that shifted under the vessel would read as a grade change.
   */
  adaptive?: boolean;
  /**
   * §4.9 — night. The boat falls to a silhouette and the speaker rings become
   * the only source in the scene. Presentation, not configuration.
   */
  night?: boolean;
  /** Told when the model resolves, or definitively does not. */
  onStatusChange?: (status: PxlSceneStatus) => void;
  /** Exposed so a viewer can read what is actually on screen. */
  onZonesReady?: (vessel: PxlVesselHandle) => void;
}

function emptyState(): PxlCameraState {
  return { azimuth: 0, elevation: 0, distance: 10, hfov: 30, minVfov: 0, target: [0, 0, 0] };
}

/* ── Adaptive backdrop ─────────────────────────────────────────────────────*/

/**
 * How far the studio may answer the hull. ±12% on the backdrop, and nothing else.
 *
 * §17 asks that no finish disappear into the background and §55 asks that the
 * help be bounded and honest. Those pull in opposite directions and the
 * resolution is *what* is allowed to move: the backdrop gradient, yes — the
 * environment map, never. The boat is lit identically in all six finishes, so
 * two configurations compared side by side are comparable; what changes is the
 * room's own value, by an amount too small to re-grade anything and large enough
 * that the black hull keeps an edge and the white one stops fusing with the sky.
 *
 * Twelve per cent is where the effect stops being visible as an effect. At
 * twenty the backdrop visibly pumps on every swatch click; at five the black
 * hull is still short of separation on a bright display.
 */
const LIFT_RANGE = 0.12;
/** Seconds for the backdrop to answer a change. Slower than the sweep, on purpose. */
const LIFT_SETTLE = 0.42;

const _liftColour = new Color();

/**
 * Perceptual luminance of a finish, 0–1.
 *
 * Read off the sRGB authoring value rather than the linear one. The question
 * being asked is "how light does this paint look", which is a perceptual
 * question, and linear luminance answers a photometric one — it would call the
 * sage study far darker than the eye does and over-correct the room for it.
 */
function finishLuminance(hex: string): number {
  // Declaring the input "already linear" is what suppresses the transform, so
  // r/g/b come back as the authored bytes rather than as light.
  _liftColour.setStyle(hex, LinearSRGBColorSpace);
  return 0.2126 * _liftColour.r + 0.7152 * _liftColour.g + 0.0722 * _liftColour.b;
}

export function PxlProductScene({
  quality,
  reducedMotion,
  preset = PXL_DEFAULT_PRESET,
  interactive = false,
  water = false,
  arrival = false,
  adaptive = false,
  night = false,
  onStatusChange,
  onZonesReady,
}: PxlProductSceneProps) {
  const { id, camera, bounds } = useStageScene();
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  const vessel = useRef<PxlVesselHandle | null>(null);
  /** The loaded root, kept for the framing measurement. */
  const model = useRef<Object3D | null>(null);
  const appliedVersion = useRef(-1);
  const warmup = useRef(0);
  const orbit = useRef<PxlOrbit | null>(null);
  /** §4.9 — the four seat lids, and whether the pointer is over one. */
  const lids = useRef(createLidStates());
  const hovering = useRef(false);
  /** §4.9 — the night transition, and the four lights it turns up. */
  const nightState = useRef(createNightState());

  /* Reused across frames — see the note in `cameraRig`. */
  const from = useRef<PxlCameraState>(emptyState());
  const to = useRef<PxlCameraState>(emptyState());
  const live = useRef<PxlCameraState>(emptyState());
  const transition = useRef(1);
  /** Seconds the move in progress is scheduled to take. See `presetDuration`. */
  const transitionSeconds = useRef(1);
  const activePreset = useRef<PxlPresetId>(preset);
  /**
   * FREE mode's frozen composition.
   *
   * A derived preset has no authored state of its own: on entry it adopts
   * wherever the camera is and holds it, so a viewer who has turned the boat
   * and then resized the window is not quietly re-composed underneath. Null
   * whenever the active preset is an authored one.
   */
  const frozen = useRef<PxlCameraState | null>(null);

  /**
   * §42's arrival, armed once when the model resolves and disarmed by the frame
   * that consumes it. A ref rather than an effect because it has to fire on the
   * first frame the composition is *known* — which is after the slot has been
   * measured, and therefore inside the frame callback, not beside it.
   */
  const arrivalPending = useRef(false);
  /** Seconds since the arrival settled. Drives the idle breath, then stops. */
  const idle = useRef({ t: 0, live: false });

  /**
   * The backdrop's own gain. A uniform object, shared with the backdrop
   * material and eased in place — see `LIFT_RANGE`.
   */
  const lift = useMemo(() => ({ value: 0 }), []);

  const [status, setStatus] = useState<PxlSceneStatus>("loading");
  /**
   * Bumped when a lost context comes back.
   *
   * Losing the context hands the slot to the fallback render, which is right.
   * Getting it back has to hand the slot forward again — and the claim below
   * is keyed on the model resolving, which already happened. Without a second
   * key the scene stays alive, drawing correctly, behind a static image
   * nobody will ever remove.
   */
  const [restored, setRestored] = useState(0);

  /**
   * The river, when it is asked for.
   *
   * These are the hero's own uniforms, held at a calm, non-choreographed
   * state: the boat is at rest, so there is no wake, the surface is barely
   * moving, and the graphic hairline the hero ends on never engages. The
   * vessel needs no vertical offset — the model's origin is on the visual
   * waterline and the water is the plane y = 0, which is the entire reason
   * the pipeline puts the origin where it does.
   */
  const riverUniforms = useMemo(() => {
    const u = createHeroUniforms();
    u.uFade.value = 1;
    u.uWaveAmp.value = 0.34;
    u.uWakeSpeed.value = 0;
    u.uWakeLength.value = 8;
    u.uWakeLift.value = 0.03;
    u.uLineify.value = 0;
    u.uHullHalf.value.set(PXL_MODEL.loa / 2, PXL_MODEL.beam / 2);
    u.uHullShade.value = 0.4;
    // The hero measures a raked mask off its own section's CSS. This scene has
    // no rake, so the mask is set to a rectangle that can never clip anything.
    u.uRake.value.set(0, 1e6, 1e6, 0);
    return u;
  }, []);

  const onReady = useCallback(
    (handle: PxlVesselHandle) => {
      vessel.current = handle;
      model.current = handle.root;
      // §4.9 — the seats' own zero, taken once, before anything can move one.
      primeLids(lids.current, (zone) => handle.zones.get(zone)?.mesh ?? null);
      // …and a real light at each speaker ring, read off the rings themselves.
      primeNightLights(nightState.current, handle.root,
                       handle.zones.get("speaker_light")?.mesh ?? null);
      appliedVersion.current = -1;              // force the first paint
      // `?sceneDebug=1` reports how the vessel on screen is represented. On
      // this route it is a real mesh, and saying so keeps the panel honest
      // rather than leaving it on the hero's "loading".
      stage.vesselSource = "model";
      arrivalPending.current = true;
      setStatus("ready");
      onZonesReady?.(handle);
    },
    [onZonesReady],
  );

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  /* ── The studio ─────────────────────────────────────────────────────────
     Built once against this renderer and attached to *this* scene's
     `environment`, not the root's: `StageScene` portals each scene into its
     own THREE.Scene precisely so the hero's dusk and the PXL's studio cannot
     leak into one another.                                                  */
  useEffect(() => {
    const studio = createStudioEnvironment(gl);
    scene.environment = studio.texture;
    // Even on the river the studio stays the *reflection* source. The hero's
    // sky is a gradient with no key in it — beautiful behind a silhouette,
    // and unable to put a highlight on a hull. Keeping the environment while
    // changing the backdrop is what lets the boat sit on the Danube and still
    // be readable as painted composite.
    invalidateStageScene(id);
    return () => {
      scene.environment = null;
      studio.dispose();
    };
  }, [gl, scene, id]);

  /* ── §23 — the deterministic QA bridge ──────────────────────────────────
     Registration only. Nothing below runs from the frame callback and nothing
     in the callback knows this exists; `pxlQa` compiles to an empty body in a
     production build, so this effect's body does too. What it hands over is the
     four things a frame needs and this component already owns — the renderer,
     the scene, the camera and the slot — plus a reader for the vessel, which
     resolves later than the effect does.                                     */
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    registerPxlQa({
      gl,
      scene,
      camera: camera as PerspectiveCamera,
      bounds,
      vessel: () => vessel.current,
      setTime: (seconds) => {
        riverUniforms.uTime.value = seconds;
        riverUniforms.uDrift.value = reducedMotion ? 0 : seconds * 0.16;
      },
    });
    /* Registration only — `pxlQa` installs its own `window` API on import, so
       that a caller can ask why the scene has not mounted rather than finding
       nothing there to ask. */
    return () => registerPxlQa(null);
  }, [gl, scene, camera, bounds, riverUniforms, reducedMotion]);

  /* ── Input ──────────────────────────────────────────────────────────────
     Bound to the slot element rather than the canvas — see `pxlOrbit`.

     §4.9 — AND PICKING, WHICH SHARES THE SAME ELEMENT AND THE SAME GESTURE.
     TWO RAYCASTS, CHEAP ONE FIRST, and the pair is the whole design. Hitting
     the four lids' own triangles answers "is the pointer over a seat" for
     almost nothing, and on the overwhelming majority of pointer moves it
     answers no and stops there. But it is not the question: from ahead the
     console stands in front of the driver's seat, and a test against the lids
     alone would open the locker when somebody clicked the dash. So a hit is
     confirmed against the whole vessel — 32,000 triangles, run only when the
     pointer is already inside a lid's silhouette, which is rare and brief. */
  useEffect(() => {
    if (!interactive) return;
    const element = document.querySelector<HTMLElement>(`[data-scene="${id}"]`);
    if (!element) return;

    const ndc = new Vector2();
    const picker = new Raycaster();
    const lidMesh = (zone: PxlZone) => vessel.current?.zones.get(zone)?.mesh ?? null;

    /* The pointer, in the SLOT's own normalised coordinates. The slot is not
       the canvas and is not the window — one canvas serves every section of
       the site — so neither of those rectangles would put the ray where the
       viewer is looking. */
    const aim = (x: number, y: number): PxlZone | null => {
      const root = vessel.current?.root;
      if (!root) return null;
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return null;
      ndc.set(((x - rect.left) / rect.width) * 2 - 1,
              -(((y - rect.top) / rect.height) * 2 - 1));
      picker.setFromCamera(ndc, camera);

      const byMesh = new Map<Object3D, PxlZone>();
      for (const zone of PXL_LID_ZONES) {
        const mesh = lidMesh(zone);
        if (mesh?.visible) byMesh.set(mesh, zone);
      }
      let near = false;
      for (const mesh of byMesh.keys()) {
        if (picker.intersectObject(mesh, false).length > 0) { near = true; break; }
      }
      if (!near) return null;
      /* Nearest first — three sorts by distance — so a lid is only picked when
         nothing on the boat stands in front of it.

         AND `visible` HAS TO BE CHECKED BY HAND. three's raycaster does not
         skip hidden objects; `Object3D.raycast` is called for every descendant
         whose layer matches, visible or not. This boat carries five meshes that
         are hidden in the delivered configuration — the source outboard, the
         two boarding-platform parts, and the cockpit cover, which is a tonneau
         stretched over the whole cockpit. Without this the cover intercepts
         every ray aimed at a seat and no lid could ever be picked, which is
         exactly how it behaved the first time it was tried. */
      for (const hit of picker.intersectObject(root, true)) {
        let node: Object3D | null = hit.object;
        let shown = true;
        while (node && node !== root) {
          if (!node.visible) { shown = false; break; }
          node = node.parent;
        }
        if (!shown) continue;
        return byMesh.get(hit.object) ?? null;
      }
      return null;
    };

    const handle = createPxlOrbit(element, !reducedMotion, {
      onTap: (x, y) => {
        const zone = aim(x, y);
        if (!zone) return;
        /* Reduced motion gets the locker, not the swing: what is under the
           seat is information about the boat, and withholding it would be the
           same mistake as withholding a colour change. */
        if (reducedMotion) {
          const state = lids.current.get(zone);
          settleLid(lids.current, zone, lidMesh(zone), !state?.open);
        } else {
          toggleLid(lids.current, zone);
        }
        invalidateStageScene(id);
      },
      /* The affordance. Without it the seats are a secret: nothing else on this
         canvas responds to a click, so there is no reason for anybody to try
         one. A cursor change is the whole hint. */
      onHover: (x, y) => {
        const over = aim(x, y) !== null;
        if (over === hovering.current) return;
        hovering.current = over;
        element.style.cursor = over ? "pointer" : "";
      },
    });
    orbit.current = handle;
    return () => {
      handle.dispose();
      element.style.cursor = "";
      hovering.current = false;
      orbit.current = null;
    };
  }, [interactive, reducedMotion, id, camera]);

  /* ── Preset changes ─────────────────────────────────────────────────────
     Captured as a move *from wherever the camera actually is*, so switching
     preset mid-transition, or after the viewer has turned the boat, resolves
     smoothly instead of snapping back to the last authored composition.     */
  useEffect(() => {
    if (preset === activePreset.current) return;
    const spec = PXL_PRESET_BY_ID.get(preset);

    if (spec?.derived) {
      // Entering FREE. Nothing moves: the composition becomes whatever is on
      // screen, including the viewer's own orbit, which is then folded into the
      // frozen state so the orbit offsets can be zeroed without the camera
      // jumping back to the authored shot.
      const held: PxlCameraState = {
        ...live.current,
        target: [...live.current.target] as [number, number, number],
      };
      orbit.current?.apply(held);
      // `reset`, not `recentre`: the offsets are already folded into `held`,
      // and easing them back to zero would subtract them a second time over
      // the next sixth of a second — a visible slide out of a mode whose whole
      // promise is that nothing moves when you enter it.
      orbit.current?.reset();
      frozen.current = held;
      Object.assign(from.current, held);
      activePreset.current = preset;
      transition.current = 1;
      invalidateStageScene(id);
      return;
    }

    frozen.current = null;
    Object.assign(from.current, live.current);
    from.current.target = [...live.current.target] as [number, number, number];
    // Leaving FREE, or moving between authored shots: the camera has to travel
    // from where the *viewer* left it, orbit included, or the move starts with
    // a jump back to the last authored composition.
    orbit.current?.apply(from.current);
    orbit.current?.reset();
    activePreset.current = preset;
    transition.current = reducedMotion ? 1 : 0;
    invalidateStageScene(id);
  }, [preset, reducedMotion, id]);

  /* ── Claim the slot once there is something worth showing ───────────────
     Until then the static PXL render underneath is the design, and if the
     model never resolves it stays the design — which is the failure mode
     §34 asks for, and the same one the hero already has.                    */
  useEffect(() => {
    if (status !== "ready") return;
    invalidateStageScene(id);
    let raf = 0;
    const claim = () => {
      if (warmup.current >= WARMUP_FRAMES) {
        setSceneActive(id, true);
        return;
      }
      raf = requestAnimationFrame(claim);
    };
    raf = requestAnimationFrame(claim);
    return () => {
      cancelAnimationFrame(raf);
      setSceneActive(id, false);
    };
  }, [status, id, restored]);

  /* ── Context loss ───────────────────────────────────────────────────────*/
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = () => {
      stage.status = "lost";
      setSceneActive(id, false);
    };
    const onRestored = () => {
      stage.status = "running";
      warmup.current = 0;
      appliedVersion.current = -1;              // repaint the materials
      invalidateStageScene(id);
      setRestored((n) => n + 1);                // and re-claim the slot
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [gl, id]);

  useFrame((_, delta) => {
    const box = bounds();
    if (!box.visible) return;

    /* 1. Configuration. Version-compared, not diffed: thirteen materials is
          cheap to rewrite and free to skip, and a counter cannot disagree
          with itself the way a deep comparison can.                         */
    let dirty = false;
    if (vessel.current && appliedVersion.current !== pxlStore.version) {
      // The very first application has nothing to transition from, so it lands
      // instantly; every later one is animated unless motion is reduced.
      const first = appliedVersion.current < 0;
      applyConfiguration(vessel.current, pxlStore.configuration, first || reducedMotion);
      appliedVersion.current = pxlStore.version;
      dirty = true;
    }

    /* 1b. Finish transitions. §9 — the paint changes, nothing else does: no
           new geometry, no new material object, no environment change, no
           camera move. Thirteen scalar writes and a colour lerp per frame,
           for about a third of a second.                                     */
    const finishing = vessel.current ? tickVessel(vessel.current, delta) : false;
    pxlTelemetry.finishing = finishing;
    if (finishing) dirty = true;

    /* 1c. §4.9 — the seat lids. Not a configuration and not in the URL: they
           are a way of looking at the boat, like an orbit angle. See `pxlLids`. */
    if (tickLids(lids.current,
                 (zone) => vessel.current?.zones.get(zone)?.mesh ?? null, delta)) {
      dirty = true;
    }

    /* 1d. §4.9 — NIGHT. The boat stops answering the studio and its own rings
           take over. Both halves are eased off one scalar, so a switch mid
           transition simply reverses. See `pxlNight`. */
    nightState.current.on = night;
    {
      const ring = vessel.current?.zones.get("speaker_light");
      const lit = Boolean(ring?.mesh.visible) && ring!.material.emissiveIntensity > 0.01;
      if (tickNight(nightState.current, delta,
                    ring?.material.emissive ?? null, lit)) {
        dirty = true;
      }
      /* ONE SCENE-LEVEL DIAL, NOT TWENTY-SEVEN MATERIAL ONES.
         `envMapIntensity` per material was the first attempt and it is quietly
         wrong here: `renderPxlFrame` re-applies the configuration before it
         draws, and a deterministic frame therefore rebuilds every material
         from its finish — so anything written outside `applyConfiguration`
         survives the live loop and not the QA capture, which is the one place
         this had to be verifiable. `scene.environmentIntensity` is the global
         term, nothing else writes it, and it cannot be undone by a repaint. */
      scene.environmentIntensity = nightEnvironment(nightState.current);
    }

    /* 2. Camera. */
    const spec = PXL_PRESET_BY_ID.get(activePreset.current);
    if (!spec) return;
    if (frozen.current) {
      Object.assign(to.current, frozen.current);
      to.current.target = [...frozen.current.target] as [number, number, number];
    } else {
      resolveInto(to.current, spec, box.width);
    }

    /* 2b. §42 — THE ARRIVAL.
           The composition is now known, which is the first moment a move into
           it can be authored. The vessel resolves from a little further out and
           a little higher: the same shot, approached, so that the boat is
           *placed* rather than switched on. `presetDuration` costs it about
           0.7 s, inside §42's 600–1200 ms, and it happens once per mount — a
           repeat visit does not pay for it again because a repeat visit does not
           re-resolve the model. */
    if (arrivalPending.current) {
      arrivalPending.current = false;
      if (arrival && !reducedMotion) {
        Object.assign(from.current, to.current);
        from.current.target = [...to.current.target] as [number, number, number];
        from.current.azimuth += 7;
        from.current.elevation += 2.2;
        from.current.distance *= 1.1;
        transition.current = 0;
        idle.current = { t: 0, live: true };
      }
    }

    if (transition.current < 1) {
      if (transition.current === 0) {
        transitionSeconds.current = presetDuration(from.current, to.current);
      }
      transition.current = Math.min(
        1,
        transition.current + delta / Math.max(transitionSeconds.current, 1e-3),
      );
      blendStates(from.current, to.current, transition.current, live.current);
      dirty = true;
    } else {
      Object.assign(live.current, to.current);
      live.current.target = [...to.current.target] as [number, number, number];
    }

    if (orbit.current) {
      const previous = orbit.current.state.azimuth;
      orbit.current.update(delta);
      orbit.current.apply(live.current);
      if (orbit.current.state.engaged ||
          Math.abs(orbit.current.state.azimuth - previous) > 1e-4) {
        dirty = true;
      }
    }

    /* 2c. §15 — THE IDLE, AND ITS END.
           A configurator whose product turns forever is a configurator nobody
           can inspect: every attempt to compare a chine against a reference
           becomes a moving target, and the confidence a still composition
           carries is spent on motion for its own sake. So this is one breath —
           about a degree of azimuth, decaying to nothing over roughly ten
           seconds — and then the scene is still, permanently, until the viewer
           moves it themselves. Touching the boat ends it on the spot rather
           than fading it out, because a drift that argues with a drag is worse
           than no drift at all. */
    if (idle.current.live) {
      if (!interactive || reducedMotion || orbit.current?.state.engaged || orbit.current?.moved()) {
        idle.current.live = false;
      } else {
        idle.current.t += delta;
        const envelope = Math.exp(-idle.current.t / 3.4);
        if (envelope < 0.02) {
          idle.current.live = false;
        } else {
          live.current.azimuth += 1.05 * envelope * Math.sin(idle.current.t * 0.86);
          dirty = true;
        }
      }
    }

    /* 2d. The studio answers the hull. Bounded, eased, and applied to the room
           rather than to the light — see LIFT_RANGE. */
    if (adaptive && !water) {
      const id = finishForRole(pxlStore.configuration, "EXTERIOR_HULL");
      const target = id
        ? MathUtils.clamp((0.5 - finishLuminance(finish(id).base)) * 0.34, -LIFT_RANGE, LIFT_RANGE)
        : 0;
      const next = MathUtils.damp(lift.value, target, 1 / LIFT_SETTLE, delta);
      if (Math.abs(next - lift.value) > 1e-4) dirty = true;
      /* Night multiplies what the adaptive lift arrived at rather than
         replacing it: the backdrop keeps answering the hull, at a third of the
         level. `uLift` is a gain of `1 + lift`, so the two compose there. */
      lift.value = (1 + next) * nightBackdrop(nightState.current) - 1;
    }

    const cam = camera as PerspectiveCamera;
    applyPxlCamera(cam, live.current, box.width / Math.max(box.height, 1));

    /* 3. Framing telemetry. Read by the development viewer; nothing renders
          off it. See `pxlTelemetry` for why the framing is measured rather
          than assumed.                                                      */
    pxlTelemetry.preset = activePreset.current;
    pxlTelemetry.orbited = orbit.current?.moved() ?? false;
    pxlTelemetry.azimuth = live.current.azimuth;
    pxlTelemetry.elevation = live.current.elevation;
    pxlTelemetry.distance = live.current.distance;
    pxlTelemetry.fov = cam.fov;
    pxlTelemetry.slotWidth = box.width;
    pxlTelemetry.slotHeight = box.height;
    if (model.current) {
      cam.updateMatrixWorld();
      measureFraming(model.current, cam);
    }

    if (warmup.current <= WARMUP_FRAMES) {
      warmup.current += 1;
      dirty = true;
    }

    /* 4. The river's own clock, when it is running. */
    if (water) {
      riverUniforms.uTime.value = stage.time;
      riverUniforms.uDrift.value = reducedMotion ? 0 : stage.time * 0.16;
    }

    /* 5. Ask for a frame whenever anything actually changed.
          A still product shot is registered as a *static* scene — under
          reduced motion always, and otherwise whenever nobody is turning it
          and there is no water running — which means the runtime draws it
          only when its box moves. Every change that happens while the box is
          perfectly still (the model arriving, a colour changing, a preset
          transition running) has to ask for its own frame, or the scene shows
          whatever it happened to be holding when it last drew.              */
    if (dirty) invalidateStageScene(id);
  });

  return (
    <>
      {water ? (
        <>
          <RiverBackdrop uniforms={riverUniforms} />
          <WaterSystem uniforms={riverUniforms} quality={quality} />
        </>
      ) : (
        <PxlBackdrop quality={quality} lift={adaptive ? lift : undefined} />
      )}
      <Suspense fallback={null}>
        <PxlVessel onReady={onReady} />
      </Suspense>
    </>
  );
}

/** Resolve a preset into a reused object, avoiding a per-frame allocation. */
function resolveInto(
  out: PxlCameraState,
  spec: Parameters<typeof resolvePreset>[0],
  width: number,
): void {
  const next = resolvePreset(spec, width);
  out.azimuth = next.azimuth;
  out.elevation = next.elevation;
  out.distance = next.distance;
  out.hfov = next.hfov;
  out.minVfov = next.minVfov;
  out.target[0] = next.target[0];
  out.target[1] = next.target[1];
  out.target[2] = next.target[2];
}
