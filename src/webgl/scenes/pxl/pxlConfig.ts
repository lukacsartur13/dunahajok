/**
 * PXL — the configuration data model.
 *
 * One plain object describing one boat. It is deliberately dull: no classes,
 * no methods, no derived state, nothing that cannot survive `JSON.stringify`.
 * Everything Phase Three needs to do with a configuration — put it in a URL,
 * attach it to a quote request, store it against a lead, rebuild the scene
 * from it a month later — is easy if the configuration is data and awkward if
 * it is an object graph.
 *
 * WHAT IS AND IS NOT MODELLED. Only what the asset and the confirmed product
 * information actually support. The hull colours are real studies; the
 * propulsion variant is the one outboard that exists in the source model and
 * nothing else. There is no seating option, because there is no seating
 * geometry. There are no prices, no availability and no lead times, because
 * none of those have been supplied. An empty category is better than a
 * plausible invention: the first can be filled in, the second has to be found
 * and removed.
 */

import {
  PXL_ACCENT_FINISHES,
  PXL_CONSOLE_FINISHES,
  PXL_FLOOR_FINISHES,
  PXL_HULL_FINISHES,
  PXL_METAL_FINISHES,
  PXL_MOTOR_FINISHES,
  PXL_STRUCTURE_FINISHES,
  finishBySlug,
  finishLabel,
  type PxlFinish,
  type PxlFinishId,
  type PxlLabelSurface,
} from "./pxlPalette";
import { PXL_ZONES, type PxlMaterialRole, type PxlZone } from "./pxlModel";

/* ── The configuration ─────────────────────────────────────────────────────*/

export interface PxlConfiguration {
  exterior: {
    hullPrimary: PxlFinishId;
    hullLower: PxlFinishId;
    hullAccent: PxlFinishId;
  };
  interior: {
    /**
     * Not upholstery. The PXL's cockpit in the source model is a bare moulded
     * liner, so this is the moulding's own finish. When upholstery geometry
     * arrives, `upholsteryPrimary` and `upholsterySecondary` join this object
     * and the channels already declared in `pxlModel` bind to it.
     */
    flooring: PxlFinishId;
    console: PxlFinishId;
    metal: PxlFinishId;
  };
  propulsion: {
    /**
     * One variant, because one is what the source model contains: a
     * transom-mounted outboard. The union exists so that adding the electric
     * drive Duna already builds is a data change rather than a refactor. Do
     * not add a variant here before there is geometry and a confirmed product
     * to go with it.
     */
    variant: PxlPropulsionVariant;
    finish: PxlFinishId;
  };
  /**
   * RESERVED DIMENSIONS. §4 lists `upholstery`, `console`, `engine`,
   * `equipment` and `accessories` alongside `exteriorColor`, and none of the
   * first five has product data behind it. They are declared in
   * `PXL_CATEGORIES` below — with their URL parameter, their reason for being
   * unavailable, and a `write` that refuses — rather than as empty fields on
   * this interface, because a field of type `PxlFinishId` that no finish can
   * legally be assigned to is a shape that compiles and lies. The categories
   * table is the future-safe schema; this interface holds only what the
   * geometry can actually carry.
   */

  /**
   * Optional equipment, by zone. Absent means "the zone's own default".
   *
   * This is the component-visibility architecture §27 asks for, and it is
   * intentionally keyed on zones rather than on invented option names: a
   * genuine option can only ever be a set of meshes to show or hide, so the
   * registry that will one day list "swim platform" or "bow sunbed" is
   * already the right shape. Today it has exactly one honest member.
   */
  equipment: Partial<Record<PxlZone, boolean>>;
}

export type PxlPropulsionVariant = "outboard";

export const PXL_PROPULSION: ReadonlyArray<{
  id: PxlPropulsionVariant;
  label: string;
  /** True when the yard has confirmed the specification. None have yet. */
  confirmed: boolean;
}> = [
  { id: "outboard", label: "Transom outboard", confirmed: false },
];

/**
 * The delivered boat.
 *
 * Deep-frozen, and shared rather than copied. `pxlStore` hands this exact
 * object to React on both the server and the client so that
 * `useSyncExternalStore` sees one identity across hydration — see the note
 * there. Freezing is what makes sharing it safe: every write allocates a new
 * configuration, and an accidental in-place mutation now throws in development
 * instead of quietly changing what "default" means for the rest of the process.
 */
export const PXL_DEFAULT_CONFIGURATION: PxlConfiguration = deepFreeze({
  exterior: {
    // The sage study is the one the PXL was presented in — it is the colour of
    // both delivered design renders, not just one of the six studies.
    hullPrimary: "pxl_sage",
    hullLower: "pxl_structure_black",
    hullAccent: "pxl_accent_black",
  },
  interior: {
    flooring: "pxl_floor_graphite",
    console: "pxl_console_graphite",
    metal: "pxl_rail_cognac",
  },
  propulsion: {
    variant: "outboard",
    finish: "pxl_motor_black",
  },
  equipment: {},
});

function deepFreeze(config: PxlConfiguration): PxlConfiguration {
  Object.freeze(config.exterior);
  Object.freeze(config.interior);
  Object.freeze(config.propulsion);
  Object.freeze(config.equipment);
  return Object.freeze(config);
}

/* ── Channel → finish options ──────────────────────────────────────────────*/

/**
 * What a given channel may be set to. The development viewer reads this to
 * build its controls; Phase Three's swatches will read the same thing, so the
 * two can never drift apart.
 */
export const PXL_CHANNEL_OPTIONS: Record<string, readonly PxlFinish[]> = {
  hullPrimary: PXL_HULL_FINISHES,
  hullLower: PXL_STRUCTURE_FINISHES,
  hullAccent: PXL_ACCENT_FINISHES,
  flooring: PXL_FLOOR_FINISHES,
  console: PXL_CONSOLE_FINISHES,
  metal: PXL_METAL_FINISHES,
  motor: PXL_MOTOR_FINISHES,
};

/** The finish a configuration assigns to a channel. */
export function finishForChannel(
  config: PxlConfiguration,
  channel: string,
): PxlFinishId | null {
  switch (channel) {
    case "hullPrimary": return config.exterior.hullPrimary;
    case "hullLower": return config.exterior.hullLower;
    case "hullAccent": return config.exterior.hullAccent;
    case "flooring": return config.interior.flooring;
    case "console": return config.interior.console;
    case "metal": return config.interior.metal;
    case "motor": return config.propulsion.finish;
    default: return null;                 // a channel the asset cannot serve
  }
}

/**
 * The finish a configuration assigns to a MATERIAL ROLE.
 *
 * §3's API, and the one configurator code should reach for. A role is a fact
 * about the boat ("the exterior hull"); a channel is a fact about this
 * configuration schema; a material index is a fact about one export of one
 * file. Resolving role → channel → finish in one place means the two lower
 * layers can be renumbered without anything upstream noticing.
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

/* ── Categories ────────────────────────────────────────────────────────────*/

/**
 * THE CONFIGURATION SCHEMA THE UI IS BUILT FROM.
 *
 * §30 asks that category navigation derive from the schema rather than from
 * five hard-coded panels, and §29 asks that a configurator with one real
 * category say so instead of inventing "01 / 04". Both fall out of one table:
 * the UI maps over `PXL_AVAILABLE_CATEGORIES` and renders what it finds. Today
 * it finds exactly one, so it renders exactly one — no disabled tabs, no greyed
 * future theatre, no count that implies three more are coming next week.
 *
 * The unavailable entries are declared anyway, and that is not the same thing
 * as exposing them. They exist so that:
 *
 *   • the reason a category is missing lives beside the category rather than in
 *     a comment somewhere, and is printable on the development bench;
 *   • the URL parameter name is reserved now, before anyone can accidentally
 *     ship a different one;
 *   • turning one on is adding `options` and clearing `unavailable`, which is a
 *     data change, not an architecture change.
 *
 * `unavailable` is a *development* string. It is never rendered to a customer:
 * a customer-facing surface shows the categories that exist and is silent about
 * the ones that do not.
 */
export type PxlCategoryId =
  | "exterior"
  | "upholstery"
  | "console"
  | "engine"
  | "equipment"
  | "accessories";

export interface PxlCategory {
  id: PxlCategoryId;
  /** Query-string key. Reserved even when the category is unavailable. */
  param: string;
  /** Selectable finishes. Empty whenever `unavailable` is set. */
  options: readonly PxlFinish[];
  /** Why this category cannot be offered. Null when it can. Never shown to customers. */
  unavailable: string | null;
  /** The finish this configuration currently assigns. */
  read: (config: PxlConfiguration) => PxlFinishId;
  /** A new configuration with this category set. Never mutates its argument. */
  write: (config: PxlConfiguration, id: PxlFinishId) => PxlConfiguration;
}

function cloneConfig(config: PxlConfiguration): PxlConfiguration {
  return {
    exterior: { ...config.exterior },
    interior: { ...config.interior },
    propulsion: { ...config.propulsion },
    equipment: { ...config.equipment },
  };
}

export const PXL_CATEGORIES: readonly PxlCategory[] = [
  {
    id: "exterior",
    param: "exterior",
    options: PXL_HULL_FINISHES,
    unavailable: null,
    read: (c) => c.exterior.hullPrimary,
    write: (c, id) => {
      const next = cloneConfig(c);
      next.exterior.hullPrimary = id;
      return next;
    },
  },
  {
    id: "upholstery",
    param: "upholstery",
    options: [],
    unavailable:
      "no seating or cushion geometry in the source STL, and no upholstery specification from the yard",
    read: (c) => c.interior.flooring,
    write: (c) => c,
  },
  {
    id: "console",
    param: "console",
    options: [],
    // Not "no geometry" — there is a console. The problem is that it is the
    // superseded revision, so offering a finish choice on it would be offering
    // a choice about a part that is going to be replaced.
    unavailable:
      "the console in the asset is the STL revision, not the glazed tower shown in the colour studies",
    read: (c) => c.interior.console,
    write: (c) => c,
  },
  {
    id: "engine",
    param: "engine",
    options: [],
    unavailable: "one unidentified outboard in the source model; no engine option list supplied",
    read: (c) => c.propulsion.finish,
    write: (c) => c,
  },
  {
    id: "equipment",
    param: "equipment",
    options: [],
    unavailable: "no equipment list supplied; the only optional mesh is an undocumented cockpit cover",
    read: (c) => c.exterior.hullPrimary,
    write: (c) => c,
  },
  {
    id: "accessories",
    param: "accessories",
    options: [],
    unavailable: "no accessory range supplied",
    read: (c) => c.exterior.hullPrimary,
    write: (c) => c,
  },
] as const;

/** What the configurator actually renders. One member today. */
export const PXL_AVAILABLE_CATEGORIES = PXL_CATEGORIES.filter(
  (c) => c.unavailable === null && c.options.length > 0,
);

export const PXL_CATEGORY_BY_ID = new Map(PXL_CATEGORIES.map((c) => [c.id, c]));

/* ── Serialisation ─────────────────────────────────────────────────────────*/

/**
 * A configuration as query parameters, and back.
 *
 * `?exterior=sage`, and later `?exterior=sage&upholstery=…&engine=…`. One
 * parameter per category, named after the category, valued with the finish's
 * `slug`. §5 asks for exactly this shape and §6 asks that it survive being
 * edited by hand, and the two together rule out the alternatives: a single
 * packed token (`?pxl=sage.black.black~graphite`, which this replaces) is
 * compact but opaque, cannot be extended without a positional migration, and
 * turns one typo into a wholly different boat.
 *
 * ONLY MEANINGFUL PARAMETERS ARE WRITTEN. An unavailable category contributes
 * nothing, and a category sitting on its default contributes nothing either —
 * so the default boat's URL is a clean `/dev/pxl`, and a shared link contains
 * only the choices someone actually made. A URL is a summary of a decision, not
 * a dump of a state object.
 */
export interface PxlParseResult {
  configuration: PxlConfiguration;
  /**
   * Parameters that were present and could not be honoured — an unknown slug,
   * or a category that does not exist. §6: the fallback is silent to the user
   * but not to the code, because the URL then has to be *rewritten*. Leaving
   * `?exterior=invalid-value` in the address bar while showing the default boat
   * is the failure mode that turns one bad link into a hundred bad links.
   */
  rejected: readonly string[];
}

export function configurationToParams(config: PxlConfiguration): URLSearchParams {
  const params = new URLSearchParams();
  for (const category of PXL_AVAILABLE_CATEGORIES) {
    const current = category.read(config);
    if (current === category.read(PXL_DEFAULT_CONFIGURATION)) continue;
    const option = category.options.find((o) => o.id === current);
    if (option) params.set(category.param, option.slug);
  }
  return params;
}

/** The query string a configuration serialises to. Empty for the default boat. */
export function serialiseConfiguration(config: PxlConfiguration): string {
  return configurationToParams(config).toString();
}

export function parseConfiguration(
  input: URLSearchParams | string | null | undefined,
): PxlParseResult {
  const params =
    input instanceof URLSearchParams
      ? input
      : new URLSearchParams(input ?? "");

  let configuration = cloneConfig(PXL_DEFAULT_CONFIGURATION);
  const rejected: string[] = [];

  for (const category of PXL_CATEGORIES) {
    const raw = params.get(category.param);
    if (raw === null) continue;

    // A parameter for a category that is not offered is rejected rather than
    // remembered. Honouring `?engine=…` today would mean carrying a value the
    // configurator cannot show, cannot change and cannot explain.
    if (category.unavailable !== null || category.options.length === 0) {
      rejected.push(category.param);
      continue;
    }

    const match = finishBySlug(raw.trim().toLowerCase(), category.options);
    if (!match) {
      rejected.push(category.param);
      continue;
    }
    configuration = category.write(configuration, match.id);
  }

  return { configuration, rejected };
}

/* ── Human-readable summary ────────────────────────────────────────────────*/

export interface PxlSummaryLine {
  category: PxlCategoryId;
  /** The internal finish key. Never printed; carried so a payload can be exact. */
  finishId: PxlFinishId;
  /** The URL token. This is the stable public identifier for the choice. */
  slug: string;
  /**
   * What may be printed on this surface, or null when nothing may be.
   *
   * Resolved through `finishLabel`, so a summary rendered on a public surface
   * automatically prints no colour name at all while the range is unapproved —
   * §53, and the reason this function takes a surface rather than assuming one.
   */
  value: string | null;
  /** True when `value` is a name the yard has approved. False today. */
  approved: boolean;
}

/**
 * The configuration in words, derived rather than written.
 *
 * §30: one summary, generated from state, expanding by itself as categories
 * arrive. The category *labels* are deliberately not here — they are UI strings
 * and belong in the locale table — so this returns ids and values and lets the
 * caller name them.
 */
export function summariseConfiguration(
  config: PxlConfiguration,
  surface: PxlLabelSurface = "preview",
): PxlSummaryLine[] {
  return PXL_AVAILABLE_CATEGORIES.map((category) => {
    const id = category.read(config);
    const option = category.options.find((o) => o.id === id);
    return {
      category: category.id,
      finishId: id,
      slug: option?.slug ?? "",
      value: option ? finishLabel(option, surface) : null,
      approved: option ? finishLabel(option, "public") !== null : false,
    };
  });
}

/* ── URLs, without a browser ───────────────────────────────────────────────*/

/**
 * Write a configuration into an existing URL, preserving everything else.
 *
 * PURE, AND THAT IS THE POINT. §27 asks that a shared link reopen the same
 * configuration and §26 that unrelated query parameters survive; both are
 * assertions a test should be able to make, and neither can be made against a
 * function that reaches for `window.location`. So the browser-facing helper in
 * `pxlStore` is a two-line wrapper around this, and the behaviour that matters
 * is tested here.
 *
 * Every category parameter is cleared before the new ones are written, so a URL
 * that arrived carrying `?exterior=navy` and a configuration that is back on
 * the default comes out clean rather than stale.
 */
export function applyConfigurationToHref(href: string, config: PxlConfiguration): string {
  // A base is required for relative hrefs and is discarded when the input is
  // absolute, so this works for both "/preview/pxl/configure?x=1" and a full URL.
  const url = new URL(href, "https://placeholder.invalid");
  for (const category of PXL_CATEGORIES) url.searchParams.delete(category.param);
  configurationToParams(config).forEach((value, key) => url.searchParams.set(key, value));
  return url.origin === "https://placeholder.invalid"
    ? `${url.pathname}${url.search}${url.hash}`
    : url.toString();
}

/**
 * Drop every parameter this configurator owns, leaving the rest untouched.
 *
 * What RESET writes (§29: "preserve unrelated URL parameters"). Reset is not
 * "serialise the default configuration" — that happens to produce the same
 * string today, but only because the default boat serialises to nothing, and a
 * future category with a non-default default would break the coincidence.
 */
export function clearConfigurationFromHref(href: string): string {
  return applyConfigurationToHref(href, PXL_DEFAULT_CONFIGURATION);
}
