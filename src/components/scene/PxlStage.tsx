"use client";

/**
 * The PXL's box in the document, and what stands in it when WebGL cannot.
 *
 * §34: if the GLB fails to load, show the strongest PXL render — not an empty
 * river, not a black rectangle, not a spinner that never resolves. That is
 * exactly what `SceneSlot` already does for the hero, so this is a SceneSlot
 * with the right child: the studio's own profile render, which is a real
 * picture of the real boat and a perfectly respectable thing for the page to
 * settle on permanently.
 *
 * The failure is silent by construction rather than by handling. The scene
 * only sets `data-scene-active` once the model has resolved *and* a few frames
 * have been drawn; until then the image is simply the design. A model that
 * never arrives, a WebGL context that never comes back, a device that cannot
 * run any of it — all three land in the same place, and none of them needs its
 * own code path.
 */

import Image from "next/image";
import { useEffect } from "react";
import { SceneSlot } from "@/components/scene/SceneSlot";
import { PXL_MEDIA, type PxlMediaId } from "@/lib/pxl.media.generated";
import { setPxlView, type PxlViewState } from "@/webgl/scenes/pxl/pxlView";
import styles from "./PxlStage.module.css";
import { asset } from "@/lib/basePath";

interface PxlStageProps extends Partial<PxlViewState> {
  /** Sizes hint for the fallback image. */
  sizes?: string;
  className?: string;
  priority?: boolean;
  /**
   * The still that stands in for the scene.
   *
   * Defaults to the studio's profile render, which is the right choice while
   * the model is loading: it is the STL revision's own console, so the handover
   * from photograph to mesh is a crossfade between two pictures of the same
   * boat. A caller that has no WebGL at all wants a different image — see the
   * fallback path in the configurator, which swaps the colour studies.
   */
  fallback?: PxlMediaId;
  /**
   * §73: what a screen reader is told the box contains.
   *
   * The canvas itself is `aria-hidden` and always will be — a Three.js scene
   * graph has nothing an assistive technology can usefully traverse. The
   * product visualisation is described here instead, once, in a sentence.
   */
  label?: string;
}

export function PxlStage({
  preset,
  interactive = false,
  water = false,
  night = false,
  arrival = false,
  adaptive = false,
  sizes = "100vw",
  className,
  priority = false,
  fallback = "pxl-hero-side",
  label,
}: PxlStageProps) {
  useEffect(() => {
    setPxlView({ preset, interactive, water, arrival, adaptive, night });
  }, [preset, interactive, water, arrival, adaptive, night]);

  const media = PXL_MEDIA[fallback];

  return (
    <SceneSlot
      scene="pxl-product"
      interactive={interactive}
      className={[styles.stage, className].filter(Boolean).join(" ")}
      label={label}
    >
      <div className={styles.plate}>
        <Image
          src={asset(media.src)}
          alt={label ? "" : media.alt}
          width={media.width}
          height={media.height}
          sizes={sizes}
          placeholder="blur"
          blurDataURL={media.blurDataURL}
          priority={priority}
          className={styles.image}
        />
      </div>
    </SceneSlot>
  );
}
