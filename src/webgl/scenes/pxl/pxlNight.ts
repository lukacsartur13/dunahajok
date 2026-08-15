/**
 * PXL — NIGHT.  PHASE 4.9, at the client's request.
 *
 * "When the night turns on only a silhouette should be seeable and the lights
 * should light up the boat's inside." Two halves that pull against each other,
 * and the whole design is in how they are separated.
 *
 * ── WHY THIS IS NOT A SECOND ENVIRONMENT ───────────────────────────────────
 *
 * The obvious build is a night studio: a second `createStudioEnvironment` with
 * the key turned down, swapped in. It is wrong twice. A dimmer studio is not a
 * silhouette — it is the same boat, darker, with every highlight still crawling
 * along the sheer — and swapping an environment map is a texture upload and a
 * shader recompile on the frame somebody flips the switch.
 *
 * A silhouette is not less light. It is light BEHIND the subject and none on
 * it. So night here is two scalars, both eased, neither of which touches the
 * environment map:
 *
 *   THE BOAT stops answering the studio. Every material's `envMapIntensity`
 *   falls to `SILHOUETTE`, which is the one term that decides how much of the
 *   room a surface returns. At 0.05 the hull keeps an edge and nothing else.
 *
 *   THE BACKDROP stays lit, dimmed only enough to read as evening. It is what
 *   the silhouette is a silhouette AGAINST, so taking it down with the boat
 *   would leave a black rectangle.
 *
 * ── AND THEN THE RINGS ARE THE ONLY SOURCE LEFT ────────────────────────────
 *
 * Which is what makes them worth having. An emissive material does not light
 * anything — it is a surface that draws bright, and three's standard material
 * has no path from one surface's emission to another's shading. So the rings
 * get real `PointLight`s, one per speaker, placed at the ring's own centre by
 * reading the exported mesh rather than by carrying a copy of the coordinates
 * `pxl_upper` already owns.
 *
 * They are built once, live in the scene switched off, and cost nothing until
 * night: a light at zero intensity is still a light the renderer counts, so
 * there are four of them and not eight, and they are removed with the vessel.
 */

import {
  Box3,
  Color,
  MathUtils,
  PointLight,
  Vector3,
  type Mesh,
  type Object3D,
} from "three";

/** What the boat's environment response falls to at full night. */
const SILHOUETTE = 0.05;

/** What the backdrop keeps. Enough to read as evening, not enough to light. */
const BACKDROP = 0.34;

/** Seconds for the change. Slower than a finish: a room takes a moment. */
const SETTLE = 0.55;

/** Below this the transition is over and the frame loop can stop. */
const EPSILON = 1e-3;

/**
 * How far a ring throws, in metres, and how hard.
 *
 * A 2.4 m range covers the cockpit's own beam from either side without
 * reaching the far topsides, so the two sides read as two sources rather than
 * washing into one flat fill — which is the difference between lit and merely
 * brighter. The decay is physical (2), so the number is a real distance rather
 * than a taste.
 */
const THROW = 2.4;
const POWER = 5.2;

export interface PxlNightState {
  /** What the viewer has asked for. */
  on: boolean;
  /** Where the transition actually is, 0–1. */
  t: number;
  lights: PointLight[];
}

export function createNightState(): PxlNightState {
  return { on: false, t: 0, lights: [] };
}

/**
 * Put a light at each speaker ring, by reading where the rings are.
 *
 * THE POSITIONS ARE MEASURED, NOT DECLARED. `pxl_upper.build_speakers` decides
 * the stations and the height, and clamps the height into whatever wall each
 * station has; a copy of those numbers here would be a fourth place for them to
 * live and the first to go stale. The mesh knows: its vertices fall into one
 * cluster per ring, and a cluster's centre is the ring's centre.
 *
 * Clustered on the SIGN OF Y AND THE STATION, not by distance, because that is
 * what the geometry actually is — a pair per station, mirrored — and a general
 * clusterer would be a lot of code to rediscover a fact this file can state.
 */
export function primeNightLights(
  state: PxlNightState,
  root: Object3D,
  rings: Mesh | null,
): void {
  for (const light of state.lights) light.removeFromParent();
  state.lights = [];
  if (!rings) return;

  const position = rings.geometry.getAttribute("position");
  if (!position) return;

  const groups = new Map<string, Box3>();
  const point = new Vector3();
  for (let i = 0; i < position.count; i += 1) {
    point.fromBufferAttribute(position, i).applyMatrix4(rings.matrixWorld);
    /* glTF is Y-up: the boat's own athwartships axis is Z here and its
       fore-and-aft axis is X. Rounding the station to 100 mm is coarse enough
       that one ring is one bucket and fine enough that two stations 1.6 m apart
       never share one. */
    const key = `${point.z > 0 ? "s" : "p"}${Math.round(point.x * 10)}`;
    const box = groups.get(key);
    if (box) box.expandByPoint(point);
    else groups.set(key, new Box3().setFromPoints([point.clone()]));
  }

  /* Merge buckets that are really one ring: a 180 mm ring straddles two 100 mm
     stations more often than not. Neighbouring keys on the same side are the
     same speaker. */
  const merged: Box3[] = [];
  for (const [key, box] of [...groups].sort()) {
    const side = key[0];
    const last = merged[merged.length - 1];
    if (last && last.getCenter(new Vector3()).z * (side === "s" ? 1 : -1) > 0
        && Math.abs(last.getCenter(new Vector3()).x - box.getCenter(new Vector3()).x) < 0.4) {
      last.union(box);
    } else {
      merged.push(box.clone());
    }
  }

  for (const box of merged) {
    const light = new PointLight(0xffffff, 0, THROW, 2);
    box.getCenter(light.position);
    /* Pulled 120 mm inboard of the diffuser, so the source is in the cockpit
       rather than inside the wall it is let into — a light exactly on the ring
       lights the moulding it sits in and nothing else. */
    light.position.z += light.position.z > 0 ? -0.12 : 0.12;
    light.intensity = 0;
    light.castShadow = false;
    root.add(light);
    state.lights.push(light);
  }
}

/**
 * Ease toward the asked-for state and write it everywhere it shows.
 *
 * Returns true while it is still moving, in the same currency as the rest of
 * the scene's tick functions.
 */
export function tickNight(
  state: PxlNightState,
  delta: number,
  ringColour: Color | null,
  ringLit: boolean,
): boolean {
  const target = state.on ? 1 : 0;
  const moving = Math.abs(state.t - target) > EPSILON;
  state.t = moving ? MathUtils.damp(state.t, target, 1 / SETTLE, delta) : target;

  const power = ringLit ? POWER * state.t : 0;
  for (const light of state.lights) {
    light.intensity = power;
    if (ringColour) light.color.copy(ringColour);
  }
  return moving;
}

/** The environment multiplier the boat's materials should be wearing. */
export function nightEnvironment(state: PxlNightState): number {
  return MathUtils.lerp(1, SILHOUETTE, state.t);
}

/** The multiplier the backdrop should be wearing. */
export function nightBackdrop(state: PxlNightState): number {
  return MathUtils.lerp(1, BACKDROP, state.t);
}
