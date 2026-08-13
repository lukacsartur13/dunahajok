"use client";

/**
 * One pool of uniforms, shared by reference across every material in the hero.
 *
 * The backdrop, the water, the vessel plate and its reflection all hold the
 * *same* `{ value }` objects for time, for the sky, for the water's colours and
 * for the rake mask. That is not a micro-optimisation — it is the mechanism
 * that makes the composite hold together. There is no way for the hull to be
 * hazed by a different sky than the water is reflecting, or for the reflection
 * to tear on a different clock than the surface, because there is only one of
 * each number in the process.
 *
 * It is also why the whole sequence updates from a single `useFrame`: one
 * function writes this object, and four materials are current.
 */

import { Vector2, Vector4, type IUniform, type Texture } from "three";
import { KEY_DIR, PALETTE, VESSEL } from "./heroConfig";

export type HeroUniforms = ReturnType<typeof createHeroUniforms>;

export function createHeroUniforms() {
  return {
    /* Shared clock and atmosphere. */
    uTime: { value: 0 } as IUniform<number>,
    uZenith: { value: PALETTE.zenith.clone() },
    uHorizon: { value: PALETTE.horizon.clone() },
    uKeyColor: { value: PALETTE.key.clone() },
    uKeyDir: { value: KEY_DIR.clone() },
    uBankColor: { value: PALETTE.bank.clone() },
    uDeepColor: { value: PALETTE.deep.clone() },
    uScatterColor: { value: PALETTE.scatter.clone() },

    /* The slot's raked top edge, in device pixels. See glsl/rake.ts. */
    uRake: { value: new Vector4(0, 0, 1, 0) },

    /* Scene opacity — the crossfade in over the photograph, and the exit. */
    uFade: { value: 0 } as IUniform<number>,

    /* Water surface. */
    uCenter: { value: new Vector2(0, 0) },
    uWaveAmp: { value: 0.42 } as IUniform<number>,
    uDrift: { value: 0 } as IUniform<number>,
    uDetail: { value: 1 } as IUniform<number>,

    /* Wake. `uWakeAxis` points astern; the bow faces +X, so it starts at -X. */
    uWakeOrigin: { value: new Vector2(0, 0) },
    uWakeAxis: { value: new Vector2(-1, 0) },
    uWakeLength: { value: 10 } as IUniform<number>,
    uWakeSpeed: { value: 0 } as IUniform<number>,
    uWakeLift: { value: 0.05 } as IUniform<number>,
    uLineify: { value: 0 } as IUniform<number>,
    uLinePixelScale: { value: 0.001 } as IUniform<number>,
    uFoamColor: { value: PALETTE.foam.clone() },
    uLineColor: { value: PALETTE.line.clone() },

    /* The hull's occlusion patch on the water. */
    uHullCentre: { value: new Vector2(0, 0) },
    uHullHalf: { value: new Vector2(VESSEL.hullHalf[0], VESSEL.hullHalf[1]) },
    uHullShade: { value: 0 } as IUniform<number>,

    /* Vessel plate. */
    uMap: { value: null as Texture | null },
    uHaze: { value: 0 } as IUniform<number>,
    uExposure: { value: 1 } as IUniform<number>,
    uWaterline: { value: VESSEL.waterline } as IUniform<number>,
    uReflStrength: { value: 0 } as IUniform<number>,
    uBreakup: { value: 0 } as IUniform<number>,
  };
}

/** Convenience for building a material's uniform map from the shared pool. */
export function pick<K extends keyof HeroUniforms>(
  u: HeroUniforms,
  keys: readonly K[],
): Pick<HeroUniforms, K> {
  const out = {} as Pick<HeroUniforms, K>;
  for (const key of keys) out[key] = u[key];
  return out;
}
