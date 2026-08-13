/**
 * THE PXL MODEL CONTRACT.
 *
 * Unlike `vesselContract.ts` — which describes a Duna 6.1 that does not exist
 * yet — everything in this file describes a model that is in the repository
 * and has been measured. `scripts/pxl/build_pxl.py` writes the node names
 * below; `scripts/pxl/validate-model.mjs` fails the build if one of them goes
 * missing. The two ends are held together by `PXL_ZONES`, and by nothing else.
 *
 * The unit of configuration is the ZONE. A zone is one mesh in the GLB, one
 * material, and at most one configuration channel. Splitting a zone means
 * re-running the pipeline; re-colouring one is a runtime assignment. That
 * boundary is the whole architecture: the model is geometry, the configuration
 * is state, and no colour ever produces a second GLB.
 *
 * See PXL_MODEL_MAP.md for the same table in prose, with the source
 * limitations spelled out.
 */

// The one import, and it imports nothing itself — this module is part of the
// pure set `npm test` runs on plain node. See `basePath.ts`.
import { asset } from "../../../lib/basePath";

/** Every mesh in `public/models/PXL.glb`, by exported node name. */
export type PxlZone =
  | "hull_primary"
  | "hull_lower"
  | "hull_accent"
  | "transom_black"
  | "deck_main"
  | "deck_trim"
  | "console_body"
  | "console_trim"
  | "helm_wheel"
  | "rails"
  | "motor"
  | "motor_trim"
  | "accessory_cockpit_cover";

/**
 * The channels a configurator can drive.
 *
 * Declared in full, including the four the current asset cannot serve, because
 * the *architecture* is what this phase delivers and a channel that appears
 * later is a channel that changes this union — which is a change every
 * consumer has to be recompiled against. A channel with no zones bound to it
 * is inert: `applyConfiguration` iterates zones, so an unbound channel simply
 * paints nothing, and `PXL_UNSUPPORTED_CHANNELS` says why in one place.
 */
export type PxlChannel =
  | "hullPrimary"
  | "hullLower"
  | "hullAccent"
  | "upholsteryPrimary"
  | "upholsterySecondary"
  | "console"
  | "glazing"
  | "metal"
  | "motor"
  | "flooring";

/**
 * Channels with no geometry in the current asset, and why.
 *
 * The source STL is a SketchUp design model. It carries the hull, the deck
 * moulding, the console box, the wheel, two rails and an outboard — and
 * nothing else. The design renders show upholstery and a windscreen that the
 * 3D file simply does not contain, and this phase does not invent geometry to
 * fill the gap. Delivering those meshes is the first item on the list of
 * things still needed from the yard.
 */
export const PXL_UNSUPPORTED_CHANNELS: Partial<Record<PxlChannel, string>> = {
  upholsteryPrimary:
    "no seating or cushion geometry in the source STL — the cockpit is a bare moulded liner",
  upholsterySecondary:
    "no secondary upholstery geometry in the source STL",
  glazing:
    "no windscreen geometry in the source STL, though the design renders show one",
};

/* ── Material roles ────────────────────────────────────────────────────────*/

/**
 * WHAT A SURFACE *IS*, as opposed to what it is called in the GLB or which
 * slot it happens to occupy in the imported material array.
 *
 * §3 asks for exactly this, and the reason is worth stating: an imported
 * material index is a property of one export of one file. Re-run the pipeline
 * with the meshes in a different order and every index moves, but the stern
 * moulding is still the stern moulding. Code that says `materials[4]` breaks
 * silently; code that says `STERN_MOULDING` breaks loudly, at the one place
 * roles are bound, or does not break at all.
 *
 * ROLES ARE DERIVED FROM GEOMETRY, NOT FROM A WISH LIST. §3's target set names
 * EXTERIOR_HULL, INTERIOR_HULL, STERN_ACCENT, DECK, FLOOR, CONSOLE and
 * METAL/HARDWARE. Four of those cannot exist here and are deliberately absent:
 *
 *   • INTERIOR_HULL — the source hull is a zero-thickness open shell. Its
 *     inner face is the *same triangles* as its outer face, drawn double-sided.
 *     There is no second surface to give a second role to.
 *   • DECK and FLOOR — `deck_main` is one mesh carrying the cockpit liner, the
 *     sole and the inner faces of the shell together. Splitting it into a deck
 *     role and a floor role would mean two names pointing at one material, and
 *     the first person to set them differently would find out the hard way.
 *
 * So the set below is smaller than the brief's, on purpose. Adding a role when
 * the geometry arrives to support it is a one-line change here plus a binding
 * in `PXL_ZONES`; nothing downstream addresses a material any other way.
 */
export type PxlMaterialRole =
  /** Topsides and the panels painted with them. The configurable surface. */
  | "EXTERIOR_HULL"
  /** Bottom below the chine. Structural black in every reference. */
  | "HULL_BOTTOM"
  /** Gunwale capping. */
  | "GUNWALE_CAPPING"
  /** Transom and the black stern moulding that carries the PXL mark. */
  | "STERN_MOULDING"
  /** Cockpit liner, sole and inner shell faces — one mesh, see above. */
  | "INTERIOR_LINER"
  /** Helm console body and its control box. */
  | "CONSOLE"
  /** Steering wheel. Not configurable; it is a bought-in part. */
  | "HELM"
  /** Grab rails. §3's METAL/HARDWARE. */
  | "HARDWARE"
  /** Outboard cowling and bracket. Never follows the hull colour. */
  | "PROPULSION"
  /** Optional flush cockpit cover. Visibility only. */
  | "COVER";

export interface PxlZoneSpec {
  /** glTF node and material name. Must match the exporter exactly. */
  id: PxlZone;
  /** Human name, for the model map and the development viewer. */
  label: string;
  /**
   * What this surface is. The stable handle: configurator code targets a role,
   * and `pxlModel` is the only file that knows which mesh currently carries it.
   */
  role: PxlMaterialRole;
  /** Which configuration channel repaints this zone, if any. */
  channel: PxlChannel | null;
  /**
   * Surface family. Decides how the runtime treats the material beyond its
   * colour — clearcoat on paint, none on a moulding, controlled environment
   * response on metal.
   */
  finish: "paint" | "structure" | "moulding" | "soft" | "metal" | "glass";
  /**
   * False for optional equipment. The default configuration hides these; the
   * component registry in `pxlConfig` turns them back on.
   */
  visibleByDefault: boolean;
}

export const PXL_ZONES: readonly PxlZoneSpec[] = [
  { id: "hull_primary", label: "Hull topsides", role: "EXTERIOR_HULL", channel: "hullPrimary", finish: "paint", visibleByDefault: true },
  { id: "hull_lower", label: "Hull bottom", role: "HULL_BOTTOM", channel: "hullLower", finish: "paint", visibleByDefault: true },
  { id: "hull_accent", label: "Gunwale capping", role: "GUNWALE_CAPPING", channel: "hullAccent", finish: "structure", visibleByDefault: true },
  { id: "transom_black", label: "Stern moulding and transom", role: "STERN_MOULDING", channel: "hullLower", finish: "structure", visibleByDefault: true },
  { id: "deck_main", label: "Cockpit liner and sole", role: "INTERIOR_LINER", channel: "flooring", finish: "moulding", visibleByDefault: true },
  { id: "deck_trim", label: "Deck panels", role: "EXTERIOR_HULL", channel: "hullPrimary", finish: "paint", visibleByDefault: true },
  { id: "console_body", label: "Helm console", role: "CONSOLE", channel: "console", finish: "paint", visibleByDefault: true },
  { id: "console_trim", label: "Console controls", role: "CONSOLE", channel: "console", finish: "moulding", visibleByDefault: true },
  { id: "helm_wheel", label: "Steering wheel", role: "HELM", channel: null, finish: "moulding", visibleByDefault: true },
  { id: "rails", label: "Grab rails", role: "HARDWARE", channel: "metal", finish: "metal", visibleByDefault: true },
  { id: "motor", label: "Outboard cowling", role: "PROPULSION", channel: "motor", finish: "paint", visibleByDefault: true },
  { id: "motor_trim", label: "Outboard bracket", role: "PROPULSION", channel: "motor", finish: "metal", visibleByDefault: true },
  { id: "accessory_cockpit_cover", label: "Cockpit cover", role: "COVER", channel: null, finish: "moulding", visibleByDefault: false },
] as const;

export const PXL_ZONE_BY_ID = new Map(PXL_ZONES.map((z) => [z.id, z]));

/** Zones a given channel repaints. Empty for the channels the asset lacks. */
export function zonesForChannel(channel: PxlChannel): PxlZone[] {
  return PXL_ZONES.filter((z) => z.channel === channel).map((z) => z.id);
}

/**
 * Zones carrying a role. More than one is normal and not a mistake — the
 * topsides and the deck panels are both EXTERIOR_HULL, and painting one
 * without the other would put a seam down a boat that does not have one.
 */
export function zonesForRole(role: PxlMaterialRole): PxlZone[] {
  return PXL_ZONES.filter((z) => z.role === role).map((z) => z.id);
}

/** The channel that drives a role, or null when the role is not configurable. */
export function channelForRole(role: PxlMaterialRole): PxlChannel | null {
  return PXL_ZONES.find((z) => z.role === role)?.channel ?? null;
}

/* ── Revisions ─────────────────────────────────────────────────────────────*/

/**
 * WHICH DESIGN REVISION THIS ASSET IS.
 *
 * The delivered STL and the six colour studies are not the same boat above the
 * gunwale: the STL carries a low, faceted helm console with a small raked
 * screen, and the studies carry a tall glazed tower. Every other surface — the
 * hull, the chine, the stern moulding, the capping, the rails, the outboard —
 * agrees between them.
 *
 * The model is faithful to the file it was built from. It is *not* faithful to
 * the console in the colour studies, and it cannot be without new geometry
 * nobody has supplied. This constant exists so that fact travels with the code
 * rather than living only in a document: the development bench prints it, and
 * `PXL_CONFIGURATOR_MODEL_MAP.md` sets out exactly what replacing it involves.
 *
 * The successor id is declared but not implemented. That is the whole promise
 * of §83 — when the tower arrives, this becomes `PXL_CONSOLE_PRODUCTION`, the
 * two console zones point at the new nodes, and no configurator code changes.
 */
export const PXL_CONSOLE_REVISION = "PXL_CONSOLE_CURRENT" as const;

export type PxlConsoleRevision = "PXL_CONSOLE_CURRENT" | "PXL_CONSOLE_PRODUCTION";

/** The zones a console replacement would swap. Nothing else may be touched. */
export const PXL_CONSOLE_ZONES: readonly PxlZone[] = [
  "console_body",
  "console_trim",
  "helm_wheel",
] as const;

/* ── The asset ─────────────────────────────────────────────────────────────*/

export const PXL_MODEL = {
  /**
   * Prefixed, because three's loader calls `fetch` directly and never sees
   * Next's `basePath`. On its own domain `asset()` is the identity; under the
   * GitHub Pages sub-path it is the difference between a model and a 404 that
   * looks like a slow network.
   */
  url: asset("/models/PXL.glb"),
  /**
   * EXT_meshopt_compression. drei's `useGLTF` attaches MeshoptDecoder from
   * three-stdlib to every loader it creates, so this needs no decoder asset
   * and makes no extra request — see scripts/pxl/compress-pxl.mjs for why it
   * is meshopt rather than Draco.
   */
  compression: "meshopt",

  /** Measured from the source STL, not from the marketing material. */
  loa: 5.2532,
  beam: 2.0943,
  /** Keel to sheer at amidships. */
  depth: 1.1634,

  /**
   * The model's own coordinate contract, as written by the pipeline:
   * metres, +Y up, bow +X, origin amidships on the visual waterline.
   * The vessel therefore needs no transform to sit correctly in a scene whose
   * water is the plane y = 0 — which is exactly the contract the Phase Two
   * hero scene was already written against.
   */
  forward: "+X",
  up: "+Y",

  /**
   * How deep the hull sits below y = 0, metres. This is a *consequence* of
   * where the pipeline put the origin, restated here so the scene can size the
   * water interaction without loading the model to find out.
   */
  draft: 0.2206,

  /**
   * VISUAL waterline trim, metres, applied on top of the model's own origin.
   *
   * Zero, and it should stay zero unless the yard supplies displacement data.
   * The 220.6 mm the pipeline baked in was measured off the design renders —
   * freeboard reads 0.167 of LOA at amidships in all six colour studies — and
   * is a match to how the boat is *drawn*, not a hydrostatic calculation. This
   * constant exists so that a real number from the yard can be applied without
   * re-exporting the model, and so that the fact it is currently an estimate
   * has somewhere to be written down.
   */
  waterlineTrim: 0,
} as const;
