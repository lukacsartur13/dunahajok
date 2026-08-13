"use client";

/**
 * PXL — configuration state.
 *
 * The same shape as `stageState`, for the same reason. A configurator changes
 * its configuration a few dozen times in a session and renders it sixty times
 * a second; those are different clocks, and putting the configuration in React
 * state joins them together — every swatch click becomes a tree render, and
 * every tree render becomes a chance to remount something that owns a GPU
 * resource.
 *
 * So: one mutable object, explicit subscription, and a version counter the
 * renderer compares against what it last applied. React components that *want*
 * to re-render (the development viewer's controls, and eventually the
 * configurator's UI) subscribe through `usePxlConfiguration`, which is built
 * on `useSyncExternalStore` and therefore behaves correctly under concurrent
 * rendering. The scene does not subscribe at all: it reads `version` inside
 * its frame callback and repaints its materials when the number moves.
 *
 * Deliberately NOT a state library. Redux, Zustand or Jotai would each be more
 * code than this file, would put the configuration behind an abstraction the
 * render loop has to poll anyway, and would be a dependency added for eighty
 * lines of work.
 */

import { useCallback, useSyncExternalStore } from "react";
import {
  PXL_DEFAULT_CONFIGURATION,
  applyConfigurationToHref,
  parseConfiguration,
  serialiseConfiguration,
  type PxlConfiguration,
} from "./pxlConfig";
import type { PxlZone } from "./pxlModel";

interface PxlStore {
  configuration: PxlConfiguration;
  /** Bumped on every accepted change. The renderer's only trigger. */
  version: number;
}

/**
 * The store starts as the frozen default OBJECT, not a copy of it.
 *
 * The identity matters, and it took a hydration warning to find out why.
 * `useSyncExternalStore` compares the server snapshot against the client
 * snapshot by identity; if the two are equal in content but different objects,
 * React concludes the external data changed during hydration and re-renders the
 * subtree mid-commit — which, in a component that also reads
 * `window.location`, surfaces as a mismatch on markup that is in fact correct.
 *
 * Returning the same frozen object from both sides removes the problem at its
 * root rather than suppressing the warning. Nothing mutates a configuration in
 * place — every write in `commit` allocates — so sharing one immutable default
 * across the server and every client is safe, and the freeze makes that a rule
 * the runtime enforces rather than a convention.
 */
export const pxlStore: PxlStore = {
  configuration: PXL_DEFAULT_CONFIGURATION,
  version: 0,
};

const listeners = new Set<() => void>();
/** Snapshot identity for useSyncExternalStore. Replaced on every commit. */
let snapshot: PxlConfiguration = pxlStore.configuration;

function commit(next: PxlConfiguration): void {
  pxlStore.configuration = next;
  pxlStore.version += 1;
  snapshot = next;
  listeners.forEach((fn) => fn());
}

export function subscribePxl(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Apply a partial change. Merged one level deep, which is exactly as deep as
 * the configuration goes — a caller sets `{ exterior: { hullPrimary } }` and
 * the other two exterior fields survive.
 */
export function setPxlConfiguration(patch: {
  exterior?: Partial<PxlConfiguration["exterior"]>;
  interior?: Partial<PxlConfiguration["interior"]>;
  propulsion?: Partial<PxlConfiguration["propulsion"]>;
  equipment?: Partial<Record<PxlZone, boolean>>;
}): void {
  const current = pxlStore.configuration;
  commit({
    exterior: { ...current.exterior, ...patch.exterior },
    interior: { ...current.interior, ...patch.interior },
    propulsion: { ...current.propulsion, ...patch.propulsion },
    equipment: { ...current.equipment, ...patch.equipment },
  });
}

/** Back to the delivered boat. */
export function resetPxlConfiguration(): void {
  commit(PXL_DEFAULT_CONFIGURATION);
}

/** True when the configuration is the delivered one — RESET has nothing to do. */
export function pxlIsDefault(): boolean {
  return serialiseConfiguration(pxlStore.configuration) === "";
}

/* ── The URL ───────────────────────────────────────────────────────────────*/

/**
 * URL → state, once, on load.
 *
 * §63 asks for one owner, and this is the shape of it: the URL is an *input* to
 * the store at startup and an *output* of it thereafter. Nothing else reads the
 * query string, and nothing else writes it. The alternative — a swatch that
 * changes the scene, a popstate listener that changes something else, and a
 * camera component keeping its own copy — is the failure §63 names, and it does
 * not announce itself until two of the three disagree.
 *
 * Returns the parameters that had to be discarded, so the caller can rewrite
 * the address bar. It does not rewrite it itself: this module is imported by
 * code that runs on the server, and `window` is not always there.
 */
export function loadPxlConfigurationFromUrl(search: string): readonly string[] {
  const { configuration, rejected } = parseConfiguration(search);
  commit(configuration);
  return rejected;
}

/** State → query string. Empty for the default boat. */
export function currentPxlQuery(): string {
  return serialiseConfiguration(pxlStore.configuration);
}

/**
 * The full shareable URL for the configuration currently in the store.
 *
 * Built from the *current* location rather than a stored origin, so it is
 * correct on localhost, on a preview deployment and in production without
 * anything being configured. Parameters that are not the configurator's are
 * preserved — the development bench uses `?debug=1`, and a share link that
 * silently dropped it would be a share link that behaves differently from the
 * page it was copied on.
 */
export function currentPxlPermalink(): string {
  if (typeof window === "undefined") return "";
  return applyConfigurationToHref(window.location.href, pxlStore.configuration);
}

/**
 * Write the store's configuration into the address bar.
 *
 * `replaceState`, never `pushState`: §26 asks for no reloads, and a colour
 * change is a refinement rather than a navigation. Pushing would mean Back
 * stepping through six swatch clicks instead of leaving the page, which is the
 * behaviour every configurator that gets this wrong is remembered for.
 *
 * Here rather than in a component because two routes now do it, and the one
 * thing worse than a configurator that forgets to sync its URL is two
 * configurators that sync it differently.
 */
export function syncPxlUrl(): void {
  if (typeof window === "undefined") return;
  const next = applyConfigurationToHref(window.location.href, pxlStore.configuration);
  if (next === window.location.href) return;
  window.history.replaceState(null, "", next);
}

/**
 * Read the configuration in React.
 *
 * The server snapshot is the *default* configuration rather than the store's
 * current value: on the server there is no store to have changed, and handing
 * back a mutable module-level object would make one request's configuration
 * visible to the next.
 */
export function usePxlConfiguration(): PxlConfiguration {
  return useSyncExternalStore(
    subscribePxl,
    useCallback(() => snapshot, []),
    useCallback(() => PXL_DEFAULT_CONFIGURATION, []),
  );
}
