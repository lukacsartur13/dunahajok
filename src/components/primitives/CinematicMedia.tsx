"use client";

/**
 * CinematicMedia — the only way an image enters a page.
 *
 * Centralising it means the whole site shares one image behaviour: a masked
 * reveal along the hull rake, a slow internal drift under scroll, and a
 * consistent LQIP. It also means the future WebGL layer has exactly one
 * component to displace.
 *
 * Three nested boxes, because each needs its own clip or transform:
 *
 *   .frame  aspect ratio + the Duna Line cut (a static raked clip-path)
 *   .plate  the reveal wipe (an animated raked clip-path driven by --wipe)
 *   img     the parallax drift, rendered slightly oversized so drifting never
 *           exposes an edge
 */

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { MEDIA, type MediaId } from "@/lib/media.generated";
/* Aliased: this component's own prop is called `asset`, and importing the
   helper under its real name would shadow it. */
import { asset as withBasePath } from "@/lib/basePath";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./CinematicMedia.module.css";

/** Which edges get raked back to the hull angle. */
export type MediaCut = "none" | "top" | "bottom" | "both" | "lead";

interface CinematicMediaProps {
  id: MediaId;
  /** Overrides the generated alt text. Pass "" only for decorative repeats. */
  alt?: string;
  priority?: boolean;
  sizes?: string;
  /** Frame ratio, e.g. "16 / 9". Defaults to the asset's own proportions. */
  ratio?: string;
  cut?: MediaCut;
  /** Slow internal drift as the frame crosses the viewport. */
  parallax?: boolean | number;
  /** Wipe the frame open along the rake on entry. */
  reveal?: boolean;
  /** Custom-cursor label while hovering (desktop only). */
  cursor?: string;
  className?: string;
  /** Bottom-weighted scrim for type overlays, 0–1. */
  scrim?: number;
  objectPosition?: string;
}

export function CinematicMedia({
  id,
  alt,
  priority = false,
  sizes = "100vw",
  ratio,
  cut = "none",
  parallax = true,
  reveal = true,
  cursor,
  className,
  scrim = 0,
  objectPosition,
}: CinematicMediaProps) {
  const asset = MEDIA[id];
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const plate = el.querySelector<HTMLElement>(`.${styles.plate}`);
    const img = el.querySelector<HTMLElement>("img");
    if (!plate || !img) return;

    if (prefersReducedMotion()) {
      gsap.set(plate, { "--wipe": "0%" });
      return;
    }

    const ctx = gsap.context(() => {
      if (reveal) {
        gsap.fromTo(
          plate,
          { "--wipe": "100%" },
          {
            "--wipe": "0%",
            duration: 1.5,
            ease: "hull",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          },
        );
      }

      if (parallax) {
        const strength = typeof parallax === "number" ? parallax : 1;
        gsap.fromTo(
          img,
          { yPercent: -3.4 * strength },
          {
            yPercent: 3.4 * strength,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.7 },
          },
        );
      }
    }, el);

    return () => ctx.revert();
  }, [parallax, reveal]);

  const style: CSSProperties = {
    "--ratio": ratio ?? `${asset.width} / ${asset.height}`,
  } as CSSProperties;

  return (
    <div
      ref={frame}
      className={[styles.frame, styles[`cut-${cut}`], className].filter(Boolean).join(" ")}
      style={style}
      data-cursor={cursor}
    >
      <div className={`${styles.plate} ${reveal ? styles.closed : ""}`}>
        {/* `withBasePath`, not the raw src. See the note in src/lib/basePath.ts:
            under `images.unoptimized` — which the static export turns on —
            next/image emits the src verbatim instead of routing it through
            `/_next/image`, and the basePath prefix goes with the optimiser.
            Every image on the site 404'd on GitHub Pages because of it. */}
        <Image
          src={withBasePath(asset.src)}
          alt={alt ?? asset.alt}
          width={asset.width}
          height={asset.height}
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          placeholder="blur"
          blurDataURL={asset.blurDataURL}
          style={objectPosition ? { objectPosition } : undefined}
        />
      </div>
      {scrim > 0 ? (
        <span className={styles.scrim} style={{ opacity: scrim }} aria-hidden="true" />
      ) : null}
    </div>
  );
}
