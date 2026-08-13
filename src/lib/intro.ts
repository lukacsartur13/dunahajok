"use client";

/**
 * A one-bit global store: has the intro finished and handed the page over?
 *
 * The Hero's own entrance must not start behind the preloader, and the header
 * must not fade in over it. Both need to know, and neither is a child of the
 * Preloader — so this lives outside React's tree rather than being threaded
 * through context providers that would re-render half the page.
 */

import { useSyncExternalStore } from "react";

let ready = false;
const subscribers = new Set<() => void>();

export function markIntroComplete(): void {
  if (ready) return;
  ready = true;
  document.documentElement.dataset.intro = "done";
  subscribers.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/** True once the preloader has released the page. */
export function useIntroReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => ready,
    () => false, // server: always "not ready" so markup matches first paint
  );
}

/** Repeat visits get a shorter intro. Session-scoped, not persistent. */
export const VISIT_KEY = "duna:visited";

export function isReturningVisitor(): boolean {
  try {
    return sessionStorage.getItem(VISIT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markVisited(): void {
  try {
    sessionStorage.setItem(VISIT_KEY, "1");
  } catch {
    /* private mode — the long intro is an acceptable fallback */
  }
}
