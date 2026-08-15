/**
 * PXL — the configuration data model.
 *
 * One plain object describing one boat. It is deliberately dull: no classes,
 * no methods, no derived state, nothing that cannot survive `JSON.stringify`.
 * Everything the configurator needs to do with a configuration — put it in a
 * URL, attach it to a quote request, store it against a lead, rebuild the scene
 * from it a month later — is easy if the configuration is data and awkward if
 * it is an object graph.
 *
 * ── WHAT CHANGED IN PHASE FOUR ─────────────────────────────────────────────
 *
 * Phase Three's version of this file was both the schema AND the option list:
 * `PXL_CATEGORIES` declared what could be chosen, what it was called, and why
 * five of the six entries could not be offered. That was right when there was
 * one real category. It stops being right the moment there are four, because
 * the option list is now the thing most likely to be replaced wholesale — §A1
 * asks for a provisional catalogue that approved Duna data can be dropped into
 * without rebuilding anything — and a table that is half schema and half data
 * cannot be replaced without touching the schema.
 *
 * So the two are now separate files with a clean seam:
 *
 *   pxlCatalog  — WHAT MAY BE CHOSEN. Provisional, replaceable, and the only
 *                 module that knows a colour is called Cognac.
 *   pxlConfig   — WHAT A CONFIGURATION IS. The shape, the field accessors, the
 *                 URL format, the summary, the material resolution. Stable.
 *
 * The seam is `PxlConfigField`: the catalogue declares which field each control
 * writes, this file declares how each field is read and written, and TypeScript
 * checks that the two sets match. A control pointing at a field with no
 * accessor does not compile.
 *
 * ── WHAT IS AND IS NOT MODELLED ────────────────────────────────────────────
 *
 * Only what the asset can actually show. There is still no seating option,
 * because there is still no seating geometry; there are still no prices, no
 * availability and no lead times, because none of those have been supplied. The
 * four categories that do exist exist because each one visibly changes the boat
 * — a paint, a treatment, two interior surfaces and four physically different
 * drives — and not because four is a better number than one.
 */

import {
  PXL_ACCENT_FINISHES,
  PXL_HULL_FINISHES,
  PXL_INTERIOR_FINISHES,
  PXL_INTERIOR_SECONDARY_FINISHES,
  PXL_METAL_FINISHES,
  PXL_MOTOR_FINISHES,
  PXL_GLAZING_FINISHES,
  PXL_SPEAKER_LIGHT_FINISHES,
  PXL_STRUCTURE_FINISHES,
  finishLabel,
  type PxlFinish,
  type PxlFinishId,
  type PxlLabelSurface,
} from "./pxlPalette";
import {
  PXL_CATEGORIES,
  PXL_CONTROLS,
  PXL_DEFERRED_CATEGORIES,
  PXL_DRIVE_SPECS,
  defaultOption,
  optionBySlug,
  type PxlCatalogCategory,
  type PxlCatalogControl,
  type PxlCatalogOption,
  type PxlCategoryId,
  type PxlConfigField,
  type PxlDriveVariant,
  type PxlInteriorSurface,
  type PxlLowerTreatment,
  type PxlRailTreatment,
} from "./pxlCatalog";
import { PXL_ZONES, type PxlChannel, type PxlMaterialRole, type PxlZone } from "./pxlModel";

export type { PxlCategoryId } from "./pxlCatalog";

/* ── The configuration ─────────────────────────────────────────────────────*/

export interface PxlConfiguration {
  exterior: {
    hullPrimary: PxlFinishId;
    /**
     * §A4. A TREATMENT, NOT A COLOUR, and the distinction is the whole design.
     *
     * The obvious implementation is a second finish field — `hullLower:
     * PxlFinishId` — and Phase Three had exactly that. It is wrong for this
     * option, because FULL BODY COLOUR does not mean "the bottom is sage", it
     * means "the bottom is *whatever the topsides are*". Stored as a finish,
     * the two would be independent: change the exterior to navy and the bottom
     * would still be sage, and every consumer would need to remember to write
     * both. Stored as a treatment, the relationship is a fact of the schema and
     * cannot be forgotten — `finishForChannel` resolves it in one place.
     */
    lowerTreatment: PxlLowerTreatment;
    hullAccent: PxlFinishId;
  };
  interior: {
    /**
     * The cockpit liner and sole. NOT UPHOLSTERY — see `pxlCatalog`'s interior
     * note and `pxlModel`'s. The field is named for the surface it paints.
     */
    primary: PxlFinishId;
    /** The console body and its control box. The one honest second surface. */
    secondary: PxlFinishId;
    /** §A8's material character, applied to both interior surfaces. */
    surface: PxlInteriorSurface;
    /** The coaming inlay and the bow cleats. Not offered; one inlay. */
    metal: PxlFinishId;
    /**
     * The grab rails, as a RELATIONSHIP. §4.9, at the client's instruction.
     *
     * Not a `PxlFinishId`, and that is the point: MATCH INTERIOR has no colour
     * of its own to store — it resolves against `primary` every time it is
     * read, so the rails keep following the leather when the leather changes.
     * Storing a resolved finish here would freeze the pair at the moment the
     * rail control was last touched, and the first interior change after that
     * would leave the rails behind wearing a colour nobody had chosen.
     */
    rails: PxlRailTreatment;
    /**
     * The console plexi's tint depth. §4.9.
     *
     * On `interior` because the screen is the console's, and the console is
     * where the reference photographs put it: a viewer choosing it is looking
     * into the cockpit, not at the topsides.
     */
    glazing: PxlFinishId;
  };
  /**
   * §4.9 — COCKPIT AUDIO, and the one field on this configuration that
   * describes a LIGHT rather than a surface.
   *
   * `speakerLight` is a finish because the two states differ only in emissive
   * intensity, so the switch eases through the same transition as a paint
   * change. Whether the speakers are FITTED is not here at all: that is mesh
   * visibility, and it lives in `equipment` with the boarding platform, keyed
   * on zones — see the note there.
   */
  audio: {
    speakerLight: PxlFinishId;
  };
  propulsion: {
    /**
     * Which proxy drive is fitted. §A13.
     *
     * A variant rather than a finish, because propulsion is the one category
     * where the choice is geometry: the cowling's own colour follows from the
     * variant (`PXL_DRIVE_SPECS[…].cowlFinishId`) rather than being chosen, so
     * that an electric drive cannot be configured in a combustion cowling.
     */
    variant: PxlDriveVariant;
  };
  /**
   * Optional equipment, by zone. Absent means "the zone's own default".
   *
   * The component-visibility architecture, keyed on zones rather than on
   * invented option names: a genuine option can only ever be a set of meshes to
   * show or hide, so the registry that will one day list "swim platform" or
   * "bow sunbed" is already the right shape. No category writes to it today —
   * §A2 says not to show EQUIPMENT until options exist — and it stays because
   * the propulsion system reads it to keep the source outboard switched off.
   */
  equipment: Partial<Record<PxlZone, boolean>>;
}

/* ── Field accessors ───────────────────────────────────────────────────────*/

/**
 * THE SEAM. One read and one write per field the catalogue can address.
 *
 * `Record<PxlConfigField, …>` rather than a switch, so adding a field to the
 * union without adding an accessor is a compile error at this table rather than
 * a control that silently does nothing at runtime.
 *
 * The write mutates, and it is the only mutating function in this file. It is
 * called on a *fresh clone* by everything public — `applyOption` clones first,
 * `buildDefaultConfiguration` builds into an object nobody has seen yet — which
 * keeps the frozen-default guarantee while avoiding the alternative, which is
 * six near-identical clone-and-set closures.
 */
type FieldAccessor = {
  read: (config: PxlConfiguration) => string;
  write: (config: PxlConfiguration, option: PxlCatalogOption) => void;
};

const FIELDS: Record<PxlConfigField, FieldAccessor> = {
  exteriorFinish: {
    read: (c) => c.exterior.hullPrimary,
    write: (c, o) => {
      if (o.finishId) c.exterior.hullPrimary = o.finishId;
    },
  },
  lowerTreatment: {
    read: (c) => c.exterior.lowerTreatment,
    write: (c, o) => {
      if (o.lowerTreatment) c.exterior.lowerTreatment = o.lowerTreatment;
    },
  },
  interiorFinish: {
    read: (c) => c.interior.primary,
    write: (c, o) => {
      if (o.finishId) c.interior.primary = o.finishId;
    },
  },
  interiorSecondaryFinish: {
    read: (c) => c.interior.secondary,
    write: (c, o) => {
      if (o.finishId) c.interior.secondary = o.finishId;
    },
  },
  interiorSurface: {
    read: (c) => c.interior.surface,
    write: (c, o) => {
      if (o.interiorSurface) c.interior.surface = o.interiorSurface;
    },
  },
  bimini: {
    /* Derived from the visible zones, like every equipment field. */
    read: (c) => {
      const on = PXL_BIMINI_ZONES.every((zone) => c.equipment[zone] === true);
      return on ? "pxl_bimini_fitted" : "pxl_bimini_none";
    },
    write: (c, o) => {
      if (!o.meshVisibility) return;
      for (const [zone, visible] of Object.entries(o.meshVisibility)) {
        c.equipment[zone as PxlZone] = visible;
      }
    },
  },
  coolBox: {
    /* Derived from the visible zones, like every equipment field. */
    read: (c) => {
      const on = PXL_COOL_BOX_ZONES.every((zone) => c.equipment[zone] === true);
      return on ? "pxl_cool_fitted" : "pxl_cool_none";
    },
    write: (c, o) => {
      if (!o.meshVisibility) return;
      for (const [zone, visible] of Object.entries(o.meshVisibility)) {
        c.equipment[zone as PxlZone] = visible;
      }
    },
  },
  audio: {
    /* Derived from the visible zones, exactly as `boardingPlatform` is, and for
       the reason set out there: an equipment option writes a SET of mesh
       visibilities and no one of them names the option, so its identity is its
       id and the read has to answer in the same currency. */
    read: (c) => {
      const on = PXL_AUDIO_ZONES.every((zone) => c.equipment[zone] === true);
      return on ? "pxl_audio_speakers" : "pxl_audio_none";
    },
    write: (c, o) => {
      if (!o.meshVisibility) return;
      for (const [zone, visible] of Object.entries(o.meshVisibility)) {
        c.equipment[zone as PxlZone] = visible;
      }
    },
  },
  speakerLight: {
    read: (c) => c.audio.speakerLight,
    write: (c, o) => {
      if (o.finishId) c.audio.speakerLight = o.finishId;
    },
  },
  glazingTint: {
    read: (c) => c.interior.glazing,
    write: (c, o) => {
      if (o.finishId) c.interior.glazing = o.finishId;
    },
  },
  railTreatment: {
    read: (c) => c.interior.rails,
    write: (c, o) => {
      if (o.railTreatment) c.interior.rails = o.railTreatment;
    },
  },
  propulsion: {
    read: (c) => c.propulsion.variant,
    write: (c, o) => {
      if (o.geometryVariant) c.propulsion.variant = o.geometryVariant;
    },
  },
  /**
   * PHASE 4.4 §24 — THE FIRST FIELD THAT WRITES GEOMETRY RATHER THAN A
   * MATERIAL, and the one that finally uses the registry Phase Four built.
   *
   * READ is derived from the registry rather than stored beside it. There is no
   * `equipment.boardingPlatform: boolean` anywhere in the configuration: the
   * truth is which zones are visible, and the control's current value is read
   * back OUT of that. A second field holding the same fact is a second field
   * that can disagree with the first — and the disagreement would show as a
   * control whose highlighted option is not the boat on screen.
   *
   * It answers with the option's own id, because that is what `selectedOption`
   * compares against, and it does so by asking whether every zone the option
   * names is in the state that option would put it in.
   */
  boardingPlatform: {
    read: (c) => {
      const on = PXL_PLATFORM_ZONES.every((zone) => c.equipment[zone] === true);
      return on ? "pxl_platform_teak" : "pxl_platform_none";
    },
    write: (c, o) => {
      if (!o.meshVisibility) return;
      for (const [zone, visible] of Object.entries(o.meshVisibility)) {
        c.equipment[zone as PxlZone] = visible;
      }
    },
  },
};

/**
 * The zones the boarding platform option owns.
 *
 * Derived from the catalogue's own option rather than listed again, so a third
 * platform mesh added in Blender and declared on the option is picked up here
 * without an edit — and cannot be picked up here if somebody forgets to declare
 * it, which is the failure mode worth making loud.
 */
const PXL_PLATFORM_ZONES: readonly PxlZone[] = Object.keys(
  PXL_CONTROLS.find((c) => c.field === "boardingPlatform")
    ?.options.find((o) => o.slug === "on")?.meshVisibility ?? {},
) as PxlZone[];

/** The zones the cool box owns. Derived the same way, for the same reason. */
const PXL_COOL_BOX_ZONES: readonly PxlZone[] = Object.keys(
  PXL_CONTROLS.find((c) => c.field === "coolBox")
    ?.options.find((o) => o.slug === "on")?.meshVisibility ?? {},
) as PxlZone[];

/** The zones the audio option owns. Derived the same way, for the same reason. */
const PXL_AUDIO_ZONES: readonly PxlZone[] = Object.keys(
  PXL_CONTROLS.find((c) => c.field === "audio")
    ?.options.find((o) => o.slug === "on")?.meshVisibility ?? {},
) as PxlZone[];

/**
 * The zones the bimini owns — the ones being FITTED turns on.
 *
 * Filtered on the value, which the three above do not have to be: the bimini is
 * the first option whose "on" state declares a mesh OFF. `bimini_boot` is the
 * struck top, and a fitted bimini is a deployed one, so the option switches the
 * boot off and `pxlStow` decides afterwards which half is drawn. Reading the
 * key list alone would ask whether the boot is visible before calling the
 * bimini fitted, and the answer would be no every time it was up.
 */
const PXL_BIMINI_ZONES: readonly PxlZone[] = Object.entries(
  PXL_CONTROLS.find((c) => c.field === "bimini")
    ?.options.find((o) => o.slug === "on")?.meshVisibility ?? {},
).filter(([, visible]) => visible === true).map(([zone]) => zone) as PxlZone[];

function writeField(
  config: PxlConfiguration,
  field: PxlConfigField,
  option: PxlCatalogOption,
): void {
  FIELDS[field].write(config, option);
}

/**
 * WHICH OPTION A CONTROL IS CURRENTLY SHOWING.
 *
 * Matched on the field's value rather than on a stored option id, so the
 * configuration never carries a second copy of a fact it already holds. The
 * fallback to the control's default is not defensive noise: a configuration
 * restored from an old link may hold a finish that has since been withdrawn
 * from a range, and answering "the default" is what makes that a graceful
 * degradation rather than an undefined swatch.
 */
export function selectedOption(
  config: PxlConfiguration,
  control: PxlCatalogControl,
): PxlCatalogOption {
  const value = FIELDS[control.field].read(config);
  return (
    control.options.find((o) => optionValue(o) === value) ?? defaultOption(control)
  );
}

/**
 * The value an option writes into its field. The other half of the match above.
 *
 * PHASE 4.4 — THE EQUIPMENT CASE IS THE OPTION'S OWN ID, and it is last on
 * purpose. Every other option here writes a single scalar somewhere in the
 * configuration, and that scalar is what identifies it: a finish id, a
 * treatment, a surface, a drive variant. An equipment option writes a SET of
 * mesh visibilities, and no one of them names the option — `platform_frame:
 * true` is a fact about a mesh, not about a choice.
 *
 * So the identity of an equipment option is its id, and `FIELDS
 * .boardingPlatform.read` answers in the same currency by deriving which option
 * the visible zones correspond to. Without this branch the match falls through
 * to `undefined`, `find` returns nothing, and `selectedOption` quietly answers
 * with the default — a control that writes correctly and reads back wrong,
 * which is exactly the shape of the Phase 4.1 defect `pxlVisualCases` exists
 * for. It was caught here by the round-trip assertion that has been in the
 * suite since Phase Four.
 */
function optionValue(option: PxlCatalogOption): string | undefined {
  return (
    option.finishId ??
    option.lowerTreatment ??
    option.interiorSurface ??
    option.railTreatment ??
    option.geometryVariant ??
    (option.meshVisibility ? option.id : undefined)
  );
}

/** A new configuration with one option applied. Never mutates its argument. */
export function applyOption(
  config: PxlConfiguration,
  control: PxlCatalogControl,
  option: PxlCatalogOption,
): PxlConfiguration {
  const next = cloneConfig(config);
  writeField(next, control.field, option);
  return next;
}

/* THE DEFAULT LIVES BELOW THE ACCESSORS, AND NOT BY PREFERENCE.
   `buildDefaultConfiguration` calls `writeField`, which reads `FIELDS` — a
   `const` initialised at module scope. Declaring the default above it puts the
   call inside `FIELDS`' temporal dead zone, and the failure is a module that
   throws on import with a message about a name that is plainly right there.
   Ordering is the whole fix; a getter or a lazy singleton would be paying for
   the same guarantee twice. */

/**
 * The delivered boat.
 *
 * Deep-frozen, and shared rather than copied. `pxlStore` hands this exact
 * object to React on both the server and the client so that
 * `useSyncExternalStore` sees one identity across hydration — see the note
 * there. Freezing is what makes sharing it safe: every write allocates a new
 * configuration, and an accidental in-place mutation now throws in development
 * instead of quietly changing what "default" means for the rest of the process.
 *
 * DERIVED FROM THE CATALOGUE, NOT RESTATED. Every value a control owns is read
 * out of that control's `defaultOptionId`, so the default boat and the option
 * marked as delivered can never disagree — which is the failure §A22 is really
 * about, because RESET restores this object and a stale literal here would make
 * RESET restore something no control shows as selected.
 */
export const PXL_DEFAULT_CONFIGURATION: PxlConfiguration = deepFreeze(
  buildDefaultConfiguration(),
);

function buildDefaultConfiguration(): PxlConfiguration {
  const config: PxlConfiguration = {
    exterior: {
      hullPrimary: PXL_HULL_FINISHES[0].id,
      lowerTreatment: "dark",
      // Not a control. Every reference render shows one capping, so offering a
      // choice would be offering a choice nobody has made.
      hullAccent: PXL_ACCENT_FINISHES[0].id,
    },
    interior: {
      primary: PXL_INTERIOR_FINISHES[0].id,
      secondary: PXL_INTERIOR_SECONDARY_FINISHES[0].id,
      surface: "grained",
      metal: PXL_METAL_FINISHES[0].id,
      rails: "interior",
      glazing: PXL_GLAZING_FINISHES[1].id,
    },
    propulsion: { variant: "standard" },
    audio: { speakerLight: PXL_SPEAKER_LIGHT_FINISHES[0].id },
    equipment: {},
  };
  for (const control of PXL_CONTROLS) {
    writeField(config, control.field, defaultOption(control));
  }
  return config;
}

function deepFreeze(config: PxlConfiguration): PxlConfiguration {
  Object.freeze(config.exterior);
  Object.freeze(config.interior);
  Object.freeze(config.audio);
  Object.freeze(config.propulsion);
  Object.freeze(config.equipment);
  return Object.freeze(config);
}

export function cloneConfig(config: PxlConfiguration): PxlConfiguration {
  return {
    exterior: { ...config.exterior },
    interior: { ...config.interior },
    propulsion: { ...config.propulsion },
    audio: { ...config.audio },
    equipment: { ...config.equipment },
  };
}


/* ── Channel → finish ──────────────────────────────────────────────────────*/

/**
 * THE FINISH A CONFIGURATION ASSIGNS TO A CHANNEL.
 *
 * Two of these are RESOLVED rather than stored, and both are Phase Four:
 *
 *   • `hullLower` follows the topsides under FULL BODY COLOUR and is structural
 *     black otherwise (§A4). Resolved here, once, so no consumer can get the
 *     relationship wrong and no consumer has to know it exists.
 *   • `motor` follows the fitted drive's own cowling finish. An electric drive
 *     in a combustion cowling is not a configuration anybody should be able to
 *     reach, so the colour is a consequence of the variant rather than a choice
 *     beside it.
 *
 * `sternMoulding` is deliberately constant. It is the moulding that carries the
 * PXL mark, and repainting it would take the mark's ground away — see the note
 * on the channel in `pxlModel`.
 */
export function finishForChannel(
  config: PxlConfiguration,
  channel: PxlChannel | string,
): PxlFinishId | null {
  switch (channel) {
    case "hullPrimary":
      return config.exterior.hullPrimary;
    case "hullLower":
      return config.exterior.lowerTreatment === "body"
        ? config.exterior.hullPrimary
        : PXL_STRUCTURE_FINISHES[0].id;
    case "hullAccent":
      return config.exterior.hullAccent;
    case "sternMoulding":
      return PXL_STRUCTURE_FINISHES[0].id;
    case "interiorPrimary":
      return config.interior.primary;
    case "interiorSecondary":
      return config.interior.secondary;
    case "metal":
      return config.interior.metal;
    case "glazing":
      return config.interior.glazing;
    case "speakerLight":
      return config.audio.speakerLight;
    /* §4.9 — RESOLVED, NOT STORED. The rails follow the leather unless they
       have been set black, and "follow" is evaluated here on every read rather
       than written into the configuration when the control was last used. */
    case "railings":
      return config.interior.rails === "black"
        ? PXL_STRUCTURE_FINISHES[0].id
        : config.interior.primary;
    case "motor":
      return PXL_DRIVE_SPECS[config.propulsion.variant].cowlFinishId;
    default:
      return null; // a channel the asset cannot serve
  }
}

/**
 * The finish a configuration assigns to a MATERIAL ROLE.
 *
 * The API configurator code should reach for. A role is a fact about the boat
 * ("the exterior hull"); a channel is a fact about this configuration schema; a
 * material index is a fact about one export of one file. Resolving role →
 * channel → finish in one place means the two lower layers can be renumbered
 * without anything upstream noticing.
 */
export function finishForRole(
  config: PxlConfiguration,
  role: PxlMaterialRole,
): PxlFinishId | null {
  const zone = PXL_ZONES.find((z) => z.role === role);
  if (!zone?.channel) return null;
  return finishForChannel(config, zone.channel);
}

/** Whether a zone should be drawn under this configuration. */
export function zoneVisible(config: PxlConfiguration, zone: PxlZone): boolean {
  const override = config.equipment[zone];
  if (override !== undefined) return override;
  return PXL_ZONES.find((z) => z.id === zone)?.visibleByDefault ?? true;
}

/**
 * What a given channel may be set to. Read by the development bench.
 *
 * The resolved channels answer with the range they can *draw from*, which for
 * `hullLower` is the hull range plus the structural black — that is genuinely
 * the set of finishes the bottom can end up wearing, even though no control
 * offers it directly.
 */
export const PXL_CHANNEL_OPTIONS: Record<string, readonly PxlFinish[]> = {
  hullPrimary: PXL_HULL_FINISHES,
  hullLower: [...PXL_STRUCTURE_FINISHES, ...PXL_HULL_FINISHES],
  hullAccent: PXL_ACCENT_FINISHES,
  sternMoulding: PXL_STRUCTURE_FINISHES,
  interiorPrimary: PXL_INTERIOR_FINISHES,
  interiorSecondary: PXL_INTERIOR_SECONDARY_FINISHES,
  glazing: PXL_GLAZING_FINISHES,
  speakerLight: PXL_SPEAKER_LIGHT_FINISHES,
  metal: PXL_METAL_FINISHES,
  /* §4.9 — the rails can end up wearing any interior finish or the structural
     black, which is the honest range even though the control offers two
     options rather than a colour list. Same reasoning as `hullLower`. */
  railings: [...PXL_INTERIOR_FINISHES, ...PXL_STRUCTURE_FINISHES],
  motor: PXL_MOTOR_FINISHES,
};

/* ── Categories, as the UI sees them ───────────────────────────────────────*/

/**
 * WHAT THE CONFIGURATOR ACTUALLY RENDERS.
 *
 * §A2 asks that the category count stay data-driven, and this is the whole of
 * the mechanism: a category with no control that has options in it does not
 * appear, so the interface cannot number to five while showing four. Sorted
 * rather than trusted to declaration order, because the catalogue is the file
 * most likely to be edited by somebody adding an entry at the bottom.
 */
export const PXL_AVAILABLE_CATEGORIES: readonly PxlCatalogCategory[] = [...PXL_CATEGORIES]
  .filter((category) => category.controls.some((control) => control.options.length > 0))
  .sort((a, b) => a.sortOrder - b.sortOrder);

export const PXL_AVAILABLE_CONTROLS: readonly PxlCatalogControl[] =
  PXL_AVAILABLE_CATEGORIES.flatMap((category) =>
    category.controls.filter((control) => control.options.length > 0),
  );

/* ── Serialisation ─────────────────────────────────────────────────────────*/

/**
 * A configuration as query parameters, and back.
 *
 * `?exterior=navy&lower=body&interior=cognac&propulsion=electric` — §A21's
 * shape exactly, plus the two extra keys the INTERIOR category's second and
 * third controls own. One parameter per control, named after the control,
 * valued with the option's slug.
 *
 * ONLY MEANINGFUL PARAMETERS ARE WRITTEN. A control sitting on its default
 * contributes nothing, so the default boat's URL is clean and a shared link
 * contains only the choices somebody actually made. A URL is a summary of a
 * decision, not a dump of a state object.
 */
export interface PxlParseResult {
  configuration: PxlConfiguration;
  /**
   * Parameters that were present and could not be honoured — an unknown slug,
   * or a control that does not exist. The fallback is silent to the user but
   * not to the code, because the URL then has to be *rewritten*. Leaving
   * `?exterior=invalid-value` in the address bar while showing the default boat
   * is the failure mode that turns one bad link into a hundred bad links.
   */
  rejected: readonly string[];
}

export function configurationToParams(config: PxlConfiguration): URLSearchParams {
  const params = new URLSearchParams();
  for (const control of PXL_AVAILABLE_CONTROLS) {
    const current = selectedOption(config, control);
    if (current.id === control.defaultOptionId) continue;
    params.set(control.param, current.slug);
  }
  return params;
}

/** The query string a configuration serialises to. Empty for the default boat. */
export function serialiseConfiguration(config: PxlConfiguration): string {
  return configurationToParams(config).toString();
}

/**
 * §A21 — INVALID VALUES SANITISE INDEPENDENTLY.
 *
 * The loop below never breaks and never bails. Each control is resolved against
 * its own parameter, and a control whose parameter is missing, unknown or
 * malformed falls back to its own default while every other control keeps the
 * value it was given. `?exterior=navy&interior=chartreuse&propulsion=electric`
 * therefore produces a navy boat with an electric drive and the default
 * interior — not a default boat, and not an error.
 *
 * That is a deliberately unglamorous property and it is the one that matters
 * most in practice, because the URLs that arrive broken are the ones somebody
 * has forwarded, truncated in a chat client, or hand-edited. Throwing away four
 * correct choices because a fifth was mistyped is how a share link becomes
 * worthless.
 */
export function parseConfiguration(
  input: URLSearchParams | string | null | undefined,
): PxlParseResult {
  const params =
    input instanceof URLSearchParams ? input : new URLSearchParams(input ?? "");

  const configuration = cloneConfig(PXL_DEFAULT_CONFIGURATION);
  const rejected: string[] = [];

  for (const control of PXL_AVAILABLE_CONTROLS) {
    const raw = params.get(control.param);
    if (raw === null) continue;

    const match = optionBySlug(control, raw.trim().toLowerCase());
    if (!match) {
      rejected.push(control.param);
      continue;
    }
    writeField(configuration, control.field, match);
  }

  // Parameters this configurator RESERVES but does not offer — the deferred
  // categories. Rejected rather than silently ignored, so `?equipment=…` is
  // cleared from the address bar rather than sitting there implying a control
  // the interface does not have.
  for (const deferred of PXL_DEFERRED_CATEGORIES) {
    if (params.has(deferred.param)) rejected.push(deferred.param);
  }

  return { configuration, rejected };
}

/* ── Human-readable summary ────────────────────────────────────────────────*/

export interface PxlSummaryLine {
  /** The category this line belongs to. Groups the summary. */
  category: PxlCategoryId;
  /** The control, so the caller can name the row without knowing the order. */
  control: string;
  /** Localisation key for the row's label. Never a printed string. */
  labelKey: string;
  /** The internal option key. Never printed; carried so a payload can be exact. */
  optionId: string;
  /** The URL token. This is the stable public identifier for the choice. */
  slug: string;
  /**
   * What may be printed on this surface, or null when nothing may be.
   *
   * A public surface gets null for every option in the provisional catalogue,
   * automatically, which is what makes the publication rule structural rather
   * than a thing somebody has to remember.
   */
  value: string | null;
  /** True when `value` is a name the yard has approved. False today. */
  approved: boolean;
}

/**
 * §A20 — THE CONFIGURATION IN WORDS, DERIVED RATHER THAN WRITTEN.
 *
 * One summary, generated from state, expanding by itself as categories arrive.
 * §A20 is explicit that no component may assemble the strings by hand, and the
 * shape here is what enforces it: the function returns ids, slugs and keys, and
 * the *labels* are deliberately absent because they are UI vocabulary and
 * belong in the locale table. A component that wanted to hard-code "Hull
 * detail: dark lower" would have to invent both halves.
 */
export function summariseConfiguration(
  config: PxlConfiguration,
  surface: PxlLabelSurface = "preview",
): PxlSummaryLine[] {
  return PXL_AVAILABLE_CONTROLS.map((control) => {
    const option = selectedOption(config, control);
    return {
      category: option.category,
      control: control.id,
      labelKey: control.labelKey,
      optionId: option.id,
      slug: option.slug,
      value: optionLabel(option, surface),
      approved: optionLabel(option, "public") !== null,
    };
  });
}

/**
 * The name a surface is allowed to print for an option, or null.
 *
 * The catalogue's own version of `finishLabel`, and it defers to it whenever
 * the option is backed by a finish so that there is exactly one publication
 * rule rather than two that can disagree. Options with no finish behind them —
 * a hull treatment, a drive variant — are governed by the option's own
 * `published` and `approvedLabel`, which are held to the same standard.
 */
export function optionLabel(
  option: PxlCatalogOption,
  surface: PxlLabelSurface,
): string | null {
  if (surface === "public") {
    return option.published && option.approvedLabel ? option.approvedLabel : null;
  }
  return option.approvedLabel ?? option.previewLabel;
}

/** True when every option in a control could be named on a public surface. */
export function controlIsPubliclyNameable(control: PxlCatalogControl): boolean {
  return control.options.every((o) => optionLabel(o, "public") !== null);
}

/** Kept for the palette-level check the exterior swatches still make. */
export { finishLabel };

/* ── URLs, without a browser ───────────────────────────────────────────────*/

/**
 * Write a configuration into an existing URL, preserving everything else.
 *
 * PURE, AND THAT IS THE POINT. A shared link must reopen the same
 * configuration and unrelated query parameters must survive; both are
 * assertions a test should be able to make, and neither can be made against a
 * function that reaches for `window.location`. So the browser-facing helper in
 * `pxlStore` is a two-line wrapper around this, and the behaviour that matters
 * is tested here.
 *
 * Every parameter this configurator owns is cleared before the new ones are
 * written — including the deferred categories' reserved names — so a URL that
 * arrived carrying `?exterior=navy` and a configuration back on the default
 * comes out clean rather than stale.
 */
export function applyConfigurationToHref(href: string, config: PxlConfiguration): string {
  // A base is required for relative hrefs and is discarded when the input is
  // absolute, so this works for both "/preview/pxl/configure?x=1" and a full URL.
  const url = new URL(href, "https://placeholder.invalid");
  for (const control of PXL_CONTROLS) url.searchParams.delete(control.param);
  configurationToParams(config).forEach((value, key) => url.searchParams.set(key, value));
  return url.origin === "https://placeholder.invalid"
    ? `${url.pathname}${url.search}${url.hash}`
    : url.toString();
}

/**
 * Drop every parameter this configurator owns, leaving the rest untouched.
 *
 * What RESET writes (§A22: one defined preview default, and unrelated URL
 * parameters preserved). Reset is not "serialise the default configuration" —
 * that happens to produce the same string today, but only because the default
 * boat serialises to nothing, and a future control with a non-default default
 * would break the coincidence.
 */
export function clearConfigurationFromHref(href: string): string {
  return applyConfigurationToHref(href, PXL_DEFAULT_CONFIGURATION);
}
