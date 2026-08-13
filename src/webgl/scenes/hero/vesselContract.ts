/**
 * THE PRODUCTION MODEL CONTRACT.
 *
 * There is no Duna 6.1 GLB in this repository. Rather than approximate one —
 * a primitive-geometry speedboat labelled "Duna 6.1" would be a lie about a
 * real product from a real yard — the hero renders the approved studio
 * photograph as a plate, and this file is the socket the real model drops into.
 *
 * WHAT ARRIVING LOOKS LIKE.
 *
 *   1. drop `Duna61Cabin.glb` into `public/models/`,
 *   2. flip `available: true` on its entry below,
 *
 * and nothing else changes. `VesselModel` already switches on that flag;
 * `WaterSystem`, the wake, `cameraRig` and the choreography in `heroConfig`
 * are written against the *vessel*, not against the plate, and take a mesh as
 * readily as a texture. The only behavioural difference is that
 * `AZIMUTH_SCALE` goes from 0.34 to 1 and the camera's authored 24° of travel
 * is finally allowed to happen.
 *
 * The delivery requirements for the model itself — orientation, origin, scale,
 * mesh groups, material separation, texture budgets, compression — are
 * specified in WEBGL_ASSET_SPEC.md at the repository root. This file only
 * describes how the site consumes what that document asks for.
 */

/** Named material groups the scene expects to be able to address separately. */
export type VesselMaterialGroup =
  | "hull"
  | "deck"
  | "teak"
  | "glass"
  | "metal"
  | "upholstery"
  | "motor";

export interface VesselModelSpec {
  id: string;
  label: string;
  /** Served from /public. Absent until the asset is delivered. */
  url: string;
  /**
   * False while the file does not exist. The loader is never invoked for an
   * unavailable model, so a missing GLB cannot produce a failed request, a
   * console error or a stalled preloader — it is simply not attempted.
   */
  available: boolean;
  /**
   * Yaw applied on load, radians. The spec asks for bow along +X, which is
   * already the scene's convention, so this is zero for a compliant delivery
   * and exists so a non-compliant one can be corrected without a code change.
   */
  yaw: number;
  /** Multiplier onto the delivered scale. 1 for a model authored in metres. */
  scale: number;
  /**
   * Vertical offset applied after scaling, metres. The spec puts the origin on
   * the waterline; this trims the last centimetre of how deep the hull sits.
   */
  draft: number;
  /** Compression the loader must be prepared for. */
  compression: "none" | "draco" | "meshopt";
  /** Groups expected in this delivery. Kadét omits `cabin` components. */
  groups: readonly VesselMaterialGroup[];
}

const COMMON_GROUPS = [
  "hull",
  "deck",
  "teak",
  "glass",
  "metal",
  "upholstery",
  "motor",
] as const satisfies readonly VesselMaterialGroup[];

/**
 * Registered vessels.
 *
 * Two entries from the start, deliberately. The Cabin and the Kadét are
 * separate hulls above the sheer and will be delivered as separate files; a
 * scene that assumes one model is a scene that gets rewritten in Phase Three.
 * The Kadét is declared here and used by nothing yet — `product-morph` is not
 * this phase's work.
 */
export const VESSELS = {
  "duna61-cabin": {
    id: "duna61-cabin",
    label: "Duna 6.1 Cabin",
    url: "/models/Duna61Cabin.glb",
    available: false,
    yaw: 0,
    scale: 1,
    draft: 0,
    compression: "draco",
    groups: COMMON_GROUPS,
  },
  "duna61-kadet": {
    id: "duna61-kadet",
    label: "Duna 6.1 Kadét",
    url: "/models/Duna61Kadet.glb",
    available: false,
    yaw: 0,
    scale: 1,
    draft: 0,
    compression: "draco",
    groups: COMMON_GROUPS,
  },
} as const satisfies Record<string, VesselModelSpec>;

export type VesselId = keyof typeof VESSELS;

/** The vessel the hero shows. Phase Three makes this a selection. */
export const HERO_VESSEL: VesselId = "duna61-cabin";

/** The plate the hero falls back to while `HERO_VESSEL` is unavailable. */
export const HERO_PLATE = "duna61-cabin-profile" as const;
