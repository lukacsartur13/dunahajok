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
  /**
   * THE DARK BAND ON THE HULL'S SIDE, WHICH IS NOT THE CAPPING. Phase 4.4, §11.
   *
   * This zone was labelled "Gunwale capping" from Phase Four to Phase 4.3 and
   * it never was one. `scripts/pxl/_probe44.mjs` on the 4.3 asset measures its
   * up-facing area at 0.000 m²: it is a 74 mm band of the hull's own vertical
   * side below the sheer, painted a different colour. That is why §4 of the 4.4
   * brief reports the top edge reading "too thin when viewed from above" — from
   * above it had no width at all.
   *
   * It stays exactly where it is, because it is a real feature: the reference's
   * side view shows ~34 mm of dark band under the capping's own edge, and it is
   * the ground the Duna script is projected onto. What changed is its NAME and
   * its ROLE. `gunwale_capping` below is the moulding it was standing in for.
   */
  | "hull_accent"
  | "transom_black"
  /**
   * THE CAPPING, AUTHORED IN PHASE 4.4. §4, §5, §6, §7, §9.
   *
   * A continuous moulding round the whole upper perimeter — port, bow,
   * starboard — with a 46 mm section, a top surface that falls 11 mm inboard,
   * and chamfers on both edges. It carries 1.7 m² of genuine up-facing surface
   * where the boat previously had none.
   *
   * It is ONE MESH AND ONE FORM. §5 permits the topology to stay modular
   * internally; it did not need to be. The two side sweeps are built over the
   * same station list and their inner edges reach the centreline at the same
   * station, so at x 2.330 they meet and weld into a single bow structure —
   * §7's convergence, arrived at rather than inserted. See `pxl_upper.build_gunwale`.
   */
  | "gunwale_capping"
  /**
   * THE INTERIOR, NAMED FOR WHAT IT PHYSICALLY IS. Phase 4.3, §14.
   *
   * Phase 4.2 cut the STL's one interior mesh into three — `deck_liner`,
   * `deck_sole` and `interior_pads` — and that was the right cut made under
   * two wrong names and one wrong premise.
   *
   * `deck_liner` was never a deck: it is the moulded shell of the cockpit, the
   * hull seen from inboard. `deck_sole` was named after the mesh it came out of
   * rather than the surface it is. And `interior_pads` was not padding at all —
   * it was the raised platform band lifted 35 mm, which is why §12 of the 4.3
   * brief reports the interior colour arriving as "a thin orange decorative
   * stripe" rather than as seating. It was a moulding wearing an upholstery
   * name, which is precisely the pretence this file has always ruled out.
   *
   * So: the platform goes back into the liner it was cut from, real cushions
   * are built on top of it, and the two surfaces that survive are called what
   * they are. §14 permits the migration explicitly — "do not keep old material
   * -role assumptions merely for backward compatibility if they are now
   * incorrect."
   */
  | "interior_hard_liner"
  | "cockpit_sole"
  /**
   * The cushions. AUTHORED IN PHASE 4.3, and the first geometry on this boat
   * that is upholstery rather than something standing in for it: the bow
   * chevron, both side cushions, the driver's bench and its backrest, each a
   * lofted section with 75 mm of thickness, a 22 mm edge radius and a 7 mm
   * crown. See `scripts/pxl/pxl_upper.py`.
   */
  | "upholstery_primary"
  /** Authored in Phase 4.2 — see `pxl_blender.py`. */
  | "coaming_inlay"
  | "bow_fitting"
  /**
   * THE HELM, REBUILT IN PHASE 4.3. §4, §5, §7.
   *
   * `console_trim` is gone and `windshield` is new. The STL's console was a
   * faceted wedge whose top raked DOWN toward the bow, with a 2,198-triangle
   * wheel standing in free air above its crest and no screen at all; the
   * screen the configurator drew was a flat runtime plane sized off that
   * console's bounding box.
   *
   * All four are now delivered geometry, measured off the plates: a console
   * whose dash rakes UP forward (+130 mm aft, +199 mm at the front), a wrapped
   * plexi with a front face and two side returns, and a wheel on a stalk out of
   * the panel the driver faces.
   *
   * `console_body` is the pale aft panel — the moulding the driver looks at,
   * which both three-quarter references show in the hull's own tone.
   * `console_detail` is the dark structural shell around it, and carries the
   * screen's surround because in every reference they are the same black.
   */
  | "console_body"
  | "console_detail"
  | "windshield"
  | "helm_wheel"
  | "rails"
  | "motor"
  | "motor_trim"
  | "accessory_cockpit_cover"
  /**
   * THE OPTIONAL AFT BOARDING PLATFORM, AUTHORED IN PHASE 4.4. §20–§24.
   *
   * Two zones because the reference shows two materials, and §23 requires the
   * wood be separable from everything else: a dark structural extension
   * carried aft off the transom on two bearers with a knee at each, and a teak
   * tread laid on it in 92 mm planks with 8 mm caulking seams.
   *
   * Both are `visibleByDefault: false`. §24 — the geometry lives in the base
   * model and the CONFIGURATION controls whether it is drawn, so nothing about
   * the asset has to change when somebody switches it on.
   */
  | "platform_frame"
  | "platform_deck";

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
  /**
   * The upholstered surfaces, and NOTHING ELSE. §A6's INTERIOR PRIMARY, and
   * §15 of the 4.3 brief, which makes it a hard requirement rather than a
   * preference.
   *
   * NARROWED TWICE. Phase 4.2 took it off `deck_main` — the whole interior,
   * 17.6 m² of it — and put it on the platform band, which stopped the cockpit
   * colour reaching the sole and the coaming. Phase 4.3 takes it off the
   * platform too, because a platform is a moulding: it now reaches
   * `upholstery_primary`, which is cushions, and there is nothing else on the
   * boat it can reach.
   *
   * The list §15 forbids it from touching — structural liner, hard deck, floor,
   * hull interior shell, console, rails, windshield — is satisfied by
   * construction rather than by care: every one of those is a different zone
   * with a different channel, and `zonesForChannel("interiorPrimary")` returns
   * exactly one name. The configurator tests assert that.
   */
  | "interiorPrimary"
  /**
   * The console's aft panel. §A6's INTERIOR SECONDARY.
   *
   * NOT THE WHOLE CONSOLE ANY MORE. The references are consistent about this
   * and Phase 4.2 could not act on it: the console is two materials, a pale
   * moulded panel facing the driver and a dark structural shell around it, and
   * only the first is a finish anybody would choose. `console_detail` is
   * therefore unbound — it is the same black as the capping and the stern
   * moulding in every plate and in every colour study, including the ones with
   * a white hull.
   */
  | "interiorSecondary"
  /**
   * The cockpit sole. New in Phase 4.2.
   *
   * One finish, not offered, and it exists as a channel rather than as a
   * hard-coded material because the sole is a real, separately-addressable
   * moulding now and the next thing anyone will want to do with it is offer a
   * choice of deck covering. `PXL_UNSUPPORTED_CHANNELS` says why it is not one
   * yet.
   */
  | "sole"
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
  sole:
    "The cockpit sole is a single dark deck covering in every reference and " +
    "the yard has not supplied a range. The zone and the channel exist; the " +
    "choice does not.",
  /* THE ENTRY THAT LEFT IN PHASE 4.1 IS WORTH A NOTE.
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
 * METAL/HARDWARE.
 *
 * PHASE 4.2 ADDED THREE OF THEM, because the geometry to carry them now
 * exists. Until this phase the note here read that DECK and FLOOR could not be
 * separated — "`deck_main` is one mesh carrying the cockpit liner, the sole and
 * the inner faces of the shell together" — and that was true of the mesh but
 * not of the boat. The surfaces were always distinct: a sole at z ≈ 0.38, a
 * raised platform at z ≈ 0.57, and the coaming walls between and above them.
 * `pxl_blender.py` cuts them apart, so INTERIOR_SHELL, SOLE and UPHOLSTERY are
 * three names pointing at three meshes, which is the rule this file has always
 * had.
 *
 * INTERIOR_HULL is still absent, and for the original reason: the hull is a
 * zero-thickness open shell, so its inner face is the *same triangles* as its
 * outer face, drawn double-sided. There is no second surface to name.
 *
 * The rule is unchanged — A ROLE EXISTS WHEN A MESH EXISTS TO CARRY IT. Adding
 * one is a line here plus a binding in `PXL_ZONES`; nothing downstream
 * addresses a material any other way.
 */
export type PxlMaterialRole =
  /** Topsides and the panels painted with them. The configurable surface. */
  | "EXTERIOR_HULL"
  /** Bottom below the chine. Structural black in every reference. */
  | "HULL_BOTTOM"
  /**
   * THE CAPPING. §32 asks for a semantic role of its own and this is it, now
   * carried by a moulding rather than by a stripe.
   *
   * IT FOLLOWS THE TOPSIDES AND THAT IS THE INTENDED BEHAVIOUR, which §32 asks
   * be stated rather than assumed. Every delivered reference draws the capping
   * in the hull's own tone — teal in the teal studies, pale in the pale ones —
   * so binding it to `hullPrimary` is the observation, not a shortcut. What §10
   * forbids is the other direction: it must never be reached by the interior
   * colour. It is not, and cannot be, because `interiorPrimary` resolves to
   * `upholstery_primary` and to nothing else.
   */
  | "GUNWALE_CAPPING"
  /**
   * The dark band on the hull's side immediately below the capping. §11.
   *
   * A ROLE OF ITS OWN FROM PHASE 4.4, because it stopped being the capping and
   * a zone whose role names a different part is the trap `pxlModel` exists to
   * prevent. It keeps the `hullAccent` channel it has always had, so no link
   * shared before this phase resolves differently.
   */
  | "SHEER_BAND"
  /** Transom and the black stern moulding that carries the PXL mark. */
  | "STERN_MOULDING"
  /**
   * The moulded interior shell: coaming walls, inner faces, the foredeck.
   *
   * IT FOLLOWS THE TOPSIDES COLOUR, which is not an assumption — it is what
   * every reference shows. The liner is the same moulding as the outside of
   * the boat seen from inboard, and it is sage in the sage renders and pale in
   * the pale ones. Binding it to `hullPrimary` rather than giving it a choice
   * is therefore the honest reading, and it is why choosing Navy now gives a
   * navy cockpit shell rather than a cognac one.
   */
  | "INTERIOR_SHELL"
  /** The cockpit sole. Dark deck covering; never the cockpit colour. */
  | "SOLE"
  /**
   * Padded, soft-trimmed surfaces — and the only role the cockpit colour
   * reaches. §15.
   *
   * IT IS CARRIED BY REAL CUSHIONS FROM PHASE 4.3 ON. Until this phase the role
   * existed and the geometry did not: it was bound to a moulding lifted 35 mm,
   * which is a colour zone with a name that overstates it. `upholstery_primary`
   * is a lofted pad with a section, an edge radius and a crown, so the role and
   * the surface now agree.
   */
  | "UPHOLSTERY"
  /** Helm console — the pale moulded panel the driver faces. */
  | "CONSOLE"
  /**
   * Dark structural mouldings that are neither hull nor console: the console's
   * own shell, and the windscreen's surround, which is the same black.
   *
   * A ROLE OF ITS OWN BECAUSE IT ANSWERS DIFFERENTLY TO LIGHT AND TO THE
   * CATALOGUE. It is not `CONSOLE`, because nothing configures it; and it is
   * not `STERN_MOULDING`, which carries the PXL mark and would drag the console
   * along with it the day that moulding becomes configurable. §25 asks that the
   * dark families stop being one grey, and this is one of them.
   */
  | "CONSOLE_SHELL"
  /**
   * The windscreen. A transmission material rather than paint, so it never
   * takes a finish and never joins the sweep — see `pxlGlazing`.
   */
  | "GLAZING"
  /** Steering wheel. Not configurable; it is a bought-in part. */
  | "HELM"
  /** Grab rails. §3's METAL/HARDWARE. */
  | "HARDWARE"
  /** Outboard cowling and bracket. Never follows the hull colour. */
  | "PROPULSION"
  /** Optional flush cockpit cover. Visibility only. */
  | "COVER"
  /**
   * The boarding platform's structural extension. §22, §32.
   *
   * NOT `STERN_MOULDING`, though both are structural black. The stern moulding
   * carries the PXL mark and is a hull part; this is a bolted-on option, and
   * the day the moulding becomes configurable the platform must not follow it
   * — which is exactly the mistake Phase Four avoided when it split
   * `sternMoulding` off `hullLower`.
   */
  | "PLATFORM_FRAME"
  /**
   * The teak tread. §23, §32.
   *
   * TAKES NO CHANNEL AT ALL, and that is the requirement rather than an
   * omission: wood is not a paint finish, and the one thing §33 asks be tested
   * about it is that an exterior change cannot recolour it. Leaving it unbound
   * is what makes that true by construction — `applyConfiguration` skips a zone
   * whose channel is null — rather than true by care.
   */
  | "PLATFORM_DECK";

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
  finish: "paint" | "structure" | "moulding" | "soft" | "metal" | "wood" | "glass";
  /**
   * False for optional equipment. The default configuration hides these; the
   * component registry in `pxlConfig` turns them back on.
   */
  visibleByDefault: boolean;
}

export const PXL_ZONES: readonly PxlZoneSpec[] = [
  { id: "hull_primary", label: "Hull topsides", role: "EXTERIOR_HULL", channel: "hullPrimary", finish: "paint", visibleByDefault: true },
  { id: "hull_lower", label: "Hull bottom", role: "HULL_BOTTOM", channel: "hullLower", finish: "paint", visibleByDefault: true },
  { id: "hull_accent", label: "Sheer band", role: "SHEER_BAND", channel: "hullAccent", finish: "structure", visibleByDefault: true },
  { id: "gunwale_capping", label: "Gunwale capping", role: "GUNWALE_CAPPING", channel: "hullPrimary", finish: "paint", visibleByDefault: true },
  { id: "transom_black", label: "Stern moulding and transom", role: "STERN_MOULDING", channel: "sternMoulding", finish: "structure", visibleByDefault: true },
  { id: "interior_hard_liner", label: "Cockpit liner and foredeck", role: "INTERIOR_SHELL", channel: "hullPrimary", finish: "paint", visibleByDefault: true },
  { id: "cockpit_sole", label: "Cockpit sole and platform faces", role: "SOLE", channel: "sole", finish: "moulding", visibleByDefault: true },
  { id: "upholstery_primary", label: "Cockpit upholstery", role: "UPHOLSTERY", channel: "interiorPrimary", finish: "soft", visibleByDefault: true },
  { id: "coaming_inlay", label: "Coaming inlay", role: "HARDWARE", channel: "metal", finish: "metal", visibleByDefault: true },
  { id: "bow_fitting", label: "Bow deck cleats", role: "HARDWARE", channel: "metal", finish: "metal", visibleByDefault: true },
  { id: "console_body", label: "Helm console panel", role: "CONSOLE", channel: "interiorSecondary", finish: "paint", visibleByDefault: true },
  { id: "console_detail", label: "Console shell and screen surround", role: "CONSOLE_SHELL", channel: null, finish: "structure", visibleByDefault: true },
  { id: "windshield", label: "Windscreen", role: "GLAZING", channel: "glazing", finish: "glass", visibleByDefault: true },
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
  /**
   * THE FIRST REAL EQUIPMENT OPTION ON THIS BOAT. §20, §24, §25.
   *
   * `visibleByDefault: false` and no channel on either. The first is what makes
   * the platform an OPTION — `zoneVisible` starts them off and the EQUIPMENT
   * control turns them on through `configuration.equipment`, so the same asset
   * serves both states and §24's "do not bake it permanently into
   * PXL.production.glb visibility" is satisfied by the asset containing the
   * geometry and none of the decision.
   *
   * The second is §32: neither the frame nor the teak may be reached by a
   * finish. The frame is structural black in the reference and the teak is
   * wood, and neither is a colour anybody chooses.
   */
  { id: "platform_frame", label: "Boarding platform frame", role: "PLATFORM_FRAME", channel: null, finish: "structure", visibleByDefault: false },
  { id: "platform_deck", label: "Boarding platform teak", role: "PLATFORM_DECK", channel: null, finish: "wood", visibleByDefault: false },
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
 * `PXL_CONSOLE_CURRENT` was the STL's: a low faceted wedge with a small raked
 * screen, which is not the helm the colour studies draw. Phases Four to 4.2 all
 * recorded that as a source limitation — "unchangeable without geometry nobody
 * has supplied" — and it was the largest perceptual gap in the whole model.
 *
 * IT WAS THE WRONG CONCLUSION, and Phase 4.3 says so plainly. What could not be
 * done was REPLACE the console with a delivered part. What could always have
 * been done, and now has been, is RECONSTRUCT it: the July side plate carries
 * the dash's height above the sheer at both ends, the screen's apex, the rake
 * of its forward post and the wheel's hub, all measurable against a calibration
 * that already existed. See `scripts/pxl/measure-upper.mjs` and `pxl_upper.py`.
 *
 * So this is `PXL_CONSOLE_4_3`: an authored console, measured from the plates,
 * at the station the August views sheet and the STL agree on. It is a
 * reconstruction and the report says so — the successor id is still there for
 * the day a production part arrives, and swapping to it still changes no
 * configurator code.
 */
export const PXL_CONSOLE_REVISION = "PXL_CONSOLE_4_3" as const;

/**
 * WHICH GEOMETRY CORRECTION PASS THIS ASSET HAS BEEN THROUGH.
 *
 * Separate from the console revision above, because they answer different
 * questions. `PXL_CONSOLE_REVISION` says *which design* the model is; this says
 * *how well the pipeline recovered it*.
 *
 * `PXL_GEOMETRY_STL` is the raw recovery from `build_pxl.py` alone: thirteen
 * zones, an interior that is one scrap-bucket mesh, a gunwale capping that
 * stops 570 mm short of the stem, and eighty-six stray interior islands on the
 * outside of the hull. `PXL_GEOMETRY_4_2` is that same hull surface after
 * `scripts/pxl/pxl_blender.py` has corrected the partition.
 *
 * `PXL_GEOMETRY_4_3` is the first revision where the two halves of the boat
 * have different provenance, and it is worth being able to tell them apart:
 * everything below the sheer is still the delivered surface with 4.2's
 * corrections and measures identically against the plate, while everything
 * above it is authored. See PXL_CONFIGURATOR_MODEL_MAP §2b.
 *
 * It exists so the fact travels with the code rather than only in a document,
 * and so that a build which skipped the Blender stage is identifiable from the
 * development bench rather than from a puzzled look at the cockpit.
 */
export const PXL_GEOMETRY_REVISION = "PXL_GEOMETRY_4_3" as const;

export type PxlGeometryRevision =
  | "PXL_GEOMETRY_STL"
  | "PXL_GEOMETRY_4_2"
  | "PXL_GEOMETRY_4_3";

export type PxlConsoleRevision =
  | "PXL_CONSOLE_CURRENT"
  | "PXL_CONSOLE_4_3"
  | "PXL_CONSOLE_PRODUCTION";

/** The zones a console replacement would swap. Nothing else may be touched. */
export const PXL_CONSOLE_ZONES: readonly PxlZone[] = [
  "console_body",
  "console_detail",
  "windshield",
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

/* ── The aft boarding platform ─────────────────────────────────────────────*/

/**
 * WHAT THE OPTIONAL PLATFORM OCCUPIES, in the model's own metres. PHASE 4.4.
 *
 * A MIRROR OF `pxl_upper.SPEC`, AND CHECKED AGAINST THE ASSET RATHER THAN
 * TRUSTED. The geometry is authored in Blender and these are the same numbers
 * on the TypeScript side, which is the sort of duplication that rots silently:
 * somebody widens the motor well in Python, the clearance test here keeps
 * passing against the old figure, and the first anybody knows is a propeller
 * through a teak plank in a customer render.
 *
 * So `scripts/pxl/validate-model.mjs` measures `platform_frame` and
 * `platform_deck` in the exported GLB and fails the build if they disagree
 * with this table by more than 10 mm. The numbers are duplicated; the
 * agreement is not assumed.
 *
 * Measured off the August side view at 349 px/m — see `pxl_upper.SPEC`.
 */
export const PXL_PLATFORM = {
  /** Top of the teak tread, and the underside of the structural frame. */
  topY: 0.179,
  bottomY: 0.073,
  /** How far the assembly stands aft of the transom plane. */
  aft: 0.504,
  /** Half-width at the transom, and at the aft edge. */
  halfBeam: { forward: 0.905, aft: 0.845 } as const,
  /**
   * THE MOTOR WELL. §29's whole subject.
   *
   * Half-width of the gap between the two bearers, at the transom and at the
   * aft edge. TAPERED, because a swivelling drive's sweep is proportional to
   * how far abaft the steering axis a part is — so the room a platform has to
   * give grows with distance aft and is nearly nothing where somebody actually
   * steps aboard. A parallel notch cut at the widest figure gives away 0.92 m
   * of tread to clear a corner that only exists at one end of it.
   */
  wellHalfForward: 0.280,
  wellHalfAft: 0.470,
  /**
   * Where a drive swivels, fore-and-aft. Used only by the clearance
   * calculation: the steering axis is the bracket, so a leg standing further
   * aft sweeps further sideways for the same angle of lock.
   */
  steeringPivotX: -2.700,
  /** The lock angle the clearance is required to hold to. Degrees. */
  steeringLockDeg: 30,
} as const;

/* ── Stern landmarks ───────────────────────────────────────────────────────*/

/**
 * THE DELIVERED STERN THREE-QUARTER, AS NUMBERS. PHASE 4.4 §17.
 *
 * §17 asks for stern QA landmarks compared as NORMALISED vertical positions,
 * and normalising needs a datum and a scale that exist in both the drawing and
 * the model. Both are the transom's own:
 *
 *     0.0   the top of the transom moulding
 *     1.0   its foot, one transom height (0.832 m) below
 *
 * Read off `pxl-views-20240815c.jpg` with `scripts/pxl/_grid.mjs`. The transom
 * spans plate rows 990 → 1150, so the view runs at 192 px/m and every row below
 * converts directly.
 *
 * ── PHASE 4.6 §2, §3 — THE DEPTH READINGS ARE NOW ENFORCED TOO ─────────────
 *
 * Phase 4.4 read all six landmarks and built four of them. Its own §O explained
 * the omission: the drawing puts the anti-ventilation plate 1.96 transom-heights
 * down and the propeller deeper still, "a rendering of a big engine drawn nearer
 * the camera than the transom it hangs on", so the leg was built to a length
 * that put the plate near the waterline instead. The result was a lower unit
 * that stopped 52 mm below the keel — level with the bottom of the boat, which
 * is the failure §42 of the 4.6 brief names in as many words.
 *
 * §3 removes the discretion: "Do not 'correct' the reference because it seems
 * mechanically unusual. For THIS phase: VISUAL REFERENCE FIDELITY is the
 * priority." So the rows were re-read by column scan rather than by eye, on a
 * datum that can be checked — the sheer at the transom and the crisp lower edge
 * of the ghosted underwater body, 253 px apart — and all six are now built.
 *
 * The re-read agrees with 4.4 where 4.4 was measuring the same thing: 4.4 put
 * the plate at row 1303 by arithmetic from its own datum, this phase reads it
 * directly at row 1306. What changed is not the drawing but which of its
 * readings the model is allowed to decline.
 */
export const PXL_STERN_REFERENCE = {
  /** Transom moulding, top of, to its foot. The normalising span, metres. */
  transomHeight: 0.832,
  plate: "assets/source/pxl/pxl-views-20240815c.jpg",
  pxPerMetre: 192,
  /** Plate rows, for anybody who wants to re-read them. */
  rows: { transomTop: 990, transomFoot: 1150, cowlTop: 985, cowlBottom: 1110 },
  /** Normalised, positive downward from the transom top. */
  normalised: {
    transomTop: 0,
    cowlTop: -0.031,
    cowlBottom: 0.750,
    plate: 1.956,
    propeller: 2.219,
    lowest: 2.469,
  },
  /**
   * PHASE 4.6 — the same drawing on its own datum: sheer at the transom = 0,
   * bottom of the ghosted hull = 1. Read by column scan over the raw pixels.
   * These are the numbers `PXL_DRIVE_SPECS` is built from, and the ones the
   * configurator suite asserts against.
   */
  hullNormalised: {
    sheer: 0,
    cowlTop: 0.043,
    cowlBottom: 0.581,
    keel: 1.0,
    plate: 1.308,
    propeller: 1.502,
    lowest: 1.684,
  },
  /** Sheer to keel at the transom, metres — the span `hullNormalised` uses. */
  transomDepth: 0.9236,
  /**
   * Which landmarks the model is required to reproduce.
   *
   * PHASE 4.6 — was `["cowlTop", "cowlBottom"]`. The depth landmarks are no
   * longer excused; §3 is explicit that mechanical plausibility does not
   * outrank the drawing this phase.
   */
  enforced: ["cowlTop", "cowlBottom", "plate", "lowest"] as const,
} as const;
