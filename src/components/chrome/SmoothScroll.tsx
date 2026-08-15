"use client";

/**
 * Lenis, wired into GSAP's ticker so ScrollTrigger and the smooth-scroll
 * position never disagree by a frame.
 *
 * Scroll hijacking is a real accessibility hazard, so this is deliberately
 * conservative: normal wheel distance, normal direction, and it is switched
 * off entirely under prefers-reduced-motion and for touch (where the platform's
 * own inertia is better than anything we can synthesise).
 */

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion, refreshAfterFonts } from "@/lib/motion";

/**
 * Expose the live Lenis instance to visual-QA tooling, in development only.
 *
 * `window.__duna.scrollTo(y)` jumps immediately and settles ScrollTrigger in the
 * same frame, so a screenshot taken straight afterwards shows the page where the
 * caller asked for it rather than wherever Lenis last animated to.
 */
function attachQaScroll(lenis: Lenis): () => void {
  if (process.env.NODE_ENV === "production") return () => {};

  const qa = {
    lenis,
    /** Jump to an absolute offset with no easing, then flush ScrollTrigger. */
    scrollTo(y: number) {
      // `force` so a stopped instance (menu open, preloader) still moves; no
      // `lock`, which would stop the instance and strand every later call.
      lenis.scrollTo(y, { immediate: true, force: true });
      ScrollTrigger.update();
      return Math.round(lenis.scroll);
    },
    /** Current settled offset, as Lenis understands it. */
    get y() {
      return Math.round(lenis.scroll);
    },
    get height() {
      return Math.round(lenis.limit + window.innerHeight);
    },
    refresh: () => ScrollTrigger.refresh(),
  };

  (window as unknown as { __duna?: typeof qa }).__duna = qa;
  return () => {
    delete (window as unknown as { __duna?: typeof qa }).__duna;
  };
}

export function SmoothScroll() {
  useEffect(() => {
    refreshAfterFonts();

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (prefersReducedMotion() || coarse) {
      // Native scrolling. ScrollTrigger still needs to know about resizes.
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // Anything inside a [data-lenis-prevent] subtree scrolls natively.
      prevent: (node) => node.hasAttribute?.("data-lenis-prevent") ?? false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();

    /* Visual QA hook. Lenis owns the scroll position: it rewrites window.scrollY
       from its own rAF, so `window.scrollTo` is silently undone a frame later and
       any screenshot taken after it shows the page still at the top. That is what
       made the Phase 4.1 "technically passing, visually broken" class of bug so
       hard to catch. Capture tooling has to go through the instance.

       Development only — `attachQaScroll` compiles to a no-op call that the
       production build drops. */
    const detachQa = attachQaScroll(lenis);

    return () => {
      detachQa();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return null;
}
