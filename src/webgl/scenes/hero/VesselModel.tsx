"use client";

/**
 * THE VESSEL — one component, two possible bodies.
 *
 * This is the only place in the scene that knows whether the Duna 6.1 is a
 * mesh or a photograph. Everything else — the water, the wake, the camera, the
 * choreography — is written against a vessel that occupies a known length at a
 * known place on the waterline, which both representations do.
 *
 * Today `vesselContract` reports no model available, so this resolves to the
 * plate on every render and the glTF path is not even downloaded. The switch
 * is a one-line change in `vesselContract.ts` when the asset lands.
 */

import { Suspense, lazy, useCallback, useEffect } from "react";
import { stage, type VesselSource } from "@/webgl/stage/stageState";
import { VesselPlate } from "./VesselPlate";
import { HERO_VESSEL, VESSELS } from "./vesselContract";
import type { HeroUniforms } from "./heroUniforms";

/**
 * Code-split so the DRACO and glTF machinery is not in the bundle for a model
 * that does not exist. `available: false` means this promise is never created.
 */
const VesselGltf = lazy(() =>
  import("./VesselGltf").then((m) => ({ default: m.VesselGltf })),
);

interface VesselModelProps {
  uniforms: HeroUniforms;
  reflection: boolean;
  /** Told once, when the vessel is on screen or has definitively failed. */
  onSourceChange: (source: VesselSource) => void;
}

export function VesselModel({ uniforms, reflection, onSourceChange }: VesselModelProps) {
  const spec = VESSELS[HERO_VESSEL];

  const onPlateReady = useCallback(
    (ok: boolean) => {
      const source: VesselSource = ok ? "plate" : "error";
      stage.vesselSource = source;
      onSourceChange(source);
    },
    [onSourceChange],
  );

  useEffect(() => {
    if (spec.available) {
      stage.vesselSource = "model";
      onSourceChange("model");
    }
  }, [spec.available, onSourceChange]);

  if (spec.available) {
    return (
      <Suspense fallback={null}>
        <VesselGltf spec={spec} />
      </Suspense>
    );
  }

  return (
    <VesselPlate uniforms={uniforms} reflection={reflection} onReady={onPlateReady} />
  );
}
