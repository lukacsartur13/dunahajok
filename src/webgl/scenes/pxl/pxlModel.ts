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
  /**
   * The black stern moulding, SEPARATED FROM `hullLower` IN PHASE FOUR.
   *
   * Until Phase Four the transom moulding and the hull bottom shared one
   * channel, because both were structural black in every reference and nothing
   * could change either. HULL DETAIL changes that: FULL BODY COLOUR paints the
   * bottom in the topsides finish, and if the moulding were still on the same
   * channel it would be painted too — which would take the PXL mark's own
   * ground away with it and turn a paint option into a branding change. They
   * are two mouldings, so they are two channels.
   */
  | "sternMoulding"
  /** The cockpit liner and sole. §A6's INTERIOR PRIMARY. */
  | "interiorPrimary"
  /** The console body and its control box. §A6's INTERIOR SECONDARY. */
  | "interiorSecondary"
  | "glazing"
  | "metal"
  | "motor";

/**
 * Channels with no geometry in the current asset, and why.
 *
 * The source STL is a SketchUp design model. It carries the hull, the deck
 * moulding, the console box, the wheel, two rails and an outboard — and
 * nothing else. The design renders show a windscreen that the 3D file simply
 * does not contain, and this phase does not invent geometry to fill the gap.
 *
 * UPHOLSTERY IS NOT IN THIS TABLE ANY MORE, AND IT IS NOT BECAUSE UPHOLSTERY
 * ARRIVED. Phase Four's INTERIOR category configures the two interior surfaces
 * the asset actually has — the moulded cockpit liner and the console — under
 * their own names. Calling them `upholsteryPrimary` and pointing them at a
 * liner would be the exact pretence §A6 rules out: a channel named after a
 * cushion, bound to a moulding, is a lie the material system would then repeat
 * in every summary, payload and share link. When cushion geometry is delivered
 * it gets its own zones and its own channels, and nothing here has to move.
 */
export const PXL_UNSUPPORTED_CHANNELS: Partial<Record<PxlChannel, string>> = {
  /* EMPTY FROM PHASE 4.1, AND THE ENTRY THAT LEFT IS WORTH A NOTE.
     `glazing` sat here for two phases with the reason "no windscreen geometry in
     the source STL, though the design renders show one", which was true and, as
     of §9, no longer sufficient: the phase requires the PXL plexi mark, a mark
     needs a surface, and a surface that does not exist has to be authored. It is
     — see `pxlGlazing`, which builds it at runtime from the console's own
     measured box, the same way `pxlPropulsion` builds the drives. The channel is
     served; the table is empty; and the table stays because the next thing the
     asset cannot do belongs in it rather than in a comment. */
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
  { id: "transom_black", label: "Stern moulding and transom", role: "STERN_MOULDING", channel: "sternMoulding", finish: "structure", visibleByDefault: true },
  { id: "deck_main", label: "Cockpit liner and sole", role: "INTERIOR_LINER", channel: "interiorPrimary", finish: "soft", visibleByDefault: true },
  { id: "deck_trim", label: "Deck panels", role: "EXTERIOR_HULL", channel: "hullPrimary", finish: "paint", visibleByDefault: true },
  { id: "console_body", label: "Helm console", role: "CONSOLE", channel: "interiorSecondary", finish: "paint", visibleByDefault: true },
  { id: "console_trim", label: "Console controls", role: "CONSOLE", channel: "interiorSecondary", finish: "moulding", visibleByDefault: true },
  { id: "helm_wheel", label: "Steering wheel", role: "HELM", channel: null, finish: "moulding", visibleByDefault: true },
  { id: "rails", label: "Grab rails", role: "HARDWARE", channel: "metal", finish: "metal", visibleByDefault: true },
  /**
   * THE DELIVERED OUTBOARD, AND WHY IT IS HIDDEN BY DEFAULT FROM PHASE FOUR ON.
   *
   * These two zones are the unidentified outboard that came in the source STL.
   * §A13 asks for four propulsion options that differ visibly in physical
   * scale, and §A14 permits either modifying the delivered geometry or
   * authoring neutral proxies. Modifying it was tried and abandoned: one
   * cowling stretched three ways is exactly the "three copies enlarged in
   * Blender" §A15 rules out, and the delivered mesh is 346 triangles of an
   * engine nobody has identified — so scaling it would also be scaling
   * somebody's product silhouette without knowing whose.
   *
   * `pxlPropulsion` builds four authored proxies instead, and the delivered
   * mesh steps aside for them. It is exported, kept, and switched back on the
   * moment a real engine range is confirmed — `visibleByDefault: false` is the
   * whole of the change, and the zone, the role and the channel are untouched.
   */
  { id: "motor", label: "Outboard cowling (source model)", role: "PROPULSION", channel: "motor", finish: "paint", visibleByDefault: false },
  { id: "motor_trim", label: "Outboard bracket (source model)", role: "PROPULSION", channel: "motor", finish: "metal", visibleByDefault: false },
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

/* ── Measured attachment points ────────────────────────────────────────────*/

/**
 * WHERE THINGS BOLT ON, IN THE MODEL'S OWN METRES.
 *
 * Every number below was read off the delivered GLB by walking the scene and
 * taking each zone's world-space bounding box — not estimated from the design
 * renders and not copied out of an earlier draft. The measurement is repeatable:
 * `npm run model` prints the same boxes, and the propulsion and branding tests
 * assert that these anchors still fall inside the zone they claim to sit on.
 *
 * They exist because the two things Phase Four adds to the vessel — proxy
 * outboards and the PXL mark — are *built at runtime* rather than exported, and
 * a runtime part with a hard-coded position is a part that silently detaches
 * the day the pipeline is re-run. Anchors here, geometry there, and one
 * validation step between them.
 */
export const PXL_MOUNTS = {
  /**
   * The transom face an outboard clamps to.
   *
   * `transom_black` runs from x = −2.6266 (the transom itself) forward to
   * x = −1.8108, and its top edge at the transom is y = 0.6275. A bracket
   * hangs its clamp over that top edge, so the mount is the transom plane at
   * capping height, on the centreline.
   */
  transom: {
    /** The transom plane. Metres, model frame. */
    x: -2.6266,
    /** Top of the transom moulding — where a clamp bracket sits down. */
    y: 0.6275,
    /** Centreline. The source model's own outboard is 49 mm off it; ours is not. */
    z: 0,
  },

  /**
   * The PXL mark on the stern moulding, as a target for a surface ray.
   *
   * NOT A POSITION — a ray. §A10 asks that the mark sit on the hull surface,
   * and the surface it has to sit on is a faceted moulding whose exact plane
   * differs between port and starboard and would move if the STL were revised.
   * So the anchor is authored as the (x, y) the mark should appear at when the
   * boat is seen in profile, and `pxlDecals` fires a ray inboard from well
   * outside the beam to find where the moulding actually is and which way it
   * faces.
   *
   * The values come from the delivered side render (`pxl-side-20240719.jpg`):
   * the mark sits about two-thirds of the way forward along the black panel and
   * a little above its mid-height, clear of both the capping above and the
   * waterline below.
   */
  pxlMark: {
    /**
     * PHASE 4.1 — RE-MEASURED, AND IT MOVED. §8.
     *
     * Phase Four authored this from the side render by eye: "about two thirds
     * of the way forward along the black panel and a little above its
     * mid-height". Measured, it is neither.
     *
     * `scripts/pxl/_mark.mjs` isolates the orange lockup by hue and walks the
     * panel row by row. The panel's outer face runs plate rows 865–1055 and the
     * mark's rows are 942–960, so the mark's centre is 45.3% DOWN the panel, not
     * above its middle. At the mark's own row the panel spans columns 565–774
     * and the mark spans 622–721, so its centre is 50.9% ACROSS, not two thirds.
     * And the model's own panel face measures 0.546 m tall at this station
     * against the plate's 0.551 m — a 1% agreement, which is what makes those
     * fractions transferable at all.
     *
     * Resolved: x = −2.6266 + 0.509 × 0.647 (the panel's fore-aft extent at the
     * mark's height, raycast), y = 0.610 − 0.453 × 0.546.
     */
    x: -2.297,
    y: 0.363,
    /** Half-beam to start the ray outside, whichever side is being placed. */
    rayFrom: 2.4,
    /**
     * OVERALL LENGTH of the lockup, metres — not its cap height.
     *
     * Changed in Phase 4.1, and the reason is measurement precision rather than
     * taste: the mark is 100 plate pixels long and 19 tall, so its length is
     * known five times better than its height. Anchoring on the better-measured
     * dimension and letting the other follow from the artwork's own aspect is
     * what stops a one-pixel reading error becoming a 5% size error.
     *
     * 100 px ÷ 345.1 px/m = 0.290 m. At the lockup's 5.236 aspect that is a
     * 55 mm cap height, against the 92 mm Phase Four authored — the mark was
     * two thirds too large, which on a 0.55 m panel is not subtle.
     */
    length: 0.290,
    /** How far off the surface the mark floats, metres. Enough to beat z-fighting. */
    standoff: 0.004,
  },

  /**
   * THE DUNA SCRIPT ON THE GUNWALE CAPPING. §4, §7 — the slot Phase Four left
   * empty.
   *
   * Placement measured the same way as the PXL mark's and confirmed against the
   * geometry it has to land on. The plate puts the script at columns 1606–1752
   * and rows 837–864, which the side plate's calibration turns into a 423 mm
   * mark centred at x +0.213, y 0.785. Raycasting the capping at that station
   * finds its outer face spanning y 0.736 → 0.886, and the plate's own dark band
   * there spans the equivalent of 0.740 → 0.879 — a 150 mm band against a 139 mm
   * one. So the mark lands on the part of the boat the drawing prints it on,
   * with roughly a third of the band clear above and below it, which is the
   * proportion §4 asks be reproduced.
   *
   * IT IS A LONG MARK AND THAT IS THE POINT. 423 mm on a 5.25 m boat is 8% of
   * the length, and the swash is more than half of it. A version scaled to look
   * like a badge would sit in the middle of the capping and read as a sticker;
   * the whole reason the script works is that it lies ALONG the band.
   */
  dunaScript: {
    x: 0.213,
    y: 0.785,
    rayFrom: 2.4,
    /** Overall length of the mark including the swash, metres. */
    length: 0.423,
    /**
     * A little tighter than the PXL mark's 4 mm.
     *
     * The capping is a narrow, strongly curved moulding rather than a flat
     * panel, so a mark standing 4 mm off it is visibly detached at the closest
     * orbit — the stand-off has to beat the depth buffer, and beyond that every
     * millimetre is a millimetre of float. 2.5 mm clears z-fighting at this
     * scene's near and far planes with room to spare.
     */
    standoff: 0.0025,
  },
} as const;
