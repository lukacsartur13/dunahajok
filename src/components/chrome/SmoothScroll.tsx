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

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return null;
}
