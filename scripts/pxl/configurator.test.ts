/**
 * PXL CONFIGURATOR — contract tests.
 *
 * §89 asks for targeted tests where the architecture supports them, and
 * explicitly not for hundreds of low-value snapshots. What is worth asserting
 * here is the part that is *data*: the URL format, the fallback behaviour, the
 * role bindings, the preset table, and the uniqueness of every slug. All of
 * those are things a future edit can silently break, none of them needs a
 * renderer, and each one of them has a single correct answer.
 *
 * What is deliberately NOT tested: anything that needs a GPU, a DOM or a
 * screenshot. Framing is verified by measurement against the live renderer —
 * see `pxlTelemetry` and the responsive matrix in PHASE_2_6_REPORT.md — because
 * a unit test that asserts "the bow is in frame" is asserting a number somebody
 * copied out of the implementation.
 *
 * Run with `npm test`. The harness compiles this file and the pure modules it
 * imports to CommonJS and runs the result on plain node — see
 * `scripts/pxl/test-configurator.mjs` for why that is simpler here than adding
 * a test runner.
 */

import {
  PXL_ALL_FINISHES,
  PXL_EXTERIOR_FINISHES,
  PXL_HULL_FINISHES,
  PXL_INTERIOR_FINISHES,
  PXL_RANGES,
  finishBySlug,
  finishLabel,
  rangeIsPubliclyNameable,
} from "../../src/webgl/scenes/pxl/pxlPalette";
import {
  PXL_AVAILABLE_CATEGORIES,
  PXL_AVAILABLE_CONTROLS,
  PXL_DEFAULT_CONFIGURATION,
  applyConfigurationToHref,
  applyOption,
  clearConfigurationFromHref,
  configurationToParams,
  controlIsPubliclyNameable,
  finishForChannel,
  finishForRole,
  optionLabel,
  parseConfiguration,
  selectedOption,
  serialiseConfiguration,
  summariseConfiguration,
  zoneVisible,
} from "../../src/webgl/scenes/pxl/pxlConfig";
import {
  PXL_CATALOGUE_FORBIDDEN,
  PXL_CATALOGUE_IS_PROVISIONAL,
  PXL_CATALOGUE_OPTIONS,
  PXL_CATEGORIES,
  PXL_CONTROLS,
  PXL_DEFERRED_CATEGORIES,
  PXL_DRIVE_SPECS,
  catalogueVisibleStrings,
  defaultOption,
  optionBySlug,
  type PxlCatalogControl,
  type PxlDriveVariant,
} from "../../src/webgl/scenes/pxl/pxlCatalog";
import {
  PXL_CENTRELINE_MARKS,
  PXL_DECAL_SLOTS,
  PXL_INK_LIGHT,
  PXL_INK_PLEXI,
  PXL_MAX_HULL_MARKS_PER_SIDE,
  groundLuminance,
  inkForGround,
} from "../../src/webgl/scenes/pxl/pxlBranding";
import {
  PXL_DUNA_ARTWORK,
  dunaAspect,
  dunaBounds,
  dunaContours,
  dunaVertexCount,
} from "../../src/webgl/scenes/pxl/pxlScript";
import {
  pxlLockup,
  pxlLockupAspect,
  pxlLockupBounds,
} from "../../src/webgl/scenes/pxl/pxlLockup";
import {
  PXL_CONSOLE_STATION,
  PXL_DUNA_BAND_PLATE,
  PXL_DUNA_PLATE,
  PXL_MARK_PLATE,
  PXL_MARK_PLATE_INK,
  PXL_PLEXI_MARK,
  PXL_PROFILE_AGREEMENT,
  PXL_REFERENCE_PLATES,
  PXL_SCREEN,
  PXL_SIDE_PLATE,
} from "../../src/webgl/scenes/pxl/pxlReference";
import {
  PXL_REQUEST_DESTINATION,
  buildPxlRequestPayload,
  requestMailtoHref,
  requestPayloadAsMessage,
  submitPxlRequest,
  validatePxlRequest,
} from "../../src/webgl/scenes/pxl/pxlRequest";
import {
  PXL_ROUTES,
  PREVIEW_ROBOTS,
  UNINDEXED_PREFIXES,
  isImmersiveRoute,
  isUnindexedRoute,
} from "../../src/content/publication";
import {
  INDEXABLE_ROUTES,
  ROUTES,
  ROUTE_LIST,
} from "../../src/content/routes";
import { NAV } from "../../src/content/site";
import { JOURNAL, PROJECTS } from "../../src/content/editorial";
import { SUZUKI, SUZUKI_BLOCKERS } from "../../src/content/suzuki";
import {
  setAnalyticsSink,
  track,
  type PxlAnalyticsEvent,
} from "../../src/lib/analytics";
import {
  PXL_CONSOLE_ZONES,
  PXL_MODEL,
  PXL_MOUNTS,
  PXL_ZONES,
  channelForRole,
  zonesForChannel,
  zonesForRole,
} from "../../src/webgl/scenes/pxl/pxlModel";
import {
  PXL_CONFIGURATOR_VIEWS,
  PXL_CONFIGURATOR_VIEW_CONTROLS,
  PXL_DEFAULT_PRESET,
  PXL_ORBIT_LIMITS,
  PXL_PRESETS,
  PXL_PRESET_BY_ID,
} from "../../src/webgl/scenes/pxl/pxlPresets";

let failures = 0;
let checks = 0;

function ok(condition: boolean, what: string): void {
  checks += 1;
  if (condition) return;
  failures += 1;
  console.error(`  ✗ ${what}`);
}

function eq(actual: unknown, expected: unknown, what: string): void {
  ok(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${what} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

function group(name: string, body: () => void): void {
  console.log(name);
  body();
}

/* ── Colour identity ───────────────────────────────────────────────────────*/

group("finishes", () => {
  /* SLUGS ARE UNIQUE WITHIN A RANGE, NOT GLOBALLY — see `PXL_RANGES`.
     Phase Four's interior range needs the honest names Light, Sand, Cognac,
     Graphite and Black, two of which the hull range already uses. That is not
     a collision, because `?exterior=black` and `?interior=black` name their own
     category; the collision that WOULD matter is two options inside one range
     answering to one token, and that is what this asserts. */
  for (const [name, range] of Object.entries(PXL_RANGES)) {
    const slugs = range.map((f) => f.slug);
    eq(new Set(slugs).size, slugs.length, `every slug in the ${name} range is unique`);
  }

  const ids = PXL_ALL_FINISHES.map((f) => f.id);
  eq(new Set(ids).size, ids.length, "every finish id is unique");

  eq(PXL_EXTERIOR_FINISHES.length, 6, "six exterior finishes, one per colour study");
  eq(PXL_EXTERIOR_FINISHES, PXL_HULL_FINISHES, "the exterior alias is the hull range");

  for (const f of PXL_ALL_FINISHES) {
    ok(/^[a-z0-9-]+$/.test(f.slug), `slug "${f.slug}" is URL-safe`);
    ok(/^#[0-9a-f]{6}$/i.test(f.base), `${f.id} has a six-digit sRGB hex`);
    ok(f.previewLabel.length > 0, `${f.id} has a preview label`);
    // §53: no finish carries an approved public name, and none claims to be
    // published. The two are separate questions and both answer no today —
    // this pair of assertions is what turns "we must not ship colour names"
    // from a note in a report into something a build can enforce.
    ok(f.approvedDisplayName === undefined, `${f.id} has no yard-approved name`);
    eq(f.published, false, `${f.id} is not published`);
    eq(finishLabel(f, "public"), null, `${f.id} refuses to name itself publicly`);
    eq(finishLabel(f, "preview"), f.previewLabel, `${f.id} names itself on a preview surface`);
    // §9: no invented lifestyle name. A working name is one or two plain words
    // describing the colour; "Danube Mist" and friends are what this catches.
    ok(
      f.previewLabel.split(" ").length <= 2,
      `${f.id} preview label is a plain descriptor, not a range name`,
    );
    /* §A9: nothing in the interior may behave like painted metal. Clearcoat
       over cloth is exactly what causes it, so the interior range carries none
       and carries sheen instead. Asserted rather than trusted because it is a
       single number somebody could reasonably "tidy up". */
    if (PXL_INTERIOR_FINISHES.includes(f)) {
      eq(f.clearcoat, 0, `${f.id} has no clear coat — it is not paint`);
      ok((f.sheen ?? 0) > 0.2, `${f.id} carries a sheen lobe`);
      ok(f.roughness > 0.7, `${f.id} is textile-rough, not sprayed-smooth`);
      ok((f.microNormal ?? 0) > 0, `${f.id} asks for a micro-normal`);
    }
    ok(f.roughness >= 0 && f.roughness <= 1, `${f.id} roughness in range`);
    ok(f.metalness >= 0 && f.metalness <= 1, `${f.id} metalness in range`);
    // §8: no RAL, no manufacturer code, until the yard supplies one.
    ok(f.manufacturingCode === undefined, `${f.id} claims no paint code`);
    // §46: a base colour at zero produces no gradient under any light and the
    // surface collapses to a silhouette. Nothing may reach it.
    const channel = parseInt(f.base.slice(1, 3), 16) + parseInt(f.base.slice(3, 5), 16) +
      parseInt(f.base.slice(5, 7), 16);
    ok(channel > 24, `${f.id} is far enough off black to keep its form`);
  }

  ok(finishBySlug("navy", PXL_EXTERIOR_FINISHES)?.id === "pxl_navy", "slug resolves");
  ok(finishBySlug("nope", PXL_EXTERIOR_FINISHES) === null, "unknown slug resolves to null");
  // A finish that exists, but not in this channel, must not resolve.
  ok(
    finishBySlug("motor-black", PXL_EXTERIOR_FINISHES) === null,
    "slug lookup is scoped to its own channel",
  );
});

/* ── Categories, controls and options ──────────────────────────────────────*/

group("catalogue", () => {
  /* §A2: FOUR CATEGORIES, BECAUSE FOUR HAVE OPTIONS.
     The number is asserted rather than the names, because the failure this
     catches is a fifth appearing with nothing behind it — a greyed EQUIPMENT
     tab, or a rail that counts to five and shows four. */
  eq(PXL_AVAILABLE_CATEGORIES.length, 4, "four categories are offered");
  eq(
    PXL_AVAILABLE_CATEGORIES.map((c) => c.id),
    ["exterior", "hull_detail", "interior", "propulsion"],
    "in the authored order",
  );
  eq(
    PXL_AVAILABLE_CATEGORIES.length,
    PXL_CATEGORIES.length,
    "nothing declared as a category is withheld — a withheld one belongs in PXL_DEFERRED_CATEGORIES",
  );
  ok(PXL_DEFERRED_CATEGORIES.length > 0, "and the deferred ones are declared separately");
  for (const deferred of PXL_DEFERRED_CATEGORIES) {
    ok(
      !PXL_CATEGORIES.some((c) => c.id === deferred.id),
      `${deferred.id} cannot become a tab`,
    );
    ok(deferred.unavailable.length > 12, `${deferred.id} says why it is deferred`);
  }

  const params = [...PXL_CONTROLS.map((c) => c.param),
                  ...PXL_DEFERRED_CATEGORIES.map((c) => c.param)];
  eq(new Set(params).size, params.length, "every URL parameter is unique, reserved ones included");

  for (const category of PXL_AVAILABLE_CATEGORIES) {
    ok(category.controls.length > 0, `${category.id} has at least one control`);
    ok(
      PXL_CONFIGURATOR_VIEWS.includes(category.suggestedView),
      `${category.id} suggests a view the camera can actually hold`,
    );
  }

  for (const control of PXL_AVAILABLE_CONTROLS) {
    ok(control.options.length > 1, `${control.id} offers a real choice`);
    ok(/^[a-z]+$/.test(control.param), `${control.param} is a clean URL key`);

    const slugs = control.options.map((o) => o.slug);
    eq(new Set(slugs).size, slugs.length, `${control.id} slugs are unique within the control`);
    for (const slug of slugs) ok(/^[a-z0-9-]+$/.test(slug), `slug "${slug}" is URL-safe`);

    // A control that cannot round-trip is a control whose parameter is decorative.
    const other = control.options.find((o) => o.id !== control.defaultOptionId)!;
    const written = applyOption(PXL_DEFAULT_CONFIGURATION, control, other);
    eq(selectedOption(written, control).id, other.id, `${control.id} reads back what it writes`);
    ok(
      PXL_DEFAULT_CONFIGURATION !== written,
      `${control.id} does not mutate the configuration it was given`,
    );
    eq(
      selectedOption(PXL_DEFAULT_CONFIGURATION, control).id,
      control.defaultOptionId,
      `${control.id} default matches the delivered boat`,
    );
    ok(Boolean(defaultOption(control)), `${control.id} default resolves`);
    eq(optionBySlug(control, "does-not-exist"), null, `${control.id} rejects an unknown slug`);
  }

  /* §A1: EVERY OPTION IS MARKED PROVISIONAL, AND NONE CLAIMS APPROVAL.
     The three fields answer three different questions and all three answer no
     today. A future edit that publishes one without approving its name, or
     approves a name without publishing it, fails here rather than on a
     customer-facing surface. */
  for (const option of PXL_CATALOGUE_OPTIONS) {
    eq(option.provisional, true, `${option.id} is marked provisional`);
    eq(option.published, false, `${option.id} is not published`);
    eq(option.approvedLabel, null, `${option.id} has no yard-approved name`);
    eq(optionLabel(option, "public"), null, `${option.id} refuses to name itself publicly`);
    eq(
      optionLabel(option, "preview"),
      option.previewLabel,
      `${option.id} names itself on a preview surface`,
    );
    ok(option.note.length > 24, `${option.id} records what makes it provisional`);
  }
  eq(PXL_CATALOGUE_IS_PROVISIONAL, true, "and the catalogue as a whole says so");
  for (const control of PXL_AVAILABLE_CONTROLS) {
    eq(controlIsPubliclyNameable(control), false, `${control.id} cannot be named publicly`);
  }

  /* §A13, §B36 — NO FAKE POWER, PRICE, PERFORMANCE OR BRAND.
     Run against every string the catalogue can put in front of a customer.
     This is the assertion that will actually earn its keep: the rule is broken
     six months from now by somebody making an option list read better. */
  for (const text of catalogueVisibleStrings()) {
    for (const pattern of PXL_CATALOGUE_FORBIDDEN) {
      ok(!pattern.test(text), `"${text}" carries no ${pattern.source}`);
    }
  }
});

/* ── Hull detail — §A4, §A5 ────────────────────────────────────────────────*/

group("lower hull treatment", () => {
  const control = PXL_AVAILABLE_CONTROLS.find((c) => c.param === "lower")!;
  const dark = optionBySlug(control, "dark")!;
  const body = optionBySlug(control, "body")!;

  const darkConfig = applyOption(PXL_DEFAULT_CONFIGURATION, control, dark);
  const bodyConfig = applyOption(PXL_DEFAULT_CONFIGURATION, control, body);

  /* THE OPTION IS A MATERIAL CHANGE, NOT A VISIBILITY ONE. §A4 is explicit:
     the hull geometry stays intact and nothing is hidden. Asserted across
     every zone, because "just hide the black bit" is the shortcut this rules
     out and it would pass any test that only looked at colours. */
  for (const zone of PXL_ZONES) {
    eq(
      zoneVisible(bodyConfig, zone.id),
      zoneVisible(darkConfig, zone.id),
      `${zone.id} visibility is identical under both treatments`,
    );
  }

  eq(
    finishForChannel(darkConfig, "hullLower"),
    "pxl_structure_black",
    "DARK LOWER keeps the structural black below the chine",
  );
  eq(
    finishForChannel(bodyConfig, "hullLower"),
    bodyConfig.exterior.hullPrimary,
    "FULL BODY COLOUR paints the bottom in the topsides finish",
  );

  /* AND IT FOLLOWS. The whole reason the treatment is stored as a treatment
     rather than as a second finish: change the exterior and the bottom comes
     with it, without anybody having to write both. */
  const exterior = PXL_AVAILABLE_CONTROLS.find((c) => c.param === "exterior")!;
  const navyBody = applyOption(bodyConfig, exterior, optionBySlug(exterior, "navy")!);
  eq(
    finishForChannel(navyBody, "hullLower"),
    "pxl_navy",
    "and it keeps following when the exterior changes",
  );

  /* THE STERN MOULDING NEVER FOLLOWS. It carries the PXL mark, and repainting
     it would take the mark's own ground away — which would turn a paint option
     into a branding change. This is why Phase Four split the channel. */
  eq(
    finishForChannel(bodyConfig, "sternMoulding"),
    "pxl_structure_black",
    "the stern moulding stays structural under FULL BODY COLOUR",
  );
  eq(
    finishForChannel(bodyConfig, "hullAccent"),
    finishForChannel(darkConfig, "hullAccent"),
    "and so does the gunwale capping",
  );
});

/* ── Interior — §A6, §A7, §A8, §A9 ────────────────────────────────────────*/

group("interior", () => {
  const primary = PXL_AVAILABLE_CONTROLS.find((c) => c.param === "interior")!;
  const secondary = PXL_AVAILABLE_CONTROLS.find((c) => c.param === "console")!;
  const surface = PXL_AVAILABLE_CONTROLS.find((c) => c.param === "surface")!;

  eq(primary.options.length, 5, "five interior tones");
  eq(
    primary.options.map((o) => o.slug),
    ["light", "sand", "cognac", "graphite", "black"],
    "including the cognac the delivered renders actually show (§A7)",
  );
  eq(
    PXL_DEFAULT_CONFIGURATION.interior.primary,
    "pxl_interior_cognac",
    "and the delivered boat is the one in the renders",
  );

  /* §A6 — TWO SURFACES, BECAUSE TWO MESHES. The liner and the console are
     genuinely separate zones with separate materials; nothing else in the
     cockpit is, so nothing else is offered. */
  eq(
    finishForChannel(PXL_DEFAULT_CONFIGURATION, "interiorPrimary"),
    PXL_DEFAULT_CONFIGURATION.interior.primary,
    "the primary control reaches the liner",
  );
  eq(
    finishForChannel(PXL_DEFAULT_CONFIGURATION, "interiorSecondary"),
    PXL_DEFAULT_CONFIGURATION.interior.secondary,
    "and the secondary reaches the console",
  );
  ok(
    zonesForChannel("interiorPrimary").length > 0 &&
      zonesForChannel("interiorSecondary").length > 0,
    "both interior channels have geometry behind them",
  );
  eq(
    zonesForChannel("interiorPrimary").some((z) =>
      zonesForChannel("interiorSecondary").includes(z),
    ),
    false,
    "and they do not share a mesh — two controls over one material would be a lie",
  );

  /* §A6 AGAIN, IN THE VOCABULARY. Nothing may call these upholstery, because
     there is no cushion geometry in the asset. The word is the whole risk: a
     channel named after a cushion and bound to a moulding repeats the claim in
     every summary, payload and share link. */
  for (const text of catalogueVisibleStrings()) {
    ok(!/upholster/i.test(text), `"${text}" does not claim upholstery`);
  }

  /* §A8 — TWO CHARACTERS, AND ONLY TWO. Quality over artificial option count:
     a third would have to be a different physical product, and there is no
     geometry, map or specification to support one. */
  eq(surface.options.length, 2, "two surface characters");
  eq(surface.options.map((o) => o.slug), ["smooth", "grained"], "smooth and grained");

  /* §A9 — THE ENDS OF THE RANGE ARE WHERE IT FAILS, so both are checked
     against their own failure mode rather than against a generic bound. */
  const black = primary.options.find((o) => o.slug === "black")!;
  const light = primary.options.find((o) => o.slug === "light")!;
  const blackFinish = PXL_INTERIOR_FINISHES.find((f) => f.id === black.finishId)!;
  const lightFinish = PXL_INTERIOR_FINISHES.find((f) => f.id === light.finishId)!;
  ok(
    groundLuminance(blackFinish.base) > 0.005,
    "dark upholstery keeps enough albedo to retain detail",
  );
  ok(
    groundLuminance(lightFinish.base) < 0.85,
    "light upholstery sits below clipping",
  );

  /* Cognac must not become orange plastic. The test for that is not the hue,
     it is the relationship to the lacquered rail inlay beside it: same family,
     much rougher, and materially darker. */
  const cognac = PXL_INTERIOR_FINISHES.find((f) => f.slug === "cognac")!;
  ok(cognac.roughness > 0.7, "cognac is matt, not lacquered");
  ok(
    groundLuminance(cognac.base) < 0.2,
    "and deep enough not to read as a saturated plastic",
  );

  eq(secondary.options.length, 3, "three console finishes");
});

/* ── Propulsion — §A13 to §A18 ────────────────────────────────────────────*/

group("propulsion", () => {
  const control = PXL_AVAILABLE_CONTROLS.find((c) => c.param === "propulsion")!;
  eq(control.options.length, 4, "four drives");
  eq(
    control.options.map((o) => o.slug),
    ["compact", "standard", "large", "electric"],
    "three combustion sizes and an electric",
  );

  const variants: PxlDriveVariant[] = ["compact", "standard", "large"];
  const specs = variants.map((v) => PXL_DRIVE_SPECS[v]);

  /* §A14 — the choice must visibly change the boat. Every drive is a distinct
     object, so no two share a cowling. */
  for (let i = 1; i < specs.length; i += 1) {
    ok(specs[i].cowl.length > specs[i - 1].cowl.length, `${variants[i]} cowling is longer`);
    ok(specs[i].cowl.height > specs[i - 1].cowl.height, `${variants[i]} cowling is taller`);
    ok(specs[i].propeller > specs[i - 1].propeller, `${variants[i]} turns a larger propeller`);
  }

  /* §A15 — NOT ONE OBJECT AT THREE SCALES, and this is the assertion that
     enforces it. If the three were uniformly scaled, every dimension would
     grow by the same ratio; the point of authoring them separately is that
     they do not. A future edit that "simplifies" the table into a scale factor
     fails here. */
  const lengthRatio = specs[2].cowl.length / specs[0].cowl.length;
  const widthRatio = specs[2].cowl.width / specs[0].cowl.width;
  const propRatio = specs[2].propeller / specs[0].propeller;
  ok(
    Math.abs(lengthRatio - widthRatio) > 0.1,
    "the cowling does not grow uniformly in length and width",
  );
  ok(
    Math.abs(lengthRatio - propRatio) > 0.1,
    "and the propeller does not track the cowling either",
  );

  /* §A17 — the electric drive is a different object, not a smaller one. Its
     distinguishing number is the corner radius: a machined technical shell
     against three moulded covers. */
  const electric = PXL_DRIVE_SPECS.electric;
  ok(electric.radius < specs[0].radius * 0.5, "the electric shell is machined, not moulded");
  ok(electric.cowl.width < specs[0].cowl.width, "and it carries less visual bulk");
  ok(
    electric.cowl.height / electric.cowl.width > specs[0].cowl.height / specs[0].cowl.width,
    "while standing taller for its width — no engine block under the cover",
  );
  ok(
    electric.cowlFinishId !== specs[0].cowlFinishId,
    "and it takes its own finish rather than the combustion black",
  );

  /* §A16 — EVERY DRIVE SITS CORRECTLY ON THE TRANSOM.
     The numbers are geometry rather than taste, so they are checked rather than
     eyeballed: the plate near the waterline, the propeller submerged, and
     nothing reaching forward of the transom into the hull. */
  for (const variant of ["compact", "standard", "large", "electric"] as const) {
    const spec = PXL_DRIVE_SPECS[variant];
    const plateY = PXL_MOUNTS.transom.y - spec.shaft;
    const gearcaseY = plateY - spec.leg.caseDepth / 2;
    const deepest = gearcaseY - spec.propeller / 2;

    ok(plateY < 0.06, `${variant}: the anti-ventilation plate is at the waterline, not above it`);
    ok(plateY > -0.16, `${variant}: and not buried`);
    ok(deepest < -0.05, `${variant}: the propeller is submerged`);
    ok(
      deepest > -0.42,
      `${variant}: and does not hang absurdly below the keel at ${PXL_MODEL.draft.toFixed(3)} m`,
    );

    /* Nothing forward of the transom. The bracket's forward face IS the
       transom plane, so the whole assembly lives aft of it — which is what
       keeps it clear of the hull, the rails and the deck by construction
       rather than by inspection. */
    const forwardMost = PXL_MOUNTS.transom.x;
    ok(
      forwardMost <= -PXL_MODEL.loa / 2 + 1e-6,
      `${variant}: the drive mounts at or aft of the transom`,
    );
  }

  /* The cowling colour is a CONSEQUENCE of the variant, never a choice beside
     it — an electric drive in a combustion cowling is not a configuration
     anybody should be able to reach. */
  for (const option of control.options) {
    const config = applyOption(PXL_DEFAULT_CONFIGURATION, control, option);
    eq(
      finishForChannel(config, "motor"),
      PXL_DRIVE_SPECS[option.geometryVariant!].cowlFinishId,
      `${option.slug}: the cowling finish follows the drive`,
    );
    ok(
      finishForChannel(config, "motor") !== finishForChannel(config, "hullPrimary"),
      `${option.slug}: and never follows the hull`,
    );
  }

  /* The delivered outboard steps aside for the proxies rather than being
     deleted. Its zones still exist, still carry the PROPULSION role, and are
     one flag away from coming back. */
  ok(
    !zoneVisible(PXL_DEFAULT_CONFIGURATION, "motor"),
    "the source model's outboard is hidden while proxies are fitted",
  );
  ok(
    PXL_ZONES.some((z) => z.id === "motor" && z.role === "PROPULSION"),
    "but it is still declared, with its role intact",
  );
});

/* ── Branding — §A10 to §A12 ──────────────────────────────────────────────*/

group("branding", () => {
  /* THE MARK SITS ON THE STERN MOULDING, and the anchor has to be inside that
     moulding's measured bounding box or the ray finds nothing. The numbers
     come from the delivered GLB; this is what catches an anchor that was tuned
     against a render and never checked against the model. */
  const anchor = PXL_MOUNTS.pxlMark;
  ok(anchor.x > -2.6266 && anchor.x < -1.8108, "the mark sits within the stern panel fore-aft");
  ok(anchor.y > -0.2034 && anchor.y < 0.6275, "and within it vertically");
  ok(anchor.y > 0, "and above the waterline");
  ok(anchor.rayFrom > PXL_MODEL.beam / 2, "the placement ray starts outside the beam");
  ok(anchor.standoff > 0, "and the mark floats clear of the surface");

  /* PHASE 4.1 §8 — THE SIZE IS DERIVED FROM THE PLATE, NOT CHOSEN.
     `length` replaced `height` because the lockup is measured five times more
     precisely along its length (100 plate px) than across its height (19), so
     the assertion is on the length and the cap height falls out of the
     artwork's own aspect. The plate's scale is 345.1 px/m. */
  const markLength = (PXL_MARK_PLATE.x1 - PXL_MARK_PLATE.x0 + 1) / PXL_SIDE_PLATE.pxPerMetre;
  ok(
    Math.abs(anchor.length - markLength) < 0.006,
    `the lockup is the plate's own ${markLength.toFixed(3)} m long, not a chosen size`,
  );
  const capHeight = anchor.length / pxlLockupAspect();
  ok(
    capHeight > 0.045 && capHeight < 0.07,
    "which puts the cap height at the plate's 55 mm rather than Phase Four's 92",
  );

  /* §A11 — READABLE ON ALL SIX HULL FINISHES.
     The ground is the stern moulding rather than the hull, so the mark's
     contrast does not in fact vary today — and that is exactly why it is
     asserted across all six: if a future option ever repaints the moulding,
     this fails rather than shipping an unreadable mark. */
  const exterior = PXL_AVAILABLE_CONTROLS.find((c) => c.param === "exterior")!;
  const lower = PXL_AVAILABLE_CONTROLS.find((c) => c.param === "lower")!;
  for (const hull of exterior.options) {
    for (const treatment of lower.options) {
      let config = applyOption(PXL_DEFAULT_CONFIGURATION, exterior, hull);
      config = applyOption(config, lower, treatment);
      const groundId = finishForChannel(config, "sternMoulding")!;
      const ground = PXL_ALL_FINISHES.find((f) => f.id === groundId)!;
      const ink = inkForGround(ground.base);
      const separation = Math.abs(
        groundLuminance(ink.colour) - groundLuminance(ground.base),
      );
      ok(
        separation > 0.02,
        `the mark separates from its ground under ${hull.slug}/${treatment.slug}`,
      );
    }
  }

  /* NO OUTLINE, NO DROP SHADOW. §A11 rules both out as things that are not
     part of the product design, so the ink treatments are colour and surface
     parameters and nothing else. */
  const ink = inkForGround("#101215");
  eq(Object.keys(ink).sort(), ["clearcoat", "colour", "metalness", "roughness"],
     "an ink treatment is a material, not an effect");

  /* PHASE 4.1 §4, §9 — THREE SLOTS, ALL OF THEM IMPLEMENTED.
     Phase Four declared two and left the Duna one empty. §4 makes the mark
     required, so the assertion inverts: an unimplemented slot now fails. */
  eq(PXL_DECAL_SLOTS.length, 3, "three branding slots");
  const pxlSlot = PXL_DECAL_SLOTS.find((s) => s.id === "pxl_wordmark")!;
  const dunaSlot = PXL_DECAL_SLOTS.find((s) => s.id === "duna_script")!;
  const plexiSlot = PXL_DECAL_SLOTS.find((s) => s.id === "pxl_plexi")!;
  for (const slot of PXL_DECAL_SLOTS) {
    eq(slot.implemented, true, `the ${slot.id} mark is implemented`);
  }
  eq(
    new Set(PXL_DECAL_SLOTS.map((s) => s.zone)).size,
    3,
    "each mark is on a surface of its own — no two share a ground",
  );
  eq(
    new Set(PXL_DECAL_SLOTS.map((s) => s.ground)).size,
    3,
    "and each ground is governed separately",
  );
  eq(PXL_MAX_HULL_MARKS_PER_SIDE, 2, "two hull marks per side, as a stated limit");
  eq(PXL_CENTRELINE_MARKS, ["pxl_plexi"], "and the plexi mark is not mirrored");
  ok(plexiSlot.zone.includes("screen"), "the plexi mark is on the screen, not the hull");
  ok(pxlSlot.zone === "transom_black" && dunaSlot.zone === "hull_accent",
     "the hull marks are on the moulding and the capping respectively");

  /* THE INK IS MEASURED. §8 asked for the mark's colour to be revalidated, and
     `scripts/pxl/_mark.mjs` averaged the 889 orange pixels in the plate. A
     hand-picked hex here would be exactly the "close enough" §8 rules out. */
  eq(inkForGround("#101215").colour, PXL_MARK_PLATE_INK,
     "the cognac ink is the plate's own measured average");

  /* §9, §12 — THE PLEXI MARK HAS ITS OWN INK AND IT IS NOT THE COGNAC.
     On dark tinted acrylic the cognac is barely separable, and §12 has removed
     outline, shadow and glow, so the ink is the only lever left. */
  ok(
    PXL_INK_PLEXI.colour !== PXL_INK_LIGHT.colour,
    "the plexi mark does not reuse the hull ink",
  );
  ok(
    groundLuminance(PXL_INK_PLEXI.colour) > 0.4,
    "it is a light grey, which is what reads on tinted glazing",
  );
  ok(
    PXL_INK_PLEXI.clearcoat < 0.15,
    "and it is matte — a clearcoat on a print over glass reads as a floating sticker",
  );

  /* THE PLEXI MARK IS INSIDE THE SCREEN'S FACE.
     Both fractions are of the screen's own face, and the two axes have
     different scales — `capHeight` is a fraction of the height and `across` of
     the width — so the mark's width has to be converted through the screen's
     aspect before the two can be compared. Skipping that conversion is how the
     first version of this check reported a mark 14% off the edge of a screen it
     is comfortably inside. The console's measured box is 0.5934 m of beam by
     0.756 m of height; the screen takes a fraction of each. */
  const screenAspect =
    (PXL_SCREEN.width * 0.5934) / (PXL_SCREEN.height * 0.756);
  const plexiCap = PXL_PLEXI_MARK.capHeight;
  const plexiHalfWidth = (plexiCap * pxlLockupAspect()) / screenAspect / 2;
  ok(
    PXL_PLEXI_MARK.across - plexiHalfWidth > 0.02 &&
      PXL_PLEXI_MARK.across + plexiHalfWidth < 0.98,
    "the plexi mark clears the screen's side edges",
  );
  ok(
    PXL_PLEXI_MARK.down - plexiCap / 2 > 0.02 && PXL_PLEXI_MARK.down + plexiCap / 2 < 0.98,
    "and its top and bottom",
  );
});

/* ── The traced artwork — Phase 4.1 §5, §6, §8 ────────────────────────────*/

group("branding artwork", () => {
  /* §6 — THE RECONSTRUCTION IS MARKED AS ONE, AND CANNOT QUIETLY STOP BEING.
     The flag is asserted true rather than merely present: it goes false only in
     the commit that replaces the trace with Duna's own vector, and that commit
     has to come here and change this line, which puts the decision in front of
     a reviewer. */
  eq(
    PXL_DUNA_ARTWORK.provisional_brand_artwork,
    true,
    "the Duna script is marked as provisional brand artwork",
  );
  ok(
    PXL_DUNA_ARTWORK.disclaimer.includes("NOT"),
    "and carries a disclaimer saying what it is not",
  );
  ok(
    PXL_DUNA_ARTWORK.tracedFrom.startsWith("assets/source/pxl/"),
    "traced from a delivered file rather than from nothing",
  );

  /* THE TWO MARKS' PROPORTIONS, AGAINST THE PLATES' OWN.
     This is the assertion that would have caught Phase Four's condensed lockup:
     the plate's is 5.263 cap heights wide and the authored one was 1.98. */
  const platePxl =
    (PXL_MARK_PLATE.x1 - PXL_MARK_PLATE.x0 + 1) / (PXL_MARK_PLATE.y1 - PXL_MARK_PLATE.y0 + 1);
  ok(
    Math.abs(pxlLockupAspect() / platePxl - 1) < 0.03,
    `the lockup's aspect is the plate's ${platePxl.toFixed(3)} within 3%`,
  );
  const plateDuna =
    (PXL_DUNA_PLATE.x1 - PXL_DUNA_PLATE.x0 + 1) / (PXL_DUNA_PLATE.y1 - PXL_DUNA_PLATE.y0 + 1);
  ok(
    Math.abs(dunaAspect() / plateDuna - 1) < 0.03,
    `the script's aspect is the plate's ${plateDuna.toFixed(3)} within 3%`,
  );

  /* BOTH MARKS ARE AUTHORED ON A UNIT CAP HEIGHT WITH y UP. Everything
     downstream scales them by length and centres them, so an artwork whose box
     had drifted off the unit would silently resize the mark on the boat. */
  const lockupBox = pxlLockupBounds();
  eq(lockupBox.y0, 0, "the lockup's baseline is y = 0");
  eq(lockupBox.y1, 1, "and its cap line y = 1");
  const dunaBox = dunaBounds();
  ok(Math.abs(dunaBox.y0) < 0.01 && Math.abs(dunaBox.y1 - 1) < 0.01,
     "the script's own box is the unit cap height");
  ok(dunaBox.x0 >= 0 && dunaBox.x0 < 0.01, "and it starts at the origin");

  /* THE GLYPHS ARE CLOSED AND NON-TRIVIAL. A contour that lost a vertex to a
     careless edit triangulates into nothing and the mark simply disappears. */
  for (const glyph of pxlLockup()) {
    ok(glyph.outline.length >= 12, `${glyph.id} has an outline`);
    eq(glyph.outline.length % 2, 0, `${glyph.id}'s outline is a run of pairs`);
  }
  const { outlines, counters } = dunaContours();
  ok(outlines.length >= 1, "the script has at least one filled contour");
  for (const contour of [...outlines, ...counters]) {
    ok(contour.length >= 6, "every traced contour has enough vertices to fill");
    for (const point of contour) eq(point.length, 2, "and every vertex is a pair");
  }

  /* COST. §30 forbids a GLB or a texture per finish; what it costs instead is
     vertices, and the number is small enough to state. Two hundred and fifty is
     about a tenth of the smallest zone in the model. */
  ok(dunaVertexCount() < 600, `the traced script costs ${dunaVertexCount()} vertices`);
});

/* ── Reference calibration — Phase 4.1 §2, §14, §17 ───────────────────────*/

group("reference calibration", () => {
  /* THE PLATE-TO-MODEL MAPPING IS SELF-CONSISTENT.
     Both marks were located in plate pixels and both anchors were derived from
     them; the check is that mapping each anchor back through the calibration
     lands inside the plate's own measured box for that mark. A datum edited
     without re-deriving the anchors fails here. */
  const toPlateX = (x: number) =>
    PXL_SIDE_PLATE.transomPx + (x + PXL_MODEL.loa / 2) * PXL_SIDE_PLATE.pxPerMetre;

  const dunaPlateX = toPlateX(PXL_MOUNTS.dunaScript.x);
  ok(
    dunaPlateX > PXL_DUNA_PLATE.x0 - 12 && dunaPlateX < PXL_DUNA_PLATE.x1 + 12,
    "the Duna anchor maps back into the plate box the script was measured in",
  );

  /* THE SCRIPT LIES INSIDE THE CAPPING'S OWN DARK BAND. §4's "relationship to
     the black side band", as arithmetic: the band is 48 plate rows and the mark
     is 28, so there has to be clearance above and below. */
  const bandRows = PXL_DUNA_BAND_PLATE.bottom - PXL_DUNA_BAND_PLATE.top;
  const markRows = PXL_DUNA_PLATE.y1 - PXL_DUNA_PLATE.y0;
  ok(markRows < bandRows, "the script is shorter than the band it sits on");
  ok(
    PXL_DUNA_PLATE.y0 > PXL_DUNA_BAND_PLATE.top &&
      PXL_DUNA_PLATE.y1 < PXL_DUNA_BAND_PLATE.bottom,
    "and sits inside it with clearance at both edges",
  );
  ok(
    PXL_MOUNTS.dunaScript.y > 0.70 && PXL_MOUNTS.dunaScript.y < 0.90,
    "the anchor is on the capping rather than on the topsides",
  );

  /* §3 — THE MODEL IS THE SAME BOAT AS THE DRAWING.
     Quoted from `npm run reference`, and asserted so that a pipeline re-run that
     moved the hull fails the build rather than invalidating a table in a
     document nobody re-reads. */
  ok(
    Math.abs(PXL_PROFILE_AGREEMENT.depthPlate / PXL_PROFILE_AGREEMENT.depthModel - 1) < 0.05,
    "hull depth agrees with the plate within 5%",
  );
  ok(PXL_PROFILE_AGREEMENT.sheerMean < 0.08, "the sheer agrees within 80 mm on average");
  ok(PXL_PROFILE_AGREEMENT.keelMean < 0.08, "and the keel within 80 mm");

  /* §14 — THE DARK LOWER TREATMENT'S EDGE. The two sources agree on where the
     line sits as a fraction of the local depth, which is what the eye reads. */
  ok(
    Math.abs(
      PXL_PROFILE_AGREEMENT.bandFractionPlate - PXL_PROFILE_AGREEMENT.bandFractionModel,
    ) < 0.03,
    "the dark band's edge sits at the same fraction of depth in both sources",
  );

  /* §17 — THE CONSOLE'S STATION, AND WHICH REVISION THE MODEL FOLLOWS.
     The two delivered plates disagree with each other by a fifth of the boat's
     length. The model follows the later one, and this asserts that rather than
     leaving it as a claim in a comment. */
  const model = PXL_CONSOLE_STATION.model;
  const august = PXL_CONSOLE_STATION.augustPlate;
  ok(
    Math.abs(model[0] - august[0]) < 0.06 && Math.abs(model[1] - august[1]) < 0.06,
    "the console follows the August views sheet",
  );
  ok(
    Math.abs(model[0] - PXL_CONSOLE_STATION.julyPlate[0]) > 0.15,
    "and is a fifth of the hull away from the July profile drawing's",
  );

  /* §20, §21 — EVERY REFERENCE PLATE NAMES A CAMERA THAT EXISTS. */
  for (const plate of PXL_REFERENCE_PLATES) {
    ok(
      PXL_PRESET_BY_ID.has(plate.preset as never),
      `the ${plate.id} plate's camera preset ${plate.preset} exists`,
    );
    const [x, y, w, h] = plate.crop;
    ok(x >= 0 && y >= 0 && x + w <= 1.0001 && y + h <= 1.0001,
       `the ${plate.id} crop is inside its file`);
    ok(w > 0.1 && h > 0.1, `and is big enough to compare against`);
  }

  /* §9 — THE SCREEN IS SIZED BY THE CONSOLE, NOT BY A REMEMBERED NUMBER. */
  ok(PXL_SCREEN.height > 0 && PXL_SCREEN.height < 1, "the screen's height is a fraction");
  ok(PXL_SCREEN.width > 0 && PXL_SCREEN.width <= 1, "and so is its width");
  ok(PXL_SCREEN.frame * 2 < PXL_SCREEN.height * 0.756, "the frame does not swallow the glass");
  ok(PXL_SCREEN.thickness > 0.004 && PXL_SCREEN.thickness < 0.02,
     "the glazing is a plausible plexi section");
  ok(PXL_SCREEN.rake >= 0 && PXL_SCREEN.rake < 20, "and its rake is the plate's, not the console's");
});

/* ── URL state ─────────────────────────────────────────────────────────────*/

/** The exterior control, used throughout the URL and payload groups. */
const EXTERIOR: PxlCatalogControl = PXL_AVAILABLE_CONTROLS.find((c) => c.param === "exterior")!;
const LOWER: PxlCatalogControl = PXL_AVAILABLE_CONTROLS.find((c) => c.param === "lower")!;
const INTERIOR: PxlCatalogControl = PXL_AVAILABLE_CONTROLS.find((c) => c.param === "interior")!;
const PROPULSION: PxlCatalogControl =
  PXL_AVAILABLE_CONTROLS.find((c) => c.param === "propulsion")!;

/** `applyOption` against a slug, which is how every test below reads better. */
function pick(config: typeof PXL_DEFAULT_CONFIGURATION, control: PxlCatalogControl, slug: string) {
  return applyOption(config, control, optionBySlug(control, slug)!);
}

group("url state", () => {
  eq(serialiseConfiguration(PXL_DEFAULT_CONFIGURATION), "", "the default boat has a clean URL");

  const navy = pick(PXL_DEFAULT_CONFIGURATION, EXTERIOR, "navy");
  eq(serialiseConfiguration(navy), "exterior=navy", "a choice serialises to one parameter");

  /* §A21 — EVERY CATEGORY IN THE URL, in the documented shape. */
  let full = pick(PXL_DEFAULT_CONFIGURATION, EXTERIOR, "navy");
  full = pick(full, LOWER, "body");
  full = pick(full, INTERIOR, "light");
  full = pick(full, PROPULSION, "electric");
  eq(
    serialiseConfiguration(full),
    "exterior=navy&lower=body&interior=light&propulsion=electric",
    "a full configuration serialises to one short parameter per control",
  );
  const round = parseConfiguration(serialiseConfiguration(full)).configuration;
  eq(round.exterior.hullPrimary, "pxl_navy", "and round-trips the exterior");
  eq(round.exterior.lowerTreatment, "body", "the lower-hull treatment");
  eq(round.interior.primary, "pxl_interior_light", "the interior");
  eq(round.propulsion.variant, "electric", "and the drive");

  /* §A21 — INVALID VALUES SANITISE INDEPENDENTLY. The property that matters
     most in practice, because the URLs that arrive broken are the ones somebody
     forwarded, truncated or hand-edited. Four correct choices must survive a
     fifth being nonsense. */
  const partial = parseConfiguration(
    "exterior=navy&lower=chartreuse&interior=cognac&propulsion=electric",
  );
  eq(partial.configuration.exterior.hullPrimary, "pxl_navy", "a valid exterior survives...");
  eq(partial.configuration.interior.primary, "pxl_interior_cognac", "...and a valid interior...");
  eq(partial.configuration.propulsion.variant, "electric", "...and a valid drive...");
  eq(
    partial.configuration.exterior.lowerTreatment,
    PXL_DEFAULT_CONFIGURATION.exterior.lowerTreatment,
    "...while only the invalid field falls back",
  );
  eq(partial.rejected, ["lower"], "and only that one is reported");

  // Round trip.
  const back = parseConfiguration(serialiseConfiguration(navy));
  eq(back.configuration.exterior.hullPrimary, "pxl_navy", "a URL round-trips");
  eq(back.rejected, [], "a valid URL rejects nothing");

  // §6: unknown values fall back to the default AND are reported so the
  // address bar can be corrected.
  const bad = parseConfiguration("exterior=invalid-value");
  eq(
    bad.configuration.exterior.hullPrimary,
    PXL_DEFAULT_CONFIGURATION.exterior.hullPrimary,
    "an unknown colour falls back to the default",
  );
  eq(bad.rejected, ["exterior"], "and the parameter is reported as rejected");

  const reserved = parseConfiguration("exterior=gold&equipment=radar&accessories=tender");
  eq(reserved.configuration.exterior.hullPrimary, "pxl_gold", "valid parameters still apply");
  eq(
    reserved.rejected,
    ["equipment", "accessories"],
    "reserved parameters are rejected, not stored",
  );

  eq(parseConfiguration(null).configuration, PXL_DEFAULT_CONFIGURATION, "no query is the default");
  eq(parseConfiguration("").configuration, PXL_DEFAULT_CONFIGURATION, "empty query is the default");
  eq(parseConfiguration("nonsense").rejected, [], "an unrelated query is ignored quietly");

  // Case and whitespace are a human typing, not an attack.
  eq(
    parseConfiguration("exterior=%20NAVY%20").configuration.exterior.hullPrimary,
    "pxl_navy",
    "slugs are matched case- and space-insensitively",
  );

  eq(configurationToParams(navy).get("exterior"), "navy", "params carry the slug, not the id");
});

/* ── Sharing, and the URL as a whole ───────────────────────────────────────*/

group("share links", () => {
  const navy = pick(PXL_DEFAULT_CONFIGURATION, EXTERIOR, "navy");
  const gold = pick(PXL_DEFAULT_CONFIGURATION, EXTERIOR, "gold");

  // §27: a valid configuration produces a deterministic link that reopens it.
  const link = applyConfigurationToHref(
    "https://dunahajok.hu/preview/pxl/configure",
    navy,
  );
  eq(link, "https://dunahajok.hu/preview/pxl/configure?exterior=navy", "an absolute share link");
  eq(
    parseConfiguration(new URL(link).search).configuration.exterior.hullPrimary,
    "pxl_navy",
    "and it reopens the same boat",
  );
  eq(
    applyConfigurationToHref(link, navy),
    link,
    "writing the same configuration twice is idempotent",
  );

  // §26: unrelated parameters survive. The development bench uses `?debug=1`,
  // and a share link that dropped it would behave differently from the page it
  // was copied on.
  eq(
    applyConfigurationToHref("/preview/pxl/configure?debug=1", navy),
    "/preview/pxl/configure?debug=1&exterior=navy",
    "unrelated parameters are preserved",
  );
  eq(
    applyConfigurationToHref("/preview/pxl/configure?exterior=navy&debug=1", gold),
    "/preview/pxl/configure?debug=1&exterior=gold",
    "a stale configuration parameter is replaced, not appended",
  );
  eq(
    applyConfigurationToHref("/preview/pxl/configure?exterior=navy#stern", gold),
    "/preview/pxl/configure?exterior=gold#stern",
    "the fragment survives",
  );

  // §29: RESET clears what this configurator owns and nothing else. Not the
  // same operation as "serialise the default", even though the two agree today.
  eq(
    clearConfigurationFromHref(
      "/preview/pxl/configure?exterior=navy&interior=black&propulsion=large&utm_source=x",
    ),
    "/preview/pxl/configure?utm_source=x",
    "reset drops EVERY category and keeps the rest (§A22)",
  );
  eq(
    clearConfigurationFromHref("/preview/pxl/configure"),
    "/preview/pxl/configure",
    "resetting an already-default URL leaves it alone",
  );

  // Route hydration: what the store is handed on a cold load of a shared link.
  const hydrated = parseConfiguration("?exterior=gold&debug=1");
  eq(hydrated.configuration.exterior.hullPrimary, "pxl_gold", "a cold load hydrates from the URL");
  eq(hydrated.rejected, [], "and rejects nothing it was not asked about");
});

/* ── Summary ───────────────────────────────────────────────────────────────*/

group("summary", () => {
  const lines = summariseConfiguration(PXL_DEFAULT_CONFIGURATION);

  /* §A20 — THE SUMMARY IS DERIVED, so its length is the number of controls
     rather than a number written down here. If a control is ever added and
     this stops matching, the summary has silently stopped describing the boat.  */
  eq(
    lines.length,
    PXL_AVAILABLE_CONTROLS.length,
    "the summary has exactly one line per available control",
  );
  eq(
    lines.map((l) => l.category),
    ["exterior", "hull_detail", "interior", "interior", "interior", "propulsion"],
    "grouped by category, with INTERIOR contributing three",
  );
  eq(lines[0].value, "Sage Green", "and prints the working name on a preview surface");
  eq(lines[0].slug, "sage", "and carries the stable token");
  eq(lines[0].optionId, "pxl_sage", "and the internal key");
  eq(lines[0].approved, false, "and says the name is not approved");

  /* §A20 also asks that no component assemble the strings by hand, and the
     shape here is what enforces it: a line carries a LOCALISATION KEY rather
     than a label, so a component that wanted to hard-code "Hull detail: dark
     lower" would have to invent both halves. */
  for (const line of lines) {
    ok(line.labelKey.length > 0, `${line.control} carries a label key rather than a label`);
    ok(line.control.length > 0, "and names its control");
  }

  // The same summary, asked for a public surface, declines to name anything.
  // No component decides this — the data does.
  const publicLines = summariseConfiguration(PXL_DEFAULT_CONFIGURATION, "public");
  for (const line of publicLines) {
    eq(line.value, null, `a public surface gets no name for ${line.control}`);
    ok(line.slug.length > 0, "but still gets the stable token");
  }

  /* A configured boat is described in full. This is what the request payload
     and the screen-reader line are both built from. */
  let full = pick(PXL_DEFAULT_CONFIGURATION, LOWER, "body");
  full = pick(full, PROPULSION, "electric");
  const configured = summariseConfiguration(full);
  eq(
    configured.find((l) => l.control === "lower")?.slug,
    "body",
    "the summary reflects the lower-hull treatment",
  );
  eq(
    configured.find((l) => l.control === "propulsion")?.slug,
    "electric",
    "and the fitted drive",
  );
});

/* ── Publication safety ────────────────────────────────────────────────────*/

group("publication", () => {
  // The two built PXL routes are the customer-facing experience for a product
  // the yard has not announced. Both must be under a disallowed prefix.
  ok(isUnindexedRoute(PXL_ROUTES.preview), "the preview product page is unindexed");
  ok(isUnindexedRoute(PXL_ROUTES.previewConfigure), "the preview configurator is unindexed");
  ok(isUnindexedRoute(PXL_ROUTES.inspect), "the development bench is unindexed");

  // And the reserved public routes are NOT — they are where this goes when it
  // is published, and a disallow left in place would quietly bury the launch.
  ok(!isUnindexedRoute(PXL_ROUTES.product), "the reserved product route is indexable");
  ok(!isUnindexedRoute(PXL_ROUTES.configure), "the reserved configurator route is indexable");

  eq(PREVIEW_ROBOTS.index, false, "preview pages are noindex");
  eq(PREVIEW_ROBOTS.follow, false, "preview pages are nofollow");
  eq(PREVIEW_ROBOTS.noimageindex, true, "and their images are not indexed either");
  eq(PREVIEW_ROBOTS.nosnippet, true, "and no snippet may be cached");

  for (const prefix of UNINDEXED_PREFIXES) {
    ok(prefix.startsWith("/") && prefix.endsWith("/"), `"${prefix}" is a path prefix`);
  }

  // §53 again, at the range level: this is the switch a public surface reads
  // to decide whether it may print names at all.
  eq(
    rangeIsPubliclyNameable(PXL_EXTERIOR_FINISHES),
    false,
    "the exterior range is not publicly nameable — colour names remain a blocker",
  );
});

/* ── Site architecture — Part B ────────────────────────────────────────────*/

group("site architecture", () => {
  /* EVERY ROUTE IS DECLARED ONCE AND ADDRESSED ONCE. A duplicate path is two
     pages competing for one canonical, which is the SEO failure that is
     hardest to see and easiest to introduce. */
  const paths = ROUTE_LIST.map((r) => r.path);
  eq(new Set(paths).size, paths.length, "every route path is unique");
  for (const route of ROUTE_LIST) {
    ok(route.path.startsWith("/"), `${route.id} is an absolute path`);
    ok(!route.path.endsWith("/") || route.path === "/", `${route.id} has no trailing slash`);
    ok(!/[A-Z_ ]/.test(route.path), `${route.id} is lowercase and hyphenated`);
  }

  /* §B2's last line, and the single most important assertion in this group:
     THE UNPUBLISHED PRODUCT CANNOT REACH A PUBLIC SURFACE. Three separate
     mechanisms have to agree, and this checks all three against each other. */
  for (const route of ROUTE_LIST) {
    ok(
      !isUnindexedRoute(route.path),
      `${route.id} is not under a disallowed prefix — the route table is public routes only`,
    );
  }
  ok(
    !ROUTE_LIST.some((r) => r.path.includes("pxl")),
    "no PXL route is in the public route table",
  );
  ok(
    INDEXABLE_ROUTES.every((r) => r.built && r.indexable),
    "the sitemap source is built and indexable routes only",
  );

  /* §B19 — EVERY NAVIGATION DESTINATION RESOLVES TO A DECLARED ROUTE.
     Phase One's nav pointed at homepage anchors because the pages did not
     exist. Phase Four's points at routes, and a link to a page nobody built is
     a 404 that only appears in production. */
  const declared = new Set(paths);
  for (const item of NAV) {
    const base = item.href.split("#")[0];
    ok(declared.has(base), `nav "${item.label}" points at a declared route (${item.href})`);
    for (const child of item.children ?? []) {
      const childBase = child.href.split("#")[0];
      ok(
        declared.has(childBase),
        `nav "${item.label} / ${child.label}" points at a declared route (${child.href})`,
      );
    }
  }
  ok(
    !NAV.some((item) => item.href.includes("pxl")),
    "the navigation does not link to the PXL while it is unpublished",
  );

  /* §B26 — WEBGL IS ON THE ROUTES THAT USE IT AND NOWHERE ELSE. The route
     table is what the performance audit reads; a route that gained a scene
     without gaining the flag would be a route whose bundle nobody is watching. */
  const webgl = ROUTE_LIST.filter((r) => r.webgl).map((r) => r.id);
  eq(webgl, ["home"], "only the homepage carries a WebGL scene among public routes");

  /* §B22 — every route declares a character, and the vocabulary is closed. */
  const tones = new Set(ROUTE_LIST.map((r) => r.tone));
  ok(tones.size >= 4, `the site uses ${tones.size} page characters, not one`);

  /* The immersive test still answers correctly for the configurator, which is
     what the route transition uses to stand down. */
  ok(isImmersiveRoute(PXL_ROUTES.previewConfigure), "the configurator is an immersive route");
  ok(!isImmersiveRoute(ROUTES.boats.path), "an editorial route is not");
});

/* ── Editorial honesty — §B14, §B16, §B12 ─────────────────────────────────*/

group("editorial content", () => {
  /* §B14 and §B16: both arrays are empty, and that is the deliverable. These
     assertions are not asserting emptiness forever — they are asserting that
     if an entry appears, it is COMPLETE. The day somebody adds a case study
     with no story or an article with no body, this fails. */
  for (const project of PROJECTS) {
    ok(project.slug.length > 0 && /^[a-z0-9-]+$/.test(project.slug),
       `project "${project.title}" has a URL-safe slug`);
    ok(project.summary.length > 20, `project "${project.title}" has a real summary`);
    ok(
      Boolean(project.story?.length || project.process?.length),
      `project "${project.title}" has a story or a process — not just a hero`,
    );
  }
  for (const article of JOURNAL) {
    ok(/^\d{4}-\d{2}-\d{2}/.test(article.date), `article "${article.title}" has an ISO date`);
    ok(article.body.length > 0, `article "${article.title}" has a body`);
    ok(article.standfirst.length > 20, `article "${article.title}" has a standfirst`);
  }

  /* §B12, §B13 — THE SUZUKI SECTION MAY NOT OVERSTATE THE RELATIONSHIP.
     One approved form of words, used everywhere, and a scan of every string
     the section can print for the words that would upgrade it. */
  ok(
    /dealership and service point/i.test(SUZUKI.status),
    "the relationship is stated as dealership and service point",
  );
  const suzukiStrings = [
    SUZUKI.lede,
    SUZUKI.status,
    ...SUZUKI.headline,
    ...SUZUKI.sections.flatMap((s) => [s.title, s.lede, ...s.body, ...(s.facts ?? [])]),
  ];
  for (const text of suzukiStrings) {
    ok(!/\bpartnership with suzuki\b/i.test(text), `"${text.slice(0, 40)}…" claims no partnership`);
    ok(!/\bin collaboration\b/i.test(text), `"${text.slice(0, 40)}…" claims no collaboration`);
    ok(!/\bendorse/i.test(text), `"${text.slice(0, 40)}…" claims no endorsement`);
    ok(!/\bofficial partner\b/i.test(text), `"${text.slice(0, 40)}…" does not say official partner`);
    // No engine model numbers. The source site publishes one power figure for
    // the Kadét and no model at all; a DF-anything here would be invented.
    ok(!/\bdf\s?\d/i.test(text), `"${text.slice(0, 40)}…" names no engine model`);
  }
  ok(SUZUKI_BLOCKERS.length >= 3, "the section records what it cannot yet say");
});

/* ── Material roles ────────────────────────────────────────────────────────*/

group("material roles", () => {
  eq(PXL_ZONES.length, 13, "thirteen zones, one per mesh in the GLB");

  const zoneIds = PXL_ZONES.map((z) => z.id);
  eq(new Set(zoneIds).size, zoneIds.length, "zone ids are unique");

  for (const z of PXL_ZONES) ok(z.role.length > 0, `${z.id} declares a material role`);

  // §3: the configurable surface is reachable by role, not by index.
  eq(
    zonesForRole("EXTERIOR_HULL"),
    ["hull_primary", "deck_trim"],
    "EXTERIOR_HULL binds the topsides and the deck panels together",
  );
  eq(channelForRole("EXTERIOR_HULL"), "hullPrimary", "and resolves to the exterior channel");
  eq(
    finishForRole(PXL_DEFAULT_CONFIGURATION, "EXTERIOR_HULL"),
    "pxl_sage",
    "role resolution reaches the finish",
  );
  // The outboard must never follow the hull. §10.
  ok(
    finishForRole(PXL_DEFAULT_CONFIGURATION, "PROPULSION") !==
      finishForRole(PXL_DEFAULT_CONFIGURATION, "EXTERIOR_HULL"),
    "PROPULSION does not follow the hull colour",
  );
  eq(finishForRole(PXL_DEFAULT_CONFIGURATION, "HELM"), null, "an unconfigurable role has no finish");

  eq(zonesForChannel("glazing"), [], "the declared-but-unbound glazing channel paints nothing");

  /* Phase Four split the stern moulding off `hullLower` so that FULL BODY
     COLOUR could repaint the bottom without repainting the mark's ground. The
     two channels must stay bound to different meshes. */
  eq(zonesForChannel("hullLower"), ["hull_lower"], "the bottom is its own channel");
  eq(zonesForChannel("sternMoulding"), ["transom_black"], "and so is the stern moulding");

  // §83: replacing the console must touch the console and nothing else.
  for (const zone of PXL_CONSOLE_ZONES) {
    ok(zoneIds.includes(zone), `${zone} exists and is part of the console swap set`);
  }
  ok(!PXL_CONSOLE_ZONES.includes("hull_primary" as never), "the swap set excludes the hull");

  // Component visibility.
  ok(
    !zoneVisible(PXL_DEFAULT_CONFIGURATION, "accessory_cockpit_cover"),
    "the cockpit cover is hidden by default — it is in no reference render",
  );
  ok(zoneVisible(PXL_DEFAULT_CONFIGURATION, "hull_primary"), "the hull is visible by default");
});

/* ── Camera presets ────────────────────────────────────────────────────────*/

group("camera presets", () => {
  const ids = PXL_PRESETS.map((p) => p.id);
  eq(new Set(ids).size, ids.length, "preset ids are unique");
  ok(PXL_PRESET_BY_ID.has(PXL_DEFAULT_PRESET), "the default preset exists");

  for (const id of PXL_CONFIGURATOR_VIEWS) {
    ok(PXL_PRESET_BY_ID.has(id), `the configurator's "${id}" view has a preset behind it`);
  }
  ok(
    !PXL_CONFIGURATOR_VIEWS.includes("detail"),
    "the detail view is withheld — its subject is the superseded console (§13)",
  );

  const derived = PXL_PRESETS.filter((p) => p.derived);
  eq(derived.length, 1, "exactly one derived preset");
  eq(derived[0].id, "free", "and it is FREE");

  // §13: the rail offers the authored compositions and never the mode. A
  // button labelled "Free" appears to do nothing when pressed, which is worse
  // than no button — and this is derived, so a future mode cannot become a
  // chip by being added to a list.
  eq(
    PXL_CONFIGURATOR_VIEW_CONTROLS,
    ["hero_3q", "side", "bow_3q", "stern_3q", "interior"],
    "the five authored views are offered as controls",
  );
  ok(
    !PXL_CONFIGURATOR_VIEW_CONTROLS.includes("free"),
    "and FREE is not among them — it is a state, not an instruction",
  );
  for (const id of PXL_CONFIGURATOR_VIEW_CONTROLS) {
    ok(PXL_CONFIGURATOR_VIEWS.includes(id), `"${id}" is a view the camera can hold`);
  }

  for (const p of PXL_PRESETS) {
    const d = p.desktop;
    ok(d.distance > 0, `${p.id} stands somewhere`);
    ok(d.hfov > 8 && d.hfov < 80, `${p.id} uses a plausible lens`);
    ok(d.minVfov >= 0 && d.minVfov < 62, `${p.id} declares a usable vertical floor`);
    // §19: no preset may put the camera under the water or over the pole.
    ok(
      d.elevation >= PXL_ORBIT_LIMITS.minElevation && d.elevation <= PXL_ORBIT_LIMITS.maxElevation,
      `${p.id} sits inside the orbit's own elevation limits`,
    );
    ok(
      d.distance >= PXL_ORBIT_LIMITS.minDistance && d.distance <= PXL_ORBIT_LIMITS.maxDistance,
      `${p.id} sits inside the orbit's own distance limits`,
    );
    const m = { ...d, ...p.mobile };
    ok(m.distance > 0 && m.hfov > 8, `${p.id} has a usable mobile composition`);
  }

  // §16: the profile view is the one that clipped the bow in Phase 2.5. It is
  // dead abeam by definition, and a preset that has drifted off zero azimuth is
  // no longer the shot design decisions get checked in.
  eq(PXL_PRESET_BY_ID.get("side")?.desktop.azimuth, 0, "profile is exactly abeam");

  // A vertical floor is needed by exactly the presets that look STEEPLY DOWN,
  // where the subject's projection is nearly square and a fixed horizontal angle
  // lets the derived vertical one collapse. Two do: the cockpit view and the
  // reference top three-quarter that Phase 4.1 added beside it. If another one
  // gains a steep elevation later it will need one too, and this is where that
  // gets noticed — so the assertion is the RULE rather than the list.
  for (const preset of PXL_PRESETS) {
    const steep = preset.desktop.elevation >= 30;
    eq(
      preset.desktop.minVfov > 0,
      steep,
      `${preset.id} declares a vertical floor exactly when it looks steeply down`,
    );
  }
});

/* ── Analytics ─────────────────────────────────────────────────────────────*/

group("analytics contract", () => {
  const seen: PxlAnalyticsEvent[] = [];

  // Nothing is installed by default, and `track` must be safe to call anyway —
  // §60: the events are defined now so that adding a provider later is wiring.
  track({ name: "pxl_reset", from: "exterior=navy" });
  eq(seen.length, 0, "with no sink installed, nothing is recorded anywhere");

  setAnalyticsSink((event) => seen.push(event));
  track({ name: "pxl_finish_change", category: "exterior", from: "sage", to: "navy" });
  eq(seen.length, 1, "an installed sink receives events");
  eq(seen[0].name, "pxl_finish_change", "under the documented name");

  // A provider that throws is a provider that throws. It is not a reason for a
  // swatch to stop working, and a configurator that breaks because a tag
  // manager 404'd is the most avoidable outage on a marketing site.
  setAnalyticsSink(() => {
    throw new Error("provider exploded");
  });
  let threw = false;
  try {
    track({ name: "pxl_share", query: "exterior=navy", method: "clipboard" });
  } catch {
    threw = true;
  }
  ok(!threw, "a failing provider cannot break the configurator");

  setAnalyticsSink(null);
});

/* ── The request flow ──────────────────────────────────────────────────────*/

group("request payload", () => {
  const PRODUCT = { id: "pxl", name: "Duna PXL", published: false } as const;
  let navy = pick(PXL_DEFAULT_CONFIGURATION, EXTERIOR, "navy");
  navy = pick(navy, LOWER, "body");
  navy = pick(navy, PROPULSION, "electric");
  const payload = buildPxlRequestPayload({
    product: PRODUCT,
    configuration: navy,
    contact: { name: "Anna Kovács", email: "anna@example.com", phone: "  ", message: "" },
    configurationUrl: "https://dunahajok.hu/preview/pxl/configure?exterior=navy",
    sourcePage: PXL_ROUTES.previewConfigure,
    createdAt: "2026-08-13T09:00:00.000Z",
  });

  eq(payload.version, 1, "the payload is versioned — a stored lead outlives the code");
  eq(payload.productId, "pxl", "it names the product");
  eq(
    payload.query,
    "exterior=navy&lower=body&propulsion=electric",
    "it carries the canonical serialisation",
  );
  /* §A23 — EVERY CATEGORY IS IN THE PAYLOAD, and by derivation rather than by
     a list somebody has to remember to extend. */
  eq(
    payload.selections.length,
    PXL_AVAILABLE_CONTROLS.length,
    "one selection per control, derived from the catalogue",
  );
  eq(payload.selections[0].slug, "navy", "by its stable token");
  eq(payload.selections[0].optionId, "pxl_navy", "and its internal key");
  eq(payload.selections[0].labelApproved, false, "flagged as an unapproved name");
  eq(
    payload.selections.find((s) => s.control === "lower")?.slug,
    "body",
    "the lower-hull treatment travels",
  );
  eq(
    payload.selections.find((s) => s.control === "propulsion")?.slug,
    "electric",
    "and so does the drive",
  );
  ok(!("snapshot" in payload), "and no snapshot is invented when none was produced");
  eq(payload.productPublished, false, "and records that the product is unpublished");
  eq(payload.createdAt, "2026-08-13T09:00:00.000Z", "the timestamp is supplied, not read");

  // Whitespace-only optional fields are absent rather than empty. A lead with
  // `phone: "  "` is a lead somebody will try to ring.
  ok(!("phone" in payload.contact), "a blank phone number is omitted entirely");
  ok(!("message" in payload.contact), "so is a blank message");

  // §46/§47: the payload must not carry a commercial claim of any kind. This
  // is a shape assertion rather than a value one on purpose — it fails when
  // someone ADDS a field, which is when the mistake actually happens.
  const forbidden = ["price", "total", "deposit", "leadTime", "availability", "specs",
                     "power", "horsepower", "kw", "speed", "range"];
  for (const key of forbidden) {
    ok(!(key in payload), `the payload carries no "${key}"`);
  }

  // The payload round-trips back into a configuration. This is what makes a
  // lead from eighteen months ago re-openable.
  const rebuilt = parseConfiguration(payload.query).configuration;
  eq(rebuilt.exterior.hullPrimary, "pxl_navy", "the stored query rebuilds the boat");
  eq(rebuilt.exterior.lowerTreatment, "body", "including its lower-hull treatment");
  eq(rebuilt.propulsion.variant, "electric", "and its drive");

  // §33: the customer never re-enters the configuration, so the message has to
  // contain it already.
  const message = requestPayloadAsMessage(payload);
  ok(message.body.includes("navy"), "the message names the finish by its token");
  ok(message.body.includes(payload.configurationUrl), "and carries the permalink");
  ok(message.body.includes("Anna Kovács"), "and the person asking");
  ok(
    message.body.includes("working name"),
    "and marks the colour name as provisional rather than presenting it as the range",
  );

  const mailto = requestMailtoHref(payload, "info@dunahajok.hu");
  ok(mailto.startsWith("mailto:info@dunahajok.hu?"), "the mailto is addressed to the yard");
  ok(mailto.includes(encodeURIComponent("exterior=navy")), "with the configuration encoded");
});

group("request validation", () => {
  eq(validatePxlRequest({ name: "Anna", email: "a@b.co" }), [], "a name and an address suffice");
  eq(validatePxlRequest({ name: "", email: "a@b.co" }), ["name"], "a missing name is caught");
  eq(validatePxlRequest({ name: " A ", email: "a@b.co" }), ["name"], "and so is a one-letter one");
  eq(validatePxlRequest({ name: "Anna", email: "nope" }), ["email"], "a non-address is caught");
  eq(
    validatePxlRequest({ name: "", email: "" }),
    ["name", "email"],
    "both problems are reported at once, not one at a time",
  );
  // §33: nothing else is required. Every additional required field is a
  // decision that the yard would rather lose an enquiry than receive it
  // incomplete, and nobody at the yard has made that decision.
  eq(
    validatePxlRequest({ name: "Anna", email: "a@b.co", phone: "", message: "" }),
    [],
    "phone and message are genuinely optional",
  );
});

group("request destination", () => {
  // §32: there is no approved destination, and the type system knows it.
  eq(PXL_REQUEST_DESTINATION.kind, "none", "no sales destination is configured");

  // The assertion that matters: submitting performs NO network call and does
  // NOT report success. `fetch` is replaced with a tripwire — if the transport
  // ever starts posting to an unapproved endpoint, this test is what says so.
  let called = false;
  const original = globalThis.fetch;
  globalThis.fetch = (() => {
    called = true;
    throw new Error("the request flow must not call fetch without an approved destination");
  }) as typeof fetch;

  const payload = buildPxlRequestPayload({
    product: { id: "pxl", name: "Duna PXL", published: false },
    configuration: PXL_DEFAULT_CONFIGURATION,
    contact: { name: "Anna", email: "a@b.co" },
    configurationUrl: "https://dunahajok.hu/preview/pxl/configure",
    sourcePage: PXL_ROUTES.previewConfigure,
    createdAt: new Date(0).toISOString(),
  });

  // The one asynchronous assertion in the suite, so the summary is printed
  // from its continuation rather than at the end of the file — see `finish`.
  void submitPxlRequest(payload)
    .then((result) => {
      eq(result.status, "no-destination", "submitting reports that there is nowhere to send it");
      ok(!called, "and no request left the machine");
    })
    .catch((error) => {
      ok(false, `submitting threw instead of reporting: ${String(error)}`);
    })
    .finally(() => {
      globalThis.fetch = original;
      finish();
    });
});

/* ── Result ────────────────────────────────────────────────────────────────*/

/**
 * Print the summary and set the exit code.
 *
 * Called from the one asynchronous group rather than at the end of the file:
 * everything else here is synchronous, so by the time that promise settles
 * every other assertion has already run. Putting the summary at the bottom of
 * the module instead would report a pass before the last group had finished —
 * a green suite that has not run all its tests being the worst possible
 * outcome for a file whose job is to say what is true.
 */
function finish(): void {
  console.log("");
  if (failures) {
    console.error(`${failures} of ${checks} checks failed`);
    process.exit(1);
  }
  console.log(`${checks} checks passed`);
}
