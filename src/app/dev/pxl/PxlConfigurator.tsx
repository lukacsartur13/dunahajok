"use client";

/**
 * THE PXL PRODUCT EXPERIENCE.
 *
 * §12: this must not feel like OrbitControls with a model in it. What separates
 * a configurator from a viewer is not the number of controls — it is that the
 * page has a subject. So the composition is authored: the boat is the hero, it
 * arrives already framed at the angle the product is known by, and everything
 * else is a rail beside it, quiet, in the site's own typographic voice.
 *
 * WHAT IS ACTUALLY CONFIGURABLE HERE IS ONE THING. Exterior colour. The rail
 * says so in a sentence rather than implying more with a "01 / 04" that would
 * be counting categories nobody has data for (§29), and the category list it
 * renders is derived from `PXL_AVAILABLE_CATEGORIES` rather than written out
 * (§30) — so the day upholstery becomes real, this file does not change.
 *
 * THE DEVELOPMENT NOTICES ARE NOT DECORATION. The console in this asset is the
 * STL revision, not the glazed tower in the colour studies, and the colour
 * names are working names the yard has not approved. Both are stated on the
 * page, in development only, because the single most expensive thing that could
 * happen to this phase is somebody screenshotting it and treating it as the
 * product (§34).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { PxlStage } from "@/components/scene/PxlStage";
import { PXL } from "@/content/pxl";
import { fill, pxlStrings } from "@/content/pxlStrings";
import { SITE } from "@/content/site";
import { PXL_MEDIA, type PxlMediaId } from "@/lib/pxl.media.generated";
import { useReducedMotion } from "@/lib/hooks";
import {
  PXL_AVAILABLE_CATEGORIES,
  PXL_AVAILABLE_CONTROLS,
  optionLabel as resolveOptionLabel,
  selectedOption,
  summariseConfiguration,
} from "@/webgl/scenes/pxl/pxlConfig";
import type { PxlCatalogOption } from "@/webgl/scenes/pxl/pxlCatalog";
import { PXL_CONFIGURATOR_VIEWS } from "@/webgl/scenes/pxl/pxlPresets";
import type { PxlCustomerPresetId } from "@/webgl/scenes/pxl/pxlPresets";
import { PXL_CONSOLE_REVISION } from "@/webgl/scenes/pxl/pxlModel";
import { pxlTelemetry } from "@/webgl/scenes/pxl/pxlTelemetry";
import {
  currentPxlPermalink,
  currentPxlQuery,
  loadPxlConfigurationFromUrl,
  pxlStore,
  selectPxlOption,
  usePxlConfiguration,
} from "@/webgl/scenes/pxl/pxlStore";
import { supportsWebGL } from "@/webgl/stage/quality";
import { PxlDebugPanel } from "./PxlDebugPanel";
import { PxlReferenceBench } from "./PxlReferenceBench";
import styles from "./PxlConfigurator.module.css";

/** Reference render for each exterior finish, for the no-WebGL path. */
const STUDY_FOR_SLUG: Record<string, PxlMediaId> = {
  white: "pxl-water-white",
  sage: "pxl-water-sage",
  black: "pxl-water-black",
  "warm-grey": "pxl-water-warm-grey",
  gold: "pxl-water-gold",
  navy: "pxl-water-navy",
};

/**
 * The exterior control. Still special-cased on the BENCH, and only here.
 *
 * The no-WebGL path below shows the six delivered colour studies, which exist
 * for the exterior range and for nothing else — there is no reference render of
 * a cognac interior or of a large drive. So the fallback is genuinely about the
 * exterior specifically, rather than about "the first category", and naming it
 * says so.
 */
const EXTERIOR = PXL_AVAILABLE_CATEGORIES[0].controls[0];

/**
 * The name this bench may print for a finish.
 *
 * `preview`, because that is what this route is: noindex, linked from nothing,
 * and covered in notices saying so. A public surface calls `finishLabel(f,
 * "public")` instead and gets null for every finish in the palette — see the
 * publication rule in `pxlPalette`.
 */
/**
 * The colour the bench paints a chip.
 *
 * The bench's chip is a flat square rather than the configurator's lit sample,
 * so it needs one colour per option and the catalogue's swatch union carries
 * three kinds. Colour and waterline options both have one; a propulsion option
 * has none, and gets a neutral rather than an invented tint — this is an
 * instrument, and a made-up colour on an engine size would be an instrument
 * that reads out something the data does not contain.
 */
function swatchColour(option: PxlCatalogOption): string {
  const swatch = option.swatch;
  if (swatch.kind === "colour") return swatch.value;
  if (swatch.kind === "waterline") return swatch.lower ?? "#8d9095";
  return "#8d9095";
}

function previewName(option: PxlCatalogOption | undefined): string {
  return option ? (resolveOptionLabel(option, "preview") ?? option.slug) : "";
}

/**
 * Whether the viewer has turned the boat away from the authored composition.
 *
 * Polled rather than subscribed, and deliberately so. The flag lives in
 * `pxlTelemetry`, which the render loop writes sixty times a second — a
 * subscription would drag React into the frame budget to answer a question
 * whose answer changes about twice a minute. Four samples a second is
 * imperceptible for a view chip, and `setState` with the same boolean is a
 * no-op, so a still boat costs nothing at all.
 */
function useOrbited(): boolean {
  const [orbited, setOrbited] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setOrbited(pxlTelemetry.orbited), 250);
    return () => window.clearInterval(id);
  }, []);
  return orbited;
}

export function PxlConfigurator() {
  const t = pxlStrings(SITE.locale);
  const config = usePxlConfiguration();
  const reducedMotion = useReducedMotion();

  const [view, setView] = useState<PxlCustomerPresetId>("hero_3q");
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [shared, setShared] = useState(false);
  const [debug, setDebug] = useState(false);
  const [ready, setReady] = useState(false);
  const orbited = useOrbited();
  const shareTimer = useRef<number | null>(null);

  const selected = useMemo(() => selectedOption(config, EXTERIOR), [config]);

  /* ── URL → state, once ──────────────────────────────────────────────────
     The only place the query string is read. §6: anything unrecognised is
     dropped *and the address bar is corrected*, so an invalid link cannot be
     forwarded on still looking valid.                                       */
  useEffect(() => {
    const search = window.location.search;
    const rejected = loadPxlConfigurationFromUrl(search);
    setDebug(new URLSearchParams(search).get("debug") === "1");
    setWebgl(supportsWebGL());
    if (rejected.length) {
      const url = new URL(window.location.href);
      for (const param of rejected) url.searchParams.delete(param);
      window.history.replaceState(null, "", url);
    }
  }, []);

  /* ── State → URL, on every change ───────────────────────────────────────
     `replaceState`, never `pushState`: §5 asks for no reloads, and a colour
     change is a refinement rather than a navigation. Pushing would mean Back
     stepping through six swatch clicks instead of leaving the page, which is
     the behaviour every configurator that gets this wrong is remembered for. */
  useEffect(() => {
    const url = new URL(window.location.href);
    const next = new URLSearchParams(currentPxlQuery());
    for (const control of PXL_AVAILABLE_CONTROLS) url.searchParams.delete(control.param);
    next.forEach((value, key) => url.searchParams.set(key, value));
    window.history.replaceState(null, "", url);
  }, [config]);

  /* Stand the site's chrome down — this route is a full-viewport instrument
     panel, not a page in the document flow. See globals.css. */
  useEffect(() => {
    document.documentElement.classList.add("is-dev-bench");
    return () => document.documentElement.classList.remove("is-dev-bench");
  }, []);

  /* The scene fades its own way in. This only drives the loading line, which
     has to disappear on its own even if the model never arrives — a permanent
     "loading" over a perfectly good fallback render is worse than silence. */
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 2600);
    const poll = window.setInterval(() => {
      if (pxlTelemetry.slotWidth > 0 && pxlTelemetry.distance > 0) {
        setReady(true);
        window.clearInterval(poll);
      }
    }, 120);
    return () => {
      window.clearTimeout(id);
      window.clearInterval(poll);
    };
  }, []);

  useEffect(
    () => () => {
      if (shareTimer.current) window.clearTimeout(shareTimer.current);
    },
    [],
  );

  const share = useCallback(async () => {
    const link = currentPxlPermalink();
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // A denied clipboard is not an error worth a dialog: the URL is already
      // in the address bar and correct, which is the whole point of §5.
      return;
    }
    setShared(true);
    if (shareTimer.current) window.clearTimeout(shareTimer.current);
    shareTimer.current = window.setTimeout(() => setShared(false), 2400);
  }, []);

  const summary = useMemo(() => summariseConfiguration(config), [config]);

  /**
   * The enquiry route.
   *
   * §67: no dead button, and no invented endpoint either. There is no enquiry
   * flow yet, so the CTA is a `mailto:` to the address already published in
   * `CONTACT`, carrying the configuration and the permalink. That is a real
   * action with a real destination which really does reach the yard, and it
   * costs nothing to replace with a form later — the state it sends is already
   * derived from `summariseConfiguration`.
   */
  const enquiry = useMemo(() => {
    const lines = summary.map((line) => `${t.categories[line.category]}: ${line.value}`);
    // The permalink is only appended once mounted. It is built from
    // `window.location`, so including it during the server render would produce
    // one href on the server and a different one in the browser — a hydration
    // mismatch on a link nobody has clicked yet.
    const link = webgl === null ? "" : currentPxlPermalink();
    const body = [PXL.fullName, ...lines, "", link].join("\n");
    return `mailto:${PXL_ENQUIRY_ADDRESS}?subject=${encodeURIComponent(
      `${PXL.name} — configuration enquiry`,
    )}&body=${encodeURIComponent(body)}`;
  }, [summary, t, webgl]);

  const activeView = orbited && view !== "free" ? "free" : view;

  /* ── No WebGL ───────────────────────────────────────────────────────────*/
  if (webgl === false) {
    return (
      <PxlColourStudies
        heading={t.fallbackHeading}
        body={t.fallbackBody}
        eyebrow={t.eyebrow}
        categoryLabel={t.categories.exterior}
        optionLabel={t.colourOptionLabel}
        cta={t.cta}
        ctaHref={enquiry}
        debug={debug}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.identity}>
          <span className={styles.marque}>{SITE.wordmark}</span>
          <span className={styles.rule} aria-hidden="true" />
          <h1 className={styles.model}>{PXL.name}</h1>
        </header>

        <div className={styles.stage}>
          <PxlStage
            preset={view}
            interactive={!reducedMotion}
            priority
            label={t.sceneDescription}
            sizes="(max-width: 900px) 100vw, 70vw"
          />
          <p className={styles.hint} data-hidden={ready ? undefined : true}>
            {t.orbitHint}
          </p>
          <p className={styles.loading} data-hidden={ready ? true : undefined} aria-live="polite">
            {PXL.name} · {t.loading}
          </p>
        </div>

        <aside className={styles.rail} data-lenis-prevent>
          <div className={styles.railScroll}>
            {/* ── Configuration. Derived from the schema, never hard-coded. */}
            {PXL_AVAILABLE_CONTROLS.map((control) => {
              const current = selectedOption(config, control);
              const label = t.controls[control.labelKey] ?? control.id;
              return (
                <section className={styles.block} key={control.id}>
                  <h2 className={styles.label}>{label}</h2>
                  <p className={styles.value} aria-live="polite">
                    {previewName(current)}
                  </p>
                  <div
                    className={styles.swatches}
                    role="radiogroup"
                    aria-label={label}
                  >
                    {control.options.map((option) => {
                      const on = option.id === current.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          // §28: the selected state is exposed semantically, not
                          // only as a ring somebody might not be able to see.
                          aria-label={fill(t.optionLabel, {
                            control: label,
                            name: previewName(option),
                          })}
                          className={styles.swatch}
                          data-on={on || undefined}
                          onClick={() => selectPxlOption(control, option)}
                        >
                          <span
                            className={styles.chip}
                            style={{ background: swatchColour(option) }}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            <p className={styles.scope}>{t.scopeNote}</p>

            {/* ── View. Secondary to configuration, per §23. */}
            <section className={styles.block}>
              <h2 className={styles.label}>{t.viewHeading}</h2>
              <div className={styles.views} role="radiogroup" aria-label={t.viewHeading}>
                {PXL_CONFIGURATOR_VIEWS.map((id) => {
                  const on = id === activeView;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={styles.view}
                      data-on={on || undefined}
                      onClick={() => setView(id)}
                    >
                      {t.views[id]}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className={styles.actions}>
              <a className={styles.cta} href={enquiry}>
                {t.cta}
              </a>
              <button type="button" className={styles.secondary} onClick={share}>
                {shared ? t.shareDone : t.share}
              </button>
              <p className={styles.note}>{t.ctaNote}</p>
            </div>

            {/* ── Development only. Never ships to a customer surface. §33/§34. */}
            <div className={styles.dev}>
              <p>
                MODEL SOURCE: STL REVISION · {PXL_CONSOLE_REVISION}
                <br />
                CONSOLE REVISION PENDING — the colour studies show a glazed tower
                this asset does not contain.
              </p>
              <p>COLOUR NAMES ARE PROVISIONAL. No RAL or manufacturer code supplied.</p>
              <p>SPECIFICATIONS PENDING · published: {String(PXL.published)}</p>
              <p>
                Development bench. Append <code>?debug=1</code> for telemetry,
                {" "}
                <code>?pxlReference=1</code> to compare against the design plates.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {debug ? <PxlDebugPanel /> : null}
      {/* §21. Mounted unconditionally and gated on `?pxlReference=1` inside,
          because the flag is read from `window` and reading it out here would
          make this component's first render depend on the URL — which is the
          hydration mismatch the debug panel already learned about. Compiles to
          nothing in a production build. */}
      <PxlReferenceBench />
    </div>
  );
}

/** Where a configuration enquiry goes until there is a form to send it to. */
const PXL_ENQUIRY_ADDRESS = "info@dunahajok.hu";

/* Phase Three had a `patchFor(category, id)` switch here, translating a
   category id into the store's patch shape. It is gone, and its absence is the
   point: the catalogue now declares which field each control writes and
   `selectPxlOption` routes through it, so there is no longer a place where a
   new category has to be wired by hand — which was the one thing that switch
   could not stop somebody forgetting. */

/* ── The no-WebGL path ─────────────────────────────────────────────────────*/

/**
 * §49: a browser that cannot run the scene still has to meet the PXL.
 *
 * It gets the product name, the six exterior colours as the studio's own
 * renders — which is genuinely the same information, delivered as pictures
 * instead of a mesh — and the same CTA. What it does not get is any suggestion
 * that it is configuring anything: there are no swatches, no view controls and
 * no "3D" language, because none of that is true here.
 */
function PxlColourStudies({
  heading,
  body,
  eyebrow,
  categoryLabel,
  optionLabel,
  cta,
  ctaHref,
  debug,
}: {
  heading: string;
  body: string;
  eyebrow: string;
  categoryLabel: string;
  optionLabel: string;
  cta: string;
  ctaHref: string;
  debug: boolean;
}) {
  const options = EXTERIOR.options;
  const [index, setIndex] = useState(() =>
    Math.max(0, options.findIndex((o) => o.id === pxlStore.configuration.exterior.hullPrimary)),
  );
  const current = options[index];
  const media = PXL_MEDIA[STUDY_FOR_SLUG[current.slug] ?? "pxl-hero-side"];

  return (
    <div className={styles.page} data-fallback="true">
      <div className={styles.studies}>
        <header className={styles.identity}>
          <span className={styles.marque}>{SITE.wordmark}</span>
          <span className={styles.rule} aria-hidden="true" />
          <h1 className={styles.model}>{PXL.name}</h1>
        </header>

        <figure className={styles.studyPlate}>
          <Image
            src={media.src}
            alt={media.alt}
            width={media.width}
            height={media.height}
            sizes="100vw"
            placeholder="blur"
            blurDataURL={media.blurDataURL}
            priority
          />
        </figure>

        <div className={styles.studyRail}>
          <p className={styles.label}>{eyebrow}</p>
          <h2 className={styles.value}>{heading}</h2>
          <p className={styles.note}>{body}</p>

          <p className={styles.label}>{categoryLabel}</p>
          <p className={styles.value}>{previewName(current)}</p>
          <div className={styles.swatches} role="radiogroup" aria-label={categoryLabel}>
            {options.map((option, i) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={i === index}
                aria-label={fill(optionLabel, { name: previewName(option) })}
                className={styles.swatch}
                data-on={i === index || undefined}
                onClick={() => setIndex(i)}
              >
                <span
                  className={styles.chip}
                  style={{ background: swatchColour(option) }}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>

          <a className={styles.cta} href={ctaHref}>
            {cta}
          </a>
          {debug ? <p className={styles.note}>WebGL unavailable — fallback path.</p> : null}
        </div>
      </div>
    </div>
  );
}
