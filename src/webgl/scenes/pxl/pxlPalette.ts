/**
 * PXL — preliminary finishes.
 *
 * ⚠️ THESE ARE INTERNAL WORKING IDENTIFIERS, NOT PRODUCT NAMES.
 *
 * The design studio delivered six hull colour studies with the PXL. They are
 * *studies*: they show what the boat looks like in six directions, not what
 * Duna Hajók sells. Nothing here has been confirmed as an orderable finish,
 * nothing here has a commercial name, and nothing here has a price. The ids
 * are deliberately unattractive (`pxl_warm_grey`, not "Danube Mist") so that
 * no one is tempted to put one in front of a customer before the yard has
 * approved a range. `label` exists for the development viewer and is written
 * to match — plain description, no marketing.
 *
 * WHAT THE NUMBERS ARE. `base` is the sRGB albedo, anchored on the lit
 * diffuse reading taken off each reference render and then opened up, because
 * a render's mid-tone under an overcast sky is darker than the paint. The
 * finish parameters describe a sprayed marine topcoat over composite:
 * clear-coated, deep, and nothing like an automotive mirror — the reference
 * renders show a surface that holds a soft, wide highlight rather than a
 * sharp reflection of the horizon, and `roughness` is what carries that.
 */

export interface PxlFinish {
  /**
   * THE INTERNAL KEY. §53's `internalKey`, under the name the codebase already
   * uses for it.
   *
   * Deliberately unattractive and deliberately prefixed, so that a value that
   * escapes into a customer-facing surface is unmistakable rather than
   * plausible. It is not a name, it is not in a URL, and it may be renamed at
   * will — `slug` is the identifier that has to stay still.
   */
  id: string;
  /**
   * The URL token for this finish — `?exterior=warm-grey`.
   *
   * Separate from `id` because the two answer to different masters. `id` is a
   * code identifier and may be renamed whenever the code wants; `slug` is in
   * links people have already sent each other, and renaming one breaks them.
   * Kept lowercase, hyphenated, and free of the `pxl_` prefix that makes an id
   * unambiguous in a codebase and merely noisy in a URL.
   *
   * Uniqueness across the whole palette is asserted by the configurator tests,
   * not by convention: two channels are free to share a colour name, and the
   * day one does, a single `slug` namespace is what stops the parser silently
   * resolving `black` to the wrong one.
   */
  slug: string;
  /**
   * Internal description. Never a commercial name — see the file note.
   *
   * Kept alongside the label fields because the three are allowed to diverge
   * the moment the yard approves a range: `label` stays as the description of
   * what the paint *is*, `approvedDisplayName` becomes whatever the range calls
   * it, and `previewLabel` is what a staging surface may say in the meantime.
   */
  label: string;
  /**
   * THE NAME THE YARD HAS APPROVED FOR PUBLIC USE. Absent on every finish.
   *
   * Phase Three §53 asks for exactly this separation, and the reason is that a
   * colour name is a *commercial commitment*: it goes into an order, onto an
   * invoice and into a conversation with a customer. Nothing in this file has
   * been through that process, so the field is undefined everywhere and
   * `finishLabel(f, "public")` returns null for all twelve — which is what
   * makes the publication rule automatic rather than a thing somebody has to
   * remember (§53's "the public-ready UI must be able to reject unpublished
   * labels").
   */
  approvedDisplayName?: string;
  /**
   * A PROVISIONAL WORKING NAME, for preview and staging surfaces only.
   *
   * §9: no invented lifestyle name appears anywhere here. Every value below is
   * a plain descriptor of the colour — "Navy", "Warm Grey" — of the kind
   * already present in the project's own content, and none of them claims to be
   * a range name. `manufacturingCode` is where a real paint reference goes when
   * it comes, and keeping it separate is the point: the colour a configurator
   * shows and the paint a yard orders are two facts, and conflating them is how
   * a visualisation becomes a purchase order for the wrong tin.
   */
  previewLabel: string;
  /**
   * Whether this finish may be presented to the public at all.
   *
   * False everywhere, and it is not the same question as whether the name is
   * approved: a finish could have a name and still not be in the range. Both
   * have to be true before `finishLabel(f, "public")` will answer.
   */
  published: boolean;
  /**
   * The yard's paint reference, once there is one. Never inferred, never
   * guessed from the RGB value, and absent on every finish today.
   */
  manufacturingCode?: string;
  /** sRGB hex. THREE converts to the renderer's working space on assignment. */
  base: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  /** The reference render this was read from, for traceability. */
  reference?: string;
}

/**
 * Hull colours.
 *
 * Values are chosen so that every one of them survives §31's tests: the black
 * never reaches zero, so the hull keeps its form in shadow; the white sits
 * well below clipping, so the sheer does not blow out under a bright sky; the
 * navy is lifted and warmed away from the river's own blue-green so it cannot
 * merge into the water; and the gold is a pigment with a trace of metalness
 * rather than a metal, which is the difference between bronze paint and a
 * plastic toy.
 */
export const PXL_HULL_FINISHES: readonly PxlFinish[] = [
  {
    id: "pxl_white",
    slug: "white",
    previewLabel: "White",
    published: false,
    label: "White",
    base: "#dcdedb",
    roughness: 0.24,
    metalness: 0,
    clearcoat: 0.62,
    clearcoatRoughness: 0.10,
    reference: "pxl-water-white",
  },
  {
    id: "pxl_sage",
    slug: "sage",
    previewLabel: "Sage Green",
    published: false,
    label: "Sage green",
    base: "#61817b",
    roughness: 0.24,
    metalness: 0,
    clearcoat: 0.62,
    clearcoatRoughness: 0.10,
    reference: "pxl-water-sage",
  },
  {
    id: "pxl_black",
    slug: "black",
    previewLabel: "Black",
    published: false,
    label: "Black",
    base: "#15181c",
    roughness: 0.28,
    metalness: 0,
    clearcoat: 0.70,
    clearcoatRoughness: 0.08,
    reference: "pxl-water-black",
  },
  {
    id: "pxl_warm_grey",
    slug: "warm-grey",
    previewLabel: "Warm Grey",
    published: false,
    label: "Warm grey",
    base: "#a49d95",
    roughness: 0.26,
    metalness: 0,
    clearcoat: 0.58,
    clearcoatRoughness: 0.11,
    reference: "pxl-water-warm-grey",
  },
  {
    id: "pxl_gold",
    slug: "gold",
    previewLabel: "Gold",
    published: false,
    label: "Gold",
    // Deeper and browner than the first pass, which rendered as a flat yellow
    // — §31's "must not look like plastic", exactly. What fixes it is not a
    // different hue but more metalness and a slightly rougher coat: a pigment
    // with flake in it darkens where it turns away from the light and lifts
    // sharply where it faces it, and that range is what reads as metal.
    base: "#8a7140",
    roughness: 0.32,
    // Not a metal — a pigment with metallic flake. Pushed to a full metal the
    // hull stops reading as paint and starts reading as foil.
    metalness: 0.34,
    clearcoat: 0.66,
    clearcoatRoughness: 0.09,
    reference: "pxl-water-gold",
  },
  {
    id: "pxl_navy",
    slug: "navy",
    previewLabel: "Navy",
    published: false,
    label: "Navy",
    base: "#1b3a5c",
    roughness: 0.24,
    metalness: 0,
    clearcoat: 0.66,
    clearcoatRoughness: 0.09,
    reference: "pxl-water-navy",
  },
] as const;

/**
 * The black lower structure and the stern moulding.
 *
 * One entry, because every reference render shows the same thing: these are
 * structural mouldings, not a choice. They are here as a *channel* rather than
 * a constant so that the architecture does not have to change if the yard
 * later offers the bottom in the hull colour.
 *
 * The value matters more than the count. §10 asks that black structures retain
 * surface detail, and the way that fails is not a wrong hue — it is a base
 * colour at or near zero, after which no amount of light produces a gradient
 * and the whole lower hull becomes one silhouette. 0x101215 is dark enough to
 * read as black beside a white hull and far enough off zero to keep its shape.
 */
export const PXL_STRUCTURE_FINISHES: readonly PxlFinish[] = [
  {
    id: "pxl_structure_black",
    slug: "structure-black",
    previewLabel: "Structural Black",
    published: false,
    label: "Structural black",
    base: "#101215",
    roughness: 0.44,
    metalness: 0,
    clearcoat: 0.20,
    clearcoatRoughness: 0.28,
  },
] as const;

/** Gunwale capping. Same reasoning; slightly less deep than the bottom. */
export const PXL_ACCENT_FINISHES: readonly PxlFinish[] = [
  {
    id: "pxl_accent_black",
    slug: "accent-black",
    previewLabel: "Capping Black",
    published: false,
    label: "Capping black",
    base: "#14161a",
    roughness: 0.36,
    metalness: 0,
    clearcoat: 0.32,
    clearcoatRoughness: 0.20,
  },
] as const;

/**
 * Cockpit liner and sole. A moulded, textured surface — matt, and materially
 * softer than anything painted, which on a model with no normal maps has to
 * come entirely from roughness.
 */
export const PXL_FLOOR_FINISHES: readonly PxlFinish[] = [
  {
    id: "pxl_floor_graphite",
    slug: "floor-graphite",
    previewLabel: "Graphite Moulding",
    published: false,
    label: "Graphite moulding",
    // Darker than the first pass. The studio's overhead wash falls straight
    // onto a cockpit sole, so a mid-grey albedo renders lighter than the hull
    // beside it — which is the wrong way round: every reference render shows a
    // near-black sole with the cognac trim reading against it.
    base: "#26292b",
    roughness: 0.80,
    metalness: 0,
    clearcoat: 0,
    clearcoatRoughness: 0,
  },
] as const;

/** Helm console. Follows the hull by default but can be broken out. */
export const PXL_CONSOLE_FINISHES: readonly PxlFinish[] = [
  {
    id: "pxl_console_graphite",
    slug: "console-graphite",
    previewLabel: "Graphite",
    published: false,
    label: "Graphite",
    base: "#232830",
    roughness: 0.30,
    metalness: 0,
    clearcoat: 0.48,
    clearcoatRoughness: 0.13,
  },
] as const;

/**
 * Rails. The reference renders show a cognac inlay along the capping and at
 * the grab rails, and it is emphatically not chrome: §10 asks for controlled
 * environmental response, so metalness stays low and roughness stays high
 * enough that the rail picks up the sky as a soft band rather than a mirror.
 */
export const PXL_METAL_FINISHES: readonly PxlFinish[] = [
  {
    id: "pxl_rail_cognac",
    slug: "rail-cognac",
    previewLabel: "Cognac Rail",
    published: false,
    label: "Cognac rail",
    base: "#a2571f",
    roughness: 0.44,
    metalness: 0.10,
    clearcoat: 0.30,
    clearcoatRoughness: 0.22,
    reference: "pxl-hero-side",
  },
] as const;

/**
 * Propulsion. Kept out of the hull channels entirely, per §10 — an outboard is
 * a bought-in component in the manufacturer's own finish, and it should not
 * change colour because the hull did.
 */
export const PXL_MOTOR_FINISHES: readonly PxlFinish[] = [
  {
    id: "pxl_motor_black",
    slug: "motor-black",
    previewLabel: "Outboard Black",
    published: false,
    label: "Outboard black",
    base: "#191b1e",
    roughness: 0.38,
    metalness: 0,
    clearcoat: 0.34,
    clearcoatRoughness: 0.16,
  },
] as const;

/**
 * The exterior range, under the name the configurator uses for it.
 *
 * The same six objects as `PXL_HULL_FINISHES`, not a copy. The alias exists
 * because the configurator's vocabulary is EXTERIOR — that is what the URL
 * parameter is called, what the swatch group is labelled and what a customer
 * would say — while the renderer's vocabulary is HULL, which is the part of
 * the boat that actually changes colour. Naming both makes it obvious at a
 * glance which layer a piece of code belongs to.
 */
export const PXL_EXTERIOR_FINISHES = PXL_HULL_FINISHES;

const ALL = [
  ...PXL_HULL_FINISHES,
  ...PXL_STRUCTURE_FINISHES,
  ...PXL_ACCENT_FINISHES,
  ...PXL_FLOOR_FINISHES,
  ...PXL_CONSOLE_FINISHES,
  ...PXL_METAL_FINISHES,
  ...PXL_MOTOR_FINISHES,
];

export const PXL_FINISHES = new Map(ALL.map((f) => [f.id, f]));

/** By URL token. See `PxlFinish.slug` for why this namespace is flat. */
export const PXL_FINISHES_BY_SLUG = new Map(ALL.map((f) => [f.slug, f]));

export type PxlFinishId = string;

export function finish(id: PxlFinishId): PxlFinish {
  const found = PXL_FINISHES.get(id);
  if (!found) throw new Error(`unknown PXL finish: ${id}`);
  return found;
}

/**
 * Resolve a URL token, within one option list.
 *
 * Scoped rather than global on purpose: `?exterior=motor-black` names a real
 * finish that is not a real *exterior*, and a lookup that answered it would
 * paint the hull the colour of an outboard because someone mistyped. Returns
 * null when the token is unknown *for that channel*, which is the signal §6
 * requires — fall back to the default and drop the value from the URL.
 */
export function finishBySlug(
  slug: string | null | undefined,
  within: readonly PxlFinish[],
): PxlFinish | null {
  if (!slug) return null;
  return within.find((f) => f.slug === slug) ?? null;
}

/** Every finish, for tests and for the debug panel. */
export const PXL_ALL_FINISHES: readonly PxlFinish[] = ALL;

/* ── Labels, and the publication rule ──────────────────────────────────────*/

/**
 * WHERE A LABEL IS ABOUT TO BE PRINTED.
 *
 * `public` is a production, customer-facing, indexable surface. `preview` is a
 * staging surface reached deliberately, by someone who has been told what they
 * are looking at — today that is `/preview/pxl` and the development bench, both
 * noindex and both linked from nothing.
 */
export type PxlLabelSurface = "public" | "preview";

/**
 * The name a surface is allowed to print for a finish, or null.
 *
 * §53: the public UI must be able to *reject* an unapproved label by itself.
 * Returning null rather than throwing is what makes that a design instruction
 * instead of a crash — a swatch with no approved name is still a perfectly good
 * swatch, and the caller's natural response to null is to show the colour and
 * say nothing, which is exactly the correct behaviour today.
 *
 * Note what this rules out. A component cannot print a colour name without
 * coming through here, because there is no field on `PxlFinish` that is both
 * human-readable and unconditionally safe: `label` is an internal description,
 * `previewLabel` is unapproved by construction, and `id` is deliberately ugly.
 * That is §53's "do not bury hardcoded colour names inside components", made
 * structural.
 */
export function finishLabel(
  finish: PxlFinish,
  surface: PxlLabelSurface,
): string | null {
  if (surface === "public") {
    return finish.published && finish.approvedDisplayName
      ? finish.approvedDisplayName
      : null;
  }
  return finish.approvedDisplayName ?? finish.previewLabel;
}

/**
 * True when every finish in a range could be named on a public surface.
 *
 * The publication gate for the exterior category, in one expression. It is
 * `false` today and the report says why; when it becomes true, nothing in the
 * UI has to change to start printing names.
 */
export function rangeIsPubliclyNameable(range: readonly PxlFinish[]): boolean {
  return range.every((f) => finishLabel(f, "public") !== null);
}
