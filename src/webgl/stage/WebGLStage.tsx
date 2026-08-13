"use client";

/**
 * WEBGL STAGE — one canvas, for the whole site.
 *
 * Mounted once at the document root, beside the header and the preloader
 * rather than inside any section, so it survives every scroll, every route
 * change and every section remount. Scenes are attached to it by SceneSlot id;
 * `hero-vessel` and `pxl-product` are the production scenes today, and the
 * remaining slots declared by Phase One attach the same way when they are
 * built. Neither knows the other exists: `StageScene` gives each its own
 * THREE.Scene and camera, and `StageRuntime` draws whichever ones are on
 * screen into their own scissor rectangles.
 *
 * This component's own job is narrow and entirely about *not* rendering:
 *
 *   • decide whether WebGL should run at all, and fall back silently and
 *     completely to the Phase One art direction when it should not;
 *   • resolve the quality tier and cap the device pixel ratio;
 *   • find the hero section and give the scene its scroll progress;
 *   • measure `--rake-cut`, so the shader's diagonal is the CSS diagonal.
 *
 * Everything that draws is below `StageRuntime` and `StageScene`.
 */

import { Canvas } from "@react-three/fiber";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { NeutralToneMapping, SRGBColorSpace } from "three";
import {
  getSceneSlot,
  setSceneActive,
  subscribeSceneSlots,
} from "@/components/scene/SceneSlot";
import { useReducedMotion } from "@/lib/hooks";
import { HeroVesselScene } from "@/webgl/scenes/hero/HeroVesselScene";
import { usePxlView } from "@/webgl/scenes/pxl/pxlView";
import { SceneDebug } from "./SceneDebug";
import { StageRuntime } from "./StageRuntime";
import { StageScene } from "./StageScene";
import { detectQuality, supportsWebGL, type QualityProfile } from "./quality";
import { trackHeroProgress } from "./heroScroll";
import { readViewport, stage } from "./stageState";
import styles from "./WebGLStage.module.css";

/**
 * Measure `--rake-cut` rather than hard-coding 4.5vw.
 *
 * The token is the site's single source of truth for the Duna Line, and the
 * scene has to mask itself to exactly the same diagonal the static art
 * direction underneath it is clipped to. Reading it off a real element means
 * changing the token re-rakes the WebGL band along with everything else.
 */
/**
 * The PXL scene, and the glTF machinery under it, split out of the bundle.
 *
 * The canvas mounts on every page; the PXL does not. Importing its scene
 * statically would put the loader, the meshopt decoder and the material system
 * into the shared chunk for every visitor to the homepage, which shows the
 * Duna 6.1 and has no PXL slot in it at all. The promise is only created once
 * a `pxl-product` slot actually exists — the same reason `VesselModel`
 * code-splits its own glTF path.
 */
const PxlProductScene = lazy(() =>
  import("@/webgl/scenes/pxl/PxlProductScene").then((m) => ({ default: m.PxlProductScene })),
);

function measureRakeCut(): number {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;height:var(--rake-cut);";
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return px;
}

export function WebGLStage() {
  const reducedMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [quality, setQuality] = useState<QualityProfile | null>(null);
  const [heroMounted, setHeroMounted] = useState(false);
  const [pxlMounted, setPxlMounted] = useState(false);
  const pxlView = usePxlView();
  const rakeCut = useRef(0);

  /* ── Should this run at all? ─────────────────────────────────────────── */
  useEffect(() => {
    readViewport();
    if (!supportsWebGL()) {
      stage.status = "unsupported";
      return;
    }
    stage.status = "running";
    stage.reducedMotion = reducedMotion;
    setEnabled(true);
  }, [reducedMotion]);

  /* ── Quality, and re-resolving it when the viewport changes class ─────── */
  useEffect(() => {
    if (!enabled) return;

    const resolve = () => {
      readViewport();
      rakeCut.current = measureRakeCut();
      const next = detectQuality(reducedMotion);
      setQuality((prev) => (prev?.tier === next.tier ? prev : next));
      stage.quality = next.tier;
      stage.reducedMotion = reducedMotion;
    };

    resolve();
    window.addEventListener("resize", resolve);
    window.addEventListener("orientationchange", resolve);
    return () => {
      window.removeEventListener("resize", resolve);
      window.removeEventListener("orientationchange", resolve);
    };
  }, [enabled, reducedMotion]);

  /* ── Wait for the hero slot, then drive it from its section's scroll ──── */
  useEffect(() => {
    if (!enabled) return;

    let disposeProgress: (() => void) | null = null;

    const sync = () => {
      const slot = getSceneSlot("hero-vessel");
      disposeProgress?.();
      disposeProgress = null;

      if (!slot) {
        setHeroMounted(false);
        return;
      }
      const section = slot.el.closest("section") ?? slot.el;
      disposeProgress = trackHeroProgress(section);
      setHeroMounted(true);
    };

    sync();
    const unsubscribe = subscribeSceneSlots(sync);
    return () => {
      unsubscribe();
      disposeProgress?.();
      setSceneActive("hero-vessel", false);
    };
  }, [enabled]);

  /* ── The PXL slot, wherever a page puts one ───────────────────────────────
     No scroll progress to track: the product scene is driven by its
     configuration and its preset, not by where the page happens to be. It
     mounts when a slot appears and unmounts when the slot goes, which is what
     keeps a route change from leaving a GLB resident for a page that no
     longer shows it.                                                        */
  useEffect(() => {
    if (!enabled) return;

    const sync = () => setPxlMounted(Boolean(getSceneSlot("pxl-product")));
    sync();
    const unsubscribe = subscribeSceneSlots(sync);
    return () => {
      unsubscribe();
      setSceneActive("pxl-product", false);
    };
  }, [enabled]);

  const getRakeCut = useCallback(() => rakeCut.current, []);

  if (!enabled || !quality) return null;

  return (
    <div className={styles.stage} aria-hidden="true">
      <Canvas
        // Transparent by default and cleared to transparent every frame: the
        // canvas covers the whole page but only paints inside a live scene.
        gl={{
          alpha: true,
          antialias: quality.tier !== "low",
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
          // The scene lives almost entirely in the bottom few percent of the
          // range. ACES lifts and desaturates exactly there, which would put
          // the WebGL band and the Phase One photography on two different
          // grades. Khronos Neutral is identity below ~0.76 linear, so
          // `--depth` renders as `--depth` and the two agree.
          toneMapping: NeutralToneMapping,
          outputColorSpace: SRGBColorSpace,
        }}
        dpr={[1, quality.maxDpr]}
        // Rendering is taken over entirely by StageRuntime's priority-1 frame
        // callback; R3F itself never draws.
        frameloop="always"
        // Nothing in the scene is interactive, and the canvas is
        // pointer-events: none. Raycasting every pointer move would be pure
        // waste.
        events={undefined}
        onCreated={({ gl }) => {
          gl.autoClear = false;
          gl.setClearColor(0x000000, 0);
          stage.dpr = gl.getPixelRatio();
        }}
      >
        <StageRuntime />
        {heroMounted ? (
          <StageScene id="hero-vessel" priority={0} animated={!reducedMotion}>
            <HeroVesselScene
              quality={quality}
              reducedMotion={reducedMotion}
              rakeCutPx={getRakeCut}
            />
          </StageScene>
        ) : null}
        {pxlMounted ? (
          // `animated` follows the *interaction*, not just reduced motion: a
          // still product shot nobody is touching is a still image, and the
          // runtime should draw it once rather than sixty times a second. The
          // scene asks for a frame itself whenever anything changes.
          <StageScene
            id="pxl-product"
            priority={1}
            animated={!reducedMotion && (pxlView.interactive || pxlView.water)}
          >
            <Suspense fallback={null}>
              <PxlProductScene
                quality={quality}
                reducedMotion={reducedMotion}
                preset={pxlView.preset}
                interactive={pxlView.interactive}
                water={pxlView.water}
                arrival={pxlView.arrival}
                adaptive={pxlView.adaptive}
              />
            </Suspense>
          </StageScene>
        ) : null}
      </Canvas>
      <SceneDebug />
    </div>
  );
}
