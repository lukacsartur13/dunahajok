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
} from "three";
import {
  PXL_SWEEP_COLOUR,
  PXL_SWEEP_FRAGMENT_COMMON,
  PXL_SWEEP_METALNESS,
  PXL_SWEEP_ROUGHNESS,
  PXL_SWEEP_VERTEX,
  PXL_SWEEP_VERTEX_COMMON,
} from "@/webgl/glsl/pxlSweep";
import { finish } from "./pxlPalette";
import {
  PXL_MODEL,
  PXL_ZONES,
  PXL_ZONE_BY_ID,
  type PxlZone,
  type PxlZoneSpec,
} from "./pxlModel";
import { finishForChannel, zoneVisible, type PxlConfiguration } from "./pxlConfig";

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
}

export type PxlZoneMap = Map<PxlZone, PxlZoneHandle>;

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
 */
function sweeps(spec: PxlZoneSpec): boolean {
  return spec.role === "EXTERIOR_HULL";
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
    const material = promote(child.material as MeshStandardMaterial);
    child.material = material;
    child.castShadow = false;
    child.receiveShadow = false;
    // Nothing here is picked or measured, and the model is always fully in
    // frame, so per-mesh frustum tests are thirteen matrix operations a frame
    // that can only ever answer "yes".
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
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const missing = PXL_ZONES.filter((z) => !map.has(z.id)).map((z) => z.id);
    if (missing.length) console.warn(`PXL: zones missing from the GLB — ${missing.join(", ")}`);
  }
  return map;
}

function snapshot(material: MeshPhysicalMaterial): SurfaceState {
  return {
    colour: material.color.clone(),
    roughness: material.roughness,
    metalness: material.metalness,
    clearcoat: material.clearcoat,
    clearcoatRoughness: material.clearcoatRoughness,
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
    Math.abs(a.clearcoatRoughness - b.clearcoatRoughness) < 1e-4
  );
}

function write(material: MeshPhysicalMaterial, state: SurfaceState): void {
  material.color.copy(state.colour);
  material.roughness = state.roughness;
  material.metalness = state.metalness;
  material.clearcoat = state.clearcoat;
  material.clearcoatRoughness = state.clearcoatRoughness;
}

/**
 * Write a configuration into the materials.
 *
 * Called on load and whenever `pxlStore.version` moves — never per frame. It
 * sets the *endpoints* of a finish change; `tickFinishes` is what moves the
 * material between them, one frame at a time.
 *
 * `immediate` skips the animation entirely, and there are exactly two callers
 * for it: the first paint after the model resolves (there is nothing to
 * transition *from* — the delivered material is a placeholder nobody has seen)
 * and reduced motion. §50 permits a subtle material transition under reduced
 * motion, but the honest reading is that a colour change is information, not
 * decoration: someone who has asked for less motion still needs to see which
 * colour they picked, and they need it without anything moving.
 */
export function applyConfiguration(
  zones: PxlZoneMap,
  config: PxlConfiguration,
  immediate = false,
): void {
  for (const handle of zones.values()) {
    const { spec, material, mesh } = handle;

    mesh.visible = zoneVisible(config, spec.id);

    const id = spec.channel ? finishForChannel(config, spec.channel) : null;
    if (!id) continue;                    // unbound channel: keep the delivery

    const paint = finish(id);
    const target: SurfaceState = {
      // `Color.set` on a hex string treats it as sRGB and converts into the
      // renderer's working space, because react-three-fiber enables THREE's
      // colour management. The finishes are therefore authored in the same
      // space the design renders were graded in.
      colour: new Color().set(paint.base),
      roughness: paint.roughness,
      metalness: paint.metalness,
      clearcoat: paint.clearcoat,
      clearcoatRoughness: paint.clearcoatRoughness,
    };

    if (same(snapshot(material), target)) {
      // Unchanged zones must not restart a transition. Eleven of the thirteen
      // are in exactly this position on every exterior colour change, and
      // animating them from a value to itself would still cost the scene a
      // third of a second of frames it does not need to draw.
      handle.t = 1;
      handle.to = target;
      continue;
    }

    if (immediate) {
      write(material, target);
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
      const previous = handle.sweepT < 1 ? handle.to : snapshot(material);
      write(material, target);
      handle.from = previous;
      handle.to = target;
      handle.t = 1;                        // the uniform path stands down
      handle.sweepT = 0;
      handle.sweep.uPxlSweepFrom.value.copy(previous.colour);
      handle.sweep.uPxlSweepFromSurface.value.set(previous.roughness, previous.metalness);
      handle.sweep.uPxlSweepEdge.value.set(1 + SWEEP_OVERSHOOT, SWEEP_SOFTNESS);
      continue;
    }

    handle.from = snapshot(material);
    handle.to = target;
    handle.t = 0;
  }
}

/** Put a sweep mask where it can have no effect. */
function park(handle: PxlZoneHandle): void {
  handle.sweep?.uPxlSweepEdge.value.set(-10, SWEEP_SOFTNESS);
}

/**
 * Advance every finish transition by one frame.
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
export function tickFinishes(zones: PxlZoneMap, delta: number): boolean {
  let running = false;
  for (const handle of zones.values()) {
    /* The swept path. The material is already holding the destination, so all
       that moves is the boundary — one vec2 per frame, per material.

       The boundary decelerates. It leaves the bow at speed and settles into the
       transom, which is the same deceleration §40 asks the camera for and the
       reason the change resolves rather than stopping. */
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
    // as a bounce. §9's "restrained".
    const e = handle.t * handle.t * (3 - 2 * handle.t);
    const { from, to, material } = handle;
    material.color.copy(from.colour).lerp(to.colour, e);
    material.roughness = from.roughness + (to.roughness - from.roughness) * e;
    material.metalness = from.metalness + (to.metalness - from.metalness) * e;
    material.clearcoat = from.clearcoat + (to.clearcoat - from.clearcoat) * e;
    material.clearcoatRoughness =
      from.clearcoatRoughness + (to.clearcoatRoughness - from.clearcoatRoughness) * e;
    if (handle.t < 1) running = true;
  }
  return running;
}

interface PxlVesselProps {
  /** Told once the model is indexed, with its zone map and its root node. */
  onReady: (zones: PxlZoneMap, root: Object3D) => void;
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

  useEffect(() => {
    onReady(indexZones(model), model);
  }, [model, onReady]);

  useEffect(
    () => () => {
      // Materials only. The geometry belongs to `useGLTF`'s cache and is
      // shared with every other mount of this URL — disposing it here would
      // empty the buffers out from under the next one.
      model.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const material = child.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      });
    },
    [model],
  );

  return <primitive object={model} />;
}

useGLTF.preload(PXL_MODEL.url, false);
