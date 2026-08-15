"use client";

/**
 * PXL — presentation state.
 *
 * Kept separate from `pxlStore` on purpose. That file holds the *boat*: which
 * colours, which equipment — the thing a customer eventually saves, shares and
 * asks for a quote on. This one holds the *view*: which camera, whether the
 * viewer may turn it, whether it is on the river or in the studio. Neither
 * belongs in a permalink with the other, and merging them would mean a
 * shareable configuration that also pins someone else's camera angle.
 *
 * It exists because the canvas is mounted once at the document root, in the
 * layout, while the thing that knows how the PXL should be presented is
 * whatever page happens to have put a `pxl-product` slot on screen. The slot
 * registry already carries *where*; this carries *how*.
 */

import { useSyncExternalStore } from "react";
import { PXL_DEFAULT_PRESET, type PxlPresetId } from "./pxlCamera";

export interface PxlViewState {
  preset: PxlPresetId;
  /** Whether the viewer may turn the boat. */
  interactive: boolean;
  /** Studio (false) or the Phase Two river (true). */
  water: boolean;
  /** §42: compose the vessel into frame on arrival, once. Configurator only. */
  arrival: boolean;
  /** §17: let the backdrop answer the hull's luminance. Configurator only. */
  adaptive: boolean;
  /**
   * §4.9 — NIGHT. The boat falls to a silhouette and its own lights take over.
   *
   * HERE AND NOT IN `PxlConfiguration`, and the line is the same one the seat
   * lids are on: a finish is what somebody would order, and night is how they
   * are looking at it. It is not serialised, so a shared link opens in daylight
   * — the COLOUR of the rings travels in the URL, because that is a
   * specification, and whether the room is dark does not.
   */
  night: boolean;
}

const DEFAULT: PxlViewState = {
  preset: PXL_DEFAULT_PRESET,
  interactive: false,
  water: false,
  arrival: false,
  adaptive: false,
  night: false,
};

let state: PxlViewState = DEFAULT;
const listeners = new Set<() => void>();

export function setPxlView(patch: Partial<PxlViewState>): void {
  const next = { ...state, ...patch };
  if (next.preset === state.preset &&
      next.interactive === state.interactive &&
      next.water === state.water &&
      next.arrival === state.arrival &&
      next.adaptive === state.adaptive &&
      next.night === state.night) {
    return;
  }
  state = next;
  listeners.forEach((fn) => fn());
}

export function resetPxlView(): void {
  if (state === DEFAULT) return;
  state = DEFAULT;
  listeners.forEach((fn) => fn());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePxlView(): PxlViewState {
  return useSyncExternalStore(subscribe, () => state, () => DEFAULT);
}
