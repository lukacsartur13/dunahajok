"use client";

/**
 * Motion system.
 *
 * One language for the whole site: slow, physical, inertial, precise.
 * Nothing eases with a default curve; nothing animates that isn't carrying
 * hierarchy or story.
 *
 * Everything routes through here so that (a) plugins register exactly once,
 * (b) reduced-motion is a single decision rather than a per-component
 * afterthought, and (c) the future WebGL layer can subscribe to the same
 * ScrollTrigger instance instead of running its own raf loop.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** The site's easing vocabulary, mirrored from tokens.css. Registered before
 *  anything can reference the names. */
gsap.registerEase("hull", (p) => 1 - Math.pow(1 - p, 4)); // decisive arrival
gsap.registerEase("glide", (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2));

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });
  gsap.defaults({ ease: "hull", duration: 1.1 });

  // Development handle for inspecting and scrubbing timelines from the
  // console. Stripped from production bundles by dead-code elimination.
  //   __gsap.globalTimeline.getChildren(true, true, false)
  //         .forEach((t) => t.progress(1));
  if (process.env.NODE_ENV !== "production") {
    (window as unknown as { __gsap: typeof gsap }).__gsap = gsap;
  }
}

export { gsap, ScrollTrigger };

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Development QA override: `?motion=reduce` forces the reduced-motion path,
 * `?motion=full` forces the animated one, so both can be reviewed without
 * changing an OS setting. Not available in production builds.
 */
export function motionOverride(): boolean | null {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("motion");
  if (value === "reduce") return true;
  if (value === "full") return false;
  return null;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return motionOverride() ?? window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Standard entrance for a block of content.
 *
 * Reduced motion: elements are simply revealed at their final position — the
 * hierarchy still lands, it just doesn't travel to get there.
 */
export function revealFrom(
  targets: gsap.TweenTarget,
  options: {
    y?: number;
    stagger?: number;
    delay?: number;
    trigger?: Element;
    start?: string;
    duration?: number;
  } = {},
): gsap.core.Tween | undefined {
  const { y = 28, stagger = 0.07, delay = 0, trigger, start = "top 82%", duration = 1.15 } = options;

  if (prefersReducedMotion()) {
    gsap.set(targets, { opacity: 1, y: 0, clearProps: "transform" });
    return undefined;
  }

  return gsap.fromTo(
    targets,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration,
      delay,
      stagger,
      ease: "hull",
      scrollTrigger: trigger ? { trigger, start, once: true } : undefined,
    },
  );
}

/**
 * Line-by-line mask reveal for display typography.
 * Expects each line wrapped in `.js-line > span` (see components/primitives).
 */
export function revealLines(
  scope: Element,
  options: { trigger?: Element; start?: string; delay?: number; stagger?: number } = {},
): void {
  const inner = scope.querySelectorAll<HTMLElement>(".js-line > span");
  if (!inner.length) return;

  if (prefersReducedMotion()) {
    gsap.set(inner, { yPercent: 0, opacity: 1 });
    return;
  }

  gsap.fromTo(
    inner,
    { yPercent: 108 },
    {
      yPercent: 0,
      duration: 1.35,
      ease: "hull",
      delay: options.delay ?? 0,
      stagger: options.stagger ?? 0.085,
      scrollTrigger: options.trigger
        ? { trigger: options.trigger, start: options.start ?? "top 80%", once: true }
        : undefined,
    },
  );
}

/**
 * Count a numeral up as it enters. Preserves the source string's decimal
 * places so "6.10" never collapses to "6.1".
 */
export function countUp(el: HTMLElement, target: string, trigger: Element): void {
  const numeric = Number.parseFloat(target);
  if (Number.isNaN(numeric)) return; // e.g. the CE category "C"

  const decimals = target.includes(".") ? target.split(".")[1].length : 0;
  if (prefersReducedMotion()) {
    el.textContent = target;
    return;
  }

  const state = { v: 0 };
  gsap.to(state, {
    v: numeric,
    duration: 1.6,
    ease: "glide",
    scrollTrigger: { trigger, start: "top 78%", once: true },
    onUpdate: () => {
      el.textContent = state.v.toFixed(decimals).padStart(target.length, target[0] === "0" ? "0" : "");
    },
    onComplete: () => {
      el.textContent = target;
    },
  });
}

/** ScrollTrigger needs a nudge after fonts settle, or `start` values drift. */
export function refreshAfterFonts(): void {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
