/**
 * THE PXL PREVIEW CONFIGURATION CATALOGUE.
 *
 * ⚠️ EVERY OPTION IN THIS FILE IS PROVISIONAL. NONE OF IT IS APPROVED PRODUCT
 * INFORMATION, NONE OF IT IS ORDERABLE, AND NONE OF IT MAY BE PRICED.
 *
 * §A1 asks for one source of truth for provisional option data, structurally
 * isolated, clearly marked, and replaceable without rebuilding the UI. This is
 * that file, and the three requirements are met in three different ways:
 *
 *   • ISOLATED — it is the only module that declares what a customer may
 *     choose. `pxlConfig` owns the *shape* of a configuration and how it
 *     serialises; `pxlPalette` owns material numbers; `pxlPropulsion` owns
 *     geometry. None of them decides what appears in the interface. The
 *     configurator maps over what it finds here and renders it, so replacing
 *     this table with approved Duna data is a data change with no component
 *     edit behind it.
 *   • MARKED — `provisional: true` and `published: false` are on every option,
 *     `approvedLabel` is null on every option, and `PXL_CATALOGUE_IS_PROVISIONAL`
 *     is computed rather than asserted, so it cannot say "approved" until the
 *     data actually is. The publication rule in `pxlPalette.finishLabel` still
 *     governs what may be *printed*, and it still answers null for everything.
 *   • REPLACEABLE — the interface is generic over categories, controls and
 *     options. There is no component in the codebase that knows the word
 *     "cognac", "electric" or "dark lower".
 *
 * WHAT PROVISIONAL DOES NOT MEAN. It does not mean careless (§A1). Every value
 * below is either read off the delivered design renders, derived from the
 * measured GLB, or a plainly-descriptive neutral chosen inside stated limits.
 * Nothing here invents a commercial name, a power figure, a range, a speed, a
 * brand or a price — see `PXL_CATALOGUE_FORBIDDEN` at the foot of this file,
 * which is the list the tests assert against.
 *
 * ── STRUCTURE ──────────────────────────────────────────────────────────────
 *
 * CATEGORY → CONTROL → OPTION, and all three are data.
 *
 * A CATEGORY is a tab in the rail: EXTERIOR, HULL DETAIL, INTERIOR, PROPULSION.
 * A CONTROL is one row of choices inside it, and it owns a URL parameter.
 * An OPTION is one thing a person can pick.
 *
 * The middle level exists because INTERIOR is genuinely more than one decision
 * — a colour, a console, and a surface character — and flattening it would
 * force either three categories for one part of the boat or a category that
 * secretly renders three different things. §A2 asks that the category count be
 * data-driven, and it is: `PXL_CATEGORIES.length` is four because four entries
 * are declared with options in them, and EQUIPMENT is absent rather than
 * greyed out because it has none.
 */

import {
  PXL_HULL_FINISHES,
  PXL_INTERIOR_FINISHES,
  PXL_INTERIOR_SECONDARY_FINISHES,
  type PxlFinish,
  type PxlFinishId,
} from "./pxlPalette";
import type { PxlCustomerPresetId } from "./pxlPresets";

/* ── Identifiers ───────────────────────────────────────────────────────────*/

export type PxlCategoryId = "exterior" | "hull_detail" | "interior" | "propulsion";

/**
 * The configuration fields a control may write.
 *
 * A string union rather than a pair of closures on each control, because the
 * catalogue has to stay importable by a test that runs on plain node and free
 * of any opinion about how a configuration is stored. `pxlConfig` owns the
 * read/write table keyed on these, so the two halves can be checked against
 * each other — a field declared here with no accessor there is a compile error,
 * not a control that silently does nothing.
 */
export type PxlConfigField =
  | "exteriorFinish"
  | "lowerTreatment"
  | "interiorFinish"
  | "interiorSecondaryFinish"
  | "interiorSurface"
  | "propulsion";

/** The proxy drives `pxlPropulsion` can build. Geometry lives there, not here. */
export type PxlDriveVariant = "compact" | "standard" | "large" | "electric";

/** How the lower hull is treated. §A4. */
export type PxlLowerTreatment = "dark" | "body";

/** §A8's material character. Two, and only where it can be shown credibly. */
export type PxlInteriorSurface = "smooth" | "grained";

/* ── Swatches ──────────────────────────────────────────────────────────────*/

/**
 * WHAT THE CONTROL LOOKS LIKE, decided here rather than in the component.
 *
 * A colour category wants a colour chip; a treatment category wants to show the
 * treatment; a propulsion category wants to show *scale*, because scale is the
 * whole point of the choice (§A13). A single component renders all three from
 * this union, which is what stops the rail growing a branch per category.
 */
export type PxlOptionSwatch =
  /** A single finish. Exterior and interior. */
  | { kind: "colour"; value: string }
  /**
   * Two bands, split at the chine. HULL DETAIL, and the only honest way to
   * draw the choice: the difference between the options *is* whether the lower
   * band is its own colour, so a swatch that showed one colour would be a
   * swatch that showed nothing.
   *
   * `lower: null` means "whatever the exterior is", resolved by the UI against
   * the live configuration rather than baked here.
   */
  | { kind: "waterline"; upper: null; lower: string | null }
  /**
   * A proportional mark. PROPULSION.
   *
   * `magnitude` is the option's own cowling volume as a fraction of the
   * largest, so the control's marks stand in the same ratio to each other as
   * the objects they select. Derived from the authored dimensions in
   * `pxlPropulsion` at module load rather than typed in, so the control cannot
   * drift from the boat.
   */
  | { kind: "scale"; magnitude: number; electric: boolean };

/* ── The option ────────────────────────────────────────────────────────────*/

export interface PxlCatalogOption {
  /**
   * Internal key. Deliberately prefixed and deliberately unattractive, for the
   * same reason `PxlFinish.id` is: a value that escapes into a customer-facing
   * surface should be unmistakable rather than plausible.
   */
  id: string;
  category: PxlCategoryId;
  /** The URL token. Unique within its control, not globally — see `PXL_RANGES`. */
  slug: string;
  /** What a preview surface may print. Never a commercial name. */
  previewLabel: string;
  /**
   * What a PUBLIC surface may print. Null on every option in this file.
   *
   * Not "not filled in yet" — structurally null, because approving a name is a
   * commercial act nobody has performed. `finishLabel(f, "public")` answers
   * null for every finish behind these options for the same reason, so a public
   * surface built on this catalogue prints no names at all without anybody
   * having to remember to suppress them.
   */
  approvedLabel: string | null;
  /** Whether this option may be offered publicly. False on every option. */
  published: boolean;
  /** Whether this option is preview data awaiting approval. True on every option. */
  provisional: boolean;
  /** Display order within its control. Ascending. */
  sortOrder: number;
  swatch: PxlOptionSwatch;

  /* ── What selecting it does. At most one of these is set. ──────────────── */

  /** Material values, by reference into the palette. Colour options. */
  finishId?: PxlFinishId;
  /** HULL DETAIL: whether the bottom follows the topsides finish. */
  lowerTreatment?: PxlLowerTreatment;
  /** INTERIOR: the surface character this option asks the materials for. */
  interiorSurface?: PxlInteriorSurface;
  /** PROPULSION: which proxy drive `pxlPropulsion` builds. §A14. */
  geometryVariant?: PxlDriveVariant;

  /**
   * WHAT MAKES THIS PROVISIONAL, in one sentence.
   *
   * A development string. It is never rendered to a customer, it is printed on
   * the bench and quoted in the phase report, and it is the field that makes
   * replacing this catalogue a tractable job for whoever inherits it: each
   * entry says what specifically has to be confirmed before it can be
   * published, rather than leaving "all of it" as the answer.
   */
  note: string;
}

/* ── The control ───────────────────────────────────────────────────────────*/

export interface PxlCatalogControl {
  id: string;
  /**
   * URL parameter. §A21 asks for clean, short, deterministic keys, and these
   * are the four it names plus two the INTERIOR category needs.
   *
   * Reserved as soon as it is written down. Renaming one breaks links that
   * have already been sent, so a key here is as permanent as a finish's slug.
   */
  param: string;
  /** Which field of the configuration this control writes. */
  field: PxlConfigField;
  /** Interface vocabulary. Localised through `pxlStrings` by key, not printed raw. */
  labelKey: string;
  options: readonly PxlCatalogOption[];
  /** The delivered boat's value for this control. §A22's single reset target. */
  defaultOptionId: string;
}

export interface PxlCatalogCategory {
  id: PxlCategoryId;
  sortOrder: number;
  /**
   * The composition to offer the FIRST time this category is opened. §A19, §A26.
   *
   * A suggestion, not an instruction: the configurator moves the camera once,
   * on first entry, and never again — after that the viewer's own viewpoint is
   * theirs. Authored here rather than in the component because "which shot
   * shows this decision" is a fact about the decision.
   */
  /* Customer-facing by construction. A category cannot suggest a reference
     composition, because a reference composition is framed for measurement
     rather than for looking at — §31. */
  suggestedView: PxlCustomerPresetId;
  controls: readonly PxlCatalogControl[];
}

/* ── Exterior ──────────────────────────────────────────────────────────────*/

/**
 * §A3: KEEP THE EXISTING EXTERIOR SYSTEM. The six finishes, their semantic
 * materials, the sweep, the URL tokens and the absence of a geometry reload are
 * all Phase Three's and none of them is touched — this wraps them.
 *
 * Derived from `PXL_HULL_FINISHES` rather than retyped, so the ranges cannot
 * diverge and a seventh study appears in the configurator by being added to the
 * palette. The slugs are the palette's own, which is what keeps every link
 * shared during Phase Three working unchanged.
 */
const EXTERIOR_OPTIONS: readonly PxlCatalogOption[] = PXL_HULL_FINISHES.map(
  (finish: PxlFinish, index: number): PxlCatalogOption => ({
    id: finish.id,
    category: "exterior",
    slug: finish.slug,
    previewLabel: finish.previewLabel,
    approvedLabel: finish.approvedDisplayName ?? null,
    published: finish.published,
    provisional: true,
    sortOrder: index,
    swatch: { kind: "colour", value: finish.base },
    finishId: finish.id,
    note:
      "one of the six hull colour studies delivered with the design; a study is " +
      "not a range, and the yard has confirmed neither the colour nor a name for it",
  }),
);

/* ── Hull detail ───────────────────────────────────────────────────────────*/

/**
 * §A4 — THE DARK LOWER HULL, AS A TREATMENT RATHER THAN AS GEOMETRY.
 *
 * Every delivered render shows the PXL with a black moulding below the chine.
 * The question §A4 asks is whether that is structural or a paint decision, and
 * the answer this implements is: a paint decision on the bottom moulding, and
 * structural everywhere else.
 *
 * WHAT MOVES AND WHAT DOES NOT. `hull_lower` (role HULL_BOTTOM) is the only
 * zone this changes. It is 7,187 triangles of bottom running the full length
 * below the chine, and painting it in the topsides finish is exactly what a
 * full-body hull is. The gunwale capping stays black because it is a capping,
 * and the stern moulding stays black because it is a separate moulding that
 * carries the PXL mark — repainting it would take the mark's own ground away
 * and turn a paint option into a branding change. That is why Phase Four split
 * `sternMoulding` off the `hullLower` channel; see `pxlModel`.
 *
 * NOTHING IS HIDDEN. §A4 is explicit, and it is worth restating in the data:
 * both options draw every triangle the boat has. `meshVisibility` is not set on
 * either, and the difference between them is one material's colour.
 */
const HULL_DETAIL_OPTIONS: readonly PxlCatalogOption[] = [
  {
    id: "pxl_lower_dark",
    category: "hull_detail",
    slug: "dark",
    previewLabel: "Dark Lower",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 0,
    swatch: { kind: "waterline", upper: null, lower: "#101215" },
    lowerTreatment: "dark",
    note:
      "the treatment shown in all six delivered colour studies; whether it is " +
      "an option at all or simply how the boat is built has not been confirmed",
  },
  {
    id: "pxl_lower_body",
    category: "hull_detail",
    slug: "body",
    previewLabel: "Full Body Colour",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 1,
    swatch: { kind: "waterline", upper: null, lower: null },
    lowerTreatment: "body",
    note:
      "not shown in any delivered render — a plausible finish option the yard " +
      "has neither offered nor ruled out, and the one entry here that is a " +
      "genuine proposal rather than a transcription",
  },
];

/* ── Interior ──────────────────────────────────────────────────────────────*/

/**
 * §A6 — AND THE LIMIT IT ASKS TO BE RESPECTED.
 *
 * The source STL has no cushions. The cockpit is a bare moulded liner, and
 * `deck_main` is one mesh carrying that liner, the sole and the inner faces of
 * the shell together. So this category does not offer upholstery, does not use
 * the word, and does not split one mesh into three imaginary controls: it
 * offers the interior's PRIMARY surface (the liner), its SECONDARY surface (the
 * console, which is genuinely a separate mesh with a separate material), and a
 * surface character.
 *
 * That is the honest maximum. When cushion geometry is delivered it becomes a
 * third control on this category and the range it is offered in is already
 * here.
 */
const INTERIOR_OPTIONS: readonly PxlCatalogOption[] = PXL_INTERIOR_FINISHES.map(
  (finish, index): PxlCatalogOption => ({
    id: finish.id,
    category: "interior",
    slug: finish.slug,
    previewLabel: finish.previewLabel,
    approvedLabel: finish.approvedDisplayName ?? null,
    published: false,
    provisional: true,
    sortOrder: index,
    swatch: { kind: "colour", value: finish.base },
    finishId: finish.id,
    note:
      finish.slug === "cognac"
        ? "read off the delivered renders, which show a warm tan interior; the " +
          "colour is observed, the range it belongs to is not"
        : "a neutral premium-marine interior tone proposed for preview; no " +
          "interior range has been supplied by the yard",
  }),
);

const INTERIOR_SECONDARY_OPTIONS: readonly PxlCatalogOption[] =
  PXL_INTERIOR_SECONDARY_FINISHES.map(
    (finish, index): PxlCatalogOption => ({
      id: finish.id,
      category: "interior",
      slug: finish.slug,
      previewLabel: finish.previewLabel,
      approvedLabel: finish.approvedDisplayName ?? null,
      published: false,
      provisional: true,
      sortOrder: index,
      swatch: { kind: "colour", value: finish.base },
      finishId: finish.id,
      note:
        "the console in the asset is the STL revision, not the glazed tower the " +
        "colour studies show; the finish is offered, the part it is offered on " +
        "is superseded — see PXL_CONSOLE_REVISION",
    }),
  );

/**
 * §A8 — MATERIAL CHARACTER, AND WHY THERE ARE TWO OF THESE AND NOT SIX.
 *
 * §A8 permits a second dimension beyond colour *only* where it can be achieved
 * credibly through roughness, normal detail and material parameters, and says
 * to keep colour alone rather than pretend two different physical products
 * exist. Both halves of that are honoured here.
 *
 * What is credible: the same moulded surface, finished two ways. SMOOTH is the
 * liner as it comes out of the mould — tighter, slightly glossier, a wider
 * highlight. GRAINED is the same liner with a textured finish on it — rougher,
 * and carrying more of the procedural micro-normal every interior zone already
 * has installed. Both are things a boatbuilder does to one part.
 *
 * What is not, and is therefore absent: leather versus fabric, woven versus
 * quilted, or anything else that would be two different products. There is no
 * geometry to carry stitching, no map to carry a weave, and inventing the
 * difference in a roughness slider would be exactly the misleading option count
 * §A8 rules out.
 */
const INTERIOR_SURFACE_OPTIONS: readonly PxlCatalogOption[] = [
  {
    id: "pxl_surface_smooth",
    category: "interior",
    slug: "smooth",
    previewLabel: "Smooth",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 0,
    swatch: { kind: "colour", value: "#8d9095" },
    interiorSurface: "smooth",
    note:
      "a finish character applied to the same moulding, not a second material; " +
      "no interior specification has been supplied",
  },
  {
    id: "pxl_surface_grained",
    category: "interior",
    slug: "grained",
    previewLabel: "Grained",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 1,
    swatch: { kind: "colour", value: "#6f7378" },
    interiorSurface: "grained",
    note:
      "a finish character applied to the same moulding, not a second material; " +
      "no interior specification has been supplied",
  },
];

/* ── Propulsion ────────────────────────────────────────────────────────────*/

/**
 * THE FOUR DRIVES, AS DIMENSIONS.
 *
 * Authored here — in the pure catalogue — rather than in `pxlPropulsion`, which
 * builds the geometry and therefore imports three and cannot be reached by the
 * test harness. The split is the same one `pxlPresets` and `pxlCamera` already
 * use, and it buys the same thing: the proportions are the part worth
 * asserting, and they can be asserted on plain node.
 *
 * §A15 — WHY THESE ARE NOT ONE OBJECT AT THREE SCALES. Read down the columns
 * rather than across the rows. From compact to large the cowling gains 65% in
 * length but only 44% in width; the shaft lengthens by 190 mm while the
 * gearcase lengthens by 90; the propeller grows by a third while the
 * anti-ventilation plate barely moves. Those are the ratios real outboards
 * change by, and they are the reason a large drive reads as a bigger *engine*
 * rather than as a nearer one. A uniform 0.7 / 1.0 / 1.3 would have produced
 * three propellers of obviously silly diameter and a compact drive whose shaft
 * did not reach the water.
 *
 * §A16 — WHY THE SHAFTS ARE NOT ALL THE SAME LENGTH EITHER. Every drive has to
 * put its anti-ventilation plate at roughly the same depth relative to the
 * hull, because that is a hydrodynamic fact rather than a size. `shaft` is
 * therefore tuned per drive against the measured transom height so that all
 * four sit correctly: see `PXL_MOUNTS.transom` and the clearance assertions in
 * the configurator tests.
 *
 * Metres throughout, in the model's own frame.
 */
export interface PxlDriveSpec {
  id: PxlDriveVariant;
  /** Cowling: length (fore-aft), height, width. The visible mass. */
  cowl: { length: number; height: number; width: number };
  /** Midsection: how far the leg drops from the cowling's underside. */
  shaft: number;
  /** Leg width, and the gearcase's own length and depth. */
  leg: { width: number; caseLength: number; caseDepth: number };
  /** Propeller diameter. */
  propeller: number;
  /** Anti-ventilation plate: length and width. */
  plate: { length: number; width: number };
  /** Bracket: how far the clamp stands proud of the transom. */
  bracket: number;
  /** Which palette finish the cowling takes. */
  cowlFinishId: PxlFinishId;
  /**
   * Cowling corner radius as a fraction of the smaller face dimension.
   *
   * §A17's whole visual argument, in one number. The combustion drives are
   * moulded covers with generous radii; the electric drive is a machined
   * technical shell and takes a much tighter one. It is the difference between
   * the two families that does not depend on adding a single glowing thing.
   */
  radius: number;
}

export const PXL_DRIVE_SPECS: Readonly<Record<PxlDriveVariant, PxlDriveSpec>> = {
  compact: {
    id: "compact",
    cowl: { length: 0.34, height: 0.40, width: 0.325 },
    shaft: 0.60,
    leg: { width: 0.115, caseLength: 0.40, caseDepth: 0.125 },
    propeller: 0.235,
    plate: { length: 0.30, width: 0.195 },
    bracket: 0.10,
    cowlFinishId: "pxl_motor_black",
    radius: 0.30,
  },
  standard: {
    id: "standard",
    // The proportions of the outboard in the delivered STL, which measures
    // 0.559 × 0.322 over cowling and leg together. Matching it is what keeps
    // STANDARD honest as the middle of the range rather than as a guess.
    cowl: { length: 0.45, height: 0.50, width: 0.382 },
    shaft: 0.68,
    leg: { width: 0.135, caseLength: 0.455, caseDepth: 0.145 },
    propeller: 0.28,
    plate: { length: 0.345, width: 0.225 },
    bracket: 0.115,
    cowlFinishId: "pxl_motor_black",
    radius: 0.28,
  },
  large: {
    id: "large",
    cowl: { length: 0.58, height: 0.615, width: 0.435 },
    shaft: 0.73,
    leg: { width: 0.16, caseLength: 0.49, caseDepth: 0.17 },
    propeller: 0.325,
    plate: { length: 0.385, width: 0.26 },
    bracket: 0.135,
    cowlFinishId: "pxl_motor_black",
    radius: 0.26,
  },
  electric: {
    id: "electric",
    // §A17: reduced visual bulk, not a smaller version of the same thing. The
    // cowling is the narrowest and the *tallest relative to its width* of the
    // four, which is what a drive with no engine block under the cover looks
    // like — the mass is in the leg and the pod, not on the transom.
    cowl: { length: 0.285, height: 0.365, width: 0.245 },
    shaft: 0.70,
    leg: { width: 0.10, caseLength: 0.44, caseDepth: 0.135 },
    propeller: 0.30,
    plate: { length: 0.275, width: 0.17 },
    bracket: 0.095,
    cowlFinishId: "pxl_motor_graphite",
    radius: 0.10,
  },
};

/** Cowling volume, as a fraction of the largest. Drives the control's marks. */
function driveMagnitude(variant: PxlDriveVariant): number {
  const volume = (spec: PxlDriveSpec) =>
    spec.cowl.length * spec.cowl.height * spec.cowl.width;
  const largest = Math.max(
    ...Object.values(PXL_DRIVE_SPECS).map(volume),
  );
  return Number((volume(PXL_DRIVE_SPECS[variant]) / largest).toFixed(3));
}

/**
 * §A13 — FOUR DRIVES, AND EVERY NUMBER THAT WOULD MAKE THEM PRODUCTS OMITTED.
 *
 * §A13 is unusually specific about what must NOT be here, and the list is worth
 * repeating because it is the whole of the risk: no horsepower, no kW, no
 * range, no speed, no brand, no model number, no price. None of those appears
 * in this file, in `pxlStrings`, in the summary, in the request payload or in
 * any component — `PXL_CATALOGUE_FORBIDDEN` is the machine-checked version of
 * that sentence and the configurator tests assert it against every string this
 * catalogue can produce.
 *
 * WHAT THEY DO COMMUNICATE is physical scale, because that is what §A13 says
 * the preview must communicate and it is the one thing about an outboard that
 * can be shown honestly without knowing which outboard it is. The three
 * combustion drives are authored at different proportions rather than scaled
 * from one master (§A15), and the electric drive is a different object rather
 * than a smaller one (§A17). The geometry is in `pxlPropulsion`; this table
 * only names it.
 */
const PROPULSION_OPTIONS: readonly PxlCatalogOption[] = [
  {
    id: "pxl_drive_compact",
    category: "propulsion",
    slug: "compact",
    previewLabel: "Combustion — Compact",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 0,
    swatch: { kind: "scale", magnitude: driveMagnitude("compact"), electric: false },
    geometryVariant: "compact",
    note:
      "a neutral proxy showing a small outboard's proportions; it is not any " +
      "manufacturer's engine and carries no output figure",
  },
  {
    id: "pxl_drive_standard",
    category: "propulsion",
    slug: "standard",
    previewLabel: "Combustion — Standard",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 1,
    swatch: { kind: "scale", magnitude: driveMagnitude("standard"), electric: false },
    geometryVariant: "standard",
    note:
      "a neutral proxy at the proportions of the outboard in the source model; " +
      "that engine is itself unidentified, so nothing is claimed about it",
  },
  {
    id: "pxl_drive_large",
    category: "propulsion",
    slug: "large",
    previewLabel: "Combustion — Large",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 2,
    swatch: { kind: "scale", magnitude: driveMagnitude("large"), electric: false },
    geometryVariant: "large",
    note:
      "a neutral proxy showing a large outboard's proportions; whether the " +
      "transom is rated for one has not been confirmed by the yard",
  },
  {
    id: "pxl_drive_electric",
    category: "propulsion",
    slug: "electric",
    previewLabel: "Electric",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 3,
    swatch: { kind: "scale", magnitude: driveMagnitude("electric"), electric: true },
    geometryVariant: "electric",
    note:
      "a neutral electric-drive proxy; Duna builds electric boats, but no " +
      "electric drive has been specified for the PXL and none is depicted here",
  },
];

/* ── The categories ────────────────────────────────────────────────────────*/

/**
 * §A2's category structure, and §A2's warning about numbering.
 *
 * Four categories, because four have options. EQUIPMENT is declared in
 * `PXL_DEFERRED_CATEGORIES` below rather than here, so the interface cannot
 * render a fifth tab, cannot count to five, and cannot print "05" beside
 * anything. §A2: "Do not call them 01/05 if only four exist" — the index a
 * category shows is its position in *this* array, which is a fact about what
 * exists rather than about what was hoped for.
 */
export const PXL_CATEGORIES: readonly PxlCatalogCategory[] = [
  {
    id: "exterior",
    sortOrder: 0,
    // §A26: the strong side / three-quarter view. This is the shot the boat is
    // known by and the one a paint decision is actually made in.
    suggestedView: "hero_3q",
    controls: [
      {
        id: "exterior",
        param: "exterior",
        field: "exteriorFinish",
        labelKey: "exteriorFinish",
        options: EXTERIOR_OPTIONS,
        defaultOptionId: "pxl_sage",
      },
    ],
  },
  {
    id: "hull_detail",
    sortOrder: 1,
    // §A26: lower-side profile. The chine is the subject, so the camera drops
    // to near the waterline and goes abeam — from any higher angle the bottom
    // is a sliver and the decision cannot be seen.
    suggestedView: "side",
    controls: [
      {
        id: "lower",
        param: "lower",
        field: "lowerTreatment",
        labelKey: "lowerTreatment",
        options: HULL_DETAIL_OPTIONS,
        defaultOptionId: "pxl_lower_dark",
      },
    ],
  },
  {
    id: "interior",
    sortOrder: 2,
    // §A26: higher cockpit view, looking down into the boat. The only preset
    // that shows the liner, the sole and the console together.
    suggestedView: "interior",
    controls: [
      {
        id: "interior",
        param: "interior",
        field: "interiorFinish",
        labelKey: "interiorPrimary",
        options: INTERIOR_OPTIONS,
        defaultOptionId: "pxl_interior_cognac",
      },
      {
        id: "console",
        param: "console",
        field: "interiorSecondaryFinish",
        labelKey: "interiorSecondary",
        options: INTERIOR_SECONDARY_OPTIONS,
        defaultOptionId: "pxl_console_graphite",
      },
      {
        id: "surface",
        param: "surface",
        field: "interiorSurface",
        labelKey: "interiorSurface",
        options: INTERIOR_SURFACE_OPTIONS,
        defaultOptionId: "pxl_surface_grained",
      },
    ],
  },
  {
    id: "propulsion",
    sortOrder: 3,
    // §A19, §A26: stern three-quarter. Aft and slightly high, which is where
    // the difference between a compact drive and a large one is legible.
    suggestedView: "stern_3q",
    controls: [
      {
        id: "propulsion",
        param: "propulsion",
        field: "propulsion",
        labelKey: "propulsion",
        options: PROPULSION_OPTIONS,
        defaultOptionId: "pxl_drive_standard",
      },
    ],
  },
];

/**
 * CATEGORIES THAT ARE NOT OFFERED, AND WHY.
 *
 * §A2 names EQUIPMENT as a potential future category and says not to show it
 * unless actual options exist. It does not, so it is here rather than above,
 * and the difference is not cosmetic: nothing in the interface iterates this
 * array, so an entry in it cannot become a tab, a count, or a disabled control
 * by accident. It exists so the reason lives beside the category and so the URL
 * parameter is reserved before somebody picks a different one.
 */
export const PXL_DEFERRED_CATEGORIES: ReadonlyArray<{
  id: string;
  param: string;
  unavailable: string;
}> = [
  {
    id: "equipment",
    param: "equipment",
    unavailable:
      "no equipment range supplied; the only optional mesh in the asset is an " +
      "undocumented flush cockpit cover, and one undocumented cover is not a category",
  },
  {
    id: "accessories",
    param: "accessories",
    unavailable: "no accessory range supplied",
  },
];

/* ── Derived lookups ───────────────────────────────────────────────────────*/

export const PXL_CONTROLS: readonly PxlCatalogControl[] = PXL_CATEGORIES.flatMap(
  (category) => category.controls,
);

export const PXL_CONTROL_BY_PARAM = new Map(PXL_CONTROLS.map((c) => [c.param, c]));
export const PXL_CONTROL_BY_FIELD = new Map(PXL_CONTROLS.map((c) => [c.field, c]));
export const PXL_CATEGORY_BY_ID = new Map(PXL_CATEGORIES.map((c) => [c.id, c]));

export const PXL_CATALOGUE_OPTIONS: readonly PxlCatalogOption[] = PXL_CONTROLS.flatMap(
  (control) => control.options,
);

export const PXL_OPTION_BY_ID = new Map(PXL_CATALOGUE_OPTIONS.map((o) => [o.id, o]));

/** An option within one control. Scoped, for the reason `finishBySlug` is. */
export function optionBySlug(
  control: PxlCatalogControl,
  slug: string | null | undefined,
): PxlCatalogOption | null {
  if (!slug) return null;
  return control.options.find((o) => o.slug === slug) ?? null;
}

/** The control's delivered option. Throws at module scope if a default is wrong. */
export function defaultOption(control: PxlCatalogControl): PxlCatalogOption {
  const found = control.options.find((o) => o.id === control.defaultOptionId);
  if (!found) {
    throw new Error(
      `PXL catalogue: control "${control.id}" defaults to "${control.defaultOptionId}", ` +
        `which is not one of its options`,
    );
  }
  return found;
}

/* ── The provisional guarantee ─────────────────────────────────────────────*/

/**
 * TRUE WHILE ANY OPTION IS UNAPPROVED. Computed, never asserted.
 *
 * §A1 asks that provisional data be clearly marked and never presented as
 * approved public technical information. A boolean somebody has to remember to
 * flip is not a mark, it is an intention — so this is derived from the data
 * itself and becomes false only when every option in the catalogue is genuinely
 * published with an approved name. The preview surfaces read it to decide
 * whether to print the provisional marker; nothing has to be edited on the day
 * it changes.
 */
export const PXL_CATALOGUE_IS_PROVISIONAL: boolean = PXL_CATALOGUE_OPTIONS.some(
  (o) => o.provisional || !o.published || o.approvedLabel === null,
);

/**
 * VOCABULARY THIS CATALOGUE MAY NEVER CONTAIN.
 *
 * §A13 and §B36 both end on the same instruction — no fake horsepower, no fake
 * price, no fake performance figures, no fake branded engine models — and the
 * way that instruction gets broken is never deliberate. It is broken by
 * somebody adding "Electric — 12 kW" to a preview label six months from now
 * because it makes the option list read better.
 *
 * So it is a test rather than a rule. The configurator suite runs every
 * catalogue string a customer could ever see against this list and fails the
 * build on a match. A term that has to be used because it has genuinely been
 * approved is removed from here in the same commit that approves it, which puts
 * the decision in front of a reviewer.
 */
export const PXL_CATALOGUE_FORBIDDEN: readonly RegExp[] = [
  /\bhp\b/i,
  /\bhorsepower\b/i,
  /\bkw\b/i,
  /\bkilowatt/i,
  /\bnm\b/i,
  /\bknots?\b/i,
  /\bkm\/h\b/i,
  /\bmph\b/i,
  /\brange\b/i,
  /\b\d+\s*(hp|kw|kn|km|nm|mph)\b/i,
  /[€$£]\s*\d/,
  /\bprice\b/i,
  /\bsuzuki\b/i,
  /\byamaha\b/i,
  /\bmercury\b/i,
  /\bhonda\b/i,
  /\btohatsu\b/i,
  /\bevinrude\b/i,
  /\btorqeedo\b/i,
];

/** Every customer-visible string this catalogue can produce. What the test scans. */
export function catalogueVisibleStrings(): string[] {
  return PXL_CATALOGUE_OPTIONS.flatMap((o) =>
    [o.previewLabel, o.approvedLabel].filter((s): s is string => typeof s === "string"),
  );
}
