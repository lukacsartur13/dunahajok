"use client";

/**
 * The hero's normalised progress, 0 → 1.
 *
 * This is the only value the whole cinematic sequence is authored against, and
 * it is deliberately *not* a new scroll mechanism. It is one ScrollTrigger over
 * the hero section's existing range — the same range the Phase One departure
 * tween already uses — so the scene evolves as the page scrolls and stops when
 * the page stops. Nothing is pinned, nothing is hijacked, and reversing the
 * scroll reverses the sequence exactly.
 *
 * `scrub` is intentionally absent: this writes a plain number, it does not
 * tween anything, so there is nothing to smooth. Lenis already supplies the
 * inertia, and adding a second smoothing stage here would make the camera lag
 * behind the type it is composed against.
 */

import { ScrollTrigger } from "@/lib/motion";
import { stage } from "./stageState";

/** Attach to the section containing the hero slot. Returns a disposer. */
export function trackHeroProgress(section: Element): () => void {
  const trigger = ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "bottom top",
    onUpdate: (self) => {
      stage.heroProgress = self.progress;
    },
    onRefresh: (self) => {
      stage.heroProgress = self.progress;
    },
  });

  stage.heroProgress = trigger.progress;
  return () => trigger.kill();
}
