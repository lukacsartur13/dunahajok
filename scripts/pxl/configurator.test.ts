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
  finishBySlug,
  finishLabel,
  rangeIsPubliclyNameable,
} from "../../src/webgl/scenes/pxl/pxlPalette";
import {
  PXL_AVAILABLE_CATEGORIES,
  PXL_CATEGORIES,
  PXL_DEFAULT_CONFIGURATION,
  applyConfigurationToHref,
  clearConfigurationFromHref,
  configurationToParams,
  finishForRole,
  parseConfiguration,
  serialiseConfiguration,
  summariseConfiguration,
  zoneVisible,
} from "../../src/webgl/scenes/pxl/pxlConfig";
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
  isUnindexedRoute,
} from "../../src/content/publication";
import {
  setAnalyticsSink,
  track,
  type PxlAnalyticsEvent,
} from "../../src/lib/analytics";
import {
  PXL_CONSOLE_ZONES,
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
  const slugs = PXL_ALL_FINISHES.map((f) => f.slug);
  eq(new Set(slugs).size, slugs.length, "every slug is unique across the palette");

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

/* ── Categories ────────────────────────────────────────────────────────────*/

group("categories", () => {
  eq(PXL_AVAILABLE_CATEGORIES.length, 1, "exactly one category is offered (§8)");
  eq(PXL_AVAILABLE_CATEGORIES[0].id, "exterior", "and it is exterior colour");

  // §48: the configurator renders this list, so an unavailable category
  // reaching it is a fake tab on screen. Both conditions are asserted rather
  // than the filter being trusted — the filter is one line and could be
  // loosened by someone who does not know why it is there.
  for (const c of PXL_AVAILABLE_CATEGORIES) {
    eq(c.unavailable, null, `${c.id} is genuinely available`);
    ok(c.options.length > 0, `${c.id} has real options behind it`);
    // A category that cannot round-trip its own default is a category whose
    // URL parameter is decorative.
    const written = c.write(PXL_DEFAULT_CONFIGURATION, c.options[0].id);
    eq(c.read(written), c.options[0].id, `${c.id} reads back what it writes`);
    ok(PXL_DEFAULT_CONFIGURATION !== written, `${c.id}.write does not mutate its argument`);
  }

  // The unavailable ones are declared but unreachable. If this ever equals the
  // full list, something has started offering categories with no data.
  ok(
    PXL_AVAILABLE_CATEGORIES.length < PXL_CATEGORIES.length,
    "reserved categories are declared without being offered",
  );

  const params = PXL_CATEGORIES.map((c) => c.param);
  eq(new Set(params).size, params.length, "every URL parameter is unique");

  for (const c of PXL_CATEGORIES) {
    if (c.unavailable === null) continue;
    eq(c.options.length, 0, `${c.id} offers nothing while unavailable`);
    ok(c.unavailable.length > 12, `${c.id} says why it is unavailable`);
    // An unavailable category must be inert, not merely hidden.
    const after = c.write(PXL_DEFAULT_CONFIGURATION, "pxl_navy");
    eq(after, PXL_DEFAULT_CONFIGURATION, `${c.id}.write is a no-op`);
  }
});

/* ── URL state ─────────────────────────────────────────────────────────────*/

group("url state", () => {
  eq(serialiseConfiguration(PXL_DEFAULT_CONFIGURATION), "", "the default boat has a clean URL");

  const navy = PXL_AVAILABLE_CATEGORIES[0].write(PXL_DEFAULT_CONFIGURATION, "pxl_navy");
  eq(serialiseConfiguration(navy), "exterior=navy", "a choice serialises to one parameter");

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

  const reserved = parseConfiguration("exterior=gold&engine=v8&upholstery=tan");
  eq(reserved.configuration.exterior.hullPrimary, "pxl_gold", "valid parameters still apply");
  eq(reserved.rejected, ["upholstery", "engine"], "reserved parameters are rejected, not stored");

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
  const navy = PXL_AVAILABLE_CATEGORIES[0].write(PXL_DEFAULT_CONFIGURATION, "pxl_navy");
  const gold = PXL_AVAILABLE_CATEGORIES[0].write(PXL_DEFAULT_CONFIGURATION, "pxl_gold");

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
    clearConfigurationFromHref("/preview/pxl/configure?exterior=navy&utm_source=x"),
    "/preview/pxl/configure?utm_source=x",
    "reset drops the configuration and keeps the rest",
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
  eq(lines.length, 1, "the summary has one line, matching the one category");
  eq(lines[0].category, "exterior", "and it names the category by id, not by label");
  eq(lines[0].value, "Sage Green", "and prints the working name on a preview surface");
  eq(lines[0].slug, "sage", "and carries the stable token");
  eq(lines[0].finishId, "pxl_sage", "and the internal key");
  eq(lines[0].approved, false, "and says the name is not approved");

  // §53's whole point: the same summary, asked for a public surface, declines
  // to name the colour. No component decides this — the data does.
  const publicLines = summariseConfiguration(PXL_DEFAULT_CONFIGURATION, "public");
  eq(publicLines[0].value, null, "a public surface gets no colour name at all");
  eq(publicLines[0].slug, "sage", "but still gets the stable token");

  // The summary expands by itself. If a second category is ever switched on
  // and this is still 1, the summary silently stopped describing the boat.
  eq(
    summariseConfiguration(PXL_DEFAULT_CONFIGURATION).length,
    PXL_AVAILABLE_CATEGORIES.length,
    "the summary has exactly one line per available category",
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

  eq(zonesForChannel("upholsteryPrimary"), [], "declared-but-unbound channels paint nothing");
  eq(zonesForChannel("glazing"), [], "the glazing channel is unbound");

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

  // The cockpit view is the only one that needs a vertical floor. If another
  // one gains a steep elevation later it will need one too, and this is where
  // that gets noticed.
  const floored = PXL_PRESETS.filter((p) => p.desktop.minVfov > 0).map((p) => p.id);
  eq(floored, ["interior"], "only the cockpit view declares a vertical floor");
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
  const navy = PXL_AVAILABLE_CATEGORIES[0].write(PXL_DEFAULT_CONFIGURATION, "pxl_navy");
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
  eq(payload.query, "exterior=navy", "it carries the canonical serialisation");
  eq(payload.selections.length, 1, "one selection, matching the one real category");
  eq(payload.selections[0].slug, "navy", "by its stable token");
  eq(payload.selections[0].finishId, "pxl_navy", "and its internal key");
  eq(payload.selections[0].labelApproved, false, "flagged as an unapproved name");
  eq(payload.productPublished, false, "and records that the product is unpublished");
  eq(payload.createdAt, "2026-08-13T09:00:00.000Z", "the timestamp is supplied, not read");

  // Whitespace-only optional fields are absent rather than empty. A lead with
  // `phone: "  "` is a lead somebody will try to ring.
  ok(!("phone" in payload.contact), "a blank phone number is omitted entirely");
  ok(!("message" in payload.contact), "so is a blank message");

  // §46/§47: the payload must not carry a commercial claim of any kind. This
  // is a shape assertion rather than a value one on purpose — it fails when
  // someone ADDS a field, which is when the mistake actually happens.
  const forbidden = ["price", "total", "deposit", "leadTime", "availability", "specs"];
  for (const key of forbidden) {
    ok(!(key in payload), `the payload carries no "${key}"`);
  }

  // The payload round-trips back into a configuration. This is what makes a
  // lead from eighteen months ago re-openable.
  eq(
    parseConfiguration(payload.query).configuration.exterior.hullPrimary,
    "pxl_navy",
    "the stored query rebuilds the boat",
  );

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
