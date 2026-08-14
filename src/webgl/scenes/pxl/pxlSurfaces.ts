/**
 * PXL — the interior's micro-surface.
 *
 * §A9 asks that interior material changes "must not behave like painted metal",
 * and lists what upholstery needs: a softer diffuse response, higher roughness,
 * a subtle micro-normal, and believable colour depth. Three of those four are
 * numbers on a finish and live in `pxlPalette`. The fourth needs a texture, and
 * the delivered GLB has none of any kind — no albedo, no roughness, no normal,
 * not one UV set that was authored for a map.
 *
 * THE PROBLEM THAT CAUSES. A `MeshPhysicalMaterial` at roughness 0.84 with no
 * normal map is not soft, it is *featureless*: the specular lobe is so wide
 * that nothing on the surface catches it, so a moulded liner reads as a
 * perfectly smooth shell of coloured plastic. Raising the roughness further
 * makes it worse. It is the single most common way a configurator's interior
 * looks cheap, and no amount of colour work fixes it.
 *
 * WHAT THIS DOES ABOUT IT. Generates one small tangent-space normal map,
 * procedurally, at module scope, shared by every interior zone. It is 128×128,
 * it is 64 KB in memory, it makes no request, and it is tileable — so it can be
 * repeated hard enough to read as a fine grain rather than as a pattern.
 *
 * WHY IT IS HONEST. §A8 warns against pretending two different physical
 * upholstery products exist. This is not two products: it is one grain, and the
 * two surface characters differ only in how strongly it is applied and how
 * rough the surface underneath it is. Both are things a boatbuilder does to one
 * moulding. Nothing here claims a weave, a stitch or a hide, because a 128px
 * value-noise field is not any of those and would be a lie if it were labelled
 * as one.
 *
 * WHY IT DOES NOT COST A RECOMPILE. The map is installed on the interior
 * materials once, at load, before their programs are first built — see
 * `PxlVessel.indexZones`. `normalScale` is a uniform after that, so §A3's "no
 * shader recompile" survives a surface change: choosing GRAINED writes two
 * floats.
 */

import { DataTexture, RepeatWrapping, RGBAFormat, UnsignedByteType } from "three";
import type { PxlInteriorSurface } from "./pxlCatalog";

/** Texels a side. Small on purpose — see the tiling note on `INTERIOR_REPEAT`. */
const SIZE = 128;

/**
 * Grain tiles per metre of boat. The triplanar projection's only scale.
 *
 * Not a texture `repeat`, because the sampling is triplanar and takes its
 * coordinates from object-space position rather than from a UV set the model
 * does not have — see `pxlGrain`. Eight tiles per metre puts one tile at
 * 125 mm, which is fine enough to read as a grain at the closest preset
 * (3.9 m off a 2 m beam) and coarse enough not to alias into shimmer when the
 * camera moves.
 */
export const PXL_GRAIN_TILES_PER_METRE = 8;

/**
 * A deterministic value-noise field, and its normal.
 *
 * DETERMINISTIC MATTERS. `Math.random` here would mean the grain differs
 * between a server render and a client render, between two tabs, and between
 * two snapshots of the same configuration — so the hash below is a fixed
 * integer scramble rather than a PRNG. The same configuration produces the same
 * pixels on every machine, which is what makes the snapshot in §A24 a
 * reproducible record of a choice.
 */
function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Smooth-interpolated value noise, wrapped so the tile has no seam. */
function noise(x: number, y: number, period: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  // Quintic fade — C² continuous, so the derived normal has no visible
  // faceting along the lattice the way a linear or cubic fade leaves.
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  const w = (a: number, b: number) => hash2(((a % period) + period) % period,
                                            ((b % period) + period) % period);
  const a = w(xi, yi);
  const b = w(xi + 1, yi);
  const c = w(xi, yi + 1);
  const d = w(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/** Two octaves. Enough for a grain; a third only adds cost and shimmer. */
function height(x: number, y: number): number {
  return noise(x * 8, y * 8, 8) * 0.66 + noise(x * 22, y * 22, 22) * 0.34;
}

function buildInteriorNormalMap(): DataTexture {
  const data = new Uint8Array(SIZE * SIZE * 4);
  const step = 1 / SIZE;
  // Height amplitude in the same units as `step`, which is what sets the slope
  // the normal ends up carrying. Tuned so the strongest character reads as a
  // grain under a grazing light and disappears under a frontal one, which is
  // how a real matte surface behaves.
  const relief = 2.6;

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const u = x * step;
      const v = y * step;
      // Central differences. Sampling the wrapped noise means the derivative is
      // continuous across the tile boundary too, so the seam is genuinely
      // absent rather than merely hard to spot.
      const dx = (height(u + step, v) - height(u - step, v)) * relief;
      const dy = (height(u, v + step) - height(u, v - step)) * relief;
      const length = Math.sqrt(dx * dx + dy * dy + 1);
      const index = (y * SIZE + x) * 4;
      data[index] = Math.round(((-dx / length) * 0.5 + 0.5) * 255);
      data[index + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255);
      data[index + 2] = Math.round((1 / length) * 255);
      data[index + 3] = 255;
    }
  }

  const texture = new DataTexture(data, SIZE, SIZE, RGBAFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  texture.name = "pxl_interior_grain";
  return texture;
}

let cached: DataTexture | null = null;

/**
 * The shared grain. Built once, on first use, never disposed.
 *
 * Module-scope rather than per-mount because it is 64 KB of constant data that
 * every mount of the vessel wants and no mount may modify. Not built eagerly
 * because this module is imported by the scene graph, which is code-split, and
 * a route that never shows the boat should not spend 16 ms of main thread on a
 * texture it will not use.
 */
export function interiorGrain(): DataTexture {
  cached ??= buildInteriorNormalMap();
  return cached;
}

/* ── Surface character ─────────────────────────────────────────────────────*/

export interface PxlSurfaceCharacter {
  /** Multiplier on the finish's own roughness. */
  roughness: number;
  /** Multiplier on the finish's own `microNormal` amplitude. */
  normal: number;
}

/**
 * §A8's two characters, as the two numbers that separate them.
 *
 * Restrained on purpose. SMOOTH is not "no grain" — a moulded liner always has
 * some — it is a tighter finish over the same tool, so the grain drops to a
 * third and the surface gains a little specular tightness. GRAINED is the
 * textured finish: the full grain, and enough extra roughness that the
 * highlight it catches stays broad.
 *
 * The gap is about 12% of roughness and 3× of normal amplitude, which is
 * visible when the two are compared and never lurid. Pushing it further was
 * tried and reads as two different materials, which is the misrepresentation
 * §A8 rules out.
 */
export const PXL_SURFACE_CHARACTER: Record<PxlInteriorSurface, PxlSurfaceCharacter> = {
  smooth: { roughness: 0.89, normal: 0.34 },
  grained: { roughness: 1.0, normal: 1.0 },
};

/**
 * The grain strength a finish and a character resolve to, 0–1.
 *
 * Capped at 0.5 because this is the `mix` factor between the geometric normal
 * and the fully-grained one, and past about half the surface starts to lose the
 * form the geometry is describing — the liner's own curvature disappears under
 * its own texture, which is a worse failure than no grain at all.
 */
export function surfaceGrainStrength(
  microNormal: number | undefined,
  surface: PxlInteriorSurface,
): number {
  return Math.min((microNormal ?? 0) * PXL_SURFACE_CHARACTER[surface].normal * 0.5, 0.5);
}
