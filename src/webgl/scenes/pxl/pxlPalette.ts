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
  /**
   * Retro-reflective sheen, 0–1. Phase Four, and only for soft surfaces.
   *
   * §A9 asks that an interior "must not behave like painted metal", and the
   * failure that produces is specific: a `MeshPhysicalMaterial` at high
   * roughness with no sheen goes *flat*, so a dark upholstery loses its form
   * entirely and a light one turns into a paper cut-out. Sheen is three's own
   * cloth term — a wide, weak, grazing-angle lobe — and it is what puts the
   * edge back on a fold without putting a highlight on it.
   *
   * Undefined on every painted surface, which is the point: paint has a
   * clearcoat, cloth has a sheen, and no finish in this file has both.
   */
  sheen?: number;
  /** Tint of the sheen lobe. Defaults to the base colour, lifted. */
  sheenColour?: string;
  /**
   * Micro-normal strength, 0–1. Phase Four.
   *
   * The delivered GLB has no maps of any kind, so the only way a moulded liner
   * can read as anything other than a smooth shell is a procedural normal —
   * see `pxlSurfaces`. This is the amplitude the finish asks for; the texture
   * itself is shared by every interior zone and installed once, at load, so
   * changing this number at runtime is a scalar write and never a recompile.
   */
  microNormal?: number;
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

/* ── Interior ──────────────────────────────────────────────────────────────*/

/**
 * THE INTERIOR RANGE. Phase Four, §A7 — and provisional in a specific way.
 *
 * WHAT THESE ARE APPLIED TO. The source STL has no cushions. `deck_main` is one
 * mesh carrying the cockpit liner, the sole and the inner faces of the shell,
 * and that mesh is what takes these colours. §A6 is explicit that the model
 * map's limitations are to be respected rather than papered over, so this range
 * is named for what it is — the interior's colour — and never for a cushion
 * that does not exist. When upholstery geometry is delivered these same five
 * entries are what it will be offered in; nothing here has to be re-authored.
 *
 * WHERE THE VALUES COME FROM. Cognac is read off the delivered renders, where
 * the cockpit trim, the rails and the seat block are all one warm tan; §A7 asks
 * specifically that it be represented accurately, and it is the anchor the
 * other four are set against. The remaining four are plain premium-marine
 * neutrals — a bone, a sand, a graphite and a black. §A7's exclusions are
 * satisfied structurally rather than by taste: nothing here exceeds 0.55
 * chroma, so no neon, no racing colour and no saturated synthetic can be in
 * this table without somebody deliberately putting it there.
 *
 * HOW THEY ARE PARAMETERISED. §A9, in four numbers. `roughness` runs 0.76–0.88,
 * which is textile territory and nothing like the 0.24 of a sprayed topcoat;
 * `clearcoat` is zero on all five, because a clear coat over cloth is what makes
 * an interior look like painted metal; `sheen` supplies the grazing-angle lift
 * that stops the dark entries going flat; and `microNormal` gives the surface a
 * grain to catch it on.
 *
 * The two ends are the ones that fail first, and both are set deliberately
 * inside their limits: the black sits at #1d1f21 rather than at zero so that
 * shadowed folds still separate, and the light sits at #d5cfc3 rather than at
 * #f0ece4 so that a studio key does not clip it to white. Cognac is held at a
 * chroma below the rails' own cognac and a roughness well above them, which is
 * the difference between leather and the orange plastic §A9 warns about.
 */
export const PXL_INTERIOR_FINISHES: readonly PxlFinish[] = [
  {
    id: "pxl_interior_light",
    slug: "light",
    previewLabel: "Light",
    published: false,
    label: "Light bone",
    base: "#d5cfc3",
    roughness: 0.80,
    metalness: 0,
    clearcoat: 0,
    clearcoatRoughness: 0,
    sheen: 0.30,
    sheenColour: "#fbf7ee",
    microNormal: 0.55,
  },
  {
    id: "pxl_interior_sand",
    slug: "sand",
    previewLabel: "Sand",
    published: false,
    label: "Sand",
    base: "#b9a684",
    roughness: 0.82,
    metalness: 0,
    clearcoat: 0,
    clearcoatRoughness: 0,
    sheen: 0.32,
    sheenColour: "#efe3cd",
    microNormal: 0.6,
  },
  {
    id: "pxl_interior_cognac",
    slug: "cognac",
    previewLabel: "Cognac",
    published: false,
    label: "Cognac",
    // The interior of both delivered renders. Deeper and browner than the
    // cognac on the rails — the rails are a lacquered inlay catching the sky,
    // this is a matt surface a metre away from it, and reading the same hex off
    // both is what turns the trim into orange plastic.
    base: "#8a4d24",
    roughness: 0.78,
    metalness: 0,
    clearcoat: 0,
    clearcoatRoughness: 0,
    sheen: 0.34,
    sheenColour: "#c98a52",
    microNormal: 0.65,
    reference: "pxl-hero-side",
  },
  {
    id: "pxl_interior_graphite",
    slug: "graphite",
    previewLabel: "Graphite",
    published: false,
    label: "Graphite",
    base: "#3a3e41",
    roughness: 0.84,
    metalness: 0,
    clearcoat: 0,
    clearcoatRoughness: 0,
    sheen: 0.36,
    sheenColour: "#8d949a",
    microNormal: 0.7,
  },
  {
    id: "pxl_interior_black",
    slug: "black",
    previewLabel: "Black",
    published: false,
    label: "Black",
    // Never zero. §A9: dark upholstery must retain detail, and an albedo at or
    // near black is where that is lost for good — no light and no sheen can
    // recover a gradient from a surface that reflects nothing.
    base: "#1d1f21",
    roughness: 0.86,
    metalness: 0,
    clearcoat: 0,
    clearcoatRoughness: 0,
    sheen: 0.42,
    sheenColour: "#6e7377",
    microNormal: 0.78,
  },
] as const;

/**
 * The console, and the one honest secondary interior surface.
 *
 * §A6 asks for a secondary interior control "where technically possible", and
 * this is the whole of what is technically possible: `console_body` and
 * `console_trim` are genuinely separate meshes with their own materials, so
 * they can genuinely take their own finish. Nothing else in the cockpit can —
 * the liner, the sole and the inner shell are one mesh, and offering three
 * controls over them would be three names pointing at one material.
 *
 * Deliberately a SHORT list. The console is a hard surface beside a soft one,
 * so it takes a low sheen and a light clearcoat where the liner takes neither,
 * and three restrained darks is what the reference supports — every delivered
 * render shows the console as the darkest object in the boat.
 */
export const PXL_INTERIOR_SECONDARY_FINISHES: readonly PxlFinish[] = [
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
  {
    id: "pxl_console_black",
    slug: "console-black",
    previewLabel: "Black",
    published: false,
    label: "Black",
    base: "#15171a",
    roughness: 0.28,
    metalness: 0,
    clearcoat: 0.52,
    clearcoatRoughness: 0.11,
  },
  {
    id: "pxl_console_stone",
    slug: "console-stone",
    previewLabel: "Stone",
    published: false,
    label: "Stone grey",
    base: "#767068",
    roughness: 0.34,
    metalness: 0,
    clearcoat: 0.44,
    clearcoatRoughness: 0.15,
  },
] as const;

/**
 * BACKWARD-COMPATIBLE ALIASES.
 *
 * Phase Three's channel names were `flooring` and `console`; Phase Four's are
 * `interiorPrimary` and `interiorSecondary`, because the surfaces are what the
 * INTERIOR category configures and "flooring" describes a sole rather than an
 * interior. The old export names are kept pointing at the new ranges so that
 * nothing outside this module had to be renamed in the same commit as the
 * ranges themselves grew.
 */
export const PXL_FLOOR_FINISHES = PXL_INTERIOR_FINISHES;
export const PXL_CONSOLE_FINISHES = PXL_INTERIOR_SECONDARY_FINISHES;

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
  {
    id: "pxl_motor_graphite",
    slug: "motor-graphite",
    previewLabel: "Drive Graphite",
    published: false,
    label: "Drive graphite",
    // The electric proxy's cowling. §A17 asks for "clean, compact, technical"
    // and rules out every way a designer would normally signal *electric* —
    // no blue, no glow, no lightning. What is left is surface: a lighter,
    // slightly warmer grey than the combustion black, held at a lower
    // clearcoat so it reads as a matte technical shell rather than a
    // moulded engine cover.
    base: "#3c4044",
    roughness: 0.42,
    metalness: 0.08,
    clearcoat: 0.22,
    clearcoatRoughness: 0.24,
  },
] as const;

/**
 * The proxy outboards' machined parts — bracket, shaft, gearcase, propeller.
 *
 * One entry, and it is a metal rather than a paint: an outboard's leg is
 * anodised or painted alloy, and giving it the cowling's clearcoat makes the
 * whole engine read as one moulded lump. The metalness stays low for the same
 * reason the rails' does — §10's controlled environmental response — so the
 * leg picks up the studio as a soft band and never as a mirror.
 */
export const PXL_DRIVE_FINISHES: readonly PxlFinish[] = [
  {
    id: "pxl_drive_alloy",
    slug: "drive-alloy",
    previewLabel: "Drive Alloy",
    published: false,
    label: "Drive alloy",
    base: "#4a4e52",
    roughness: 0.48,
    metalness: 0.28,
    clearcoat: 0.12,
    clearcoatRoughness: 0.34,
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
  ...PXL_INTERIOR_FINISHES,
  ...PXL_INTERIOR_SECONDARY_FINISHES,
  ...PXL_METAL_FINISHES,
  ...PXL_MOTOR_FINISHES,
  ...PXL_DRIVE_FINISHES,
];

export const PXL_FINISHES = new Map(ALL.map((f) => [f.id, f]));

/**
 * THE SLUG NAMESPACE IS PER-RANGE FROM PHASE FOUR ON, AND THE FLAT MAP IS GONE.
 *
 * Phase Three had one range with slugs in it, so a global `slug → finish` map
 * was free and `slug` documented itself as globally unique. Phase Four adds an
 * interior range, and the honest names for its five entries are Light, Sand,
 * Cognac, Graphite and Black — two of which the hull range has already used.
 *
 * There were two ways out and only one of them is right. Prefixing
 * (`?interior=interior-black`) keeps a global namespace nobody reads and makes
 * every share link worse. Scoping accepts that a URL parameter already *names
 * its category* — `?exterior=black` and `?interior=black` are two unambiguous
 * statements — and puts the uniqueness requirement where it actually bites,
 * which is inside one option list.
 *
 * `finishBySlug` has always taken the range to search, precisely so that
 * `?exterior=motor-black` could not paint a hull. That was the scoped design;
 * this is the rest of it. `PXL_RANGES` below is what the tests assert
 * per-range uniqueness against, and a global map is not reintroduced because a
 * global lookup is exactly the mistake this prevents.
 */
export const PXL_RANGES: Readonly<Record<string, readonly PxlFinish[]>> = {
  hull: PXL_HULL_FINISHES,
  structure: PXL_STRUCTURE_FINISHES,
  accent: PXL_ACCENT_FINISHES,
  interior: PXL_INTERIOR_FINISHES,
  interiorSecondary: PXL_INTERIOR_SECONDARY_FINISHES,
  metal: PXL_METAL_FINISHES,
  motor: PXL_MOTOR_FINISHES,
  drive: PXL_DRIVE_FINISHES,
};

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
