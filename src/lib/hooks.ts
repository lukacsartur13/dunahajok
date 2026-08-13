"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { motionOverride, REDUCED_MOTION_QUERY } from "@/lib/motion";

/** useLayoutEffect that doesn't warn during SSR. */
export const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(defaultValue);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useReducedMotion(): boolean {
  const system = useMediaQuery(REDUCED_MOTION_QUERY);
  const [override, setOverride] = useState<boolean | null>(null);

  // Resolved after mount so SSR output and first paint still agree.
  useEffect(() => setOverride(motionOverride()), []);

  return override ?? system;
}

/**
 * True only for devices with a precise pointer and hover — the gate for the
 * custom cursor and any drag affordance that has no touch equivalent.
 */
export function useFinePointer(): boolean {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}

/** Desktop layout gate. Matches the CSS breakpoint in the section modules. */
export function useDesktop(): boolean {
  return useMediaQuery("(min-width: 61.25rem)");
}

/** Locks body scroll while the overlay menu is open, without layout shift. */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const { body, documentElement: html } = document;
    const gap = window.innerWidth - html.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;

    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
    };
  }, [locked]);
}

/**
 * Pointer position within an element, normalised to -1…1 on both axes.
 * Returns a ref callback plus the latest value; used by the Cabin/Kadét
 * divider and the power selector.
 */
export function useNormalisedPointer<T extends HTMLElement>(enabled = true) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const onPointerMove = useCallback(
    (event: React.PointerEvent<T>) => {
      if (!enabled) return;
      const rect = event.currentTarget.getBoundingClientRect();
      setPos({
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
      });
    },
    [enabled],
  );

  const reset = useCallback(() => setPos({ x: 0, y: 0 }), []);

  return { pos, onPointerMove, reset };
}
