"use client";

/**
 * THE PXL, AS GEOMETRY.
 *
 * One GLB, thirteen meshes, thirteen materials, no textures. This component
 * owns exactly two things: turning the loaded scene into a zone-indexed map,
 * and pushing the current configuration into those materials.
 *
 * IT NEVER SWAPS A MATERIAL OBJECT. Changing a colour writes to the existing
 * `MeshPhysicalMaterial` — `.color.set()`, `.roughness =`, and so on. Assigning
 * a new material to a mesh invalidates the shader program and makes the
 * renderer compile a new one, which is a frame-long stall on exactly the
 * interaction that has to feel instant. Writing to a uniform costs nothing and
 * is picked up on the next draw. This is also why there is no material per
 * colour and no GLB per colour: the geometry is loaded once and the paint is
 * state, which is §26 restated as code.
 *
 * The materials arrive as `MeshStandardMaterial` from the loader (glTF's
 * metallic-roughness maps onto it) except where the exporter wrote
 * KHR_materials_clearcoat, which three upgrades to `MeshPhysicalMaterial`.
 * Since the hull's whole character is clear-coated paint, every zone is
 * promoted to physical on load so that a zone can gain clearcoat at runtime
 * without needing a different material class.
 */

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import {
  Color,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector2,
  Vector3,
  type IUniform,
  type Object3D,
  type Texture,
} from "three";
import {
  PXL_SWEEP_COLOUR,
  PXL_SWEEP_FRAGMENT_COMMON,
  PXL_SWEEP_METALNESS,
  PXL_SWEEP_ROUGHNESS,
  PXL_SWEEP_VERTEX,
  PXL_SWEEP_VERTEX_COMMON,
} from "@/webgl/glsl/pxlSweep";
import {
  PXL_GRAIN_FRAGMENT_COMMON,
  PXL_GRAIN_NORMAL,
  PXL_GRAIN_VERTEX,
  PXL_GRAIN_VERTEX_COMMON,
} from "@/webgl/glsl/pxlGrain";
import { finish } from "./pxlPalette";
import {
  PXL_MODEL,
  PXL_ZONES,
  PXL_ZONE_BY_ID,
  type PxlZone,
  type PxlZoneSpec,
} from "./pxlModel";
import { finishForChannel, zoneVisible, type PxlConfiguration } from "./pxlConfig";
import {
  PXL_GRAIN_TILES_PER_METRE,
  PXL_SURFACE_CHARACTER,
  interiorGrain,
  surfaceGrainStrength,
} from "./pxlSurfaces";
import {
  PXL_INK_PLEXI,
  disposePlacement,
  badgeForInk,
  inkForGround,
  placeDunaScript,
  placePlexiMark,
  placeWordmark,
  type PxlDecalPlacement,
} from "./pxlDecals";
import {
  createPlexiMaterial,
  measureScreenFrame,
  type PxlScreenFrame,
} from "./pxlGlazing";
import {
  createPropulsionState,
  disposePropulsion,
  setDrive,
  tickPropulsion,
  type PropulsionState,
} from "./pxlPropulsion";

/**
 * A material's surface parameters, without the material.
 *
 * The endpoints of a finish change are captured into two of these so the
 * transition can be driven without re-reading the live material — which is the
 * thing being written to, and therefore useless as a source.
 */
interface SurfaceState {
  colour: Color;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  /**
   * §A9's cloth terms, carried through the same interpolation as everything
   * else. Zero on every painted surface, so the eleven zones that are not
   * interior pay nothing for their presence — `same()` compares them, finds
   * them equal, and skips the zone entirely.
   */
  sheen: number;
  sheenColour: Color;
  /** Grain strength, 0–0.5. Read by the triplanar injection. See `pxlGrain`. */
  grain: number;
}

/**
 * The uniforms one swept material carries. Null on the ten zones that are not
 * part of the exterior hull and therefore never sweep.
 */
export interface SweepUniforms {
  /** (kx, ky, offset): the plane equation that becomes the sweep coordinate. */
  uPxlSweepBasis: IUniform<Vector3>;
  /** (position, softness), in sweep-coordinate units. */
  uPxlSweepEdge: IUniform<Vector2>;
  /** The colour behind the line, in the renderer's linear working space. */
  uPxlSweepFrom: IUniform<Color>;
  /** (roughness, metalness) behind the line. */
  uPxlSweepFromSurface: IUniform<Vector2>;
}

export interface PxlZoneHandle {
  spec: PxlZoneSpec;
  mesh: Mesh;
  material: MeshPhysicalMaterial;
  /**
   * The finish change in progress, if any. `t` runs 0 → 1 and stops there;
   * `from` is where the material was when the change was requested, not where
   * the previous finish nominally was, so interrupting a transition halfway
   * resolves from the colour actually on screen rather than snapping back.
   */
  from: SurfaceState;
  to: SurfaceState;
  t: number;
  /**
   * Present only on the exterior hull. When it is, the change is driven as a
   * travelling boundary rather than a uniform interpolation — the material
   * holds the *destination* from the first frame and the mask reveals it.
   */
  sweep: SweepUniforms | null;
  /** Progress of the sweep, 0 → 1. Meaningless when `sweep` is null. */
  sweepT: number;
  /**
   * The grain uniform, on the two interior zones. Null on the other eleven.
   *
   * `(tiles per metre, strength)`. The x component never moves; the y is what a
   * surface-character change writes, and writing it is the whole cost of §A8 at
   * runtime — one float, no recompile, because the injection was installed
   * before the program was first built.
   */
  grain: IUniform<Vector2> | null;
}

export type PxlZoneMap = Map<PxlZone, PxlZoneHandle>;

/**
 * THE VESSEL, INCLUDING THE PARTS THAT ARE NOT IN THE GLB.
 *
 * Phase Three's vessel was exactly the loaded model, so a zone map was a
 * complete description of it and every function here took one. Phase Four adds
 * two things the delivery does not contain — the proxy drives (§A14) and the
 * PXL mark (§A10) — and both of them have to be configured, transitioned and
 * disposed alongside the zones rather than beside them.
 *
 * So the unit of work is now a handle. It is a plain object rather than a
 * class for the same reason a configuration is: everything in it is owned by
 * one component, mutated in a frame callback, and never serialised.
 */
export interface PxlVesselHandle {
  zones: PxlZoneMap;
  root: Object3D;
  propulsion: PropulsionState;
  /**
   * Every mark on the boat: two hull marks per side and one on the plexi.
   *
   * Phase Four's version of this field held one mark per side, so a flat array
   * was a complete description. Phase 4.1 has three slots with two different
   * ink rules between them, and the array stays flat rather than becoming a map
   * per slot because every consumer wants all of them: the ink pass filters on
   * `inkFollowsGround`, and teardown does not filter at all.
   */
  decals: PxlDecalPlacement[];
  /** The ground the hull marks were last inked for, so a repaint can be skipped. */
  decalGround: string | null;
  /**
   * The delivered windscreen's front face, as a basis for the plexi mark. §9.
   *
   * NOT THE SCREEN ITSELF ANY MORE. Until Phase 4.3 the runtime built the
   * glazing; it is geometry in the GLB now, and what survives here is the one
   * thing a GLB cannot carry — where on that geometry the mark goes, measured
   * by ray at load.
   *
   * Null when the asset has no `windshield`, which is worth distinguishing from
   * "not measured yet": the mark has nowhere to go, and the vessel renders
   * without it rather than putting it at the origin.
   */
  screen: PxlScreenFrame | null;
}

/**
 * Seconds a finish change takes.
 *
 * §9 asks for a restrained interpolation "around 250–500 ms" and says to judge
 * it visually. 340 ms is what this scene settled on: below about 250 ms the
 * change reads as a cut and the eye records a flicker rather than a finish;
 * above about 450 ms the swatch stops feeling connected to the boat and the
 * control starts to feel laggy. The middle of the range, with a smoothstep and
 * no overshoot, reads as the paint *becoming* the other colour — which is the
 * point, and is also why there is no wipe, no flash and no dissolve here.
 */
export const FINISH_TRANSITION = 0.34;

/**
 * Seconds the hull sweep takes. §67 asks for 400–700 ms.
 *
 * 0.52 s, and the number is set by the *distance* rather than by taste: the
 * boundary crosses 5.25 m of hull, and below about 0.45 s it stops reading as
 * something travelling and starts reading as a wipe, while above about 0.65 s
 * the stern is visibly waiting for paint. It is longer than the plain
 * interpolation on purpose — a line that has somewhere to go needs time to get
 * there, and the two are not the same event.
 */
export const SWEEP_TRANSITION = 0.52;

/**
 * How far past each end of the hull the boundary starts and finishes.
 *
 * Not zero, because a sweep that begins exactly at the bow spends its first
 * frames doing nothing visible, and one that ends exactly at the transom leaves
 * the last few centimetres to be resolved by the smoothstep's own tail.
 */
const SWEEP_OVERSHOOT = 0.09;
/** Half-width of the boundary, in sweep-coordinate units. ~0.29 m of hull. */
const SWEEP_SOFTNESS = 0.055;

/**
 * The rake of the boundary, as a multiple of the Duna Line's own tangent.
 *
 * §66 asks that the effect reference the Duna Line — the 6.5° that governs
 * every diagonal on the site. A boundary raked at exactly 6.5° on a hull that
 * is four and a half times longer than it is tall is, in practice, vertical:
 * the lean would come to about 2% of the sweep's length and nobody would see
 * it. Multiplying by three brings it to roughly 7%, which reads as a deliberate
 * lean at the speed the line actually travels, and is still nothing like a
 * diagonal wipe. The *angle* is a quotation; the amount is tuned to be visible.
 */
const SWEEP_RAKE_GAIN = 3;
/** tan(6.5°) — the site's `--rake`, as a number. */
const DUNA_RAKE_TANGENT = 0.11394;

/** The sweep coordinate's plane equation, for a hull of this length. */
function sweepBasis(): Vector3 {
  const kx = 1 / PXL_MODEL.loa;
  return new Vector3(kx, DUNA_RAKE_TANGENT * SWEEP_RAKE_GAIN * kx, 0.5);
}

/**
 * Teach one material to carry a travelling boundary.
 *
 * Installed at load, once, before the material has ever been compiled — which
 * is what keeps §11's "no shader recompile during finish changes" true. The
 * program is built with the injections already in it, the uniforms are parked
 * where the mask is inert, and a colour change afterwards writes numbers.
 *
 * The uniform objects are returned rather than looked up later. `onBeforeCompile`
 * runs on the renderer's schedule, not ours, so the only reliable moment to
 * capture the handles is inside it — and holding them directly means the frame
 * callback never has to search `material.userData` or a program's uniform map.
 */
function installSweep(material: MeshPhysicalMaterial): SweepUniforms {
  const uniforms: SweepUniforms = {
    uPxlSweepBasis: { value: sweepBasis() },
    // Parked below every coordinate the hull contains: the smoothstep resolves
    // to 1 everywhere and all three mixes are the identity.
    uPxlSweepEdge: { value: new Vector2(-10, SWEEP_SOFTNESS) },
    uPxlSweepFrom: { value: new Color(0, 0, 0) },
    uPxlSweepFromSurface: { value: new Vector2(material.roughness, material.metalness) },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", PXL_SWEEP_VERTEX_COMMON)
      .replace("#include <begin_vertex>", PXL_SWEEP_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", PXL_SWEEP_FRAGMENT_COMMON)
      .replace("#include <color_fragment>", PXL_SWEEP_COLOUR)
      .replace("#include <roughnessmap_fragment>", PXL_SWEEP_ROUGHNESS)
      .replace("#include <metalnessmap_fragment>", PXL_SWEEP_METALNESS);
  };

  return uniforms;
}

/**
 * Which zones sweep.
 *
 * The role, not the zone id: `hull_primary` and `deck_trim` both carry
 * EXTERIOR_HULL today, and if the pipeline ever splits the topsides again the
 * new mesh joins the sweep by virtue of what it *is* rather than by being added
 * to a list somebody has to remember.
 *
 * HULL_BOTTOM JOINS IN PHASE FOUR — §A5. The hull-detail option is a change to
 * the bottom's paint, and §A5 asks for a controlled transition that reuses the
 * Duna Line's material-sweep language rather than a hard cut. Putting the
 * bottom on the same sweep, with the same basis and the same duration, means
 * FULL BODY COLOUR arrives as one boundary travelling down the whole hull
 * rather than as two effects that happen to overlap — and it costs nothing,
 * because the injection is installed at load on a material that was already
 * being promoted.
 *
 * The two are genuinely one event when they coincide. Switching to FULL BODY
 * COLOUR *and* changing the exterior finish in the same commit paints the
 * topsides and the bottom in the same colour behind the same line, which is
 * exactly what a hull being repainted looks like.
 *
 * INTERIOR_SHELL JOINS IN PHASE 4.2, and it has to. The cockpit liner is the
 * same moulding as the topsides seen from inboard, so 4.2 bound it to
 * `hullPrimary` — which means an exterior finish change now repaints the
 * inside of the boat as well. Left off the sweep it would snap to the new
 * colour on frame one while the hull outside it took 520 ms, and the cockpit
 * view is the one preset where you can see both at once.
 */
function sweeps(spec: PxlZoneSpec): boolean {
  return spec.role === "EXTERIOR_HULL" || spec.role === "HULL_BOTTOM"
    || spec.role === "INTERIOR_SHELL";
}

/**
 * Which zones carry the interior grain. §A9.
 *
 * The soft and textured roles, and nothing else. A grain on the hull would be a
 * texture on a sprayed topcoat, which is wrong; a grain on the rails would be a
 * texture on a lacquered inlay, which is also wrong. The cost of the injection
 * is three texture fetches per fragment, so keeping it to the zones that want
 * it is not only correct but the difference between paying for it on a few
 * hundred triangles and paying for it on 20,000.
 *
 * PHASE 4.2 SPLIT THE OLD `INTERIOR_LINER` AND ONLY TWO PIECES KEPT THE GRAIN.
 * The upholstery has it because it is leather and the sole because it is a
 * textured deck covering. INTERIOR_SHELL does NOT: it is now bound to
 * `hullPrimary` and wears the same sprayed finish as the topsides, so graining
 * it would put a leather texture on paint — which is what the whole interior
 * looked like before this phase.
 */
function grained(spec: PxlZoneSpec): boolean {
  return spec.role === "UPHOLSTERY" || spec.role === "SOLE"
    || spec.role === "CONSOLE";
}

/**
 * Teach one material to carry the triplanar grain.
 *
 * Same contract as `installSweep`, for the same reason: at load, before the
 * first compile, with the uniform parked where the block is the identity
 * (strength 0 makes the final `mix` return the geometric normal untouched).
 * A surface-character change afterwards writes one float.
 */
function installGrain(material: MeshPhysicalMaterial, map: Texture): IUniform<Vector2> {
  const grain: IUniform<Vector2> = {
    value: new Vector2(PXL_GRAIN_TILES_PER_METRE, 0),
  };
  const mapUniform: IUniform<Texture> = { value: map };

  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.uPxlGrain = grain;
    shader.uniforms.uPxlGrainMap = mapUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", PXL_GRAIN_VERTEX_COMMON)
      .replace("#include <begin_vertex>", PXL_GRAIN_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", PXL_GRAIN_FRAGMENT_COMMON)
      .replace("#include <normal_fragment_maps>", PXL_GRAIN_NORMAL);
  };

  return grain;
}

/**
 * How strongly each surface family answers the environment.
 *
 * The scene's own sky is the light source, so this is the one place the
 * *scene* is allowed an opinion about the *product*: a painted hull should
 * take the sky at full strength, a moulded liner should not, and a rail should
 * take slightly more than the paint without ever becoming chrome. Everything
 * else about the material belongs to the finish.
 */
const ENV_INTENSITY: Record<PxlZoneSpec["finish"], number> = {
  paint: 1.0,
  structure: 0.9,
  moulding: 0.42,
  soft: 0.3,
  metal: 1.15,
  /* PHASE 4.4. Oiled marine teak sits between a moulding and a paint: it has a
     sheen along the grain and almost none across it, and at 0.68 roughness the
     environment response is what carries that. Above ~0.7 the tread goes flat
     and the planks stop reading as separate boards. */
  wood: 0.55,
  glass: 1.2,
};

/**
 * A fresh physical material carrying the delivered one's values.
 *
 * Always a copy, never the loaded instance. `useGLTF` caches the parsed scene
 * by URL, and `Object3D.clone` copies materials *by reference* — so writing a
 * hull colour into a material that came straight off the clone would repaint
 * every other mount of the model, including the one in the cache that the next
 * page navigation will re-use.
 *
 * Field by field rather than through `copy()`. `MeshPhysicalMaterial.copy`
 * reaches for physical-only properties on its source — `clearcoatNormalScale`
 * and friends — and a `MeshStandardMaterial`, which is what glTF gives you for
 * any material without a clearcoat extension, does not have them. It throws on
 * the first one. Listing what actually transfers is also honest about what the
 * delivery contains: a colour, two scalars, and no maps at all.
 */
function promote(source: MeshStandardMaterial): MeshPhysicalMaterial {
  const next = new MeshPhysicalMaterial({
    color: source.color.clone(),
    roughness: source.roughness,
    metalness: source.metalness,
    side: source.side,
    transparent: source.transparent,
    opacity: source.opacity,
    flatShading: false,
  });
  next.name = source.name;
  if (source instanceof MeshPhysicalMaterial) {
    next.clearcoat = source.clearcoat;
    next.clearcoatRoughness = source.clearcoatRoughness;
  }
  return next;
}

/**
 * Index the loaded scene by zone name.
 *
 * Matching is on `Object3D.name`, which the pipeline writes from the same
 * `PxlZone` union this file imports. A zone that has gone missing is reported
 * once to the console in development and then ignored — the boat renders with
 * one part unpainted rather than failing to render at all, and
 * `validate-model.mjs` is where a missing zone is supposed to be caught, at
 * build time, not here.
 */
export function indexZones(root: Object3D): PxlZoneMap {
  const map: PxlZoneMap = new Map();
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const spec = PXL_ZONE_BY_ID.get(child.name as PxlZone);
    if (!spec) return;
    /* GLAZING IS NOT PROMOTED, IT IS REPLACED. §8 needs a transmission
       material, and glTF's own transmission would arrive through `promote` as a
       plain physical material and then be overwritten by the first
       `applyConfiguration`. Built here instead, before the program is first
       compiled, and left alone afterwards: `windshield` is bound to the
       `glazing` channel, the catalogue offers nothing on it, and
       `applyConfiguration` skips a zone whose channel resolves to no finish. */
    const material = spec.role === "GLAZING"
      ? createPlexiMaterial()
      : promote(child.material as MeshStandardMaterial);
    child.material = material;
    if (spec.role === "GLAZING") child.renderOrder = 2;
    child.castShadow = false;
    child.receiveShadow = false;
    // Nothing here is picked or measured, and the model is always fully in
    // frame, so per-mesh frustum tests are thirteen matrix operations a frame
    // that can only ever answer "yes".
    //
    // With one exception. The stern moulding IS picked: `placeWordmark` fires a
    // ray at it to find where the mark goes, and `Raycaster` skips a culled
    // object only when a camera has set a frustum on it — which it has not
    // here. So the flag stays off for uniformity and the ray works regardless.
    child.frustumCulled = false;
    material.envMapIntensity = ENV_INTENSITY[spec.finish];
    map.set(spec.id, {
      spec,
      mesh: child,
      material,
      from: snapshot(material),
      to: snapshot(material),
      t: 1,
      sweep: sweeps(spec) ? installSweep(material) : null,
      sweepT: 1,
      grain: grained(spec) ? installGrain(material, interiorGrain()) : null,
    });

    /* SHEEN HAS TO BE NON-ZERO BEFORE THE FIRST COMPILE, OR NEVER.
       three decides `USE_SHEEN` from `material.sheen > 0` when it builds the
       program, so a material that starts at zero and gains sheen later is a
       material that recompiles mid-interaction — the exact stall the sweep is
       installed early to avoid. The liner is the only zone whose range carries
       sheen, so it is floored here at a value too small to see and large enough
       to be true, and `applyConfiguration` writes the real number before the
       first draw. The upholstery is the only zone whose range carries sheen —
       it is the only leather on the boat — so it is floored here at a value too
       small to see and large enough to be true, and `applyConfiguration` writes
       the real number before the first draw. Nothing else is ever given any. */
    if (spec.role === "UPHOLSTERY") material.sheen = Math.max(material.sheen, 1e-3);
  });

  if (process.env.NODE_ENV !== "production") {
    const missing = PXL_ZONES.filter((z) => !map.has(z.id)).map((z) => z.id);
    if (missing.length) console.warn(`PXL: zones missing from the GLB — ${missing.join(", ")}`);
  }
  return map;
}

function snapshot(handleOrMaterial: PxlZoneHandle | MeshPhysicalMaterial): SurfaceState {
  const material =
    handleOrMaterial instanceof MeshPhysicalMaterial
      ? handleOrMaterial
      : handleOrMaterial.material;
  const grain =
    handleOrMaterial instanceof MeshPhysicalMaterial
      ? 0
      : (handleOrMaterial.grain?.value.y ?? 0);
  return {
    colour: material.color.clone(),
    roughness: material.roughness,
    metalness: material.metalness,
    clearcoat: material.clearcoat,
    clearcoatRoughness: material.clearcoatRoughness,
    sheen: material.sheen,
    sheenColour: material.sheenColor.clone(),
    grain,
  };
}

/** True when two surfaces are close enough that animating between them is noise. */
function same(a: SurfaceState, b: SurfaceState): boolean {
  return (
    Math.abs(a.colour.r - b.colour.r) < 1e-4 &&
    Math.abs(a.colour.g - b.colour.g) < 1e-4 &&
    Math.abs(a.colour.b - b.colour.b) < 1e-4 &&
    Math.abs(a.roughness - b.roughness) < 1e-4 &&
    Math.abs(a.metalness - b.metalness) < 1e-4 &&
    Math.abs(a.clearcoat - b.clearcoat) < 1e-4 &&
    Math.abs(a.clearcoatRoughness - b.clearcoatRoughness) < 1e-4 &&
    Math.abs(a.sheen - b.sheen) < 1e-4 &&
    Math.abs(a.grain - b.grain) < 1e-4 &&
    Math.abs(a.sheenColour.r - b.sheenColour.r) < 1e-4 &&
    Math.abs(a.sheenColour.g - b.sheenColour.g) < 1e-4 &&
    Math.abs(a.sheenColour.b - b.sheenColour.b) < 1e-4
  );
}

function write(handle: PxlZoneHandle, state: SurfaceState): void {
  const { material } = handle;
  material.color.copy(state.colour);
  material.roughness = state.roughness;
  material.metalness = state.metalness;
  material.clearcoat = state.clearcoat;
  material.clearcoatRoughness = state.clearcoatRoughness;
  // Floored, never zeroed — see the USE_SHEEN note in `indexZones`. A zone
  // whose range carries no sheen never enters this branch, because its
  // snapshot and its target both read zero and `same()` skips it.
  if (material.sheen > 0) material.sheen = Math.max(state.sheen, 1e-3);
  material.sheenColor.copy(state.sheenColour);
  if (handle.grain) handle.grain.value.y = state.grain;
}

/**
 * Write a configuration into the vessel.
 *
 * Called on load and whenever `pxlStore.version` moves — never per frame. It
 * sets the *endpoints* of a finish change, fits the drive the configuration
 * asks for, and re-inks the mark if its ground has moved; `tickVessel` is what
 * moves everything between one frame and the next.
 *
 * `immediate` skips every animation, and there are exactly two callers for it:
 * the first paint after the model resolves (there is nothing to transition
 * *from* — the delivered material is a placeholder nobody has seen) and reduced
 * motion. A colour change is information, not decoration: someone who has asked
 * for less motion still needs to see which colour they picked, and they need it
 * without anything moving.
 */
export function applyConfiguration(
  vessel: PxlVesselHandle,
  config: PxlConfiguration,
  immediate = false,
): void {
  for (const handle of vessel.zones.values()) {
    const { spec, material, mesh } = handle;

    mesh.visible = zoneVisible(config, spec.id);

    const id = spec.channel ? finishForChannel(config, spec.channel) : null;
    if (!id) continue;                    // unbound channel: keep the delivery

    const paint = finish(id);
    const soft = handle.grain !== null;
    /* §A8 — THE SURFACE CHARACTER IS A MULTIPLIER, NOT A SECOND MATERIAL.
       It scales the finish's own roughness and its own grain amplitude, so a
       character cannot invent a surface the finish did not describe: an option
       with no `microNormal` stays perfectly smooth under GRAINED, which is
       correct for the console and is what stops the character control implying
       a texture on a part that has none. */
    const character = PXL_SURFACE_CHARACTER[config.interior.surface];
    const target: SurfaceState = {
      // `Color.set` on a hex string treats it as sRGB and converts into the
      // renderer's working space, because react-three-fiber enables THREE's
      // colour management. The finishes are therefore authored in the same
      // space the design renders were graded in.
      colour: new Color().set(paint.base),
      roughness: soft ? paint.roughness * character.roughness : paint.roughness,
      metalness: paint.metalness,
      clearcoat: paint.clearcoat,
      clearcoatRoughness: paint.clearcoatRoughness,
      sheen: paint.sheen ?? 0,
      sheenColour: new Color().set(paint.sheenColour ?? paint.base),
      grain: soft ? surfaceGrainStrength(paint.microNormal, config.interior.surface) : 0,
    };

    if (same(snapshot(handle), target)) {
      // Unchanged zones must not restart a transition. Eleven of the thirteen
      // are in exactly this position on every exterior colour change, and
      // animating them from a value to itself would still cost the scene a
      // third of a second of frames it does not need to draw.
      handle.t = 1;
      handle.to = target;
      continue;
    }

    if (immediate) {
      write(handle, target);
      handle.from = target;
      handle.to = target;
      handle.t = 1;
      handle.sweepT = 1;
      park(handle);
      continue;
    }

    if (handle.sweep) {
      /* THE SWEEP. The material takes the destination on this very frame and
         the mask is what holds the old finish back — which is the inversion
         that makes this a real material transition rather than a blend of two.

         An interrupted sweep completes instantly rather than chaining. Half way
         through a change the hull is genuinely two colours at once, and there
         is no single "from" that describes it: starting the next sweep from the
         incoming colour would pop the un-swept stern, and starting it from the
         outgoing one would pop the bow. Resolving the first change and letting
         the second depart from a settled hull is the one option with no pop in
         it, and at 0.52 s it is a case that needs someone to be trying. */
      const previous = handle.sweepT < 1 ? handle.to : snapshot(handle);
      write(handle, target);
      handle.from = previous;
      handle.to = target;
      handle.t = 1;                        // the uniform path stands down
      handle.sweepT = 0;
      handle.sweep.uPxlSweepFrom.value.copy(previous.colour);
      handle.sweep.uPxlSweepFromSurface.value.set(previous.roughness, previous.metalness);
      handle.sweep.uPxlSweepEdge.value.set(1 + SWEEP_OVERSHOOT, SWEEP_SOFTNESS);
      continue;
    }

    handle.from = snapshot(handle);
    handle.to = target;
    handle.t = 0;
  }

  /* §A14 — the drive. Cached, so stepping back to one already built costs a
     `Map` lookup and an `add`. */
  setDrive(vessel.propulsion, vessel.root, config.propulsion.variant, immediate);

  /* §A11 — the mark's ink follows its ground. The ground is the stern
     moulding, which no option currently changes, so this is a no-op on every
     call after the first — and it is written as a comparison rather than as a
     one-shot so that it stays correct the day the moulding becomes
     configurable. */
  inkWordmark(vessel, config);
}

/**
 * Build the branding, once, and re-ink it when its ground moves.
 *
 * THE MARKS ARE BUILT LAZILY, on the first call that has surfaces to put them
 * on — which is the same call that first applies a configuration, so they are in
 * place before the first draw and there is no frame in which the boat is
 * unbranded.
 *
 * TWO INK RULES, AND THE DATA DECIDES WHICH APPLIES. The hull marks sit on the
 * stern moulding and the gunwale capping, both of which are finishes a
 * configuration resolves, so their ink follows §12's contrast rule. The plexi
 * mark sits on glazing, which no option changes, so its ink is fixed. Rather
 * than special-casing the third mark, each placement carries
 * `inkFollowsGround` and the re-ink pass filters on it — which is also what
 * keeps this correct on the day the moulding becomes configurable.
 *
 * BOTH HULL MARKS TAKE THE SAME INK, and that is a decision rather than an
 * oversight. They sit on two different mouldings, so in principle each could
 * resolve its own; in every delivered plate they are the same colour, because
 * both mouldings are the same structural black. Resolving them separately would
 * be modelling a distinction the product does not make, and would leave the two
 * marks free to disagree the first time somebody made the capping configurable.
 */
function inkWordmark(vessel: PxlVesselHandle, config: PxlConfiguration): void {
  const groundId = finishForChannel(config, "sternMoulding");
  if (!groundId) return;
  const ground = finish(groundId).base;
  if (vessel.decalGround === ground) return;

  const ink = inkForGround(ground);

  if (!vessel.decals.length) {
    const moulding = vessel.zones.get("transom_black");
    const capping = vessel.zones.get("hull_accent");
    if (moulding) vessel.decals.push(...placeWordmark(moulding.mesh, ink));
    if (capping) vessel.decals.push(...placeDunaScript(capping.mesh, ink));
    if (vessel.screen) {
      vessel.decals.push(placePlexiMark(vessel.screen, PXL_INK_PLEXI));
    }
    for (const placement of vessel.decals) vessel.root.add(placement.mesh);

    if (process.env.NODE_ENV !== "production") {
      /* Reported per slot rather than as one warning, because the three fail
         independently and for different reasons — a missing moulding, a capping
         whose section has moved inboard of the ray, an absent console. One
         message saying "branding failed" would send whoever reads it looking in
         the wrong place. */
      const built = new Set(vessel.decals.map((p) => p.slot));
      for (const slot of ["pxl_wordmark", "duna_script", "pxl_plexi"]) {
        if (!built.has(slot)) console.warn(`PXL: the ${slot} mark could not be placed`);
      }
    }
  } else {
    /* PHASE 4.6 §25, §30 — RE-BADGE, NOT RE-INK.
       The hull marks stopped being paint this phase, so applying the ink's own
       colour and surface here would have undone the whole of §25 the first time
       anybody changed finish: a brushed emblem would have become flat cognac at
       metalness 0 the moment the sweep landed. The ink still DECIDES — one rule,
       `badgeForInk`, on the same luminance threshold — but what it selects is
       one of the two metal tones §30 asks be tested across the range.

       The plexi mark is untouched, as it has been since Phase Four: it carries
       `inkFollowsGround: false` because its ground is glazing, and §31 requires
       it stay a print. */
    for (const placement of vessel.decals) {
      if (!placement.inkFollowsGround) continue;
      const badge = badgeForInk(ink, placement.slot);
      placement.material.color.set(badge.colour);
      placement.material.roughness = badge.roughness;
      placement.material.metalness = badge.metalness;
      placement.material.anisotropy = badge.anisotropy;
      placement.material.anisotropyRotation = badge.anisotropyRotation;
      placement.material.clearcoat = 0;
    }
  }

  vessel.decalGround = ground;
}

/** Put a sweep mask where it can have no effect. */
function park(handle: PxlZoneHandle): void {
  handle.sweep?.uPxlSweepEdge.value.set(-10, SWEEP_SOFTNESS);
}

/**
 * Advance every transition on the vessel by one frame.
 *
 * Returns true while any of them is still running, which is what the scene
 * turns into a request for another frame — a demand-rendered scene that
 * animates a material without asking for frames animates it in the dark.
 *
 * Colours are interpolated in the renderer's LINEAR working space, which is
 * where `Color` already holds them. That matters most on the two changes that
 * traverse the widest range — white to black, and anything to the gold — where
 * an sRGB-space blend passes through a washed-out midpoint that neither
 * endpoint contains, and a linear blend passes through a plausible paint.
 */
export function tickVessel(vessel: PxlVesselHandle, delta: number): boolean {
  let running = tickPropulsion(vessel.propulsion, vessel.root, delta);

  for (const handle of vessel.zones.values()) {
    /* The swept path. The material is already holding the destination, so all
       that moves is the boundary — one vec2 per frame, per material.

       The boundary decelerates. It leaves the bow at speed and settles into the
       transom, which is the same deceleration the camera uses and the reason
       the change resolves rather than stopping. */
    if (handle.sweep && handle.sweepT < 1) {
      handle.sweepT = Math.min(1, handle.sweepT + delta / SWEEP_TRANSITION);
      const e = 1 - Math.pow(1 - handle.sweepT, 3);
      handle.sweep.uPxlSweepEdge.value.x = MathUtils.lerp(
        1 + SWEEP_OVERSHOOT,
        -SWEEP_OVERSHOOT,
        e,
      );
      if (handle.sweepT >= 1) park(handle);
      else running = true;
      continue;
    }

    if (handle.t >= 1) continue;
    handle.t = Math.min(1, handle.t + delta / FINISH_TRANSITION);
    // Smoothstep: zero velocity at both ends, no overshoot, nothing that reads
    // as a bounce.
    const e = handle.t * handle.t * (3 - 2 * handle.t);
    const { from, to, material } = handle;
    material.color.copy(from.colour).lerp(to.colour, e);
    material.roughness = from.roughness + (to.roughness - from.roughness) * e;
    material.metalness = from.metalness + (to.metalness - from.metalness) * e;
    material.clearcoat = from.clearcoat + (to.clearcoat - from.clearcoat) * e;
    material.clearcoatRoughness =
      from.clearcoatRoughness + (to.clearcoatRoughness - from.clearcoatRoughness) * e;
    if (material.sheen > 0) {
      material.sheen = Math.max(from.sheen + (to.sheen - from.sheen) * e, 1e-3);
    }
    material.sheenColor.copy(from.sheenColour).lerp(to.sheenColour, e);
    if (handle.grain) {
      handle.grain.value.y = from.grain + (to.grain - from.grain) * e;
    }
    if (handle.t < 1) running = true;
  }
  return running;
}

interface PxlVesselProps {
  /** Told once the model is indexed, with everything hung on it. */
  onReady: (vessel: PxlVesselHandle) => void;
}

/**
 * ONE VESSEL PER MODEL ROOT, however many times this is called.
 *
 * ── THE BUG THIS EXISTS FOR ────────────────────────────────────────────────
 *
 * Building the vessel is not a pure computation: `indexZones` promotes each
 * mesh's material and ASSIGNS IT BACK to the mesh, and `createScreen` adds a
 * child to the model. Both of those were run straight from a `useMemo` factory,
 * and React StrictMode — which `next.config.ts` turns on — deliberately invokes
 * memo factories twice in development to surface exactly that impurity.
 *
 * It surfaced. The second invocation re-promoted every material and left the
 * mesh wearing a fresh instance, while the handle React retained still held the
 * first. Every zone's `mesh.material !== handle.material`, and the consequence
 * was silent and total: `applyConfiguration` wrote colours to thirteen orphans,
 * the store and the URL and the swatches all read correct, and THE BOAT NEVER
 * CHANGED COLOUR. Nothing threw, and nothing in `npm run qa` could see it,
 * because it lives in the gap between the model and the pixels.
 *
 * Found in Phase 4.1 by rendering `exterior=navy` and `exterior=white` through
 * the deterministic frame mode and diffing the two images: zero differing
 * pixels, against two materials that demonstrably held different colours. See
 * PHASE_4_1_REPORT.md §M.
 *
 * ── WHY A WEAKMAP AND NOT AN EFFECT ────────────────────────────────────────
 *
 * The textbook fix is to move construction into an effect and hold the vessel
 * as state. That is a larger change than the bug warrants — the vessel would
 * become nullable for one frame, and every consumer would grow a branch for it —
 * and §32 is explicit that this phase is not for rebuilding what Phase Four
 * settled.
 *
 * Keying the built vessel to the root it was built from makes the factory
 * IDEMPOTENT instead, which is what StrictMode is actually asking for: invoke it
 * twice and the second call returns the first call's work rather than doing it
 * again. A weak key means the entry dies with the model clone that owns it, so
 * remounting still builds a genuinely new vessel and unmount still disposes one.
 *
 * This is also a real production guarantee and not only a development one.
 * Nothing promises a memo factory runs once — React may drop and recompute a
 * cache under memory pressure — and a second run in production would have had
 * precisely the same effect with no StrictMode to blame.
 */
const VESSEL_BY_ROOT = new WeakMap<Object3D, PxlVesselHandle>();

function buildVessel(model: Object3D): PxlVesselHandle {
  const existing = VESSEL_BY_ROOT.get(model);
  if (existing) return existing;

  const zones = indexZones(model);
  /* §9 — the plexi mark's basis, measured off the DELIVERED glazing before any
     configuration is applied, because the mark is built on the first
     `applyConfiguration` and needs a surface to sit on by then.
     `installGlazing` also puts the transmission material on, which has to
     happen before the material's program is first built. */
  const glazing = zones.get("windshield");
  const screen = glazing ? measureScreenFrame(glazing.mesh) : null;
  if (process.env.NODE_ENV !== "production" && !screen) {
    console.warn("PXL: no windshield in the asset — the plexi mark was not placed");
  }

  const vessel: PxlVesselHandle = {
    zones,
    root: model,
    propulsion: createPropulsionState(),
    decals: [],
    decalGround: null,
    screen,
  };
  VESSEL_BY_ROOT.set(model, vessel);
  return vessel;
}

export function PxlVessel({ onReady }: PxlVesselProps) {
  // `false` for Draco: the asset is meshopt-encoded, and leaving drei's
  // default in place would construct a DRACOLoader pointed at Google's CDN
  // for a decoder this model will never ask for. Meshopt stays on — its
  // decoder is bundled with three-stdlib and costs no request.
  const { scene } = useGLTF(PXL_MODEL.url, false);

  const model = useMemo(() => {
    // Cloned because `useGLTF` caches by URL and the development viewer can
    // mount a second instance; two scenes sharing one Object3D would fight
    // over its transform.
    const root = scene.clone(true);
    root.name = "PXL_ROOT";
    return root;
  }, [scene]);

  const vessel = useMemo<PxlVesselHandle>(() => buildVessel(model), [model]);

  useEffect(() => {
    onReady(vessel);
  }, [vessel, onReady]);

  useEffect(
    () => () => {
      /* Everything this component created, and nothing it borrowed.

         The GLB's GEOMETRY belongs to `useGLTF`'s cache and is shared with
         every other mount of this URL — disposing it here would empty the
         buffers out from under the next one. The MATERIALS are ours, because
         `indexZones` promoted every one of them to a fresh instance. The
         drives, the marks and the screen are ours outright, geometry included,
         because nothing else built them. */
      disposePropulsion(vessel.propulsion, vessel.root);
      for (const placement of vessel.decals) disposePlacement(placement);
      vessel.decals = [];
      model.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const material = child.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      });
    },
    [model, vessel],
  );

  return <primitive object={model} />;
}

useGLTF.preload(PXL_MODEL.url, false);
