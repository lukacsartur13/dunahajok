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
  PXL_GLAZING_FINISHES,
  PXL_HULL_FINISHES,
  PXL_SPEAKER_LIGHT_FINISHES,
  PXL_INTERIOR_FINISHES,
  PXL_INTERIOR_SECONDARY_FINISHES,
  type PxlFinish,
  type PxlFinishId,
} from "./pxlPalette";
import type { PxlCustomerPresetId } from "./pxlPresets";
import { PXL_MOUNTS, type PxlZone } from "./pxlModel";

/* ── Identifiers ───────────────────────────────────────────────────────────*/

export type PxlCategoryId =
  | "exterior"
  | "hull_detail"
  | "interior"
  | "propulsion"
  /**
   * PHASE 4.4 §25 — EQUIPMENT, WHICH IS NOW A CATEGORY BECAUSE IT NOW HAS AN
   * OPTION.
   *
   * Phase Four deferred it and gave a reason that was checkable rather than
   * vague: "no equipment range supplied; the only optional mesh in the asset is
   * an undocumented flush cockpit cover, and one undocumented cover is not a
   * category". §25 is explicit that the deferral ends when a real configurable
   * geometry option exists and NOT before — "do not add artificial additional
   * equipment just to fill it. If the only equipment option is AFT BOARDING
   * PLATFORM, that is acceptable."
   *
   * It is the only one. The cockpit cover stays undocumented and stays out.
   */
  | "equipment";

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
  /** PHASE 4.9. How the grab rails are finished — see `PxlRailTreatment`. */
  | "railTreatment"
  /** PHASE 4.9. How dark the console plexi is. A finish, so it needs no type. */
  | "glazingTint"
  /** PHASE 4.9. Whether the cockpit speakers are fitted. */
  | "audio"
  /** PHASE 4.9. Whether the cool box forward of the console is fitted. */
  | "coolBox"
  /** PHASE 4.9. Whether their rings are lit. A finish, so it needs no type. */
  | "speakerLight"
  /** PHASE 4.10. Whether the bimini over the helm is fitted. */
  | "bimini"
  | "propulsion"
  /** PHASE 4.4 §24, §26. Whether the aft boarding platform is fitted. */
  | "boardingPlatform";

/** The proxy drives `pxlPropulsion` can build. Geometry lives there, not here. */
export type PxlDriveVariant = "compact" | "standard" | "large" | "electric";

/** How the lower hull is treated. §A4. */
export type PxlLowerTreatment = "dark" | "body";

/**
 * How the grab rails are finished. NEW IN 4.9, at the client's instruction.
 *
 * NOT A COLOUR LIST, AND THAT IS THE WHOLE DESIGN. The rails were asked to
 * "match the interior finishes", which is a relationship rather than a set of
 * swatches: whatever leather the cockpit is trimmed in, the rails follow it,
 * and they keep following it when the interior changes. A parallel list of rail
 * colours would have gone stale the first time the interior gained one, and it
 * would have let somebody configure cognac rails on a graphite interior — a
 * combination nobody chose, assembled out of two controls that did not know
 * about each other.
 *
 * `black` is the one exception the relationship needs, because a dark rail on a
 * pale interior is a real specification rather than a mismatch.
 *
 * It reaches the rails through the `railings` channel and not through
 * `interiorPrimary` — see `pxlModel`. §15's list of surfaces the interior
 * colour must not touch names the rails explicitly, and that list is a fact
 * about the CHANNEL. Keeping the rails on their own channel means the rule
 * still holds by construction, the tests that assert it keep passing unchanged,
 * and the day somebody wants rails that do not follow the leather it is one
 * resolver line rather than an unpicking.
 */
export type PxlRailTreatment = "interior" | "black";

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
  | { kind: "scale"; magnitude: number; electric: boolean }
  /**
   * WHATEVER ANOTHER CONTROL IS SET TO. §4.9, for MATCH INTERIOR on the rails.
   *
   * Drawn in a colour the UI resolves against the live configuration, because
   * the option genuinely has no colour of its own — that is the whole meaning
   * of it. A fixed cognac chip would be a swatch that lies the moment somebody
   * chooses a graphite interior, which is the same failure `waterline` exists
   * to avoid one control along.
   */
  | { kind: "follows" };

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
  /** INTERIOR: whether the grab rails follow the leather or go black. §4.9. */
  railTreatment?: PxlRailTreatment;
  /** PROPULSION: which proxy drive `pxlPropulsion` builds. §A14. */
  geometryVariant?: PxlDriveVariant;
  /**
   * EQUIPMENT: which meshes this option shows or hides. §24.
   *
   * A ZONE MAP RATHER THAN A BOOLEAN, because that is what an equipment option
   * physically IS — a set of parts that are either on the boat or not — and
   * because the registry it writes into (`PxlConfiguration.equipment`) has been
   * keyed on zones since Phase Four in anticipation of exactly this. The option
   * names the meshes; nothing in the component layer knows the words "platform"
   * or "teak".
   */
  meshVisibility?: Readonly<Partial<Record<PxlZone, boolean>>>;

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
        "drives the console's aft panel only — the dark shell around it and the " +
        "screen surround are structural black in every reference and take no " +
        "finish; the console itself is a Phase 4.3 reconstruction measured from " +
        "the plates, not a delivered part — see PXL_CONSOLE_REVISION",
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

/**
 * THE GRAB RAILS. §4.9.
 *
 * Two options, and the swatch tells the difference honestly: MATCH INTERIOR has
 * no colour of its own to show, so it is drawn as the interior's own — the UI
 * resolves `lower: null` against the live configuration, the same mechanism
 * HULL DETAIL already uses for FULL BODY COLOUR. A fixed cognac chip would have
 * been a lie the moment somebody chose a graphite interior.
 */
const RAIL_OPTIONS: readonly PxlCatalogOption[] = [
  {
    id: "pxl_rails_interior",
    category: "interior",
    slug: "interior",
    previewLabel: "Match interior",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 0,
    swatch: { kind: "follows" },
    railTreatment: "interior",
    note:
      "a relationship rather than a colour: the rails follow the interior " +
      "primary finish, which is itself provisional",
  },
  {
    id: "pxl_rails_black",
    category: "interior",
    slug: "black",
    previewLabel: "Satin black",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 1,
    swatch: { kind: "colour", value: "#17191c" },
    railTreatment: "black",
    note:
      "the structural black already on the boat, applied to the rails; no " +
      "hardware specification has been supplied",
  },
];

/**
 * THE CONSOLE PLEXI, IN THREE DEPTHS. §4.9, at the client's instruction.
 *
 * Ordinary finish options, because that is what they are: `PXL_GLAZING_FINISHES`
 * carries three plexi entries and each of these selects one. What makes the
 * screen special lives in the palette, not here — see the note on
 * `PxlFinish.transmission` for why a tinted screen is not a coloured one.
 *
 * The swatches are the ATTENUATION colours rather than the finishes' own base,
 * which is white on all three. A row of three white chips would be honest about
 * the albedo and useless about the choice.
 */
const GLAZING_OPTIONS: readonly PxlCatalogOption[] = PXL_GLAZING_FINISHES.map(
  (glass: PxlFinish, index: number): PxlCatalogOption => ({
    id: `pxl_glazing_${glass.slug.replace("plexi-", "")}`,
    category: "interior" as const,
    slug: glass.slug.replace("plexi-", ""),
    previewLabel: glass.previewLabel,
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: index,
    swatch: { kind: "colour" as const, value: glass.attenuation ?? "#ffffff" },
    finishId: glass.id,
    note:
      "a tint depth on one sheet of cast acrylic; no glazing specification " +
      "has been supplied and the section is the authored 9 mm",
  }),
);

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
  /**
   * PHASE 4.4 §14–§18 — WHERE THE COWLING'S **TOP** SITS, above `PXL_MOUNTS
   * .transom.y`. THE DATUM CHANGED, AND THAT IS THE WHOLE CORRECTION.
   *
   * Until this phase the cowling's UNDERSIDE stood on the transom top, so a
   * standard drive put its powerhead at y 1.128 against a sheer of 0.703 at
   * the transom — 425 mm of engine towering over the gunwale. §14: "the
   * current propulsion proxy is visibly positioned too high compared with the
   * delivered stern three-quarter."
   *
   * MEASURED OFF THAT REFERENCE. `scripts/pxl/_grid.mjs` over the stern
   * three-quarter, with the transom's own visible height as the scale — top of
   * the moulding at plate row 990, its foot at 1150, so 160 px spans the
   * model's 0.832 m and the view runs at 192 px/m:
   *
   *     top of the transom moulding      row  990   datum
   *     top of the motor cowling         row  985   26 mm ABOVE it
   *     bottom of the motor cowling      row 1110   625 mm below it
   *     cowling height                   125 px  =  651 mm
   *
   * The cowling top is level with the transom, not 425 mm over it. And the
   * 651 mm height identifies the drawn engine as the LARGE one (0.615 m), which
   * is why `large` carries the rise the measurement gives and the other three
   * are spread either side of it: a bigger engine is trimmed a hole or two
   * higher on a real bracket, and §18 asks explicitly that one global transform
   * NOT be applied blindly to four different objects.
   */
  mountRise: number;
  /**
   * Midsection: how far the anti-ventilation plate sits below the COWLING'S
   * OWN UNDERSIDE.
   *
   * PHASE 4.4 — it used to be measured from the transom top, which made it a
   * second expression of the mounting height rather than a dimension of the
   * engine. Now that the cowling hangs from its top, the two are independent:
   * `mountRise` says where the powerhead is and `shaft` says how long the leg
   * under it is, so re-tuning either cannot silently move the other.
   */
  shaft: number;
  /** Leg width, and the gearcase's own length and depth. */
  leg: { width: number; caseLength: number; caseDepth: number };
  /** Propeller diameter. */
  propeller: number;
  /**
   * Anti-ventilation plate: length and width.
   *
   * PHASE 4.6 §6, second iteration — each grew about 15%. The first build of
   * the deeper leg put a 0.345 m plate under a 0.455 m gearcase and the crop at
   * `.qa/p46-motor-crop.png` showed why that is not enough: against a leg three
   * times longer than it used to be, the plate read as a ledge rather than as
   * the "ANTI-VENTILATION REGION" §6 asks be visually distinguishable. It is the
   * drive's most recognisable feature after the cowling and it has to hold its
   * own against the new proportions.
   *
   * Bounded by the platform, not by taste: `platformClearance` requires every
   * part inside the tread's height band to fit ±0.280 m at the well's narrowest,
   * and the largest plate here is 0.150 m half-width. The configurator suite
   * asserts it rather than this comment.
   */
  plate: { length: number; width: number };
  /**
   * PHASE 4.6 §2, §42 — HOW FAR THE LOWEST POINT OF THE DRIVE FALLS BELOW THE
   * ANTI-VENTILATION PLATE, and the number the skeg is sized from.
   *
   * The lower unit is no longer "whatever the gearcase and the propeller happen
   * to add up to". §6 asks that the lower half stop being an abstract extrusion
   * and resolve into a gearcase, an anti-ventilation region, a propeller and a
   * skeg; the skeg is the part that reaches furthest down on a real outboard and
   * on the delivered reference, so it is authored to a target rather than left
   * to fall out of the other dimensions. `pxlPropulsion.buildDrive` sizes the
   * skeg to land exactly here and `sternLandmarks` reports it, so the two agree
   * by construction and the configurator suite can assert the reference ratio.
   */
  lowerDrop: number;
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

/**
 * PHASE 4.6 §2, §3, §5, §42 — THE LEGS ARE ROUGHLY THREE TIMES LONGER, AND THE
 * LENGTH IS THE MEASUREMENT PHASE 4.4 TOOK AND THEN DECLINED TO BUILD.
 *
 * `PXL_STERN_REFERENCE` has carried the reading since 4.4: the drawing puts the
 * anti-ventilation plate 1.956 transom-heights below the transom top and the
 * lowest point at 2.469. 4.4 built neither, and said so in its own §O — "that is
 * a rendering of a big engine drawn nearer the camera than the transom it hangs
 * on, and building it would put the plate on the riverbed". The plate went to
 * y −0.060 instead, which is 52 mm below a keel at −0.2206: a lower unit that
 * ends level with the bottom of the boat, which is exactly the failure §42 now
 * names ("if a viewer can still say *the motor ends around the bottom of the
 * boat* then FAIL").
 *
 * §3 OVERRULES THAT JUDGEMENT EXPLICITLY: "Do not 'correct' the reference
 * because it seems mechanically unusual. For THIS phase: VISUAL REFERENCE
 * FIDELITY is the priority." So the readings are re-taken and built.
 *
 * RE-MEASURED THIS PHASE, on `pxl-views-20240815c.jpg`, by column scan rather
 * than by eye — `node -e` over the raw pixels, looking for the runs of dark and
 * the crisp edge where the ghosted underwater body stops:
 *
 *     sheer at the transom            row  975   datum, 0.000
 *     bottom of the ghosted hull      row 1228   1.000  (253 px = one depth)
 *     cowling top                     row  986   0.043
 *     cowling bottom                  row 1122   0.581
 *     anti-ventilation plate          row 1306   1.308
 *     propeller centre                row 1355   1.502
 *     skeg, lowest point              row 1401   1.684
 *
 * The cowling reading is the check that the scale is right: 0.581 − 0.043 is
 * 0.538 of a depth, and at the model's own 0.9236 m transom depth that is
 * 0.497 m of cowling against the 0.500 m `standard` already carries. The two
 * agree to 3 mm, so the same scale can be trusted for the rows below.
 *
 * IN MODEL METRES (sheer at the transom z 0.703, keel z −0.2206):
 *
 *     plate      0.703 − 1.308 × 0.9236  =  −0.505     0.28 m below the keel
 *     lowest     0.703 − 1.684 × 0.9236  =  −0.852     0.63 m below the keel
 *
 * §5 — the four are spread around that rather than set to it. A compact engine
 * is trimmed shallower and an electric pod deeper, because they are different
 * objects; what all four now share is that the lower unit is unmistakably below
 * the hull rather than level with it.
 */
export const PXL_DRIVE_SPECS: Readonly<Record<PxlDriveVariant, PxlDriveSpec>> = {
  compact: {
    id: "compact",
    cowl: { length: 0.34, height: 0.40, width: 0.325 },
    // Trimmed lowest of the four. A small engine's leg is short, so it has to
    // hang from a low mount to put its plate anywhere near the water.
    mountRise: 0.020,
    // Plate at −0.435, the shallowest of the four: 0.21 m below the keel.
    shaft: 0.6825,
    leg: { width: 0.115, caseLength: 0.40, caseDepth: 0.170 },
    propeller: 0.245,
    plate: { length: 0.345, width: 0.225 },
    lowerDrop: 0.325,
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
    mountRise: 0.027,
    // THE MEASURED ONE. 0.6595 of leg puts the plate at −0.505 exactly, which
    // is the row-1306 reading above.
    shaft: 0.6595,
    leg: { width: 0.135, caseLength: 0.455, caseDepth: 0.200 },
    propeller: 0.30,
    plate: { length: 0.400, width: 0.260 },
    // −0.505 − 0.347 = −0.852, the row-1401 reading.
    lowerDrop: 0.347,
    bracket: 0.115,
    cowlFinishId: "pxl_motor_black",
    radius: 0.28,
  },
  large: {
    id: "large",
    cowl: { length: 0.58, height: 0.615, width: 0.435 },
    // 0.615 m of cowling is the 651 mm the reference draws, and 33 mm of rise
    // puts its top at y 0.661 against the reference's 0.654.
    mountRise: 0.033,
    // Plate at −0.545: a big engine is hung a little deeper still.
    shaft: 0.5905,
    leg: { width: 0.16, caseLength: 0.49, caseDepth: 0.225 },
    propeller: 0.345,
    plate: { length: 0.450, width: 0.300 },
    lowerDrop: 0.368,
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
    mountRise: 0.024,
    // The longest leg of the four under the shortest cowling, which is what a
    // pod drive with its mass in the lower unit actually looks like. Plate at
    // −0.500.
    shaft: 0.7865,
    leg: { width: 0.10, caseLength: 0.44, caseDepth: 0.190 },
    propeller: 0.315,
    plate: { length: 0.315, width: 0.200 },
    lowerDrop: 0.340,
    bracket: 0.095,
    cowlFinishId: "pxl_motor_graphite",
    radius: 0.10,
  },
};

/* ── Stern landmarks and platform clearance ────────────────────────────────*/

/**
 * WHERE A DRIVE'S NAMED POINTS END UP. PHASE 4.4 §17, §18, §29.
 *
 * The same chain `pxlPropulsion.buildDrive` builds from, expressed as numbers
 * a test can read on plain node. It is not a second implementation: both start
 * at `PXL_MOUNTS.transom.y + spec.mountRise` and subtract the same authored
 * dimensions in the same order, and the configurator suite asserts that the
 * geometry three builds agrees with the arithmetic this returns.
 *
 * §18 IS SATISFIED BY THIS FUNCTION EXISTING PER VARIANT. "Do NOT use one
 * global transform blindly if it makes the different sizes mount incorrectly"
 * — there is no global transform. Each drive resolves its own chain from its
 * own `mountRise`, `cowl.height` and `shaft`, and the four answers are checked
 * separately against the reference and against the platform.
 */
/** One assembly of a drive, as the box the clearance calculation sees. */
export interface PxlDrivePart {
  name: "cowling" | "leg" | "plate" | "gearcase" | "propeller" | "skeg";
  /** Vertical extent, model metres, +Y up. */
  bottomY: number;
  topY: number;
  /** Half-width athwartships. */
  halfWidth: number;
  /** Fore-aft extent. Both ends, because only the part over the platform counts. */
  forwardX: number;
  aftX: number;
}

export interface PxlSternLandmarks {
  variant: PxlDriveVariant;
  /** Model metres, +Y up. */
  cowlTop: number;
  cowlBottom: number;
  plate: number;
  propeller: number;
  /** PHASE 4.6 — the bottom of the gearcase, where the skeg picks up. */
  gearcaseBottom: number;
  /** The tip of the skeg. On every drive this is also `lowest`. */
  skeg: number;
  lowest: number;
  legX: number;
  parts: readonly PxlDrivePart[];
}

export function sternLandmarks(
  variant: PxlDriveVariant,
  mountY: number,
  transomX: number,
): PxlSternLandmarks {
  const spec = PXL_DRIVE_SPECS[variant];
  const cowlTop = mountY + spec.mountRise;
  const cowlBottom = cowlTop - spec.cowl.height;
  const plate = cowlBottom - spec.shaft;
  const propeller = plate - spec.leg.caseDepth / 2;
  /* PHASE 4.6 §6 — the lower unit is four named things, not one number. The
     gearcase hangs its own depth under the plate; the skeg reaches `lowerDrop`
     under the plate, which is the authored target; and `lowest` is the skeg
     rather than the propeller, which is both what an outboard is and what the
     reference draws. The propeller is asserted to stay above it, so a spec that
     shrank the skeg under a growing wheel would fail rather than pass quietly. */
  const gearcaseBottom = plate - spec.leg.caseDepth;
  const skeg = plate - spec.lowerDrop;
  const lowest = Math.min(skeg, propeller - spec.propeller / 2);

  const cowlX = transomX - spec.bracket - spec.cowl.length / 2;
  const legX = transomX - spec.bracket - spec.cowl.length * 0.5;
  const gearX = legX + spec.leg.caseLength * 0.06;
  const propX = legX - spec.leg.caseLength * 0.52;

  /* The same five objects `pxlPropulsion.buildDrive` adds to the group, as
     boxes. Mirroring the builder rather than approximating it is what lets §29
     be answered per part: on a compact drive it is the leg that passes through
     the platform's height band and on a large one it is the bottom of the
     cowling, and a single "widest thing anywhere" figure would charge every
     drive for the propeller — which on all four hangs well below the platform
     and cannot touch it at any angle of lock. */
  const parts: PxlDrivePart[] = [
    {
      name: "cowling",
      bottomY: cowlBottom,
      topY: cowlTop,
      halfWidth: spec.cowl.width / 2,
      forwardX: cowlX + spec.cowl.length / 2,
      aftX: cowlX - spec.cowl.length / 2,
    },
    {
      name: "leg",
      bottomY: plate,
      topY: cowlBottom + spec.cowl.height * 0.06,
      halfWidth: spec.leg.width / 2,
      forwardX: legX + spec.leg.caseLength * 0.25,
      aftX: legX - spec.leg.caseLength * 0.25,
    },
    {
      name: "plate",
      bottomY: plate - 0.010,
      topY: plate + 0.010,
      halfWidth: spec.plate.width / 2,
      forwardX: legX + spec.plate.length / 2,
      aftX: legX - spec.plate.length / 2,
    },
    {
      name: "gearcase",
      bottomY: plate - spec.leg.caseDepth,
      topY: plate,
      halfWidth: (spec.leg.width * 1.15) / 2,
      forwardX: gearX + spec.leg.caseLength / 2,
      aftX: gearX - spec.leg.caseLength / 2,
    },
    {
      name: "propeller",
      bottomY: propeller - spec.propeller / 2,
      topY: propeller + spec.propeller / 2,
      halfWidth: spec.propeller / 2,
      forwardX: propX + spec.leg.width * 0.6,
      aftX: propX - spec.leg.width * 0.6,
    },
    /* The skeg. Thin — it is a fin — and forward of the propeller, which is
       where the water it straightens comes from. It is the deepest part of the
       drive and therefore the one §29's platform clearance would notice first,
       so it is a part like the others rather than a bare number. */
    {
      name: "skeg",
      bottomY: skeg,
      topY: gearcaseBottom,
      halfWidth: spec.leg.width * 0.22,
      forwardX: gearX + spec.leg.caseLength * 0.14,
      aftX: gearX - spec.leg.caseLength * 0.30,
    },
  ];

  return {
    variant, cowlTop, cowlBottom, plate, propeller,
    gearcaseBottom, skeg, lowest, legX, parts,
  };
}

/**
 * §29 — HOW WIDE THE MOTOR WELL HAS TO BE for a drive to swing inside it.
 *
 * A part can only foul the platform where it is inside BOTH the platform's
 * height band and its fore-aft extent, and a part that swivels sweeps sideways
 * by its distance aft of the steering axis times the sine of the lock. Both
 * qualifications do real work here:
 *
 *   HEIGHT   the propeller is the widest thing on every drive and can never
 *            touch the platform, because it hangs below the frame.
 *   FORE-AFT the large cowling's aft corner reaches x −3.342 at 30° of lock,
 *            which is 0.21 m ABAFT the platform's own aft edge — it sweeps
 *            past the structure rather than over it. Charging the drive for
 *            that corner would have demanded a 0.54 m well to clear a part
 *            that is not there.
 *
 * So the reach is evaluated at the aft-most station where the part and the
 * platform actually overlap. Returns the worst offender and the half-width it
 * needs, so a failure names the part rather than the drive.
 */
export function platformClearance(
  landmarks: PxlSternLandmarks,
  band: {
    bottomY: number;
    topY: number;
    forwardX: number;
    aftX: number;
    wellHalfForward: number;
    wellHalfAft: number;
  },
  pivotX: number,
  lockDeg: number,
): { part: PxlDrivePart["name"]; needed: number; available: number; atX: number } {
  const sweep = Math.sin((lockDeg * Math.PI) / 180);
  /** The notch's own half-width at a station. Linear, as the geometry is. */
  const wellAt = (x: number) => {
    const t = (band.forwardX - x) / (band.forwardX - band.aftX);
    const c = Math.min(Math.max(t, 0), 1);
    return band.wellHalfForward + (band.wellHalfAft - band.wellHalfForward) * c;
  };

  /* BOTH ENDS OF THE OVERLAP ARE TESTED, and with a tapered notch that is not
     pedantry. The reach grows going aft and so does the room, both linearly, so
     the tightest point is at one end or the other — and which one depends on
     the drive. The worst is reported as the largest shortfall rather than the
     largest reach, because a 0.43 m reach where 0.47 m is available is fine and
     a 0.26 m reach where 0.28 m is available is nearly not. */
  let worst = {
    part: "leg" as PxlDrivePart["name"],
    needed: 0,
    available: Infinity,
    atX: 0,
  };
  let worstMargin = Infinity;

  for (const part of landmarks.parts) {
    if (part.topY <= band.bottomY || part.bottomY >= band.topY) continue;
    const overlapAft = Math.max(part.aftX, band.aftX);
    const overlapFwd = Math.min(part.forwardX, band.forwardX);
    if (overlapAft > overlapFwd) continue;          // no fore-aft overlap at all
    for (const atX of [overlapFwd, overlapAft]) {
      const needed = part.halfWidth + Math.abs(atX - pivotX) * sweep;
      const available = wellAt(atX);
      if (available - needed < worstMargin) {
        worstMargin = available - needed;
        worst = { part: part.name, needed, available, atX };
      }
    }
  }
  return worst;
}

/**
 * Normalise a height against the transom, the way §17 asks the comparison be
 * made: 0 at the top of the transom moulding, 1 at its foot, positive down.
 */
export function normaliseAgainstTransom(
  y: number,
  mountY: number,
  transomHeight: number,
): number {
  return (mountY - y) / transomHeight;
}

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

/* ── Equipment ─────────────────────────────────────────────────────────────*/

/**
 * §20–§27 — THE AFT BOARDING PLATFORM, AND THE FIRST GENUINE GEOMETRY OPTION
 * ON THIS BOAT.
 *
 * Every other control in this file changes a material. This one changes what
 * the boat HAS, which is why §24 insists it be a real geometry toggle rather
 * than a colour trick: "do not bake it permanently into PXL.production.glb
 * visibility. The base model can contain the geometry, but configuration should
 * control visibility."
 *
 * That is exactly the split. `platform_frame` and `platform_deck` are exported
 * in every build and carry `visibleByDefault: false`; these two options write
 * the override that `zoneVisible` reads. Nothing about the asset differs
 * between the two states, so the difference cannot drift out of sync with the
 * catalogue.
 *
 * WHY THE DEFAULT IS OFF. §20 leaves it to "the reference-default/configuration
 * logic", and the delivered material answers plainly: the July side plate — the
 * boat's own profile drawing — does not show a platform at all, and the August
 * views sheet does. Two drawings of the same boat, one with and one without, is
 * what an option looks like. The plate that defines the profile is the one the
 * delivered configuration follows.
 *
 * NO PRICE, per §27, and none is possible: `PXL_CATALOGUE_FORBIDDEN` would fail
 * the build on a currency symbol in any catalogue string.
 */
const PLATFORM_ZONES: Readonly<Partial<Record<PxlZone, boolean>>> = {
  platform_frame: true,
  platform_deck: true,
  /* §4.9 — THE SPOILER SHIPS WITH THE PLATFORM, at the client's instruction,
     and the geometry agrees with the instruction: `build_stern_spoiler` lands
     the moulding ON the tread and shares the platform's own plan, so a boat
     with the spoiler and no platform would have it resting on nothing. One
     option, three meshes. */
  stern_spoiler: true,
};

/**
 * COCKPIT AUDIO. §4.9, at the client's request, and at the four stations the
 * client marked: a pair in the side liner forward of the console and a pair aft.
 *
 * Both meshes together, because a grille without its ring is half a speaker and
 * a ring without its grille is a hole with a light in it.
 */
const AUDIO_ZONES: Readonly<Partial<Record<PxlZone, boolean>>> = {
  speaker_grille: true,
  speaker_light: true,
};

/**
 * THE COOL BOX. §4.9, at the client's request: an extra, opening like the
 * seats, working as a cool box.
 *
 * All three meshes together — a shell without its lining is a box that is not
 * insulated and a lid without its box is a lid on the floor.
 */
const COOL_BOX_ZONES: Readonly<Partial<Record<PxlZone, boolean>>> = {
  cool_box: true,
  cool_box_liner: true,
  cool_box_lid: true,
};

const COOL_BOX_OPTIONS: readonly PxlCatalogOption[] = [
  {
    id: "pxl_cool_none",
    category: "equipment",
    slug: "none",
    previewLabel: "Not fitted",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 0,
    swatch: { kind: "colour", value: "#2b2c2e" },
    meshVisibility: { cool_box: false, cool_box_liner: false, cool_box_lid: false },
    note:
      "no cool box appears in any delivered drawing; the size is chosen to " +
      "stand on the sole forward of the console without blocking the view " +
      "from the helm, and no capacity is claimed",
  },
  {
    id: "pxl_cool_fitted",
    category: "equipment",
    slug: "on",
    previewLabel: "Cool Box",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 1,
    swatch: { kind: "colour", value: "#bdc0c2" },
    meshVisibility: COOL_BOX_ZONES,
    note:
      "an insulated locker on the sole forward of the console, lid hinged on " +
      "its aft edge so it opens toward the bow; no volume, temperature or " +
      "power is implied",
  },
];

/**
 * THE BIMINI. §4.10, to the client's reference photograph.
 *
 * Both meshes together and never one of them: a frame without its canvas is a
 * roll bar and a canvas without its frame is a rug in the air.
 */
const BIMINI_ZONES: Readonly<Partial<Record<PxlZone, boolean>>> = {
  bimini_canopy: true,
  bimini_frame: true,
  bimini_aft: true,
  bimini_fwd: true,
  bimini_mid: true,
  bimini_brace: true,
  bimini_strap: true,
  /* Fitted means DEPLOYED. The boot is the other state of the same cloth and
     is switched by striking the top, not by ordering it — see `pxlStow`. */
  bimini_boot: false,
};

const BIMINI_OPTIONS: readonly PxlCatalogOption[] = [
  {
    id: "pxl_bimini_none",
    category: "equipment",
    slug: "none",
    previewLabel: "Not fitted",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 0,
    swatch: { kind: "colour", value: "#2b2c2e" },
    meshVisibility: {
      bimini_canopy: false, bimini_frame: false, bimini_boot: false,
      bimini_aft: false, bimini_fwd: false, bimini_mid: false,
      bimini_brace: false, bimini_strap: false,
    },
    note:
      "no bimini appears in any delivered drawing; the geometry is built to " +
      "the client's reference photograph of a three-bow top, and neither the " +
      "supplier nor the fabric is specified by anybody",
  },
  {
    id: "pxl_bimini_fitted",
    category: "equipment",
    slug: "on",
    previewLabel: "Bimini Top",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 1,
    swatch: { kind: "colour", value: "#17181a" },
    meshVisibility: BIMINI_ZONES,
    note:
      "a three-bow bimini over the helm, feet on the gunwale capping, canopy " +
      "1.31 m above the sole at the crown; it is drawn deployed and does not " +
      "fold, and no air draft is claimed",
  },
];

const AUDIO_OPTIONS: readonly PxlCatalogOption[] = [
  {
    id: "pxl_audio_none",
    category: "equipment",
    slug: "none",
    previewLabel: "Not fitted",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 0,
    swatch: { kind: "colour", value: "#2b2c2e" },
    meshVisibility: { speaker_grille: false, speaker_light: false },
    note:
      "no audio appears in any delivered drawing; the installation is the " +
      "client's, and the size is a 6.5 in marine coaxial chosen to fit the " +
      "liner wall rather than specified by anybody",
  },
  {
    id: "pxl_audio_speakers",
    category: "equipment",
    slug: "on",
    previewLabel: "Cockpit Speakers",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 1,
    swatch: { kind: "colour", value: "#63b4ff" },
    meshVisibility: AUDIO_ZONES,
    note:
      "four 6.5 in coaxials with lit rings, flush in the cockpit's inner " +
      "wall; no brand, model, power or price is implied and none may be",
  },
];

/**
 * THE RINGS, LIT OR NOT. §4.9.
 *
 * A SEPARATE CONTROL FROM THE SPEAKERS THEMSELVES, and it is separate because
 * the client asked for it to be: the lights are wanted as their own switch so a
 * night configuration can reach them without also deciding whether the boat has
 * audio at all. It does nothing when the speakers are not fitted, which is
 * correct rather than convenient — it describes a ring, and a ring that is not
 * on the boat has no state to describe.
 */
const SPEAKER_LIGHT_OPTIONS: readonly PxlCatalogOption[] =
  PXL_SPEAKER_LIGHT_FINISHES.map((ring: PxlFinish, index: number): PxlCatalogOption => ({
    id: `pxl_light_${ring.slug}`,
    category: "equipment" as const,
    slug: ring.slug,
    previewLabel: ring.previewLabel,
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: index,
    swatch: {
      kind: "colour" as const,
      value: (ring.emissiveIntensity ?? 0) > 0 ? (ring.emissive ?? "#63b4ff") : "#1e2126",
    },
    finishId: ring.id,
    note:
      "a lighting state rather than a product; the colour is read off the " +
      "client's reference photograph and no fixture has been specified",
  }));

const EQUIPMENT_OPTIONS: readonly PxlCatalogOption[] = [
  {
    id: "pxl_platform_none",
    category: "equipment",
    slug: "none",
    previewLabel: "Not fitted",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 0,
    swatch: { kind: "colour", value: "#2b2c2e" },
    meshVisibility: { platform_frame: false, platform_deck: false, stern_spoiler: false },
    note:
      "the boat as the July side plate draws it, which is the delivered " +
      "profile and therefore the delivered configuration",
  },
  {
    id: "pxl_platform_teak",
    category: "equipment",
    slug: "on",
    previewLabel: "Aft Platform and Spoiler",
    approvedLabel: null,
    published: false,
    provisional: true,
    sortOrder: 1,
    // The tread's own measured colour, so the swatch shows the material rather
    // than a generic wood brown — sampled at #b0753f off the reference.
    swatch: { kind: "colour", value: "#b0753f" },
    meshVisibility: PLATFORM_ZONES,
    note:
      "the platform is drawn in the August views sheet and absent from the " +
      "July side plate; the spoiler is the reverse. The yard has confirmed " +
      "neither as option or standard, and each is measured from one drawing",
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
      {
        id: "glazing",
        param: "glazing",
        field: "glazingTint",
        labelKey: "glazingTint",
        options: GLAZING_OPTIONS,
        defaultOptionId: "pxl_glazing_light",
      },
      {
        id: "rails",
        param: "rails",
        field: "railTreatment",
        labelKey: "railTreatment",
        options: RAIL_OPTIONS,
        defaultOptionId: "pxl_rails_interior",
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
  {
    id: "equipment",
    sortOrder: 4,
    // §28 — THE STERN THREE-QUARTER, SUGGESTED ONCE AND THEN LET GO.
    //
    // "When the Equipment category / boarding platform option is first
    // selected, the configurator may suggest a stern three-quarter camera. Do
    // not permanently force that camera. The user keeps control afterward."
    //
    // Nothing extra is needed to satisfy the second half: `suggestedView` has
    // been a one-shot since Phase Four — the configurator moves the camera on
    // FIRST entry to a category and never again, and any orbit the viewer makes
    // afterwards puts them in `free` and keeps them there. So this is the same
    // mechanism the other four categories use, and the platform gets the same
    // treatment as a paint colour rather than a special case that could forget
    // to let go.
    suggestedView: "stern_3q",
    controls: [
      {
        id: "platform",
        param: "platform",
        field: "boardingPlatform",
        labelKey: "boardingPlatform",
        options: EQUIPMENT_OPTIONS,
        defaultOptionId: "pxl_platform_none",
      },
      {
        id: "bimini",
        param: "bimini",
        field: "bimini",
        labelKey: "bimini",
        options: BIMINI_OPTIONS,
        defaultOptionId: "pxl_bimini_none",
      },
      {
        id: "cool",
        param: "cool",
        field: "coolBox",
        labelKey: "coolBox",
        options: COOL_BOX_OPTIONS,
        defaultOptionId: "pxl_cool_none",
      },
      {
        id: "audio",
        param: "audio",
        field: "audio",
        labelKey: "audio",
        options: AUDIO_OPTIONS,
        defaultOptionId: "pxl_audio_none",
      },
      {
        id: "ring",
        param: "ring",
        field: "speakerLight",
        labelKey: "speakerLight",
        options: SPEAKER_LIGHT_OPTIONS,
        defaultOptionId: "pxl_light_off",
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
  /* EQUIPMENT LEFT THIS LIST IN PHASE 4.4, and the entry that used to be here
     is worth quoting rather than deleting, because it is the standard the next
     category has to meet:

       "no equipment range supplied; the only optional mesh in the asset is an
        undocumented flush cockpit cover, and one undocumented cover is not a
        category"

     What changed is not the standard but the asset. The aft boarding platform
     is drawn in a delivered reference, measured off it, modelled as real
     structure, and switched by a real geometry toggle — so the category has
     one genuine option and is offered. The cockpit cover is still undocumented
     and is still not offered; §25's "do not add artificial additional
     equipment just to fill it" is the reason it did not come along for the
     ride. */
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
