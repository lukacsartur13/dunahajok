"use client";

/**
 * Quality tiers.
 *
 * Resolved once, from things the browser already tells every page: viewport
 * size, pointer type, reported core count, and the reduced-motion preference.
 * Nothing is probed, timed or reported anywhere — this is a rendering budget,
 * not a profile of the visitor.
 *
 * The governing constraint is fill rate, not geometry. The water is a
 * full-screen, multi-octave fragment shader, so device pixel ratio is the
 * single most expensive dial on the board: a 3× retina phone would otherwise
 * ask the GPU for nine times the shader work of the same layout at 1×, for a
 * surface whose highest-frequency content is deliberately soft. Hence the caps
 * below, which are well under `window.devicePixelRatio` on every modern
 * display and still resolve the hull edge cleanly.
 */

export type QualityTier = "high" | "medium" | "low";

export interface QualityProfile {
  tier: QualityTier;
  /** Upper bound handed to the renderer's DPR clamp. */
  maxDpr: number;
  /** Radial rings in the water disc. */
  rings: number;
  /** Angular segments in the water disc. */
  segments: number;
  /** Scales the number of wave octaves evaluated per fragment. */
  detail: number;
  /** Displace the water surface, or shade a flat plane. */
  vertexWaves: boolean;
  /** Draw the vessel's mirrored reflection. */
  reflection: boolean;
  /** Longest edge of the vessel plate texture. */
  plateTextureWidth: number;
}

const PROFILES: Record<QualityTier, Omit<QualityProfile, "tier">> = {
  high: {
    maxDpr: 1.6,
    rings: 128,
    segments: 168,
    detail: 1,
    vertexWaves: true,
    reflection: true,
    plateTextureWidth: 1049,
  },
  medium: {
    maxDpr: 1.35,
    rings: 96,
    segments: 120,
    detail: 0.68,
    vertexWaves: true,
    reflection: true,
    plateTextureWidth: 1049,
  },
  low: {
    maxDpr: 1.2,
    rings: 64,
    segments: 80,
    detail: 0.42,
    // Off: the vertex pass only carries the silhouette of a 4.5 cm swell, and
    // the shading — which is analytic, per fragment — is unchanged without it.
    // All that is lost is a horizon line that undulates.
    vertexWaves: false,
    // On, even here. It is one small transparent quad with a cheap shader, and
    // it is the single strongest cue that the vessel is *in* the water rather
    // than in front of it. Dropping it to save a draw call would cost the
    // phone composition the one thing it is built around.
    reflection: true,
    plateTextureWidth: 1049,
  },
};

/** A still frame costs one render, so it can afford the full treatment. */
const REDUCED_MOTION_PROFILE: Omit<QualityProfile, "tier"> = {
  ...PROFILES.high,
  maxDpr: 2,
};

export function detectQuality(reducedMotion: boolean): QualityProfile {
  if (typeof window === "undefined") return { tier: "high", ...PROFILES.high };
  if (reducedMotion) return { tier: "high", ...REDUCED_MOTION_PROFILE };

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 768;
  const cores = navigator.hardwareConcurrency ?? 8;

  // Phones and low-core machines: the smaller composition, cheaply rendered.
  if ((coarse && narrow) || cores <= 4) return { tier: "low", ...PROFILES.low };
  // Tablets, and laptops that report a modest core count.
  if (coarse || cores <= 8) return { tier: "medium", ...PROFILES.medium };

  return { tier: "high", ...PROFILES.high };
}

/**
 * Development QA override: keep drawing even when the tab reports hidden.
 *
 * `StageRuntime` skips every frame while `document.hidden` is true, which is
 * correct — a backgrounded tab still gets rAF in some browsers and has nothing
 * to show for the work. It also makes the scene invisible to any *offscreen*
 * renderer: an automated browser capturing screenshots is, as far as the page
 * is concerned, permanently backgrounded, so the canvas never composes and
 * every review frame comes back showing the static fallback.
 *
 * `?render=always` turns the guard off, on the same terms as `?webgl=off` and
 * `?motion=reduce`: development only, stripped from production builds, and
 * reachable only on purpose.
 */
export function rendersWhenHidden(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("render") === "always";
}

/** WebGL2 with a working context, or the site keeps its Phase One hero. */
export function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;

  // Development QA override, matching the `?motion=reduce` convention Phase
  // One established: `?webgl=off` exercises the no-WebGL path on a machine
  // that has perfectly good WebGL. The fallback is the most important
  // behaviour in this layer and the hardest to reach by accident, so it needs
  // to be reachable on purpose. Stripped from production builds.
  if (process.env.NODE_ENV !== "production") {
    if (new URLSearchParams(window.location.search).get("webgl") === "off") return false;
  }

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
