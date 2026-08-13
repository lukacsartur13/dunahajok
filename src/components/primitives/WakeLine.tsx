"use client";

/**
 * WakeLine — the recurring motif of the site.
 *
 * A boat's wake is a still line that, at the point of disturbance, opens into
 * a divergent fan and then slowly closes again. That single behaviour is
 * reused everywhere: as a section divider, as a field behind dark sections,
 * as the rule the heritage timeline runs along, and as the scroll indicator.
 *
 * Geometry is hand-authored rather than generated so it stays deterministic
 * across server and client render, and so the curves read as designed rather
 * than as noise. All paths live in one 1200×160 viewBox; `preserveAspectRatio`
 * is released on x so the line spans any width without changing its weight.
 *
 * Motion: paths draw in from the origin on entry. Under reduced motion the
 * paths are simply present.
 */

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./WakeLine.module.css";

export type WakeVariant = "divider" | "field" | "quiet";

interface WakeLineProps {
  variant?: WakeVariant;
  /** Horizontal position of the disturbance, 0–1 across the width. */
  origin?: number;
  /** Animate the draw-in when the element scrolls into view. */
  animate?: boolean;
  className?: string;
}

/** Divergent wake curves, in viewBox units, measured from the origin at x=200. */
const FAN = [
  "M200 80 C 460 80 700 83 1200 99",
  "M200 80 C 460 80 700 77 1200 61",
  "M200 80 C 470 81 720 88 1200 124",
  "M200 80 C 470 79 720 72 1200 36",
  "M200 80 C 500 82 800 95 1200 146",
  "M200 80 C 500 78 800 65 1200 14",
];

/** Transverse ripples — the interference pattern inside the fan. */
const RIPPLES = [
  "M372 62 C 392 70 392 90 372 98",
  "M566 50 C 592 65 592 95 566 110",
  "M792 38 C 824 60 824 100 792 122",
  "M1032 25 C 1070 55 1070 105 1032 135",
];

export function WakeLine({
  variant = "divider",
  origin = 0.17,
  animate = true,
  className,
}: WakeLineProps) {
  const root = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = root.current;
    if (!svg || !animate) return;

    const paths = svg.querySelectorAll<SVGPathElement>("path");
    if (prefersReducedMotion()) {
      gsap.set(paths, { strokeDashoffset: 0, opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      paths.forEach((path) => {
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      });

      gsap.to(paths, {
        strokeDashoffset: 0,
        duration: 2.2,
        ease: "glide",
        stagger: 0.08,
        scrollTrigger: { trigger: svg, start: "top 92%", once: true },
      });
    }, svg);

    return () => ctx.revert();
  }, [animate]);

  // Shift the whole drawing so the disturbance sits where the caller wants it.
  const shift = (origin - 200 / 1200) * 1200;

  return (
    <svg
      ref={root}
      className={[styles.wake, styles[variant], className].filter(Boolean).join(" ")}
      viewBox="0 0 1200 160"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <g transform={`translate(${shift} 0)`}>
        {/* Still water before the disturbance. */}
        <path className={styles.still} d={`M${-shift - 40} 80 H 200`} />
        {FAN.map((d, i) => (
          <path key={`f${i}`} className={styles.fan} style={{ opacity: 1 - i * 0.13 }} d={d} />
        ))}
        {variant !== "quiet" &&
          RIPPLES.map((d, i) => (
            <path key={`r${i}`} className={styles.ripple} style={{ opacity: 0.5 - i * 0.09 }} d={d} />
          ))}
      </g>
    </svg>
  );
}
