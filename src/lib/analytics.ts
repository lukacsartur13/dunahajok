/**
 * The analytics seam.
 *
 * THERE IS NO ANALYTICS PROVIDER IN THIS PROJECT, and §60 is explicit that this
 * phase must not add one. What it asks for instead is a contract: a named set
 * of semantic events, defined once, so that wiring a provider later is an
 * implementation of `PxlAnalyticsSink` rather than a search through components
 * for the places something interesting happens.
 *
 * So this file is a list of events and a `track` that, by default, does
 * nothing. That is not a placeholder — it is the correct behaviour for a site
 * with no consent banner, no provider and no data-processing agreement. A
 * default that silently queued events for a future flush would be a default
 * that starts collecting the moment somebody adds a provider, without anyone
 * deciding to.
 *
 * WHAT IS AND IS NOT IN A PAYLOAD. Slugs, preset ids and counts. No permalink
 * with a query string that could later carry a name, no free text from a form,
 * no identifiers of any kind. Every field below is derivable from state the
 * page already holds and describes the *product interaction*, not the person.
 */

/* ── The events ────────────────────────────────────────────────────────────*/

export type PxlAnalyticsEvent =
  /** The configurator became interactive. Once per entry. */
  | { name: "pxl_configurator_open"; surface: "preview"; entry: "direct" | "product" }
  /** An exterior finish was selected. Slugs, because they are the stable ids. */
  | { name: "pxl_finish_change"; category: string; from: string; to: string }
  /** A camera preset was chosen, or the viewer took the camera themselves. */
  | { name: "pxl_camera_change"; preset: string; source: "control" | "drag" }
  /** The configuration link was copied. `query` is the serialised choice. */
  | { name: "pxl_share"; query: string; method: "clipboard" | "share-sheet" }
  /** RESET returned the configuration to the delivered boat. */
  | { name: "pxl_reset"; from: string }
  /** The request flow was opened. Nothing is transmitted by opening it. */
  | { name: "pxl_request_start"; query: string }
  /** The immersive product-focus view was entered or left. */
  | { name: "pxl_focus"; on: boolean }
  /** A client-side snapshot was produced, or could not be. */
  | { name: "pxl_snapshot"; ok: boolean };

export type PxlAnalyticsSink = (event: PxlAnalyticsEvent) => void;

/* ── The seam ──────────────────────────────────────────────────────────────*/

let sink: PxlAnalyticsSink | null = null;

/**
 * Install the provider. Called by nobody today.
 *
 * One function, one module-level variable, no registry of subscribers: there is
 * exactly one analytics destination in any site that has one, and a fan-out
 * this file cannot test is a fan-out this file should not have.
 */
export function setAnalyticsSink(next: PxlAnalyticsSink | null): void {
  sink = next;
}

/**
 * Record an event, if anything is listening.
 *
 * Never throws. A provider that fails is a provider that fails; it is not a
 * reason for a swatch to stop working, and a configurator that breaks because a
 * tag manager 404'd is the single most avoidable outage on a marketing site.
 */
export function track(event: PxlAnalyticsEvent): void {
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    // The development mirror. Not a queue and not persisted — a bounded ring on
    // `window` so that the event contract can be *verified* in a browser
    // ("interact, then read `__dunaEvents`") without a provider existing.
    const w = window as unknown as { __dunaEvents?: PxlAnalyticsEvent[] };
    const log = (w.__dunaEvents ??= []);
    log.push(event);
    if (log.length > 100) log.shift();
  }
  if (!sink) return;
  try {
    sink(event);
  } catch {
    /* see the note above */
  }
}
