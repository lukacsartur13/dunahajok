"use client";

/**
 * HERO — the Duna 6.1 on the Danube.
 *
 *   stillness → disturbance → vessel → movement → wake → departure
 *
 * The whole sequence is one number: `stage.heroProgress`, 0 to 1 across the
 * hero's own scroll range. `cameraRig` resolves that number against the
 * authored states in `heroConfig`; this file applies the result to the camera,
 * the vessel and every uniform in the scene, in ONE `useFrame`.
 *
 * One update function is a deliberate constraint, not an accident of layout.
 * A camera in one component, a wake in another and a water amplitude in a
 * third will drift apart the first time someone adds an ease to one of them —
 * and the entire premise here is that the boat moves, *therefore* the water
 * moves, *therefore* a wake appears. Those are not three animations that agree
 * with each other; they are one state, read four times.
 *
 * Nothing in this file sets React state per frame. The scene mounts, renders
 * about six times over its life, and everything after that is uniform writes.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MathUtils, type Group, type PerspectiveCamera } from "three";
import { setSceneActive } from "@/components/scene/SceneSlot";
import type { QualityProfile } from "@/webgl/stage/quality";
import { invalidateStageScene } from "@/webgl/stage/sceneRegistry";
import { stage, type VesselSource } from "@/webgl/stage/stageState";
import { useStageScene } from "@/webgl/stage/StageScene";
import { Backdrop } from "./Backdrop";
import { applyState, sampleStates } from "./cameraRig";
import {
  AZIMUTH_SCALE,
  DESKTOP_STATES,
  HAZE,
  LINE_WIDTH_PX,
  MOBILE_STATES,
  STILL_STATE,
  STILL_STATE_MOBILE,
  TIMING,
  VESSEL,
  WATER,
  type CameraState,
} from "./heroConfig";
import { createHeroUniforms } from "./heroUniforms";
import { VesselModel } from "./VesselModel";
import { WaterSystem } from "./WaterSystem";

/** Below this slot width the mobile composition is used. Matches the layout. */
const MOBILE_MAX_WIDTH = 768;

interface HeroVesselSceneProps {
  quality: QualityProfile;
  reducedMotion: boolean;
  /**
   * Live `--rake-cut` in CSS pixels — the vertical drop of the diagonal that
   * the static art direction under this slot is already clipped to. Read as a
   * function because it is measured off the document and changes on resize.
   */
  rakeCutPx: () => number;
}

export function HeroVesselScene({ quality, reducedMotion, rakeCutPx }: HeroVesselSceneProps) {
  const { camera, bounds } = useStageScene();
  const gl = useThree((s) => s.gl);

  const uniforms = useMemo(() => createHeroUniforms(), []);
  const vessel = useRef<Group>(null);

  /** Reused across frames — see `sampleStates`. */
  const frameState = useRef<CameraState>({ ...DESKTOP_STATES[0] });
  const warmup = useRef(0);
  const [source, setSource] = useState<VesselSource>("loading");
  const onSourceChange = useCallback((next: VesselSource) => setSource(next), []);

  uniforms.uDetail.value = quality.detail;
  uniforms.uHaze.value = HAZE;

  /**
   * Claim the slot only once there is something worth looking at: the vessel
   * resolved, and a few frames drawn. Until then the Phase One photograph is
   * still the design, and if the vessel never resolves it stays the design
   * permanently — the failure mode is "the site as it shipped in Phase One",
   * which is a good failure mode.
   */
  useEffect(() => {
    if (source !== "plate" && source !== "model") return;
    invalidateStageScene("hero-vessel");
    let raf = 0;
    const claim = () => {
      if (warmup.current >= TIMING.warmupFrames) {
        setSceneActive("hero-vessel", true);
        return;
      }
      raf = requestAnimationFrame(claim);
    };
    raf = requestAnimationFrame(claim);
    return () => {
      cancelAnimationFrame(raf);
      setSceneActive("hero-vessel", false);
    };
  }, [source]);

  /* Context loss: hand the slot straight back to the photograph. */
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = () => {
      stage.status = "lost";
      setSceneActive("hero-vessel", false);
    };
    const onRestored = () => {
      stage.status = "running";
      warmup.current = 0;
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const box = bounds();
    if (!box.visible) return;

    const mobile = box.width < MOBILE_MAX_WIDTH;

    /* ── 1. Where in the sequence are we? ───────────────────────────────── */

    const state = frameState.current;
    if (reducedMotion) {
      Object.assign(state, mobile ? STILL_STATE_MOBILE : STILL_STATE);
    } else {
      sampleStates(mobile ? MOBILE_STATES : DESKTOP_STATES, stage.heroProgress, state);
    }

    /* ── 2. The vessel ──────────────────────────────────────────────────── */

    const vesselX = state.vesselAlong;
    if (vessel.current) {
      vessel.current.position.set(vesselX, -VESSEL.drop, 0);
    }

    /* ── 3. The camera ──────────────────────────────────────────────────── */

    const cam = camera as PerspectiveCamera;
    applyState(
      cam,
      state,
      box.width / Math.max(box.height, 1),
      vesselX,
      source === "model" ? AZIMUTH_SCALE.model : AZIMUTH_SCALE.plate,
    );

    // Metres of world per CSS pixel, at one metre of distance. Derived from
    // the field of view the rig just resolved, so the graphic wake keeps its
    // authored weight through every FOV change in the choreography.
    uniforms.uLinePixelScale.value =
      (LINE_WIDTH_PX * 2 * Math.tan(MathUtils.degToRad(cam.fov) / 2)) /
      Math.max(box.height, 1) /
      2.2;

    /* ── 4. The rake mask ───────────────────────────────────────────────────
       The slot's box, in device pixels, in WebGL's bottom-left origin. This is
       the only place the DOM's coordinate system enters a shader.            */

    const dpr = stage.dpr;
    const canvasH = stage.viewportHeight;
    uniforms.uRake.value.set(
      box.left * dpr,
      (canvasH - box.top) * dpr,
      box.width * dpr,
      rakeCutPx() * dpr,
    );

    /* ── 5. Water and wake ──────────────────────────────────────────────────
       Everything below is read off the same blended state, so the surface can
       never be calm while the wake is roaring.                               */

    uniforms.uTime.value = stage.time;
    uniforms.uWaveAmp.value = state.waveAmp;
    uniforms.uDrift.value = reducedMotion ? 0 : stage.time * WATER.drift;

    // The transom, where the wake is born, travels with the boat.
    uniforms.uWakeOrigin.value.set(
      vesselX - VESSEL.length / 2 + VESSEL.transomInset,
      0,
    );
    uniforms.uWakeSpeed.value = state.speed;
    uniforms.uWakeLength.value = state.wakeLength;
    uniforms.uWakeLift.value = state.wakeLift;
    uniforms.uLineify.value = state.lineify;
    uniforms.uHullCentre.value.set(vesselX, 0);
    uniforms.uHullShade.value = WATER.hullShade * (1 - state.lineify);

    /* ── 6. The plate's relationship to the water ───────────────────────── */

    // The reflection breaks up as the boat gathers way, and is suppressed
    // entirely once the wake has become a drawing.
    uniforms.uBreakup.value = state.speed;
    uniforms.uReflStrength.value =
      (quality.reflection ? 0.62 : 0) * (1 - state.lineify);

    /* ── 7. Fade ────────────────────────────────────────────────────────────
       Ramped rather than snapped, so the live scene arrives *over* the Phase
       One photograph as a crossfade rather than a cut.                       */

    const previousFade = uniforms.uFade.value;
    const target = warmup.current >= TIMING.warmupFrames ? state.fade : 0;
    uniforms.uFade.value = reducedMotion
      ? target
      : MathUtils.damp(previousFade, target, 1 / TIMING.handover, delta);

    if (warmup.current <= TIMING.warmupFrames) warmup.current += 1;

    // A still scene has to be allowed to finish arriving. Under reduced motion
    // the runtime draws only when the slot's box moves, and the box does not
    // move while the plate texture is decoding or the opening fade resolves.
    //
    // The test is on what *changed this frame*, not on whether the scene has
    // settled. Asking only "is there still work to do" requests every frame up
    // to the last one and then stops — leaving the single frame in which the
    // fade actually reached its target undrawn, and the band black.
    if (!reducedMotion) return;
    if (warmup.current <= TIMING.warmupFrames || uniforms.uFade.value !== previousFade) {
      invalidateStageScene("hero-vessel");
    }
  });

  return (
    <>
      <Backdrop uniforms={uniforms} />
      <WaterSystem uniforms={uniforms} quality={quality} />
      <group ref={vessel}>
        <VesselModel
          uniforms={uniforms}
          reflection={quality.reflection}
          onSourceChange={onSourceChange}
        />
      </group>
    </>
  );
}
