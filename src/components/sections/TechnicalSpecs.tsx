"use client";

/**
 * SECTION 03 — Specification.
 *
 * A specification table would be the obvious move and the wrong one. Instead
 * the studio profile is treated as what it nearly already is — a general
 * arrangement drawing — and dimensioned: a real measurement line with end
 * ticks runs under the hull, carrying the length overall. The remaining
 * figures are set as oversized numerals on a staggered baseline, so the
 * section reads as a drawing sheet rather than a spec sheet.
 *
 * Every figure comes from content/boats.ts, which is transcribed from the
 * source site. Nothing is rounded or invented.
 */

import { useEffect, useRef } from "react";
import { PLATFORM_SPECS, type Spec } from "@/content/boats";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import { DisplayLines, SectionLabel } from "@/components/primitives/Type";
import { Reveal } from "@/components/primitives/Reveal";
import { countUp } from "@/lib/motion";
import styles from "./TechnicalSpecs.module.css";

export function TechnicalSpecs() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>("[data-count]").forEach((node) => {
      countUp(node, node.dataset.count ?? "", node);
    });
  }, []);

  return (
    <section ref={root} id="specifications" className={`${styles.section} is-light`} data-ground="light">
      <div className={styles.head}>
        <SectionLabel index="03">Specification</SectionLabel>
        <DisplayLines size="d1" lines={["Six metres ten.", "Nothing spare."]} />
      </div>

      {/* ── The dimensioned drawing ─────────────────────────────────────── */}
      <div className={styles.drawing}>
        <CinematicMedia
          id="cabin-studio-profile"
          sizes="(max-width: 61.25rem) 100vw, 76vw"
          ratio="16 / 10"
          parallax={0.25}
          className={styles.drawingMedia}
          objectPosition="50% 46%"
          alt="The Duna 6.1 Cabin in profile, photographed in the studio."
        />

        {/* Dimension line. Positioned against the hull in the photograph. */}
        <div className={styles.dimension} aria-hidden="true">
          <span className={styles.dimTick} />
          <span className={styles.dimRule} />
          <span className={styles.dimValue}>
            6.10 <span className={styles.dimUnit}>m</span>
          </span>
          <span className={styles.dimRule} />
          <span className={styles.dimTick} />
        </div>
        <p className={`${styles.dimLabel} t-label`} aria-hidden="true">
          Length overall
        </p>
      </div>

      {/* ── The figures ─────────────────────────────────────────────────── */}
      <Reveal as="ul" className={styles.figures} stagger>
        {PLATFORM_SPECS.map((spec, i) => (
          <Figure key={spec.label} spec={spec} offset={i % 2 === 1} />
        ))}
      </Reveal>

      <p className={`${styles.footnote} t-label`}>
        Figures as published by Duna Hajók. Cabin and Kadét differ where noted.
      </p>
    </section>
  );
}

function Figure({ spec, offset }: { spec: Spec; offset: boolean }) {
  const countable = !Number.isNaN(Number.parseFloat(spec.value));

  return (
    <li className={[styles.figure, offset ? styles.figureOffset : ""].filter(Boolean).join(" ")}>
      <p className={styles.value}>
        <span
          className={styles.number}
          // Non-numeric values (the CE category) are rendered as-is.
          {...(countable ? { "data-count": spec.value } : null)}
        >
          {spec.value}
        </span>
        {spec.unit ? <span className={styles.unit}>{spec.unit}</span> : null}
      </p>
      <span className={styles.figureRule} aria-hidden="true" />
      <p className={`${styles.figureLabel} t-label`}>{spec.label}</p>
      {spec.note ? <p className={styles.figureNote}>{spec.note}</p> : null}
    </li>
  );
}
