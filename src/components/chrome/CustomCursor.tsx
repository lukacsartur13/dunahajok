"use client";

/**
 * Custom cursor.
 *
 * Restrained on purpose: a hairline ring that trails the pointer, and a label
 * that appears only over media which actually affords something. It never
 * replaces the system cursor's meaning — links still show a pointer beneath
 * it, text still shows a caret — and it is not rendered at all on touch
 * devices or under prefers-reduced-motion.
 *
 * States come from the DOM, so any component can opt in without importing
 * anything: put `data-cursor="View"` on an element and it takes over while
 * the pointer is inside it. `data-cursor-solid` shrinks the ring to a dot for
 * dense UI like the header.
 */

import { useEffect, useRef, useState } from "react";
import { useFinePointer, useReducedMotion } from "@/lib/hooks";
import { gsap } from "@/lib/motion";
import styles from "./CustomCursor.module.css";

export function CustomCursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const enabled = fine && !reduced;

  const ring = useRef<HTMLDivElement>(null);
  const labelEl = useRef<HTMLSpanElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const el = ring.current;
    if (!el) return;

    // Two quickTo setters: the ring lags the pointer slightly, which is what
    // makes the movement read as physical rather than as a hardware cursor.
    const x = gsap.quickTo(el, "x", { duration: 0.42, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.42, ease: "power3.out" });

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x(event.clientX);
      y(event.clientY);
      setVisible(true);

      const target = event.target as Element | null;
      const owner = target?.closest?.("[data-cursor]");
      setLabel(owner?.getAttribute("data-cursor") || null);
      setCompact(Boolean(target?.closest?.("[data-cursor-solid]")));
    };

    const onLeave = () => setVisible(false);
    const onDown = () => el.classList.add(styles.pressed);
    const onUp = () => el.classList.remove(styles.pressed);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [enabled]);

  /* Label swap is its own tween so the ring never jumps while it resizes. */
  useEffect(() => {
    if (!enabled || !labelEl.current) return;
    gsap.fromTo(
      labelEl.current,
      { opacity: 0, y: 4 },
      { opacity: 1, y: 0, duration: 0.28, ease: "power2.out" },
    );
  }, [label, enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={ring}
      className={[
        styles.cursor,
        visible ? styles.visible : "",
        label ? styles.labelled : "",
        compact ? styles.compact : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <span className={styles.ring} />
      {label ? (
        <span ref={labelEl} className={`${styles.label} t-label`}>
          {label}
        </span>
      ) : null}
    </div>
  );
}
