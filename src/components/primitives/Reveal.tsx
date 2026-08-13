"use client";

/**
 * Reveal — the generic scroll entrance for non-typographic content.
 *
 * Display headlines use DisplayLines (masked, per line). Everything else —
 * paragraphs, lists, annotations, actions — comes through here so the whole
 * page shares one arrival curve and one stagger rhythm.
 */

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import type { PolymorphicTag } from "./polymorphic";
import styles from "./Reveal.module.css";

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  /** Stagger direct children instead of moving the block as one. */
  stagger?: boolean;
  delay?: number;
  distance?: number;
  start?: string;
  className?: string;
  id?: string;
}

export function Reveal({
  children,
  as = "div",
  stagger = false,
  delay = 0,
  distance = 26,
  start = "top 84%",
  className,
  id,
}: RevealProps) {
  const root = useRef<HTMLElement>(null);
  const Tag = as as PolymorphicTag;

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const targets = stagger ? Array.from(el.children) : el;

    if (prefersReducedMotion()) {
      gsap.set(targets, { opacity: 1, y: 0 });
      el.classList.remove(styles.pending);
      return;
    }

    const ctx = gsap.context(() => {
      el.classList.remove(styles.pending);
      gsap.fromTo(
        targets,
        { opacity: 0, y: distance },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          delay,
          stagger: stagger ? 0.075 : 0,
          ease: "hull",
          scrollTrigger: { trigger: el, start, once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [stagger, delay, distance, start]);

  return (
    <Tag ref={root} id={id} className={[styles.pending, className].filter(Boolean).join(" ")}>
      {children}
    </Tag>
  );
}
