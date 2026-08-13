"use client";

/**
 * Display typography primitives.
 *
 * Line breaks in monumental headlines are an art-direction decision, not a
 * consequence of container width — so callers pass an array of lines and we
 * mask each one individually. That also gives the reveal something honest to
 * animate: type rising out of the line below it, the way a hull rises out of
 * its own wake.
 */

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { gsap, revealLines } from "@/lib/motion";
import type { PolymorphicTag } from "./polymorphic";
import styles from "./Type.module.css";

interface DisplayLinesProps {
  lines: ReadonlyArray<ReactNode>;
  as?: ElementType;
  /** Type scale step. */
  size?: "mega" | "d1" | "d2" | "d3";
  /** Serif treatment for editorial chapters. */
  editorial?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
  /** Animate on scroll-in. Set false when a parent timeline owns the reveal. */
  reveal?: boolean;
  revealDelay?: number;
  id?: string;
}

export function DisplayLines({
  lines,
  as = "h2",
  size = "d2",
  editorial = false,
  align = "start",
  className,
  reveal = true,
  revealDelay = 0,
  id,
}: DisplayLinesProps) {
  const root = useRef<HTMLElement>(null);
  const Tag = as as PolymorphicTag;

  useEffect(() => {
    const el = root.current;
    if (!el || !reveal) return;

    // The `pending` class hides the lines pre-hydration so there is no flash
    // of un-masked type; GSAP takes over the moment it is removed.
    const ctx = gsap.context(() => {
      el.classList.remove(styles.pending);
      revealLines(el, { trigger: el, delay: revealDelay });
    }, el);

    return () => ctx.revert();
  }, [reveal, revealDelay]);

  return (
    <Tag
      ref={root}
      id={id}
      className={[
        editorial ? "t-editorial" : "t-display",
        styles.display,
        styles[size],
        styles[`align-${align}`],
        reveal ? styles.pending : undefined,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {lines.map((line, i) => (
        <span className={`${styles.line} js-line`} key={i}>
          {/* The trailing space keeps the accessible name readable — without it
              the line boxes concatenate into "Craftedto be touched." It
              collapses visually, since it ends a block box. */}
          <span>{line} </span>
        </span>
      ))}
    </Tag>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

interface SectionLabelProps {
  /** Two-digit section index, e.g. "03". */
  index?: string;
  children: ReactNode;
  className?: string;
  /** Draw the short rule that ties the label to the section edge. */
  rule?: boolean;
}

/**
 * The small technical caption that opens every section — an index, a rule and
 * a name, set in the mono face. It is the site's equivalent of a drawing's
 * title block.
 */
export function SectionLabel({ index, children, className, rule = true }: SectionLabelProps) {
  return (
    <p className={[styles.label, "t-label", className].filter(Boolean).join(" ")}>
      {index ? <span className={styles.labelIndex}>{index}</span> : null}
      {rule ? <span className={styles.labelRule} aria-hidden="true" /> : null}
      <span>{children}</span>
    </p>
  );
}

