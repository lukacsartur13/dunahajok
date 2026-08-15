"use client";

/**
 * THE PXL CONFIGURATOR — the customer-facing experience.
 *
 * A luxury product film that became interactive, not a control panel with a
 * boat in it. Everything about the composition follows from one decision: the
 * vessel is the page, and the interface is a rail along the bottom of it. There
 * is no sidebar, because a sidebar takes a quarter of the width away from the
 * only thing worth looking at.
 *
 * ── WHAT PHASE FOUR CHANGED, AND WHAT IT REFUSED TO ────────────────────────
 *
 * Phase Three had one category and rendered it flat: a heading, six swatches, a
 * row of view chips. Phase Four has four categories and six controls, and the
 * naive extension of that layout is a form — twenty-two controls stacked in a
 * band across the bottom of a product shot. §A25 rules it out in as many words:
 * do not turn it into a giant form, keep the viewport dominant, and do not
 * display every option from every category at once.
 *
 * So the rail became TWO LAYERS. A low horizontal category navigation that is
 * always present and costs one line, and the active category's controls
 * underneath it. One category is open at a time; the others are a word each.
 * At 1440px the whole interface is 150px tall and the boat has the rest; at
 * 390px it is a tray whose height is capped so the vessel keeps the majority of
 * the viewport.
 *
 * ── WHAT IS CONFIGURABLE IS WHAT IS REAL ───────────────────────────────────
 *
 * The category list is `map`ped from `PXL_AVAILABLE_CATEGORIES`, which derives
 * from the catalogue. There are no disabled EQUIPMENT tabs and no "01 / 05"
 * implying a fifth is coming — the index a category shows is its position among
 * the categories that exist. The day equipment becomes real it appears here
 * without this file changing.
 *
 * ── WHAT IT REFUSES TO SAY ─────────────────────────────────────────────────
 *
 * No price, no specification, no availability, no power figure, and no name the
 * yard has not approved — the last one enforced by `optionLabel` rather than by
 * everyone remembering.
 *
 * ── THE CAMERA ─────────────────────────────────────────────────────────────
 *
 * §A19 and §A26 ask that opening a category suggest the composition the
 * decision is made in, and that the suggestion be art direction rather than
 * automation. The rule implemented here is: the first time a category is
 * opened, the camera moves to its suggested view. After that, never — not on
 * re-entry, not on a change within the category, and not at all once the
 * viewer has taken the camera themselves.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PxlStage } from "@/components/scene/PxlStage";
import { PXL, PXL_STUDY_FOR_SLUG } from "@/content/pxl";
import { fill, pxlStrings } from "@/content/pxlStrings";
import { SITE } from "@/content/site";
import { track } from "@/lib/analytics";
import { useFinePointer, useReducedMotion } from "@/lib/hooks";
import {
  PXL_CATALOGUE_IS_PROVISIONAL,
  type PxlCatalogCategory,
  type PxlCatalogControl,
  type PxlCatalogOption,
} from "@/webgl/scenes/pxl/pxlCatalog";
import {
  PXL_AVAILABLE_CATEGORIES,
  optionLabel,
  selectedOption,
  summariseConfiguration,
} from "@/webgl/scenes/pxl/pxlConfig";
import { finish } from "@/webgl/scenes/pxl/pxlPalette";
import {
  PXL_CONFIGURATOR_VIEW_CONTROLS,
  type PxlCustomerPresetId,
} from "@/webgl/scenes/pxl/pxlPresets";
import { requestPxlSnapshot, snapshotFilename } from "@/webgl/scenes/pxl/pxlSnapshot";
import {
  currentPxlPermalink,
  currentPxlQuery,
  loadPxlConfigurationFromUrl,
  resetPxlConfiguration,
  selectPxlOption,
  syncPxlUrl,
  usePxlConfiguration,
} from "@/webgl/scenes/pxl/pxlStore";
import { pxlTelemetry } from "@/webgl/scenes/pxl/pxlTelemetry";
import { supportsWebGL } from "@/webgl/stage/quality";
import { PxlRequestPanel } from "./PxlRequestPanel";
import { PxlSwatches } from "./PxlSwatches";
import { consumePxlEntry, markPxlHintSeen, pxlHintSeen } from "./pxlEntry";
import styles from "./PxlProductConfigurator.module.css";

/** How long a confirmation stays up. Long enough to read, short enough to ignore. */
const FEEDBACK_MS = 2400;
/** The arrival caption's life. Brief, then the controls are the page. */
const ARRIVAL_MS = 1600;

type Feedback = { key: string; text: string } | null;

/**
 * Whether the viewer has taken the camera.
 *
 * Polled rather than subscribed, and deliberately so: the flag lives in
 * `pxlTelemetry`, which the render loop writes sixty times a second, and a
 * subscription would drag React into the frame budget to answer a question whose
 * answer changes about twice a minute. Four samples a second is imperceptible on
 * a view chip, and `setState` with an unchanged boolean is a no-op, so a still
 * boat costs nothing at all.
 */
function useOrbited(): boolean {
  const [orbited, setOrbited] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setOrbited(pxlTelemetry.orbited), 250);
    return () => window.clearInterval(id);
  }, []);
  return orbited;
}

export function PxlProductConfigurator() {
  const t = pxlStrings(SITE.locale);
  const config = usePxlConfiguration();
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();

  const [view, setView] = useState<PxlCustomerPresetId>("hero_3q");
  /* §4.9 — night. A way of LOOKING at the boat, so it lives beside the camera
     rather than in the configuration: it is not in the URL and a shared link
     opens in daylight. What the rings are set to travels, because that is a
     specification. */
  const [night, setNight] = useState(false);
  const [category, setCategory] = useState<PxlCatalogCategory>(
    PXL_AVAILABLE_CATEGORIES[0],
  );
  const [focus, setFocus] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [entered, setEntered] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [hint, setHint] = useState(false);
  const [permalink, setPermalink] = useState("");
  /** Null until tried. False once a capture has definitively failed. */
  const [snapshotOk, setSnapshotOk] = useState<boolean | null>(null);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const orbited = useOrbited();
  const feedbackTimer = useRef<number | null>(null);
  const shell = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  /**
   * Categories whose camera suggestion has already been offered. §A26.
   *
   * A ref rather than state: nothing renders off it, and putting it in state
   * would re-render the whole configurator on a set that only ever grows to
   * four members. Seeded with the category the configurator opens on, because
   * the arrival composition IS that category's suggested view — offering it
   * again half a second later would be a camera move to where the camera
   * already is.
   */
  const suggested = useRef(new Set<string>([PXL_AVAILABLE_CATEGORIES[0].id]));

  /**
   * Publish the rail's real height as `--rail-height`.
   *
   * The overlays that sit above the rail — the interaction hint, the
   * confirmation line — have to clear it, and the rail's height is not a
   * constant: it changes with the language, with the type scale, with the
   * safe-area inset, with which category is open, and completely between the
   * three compositions. A guessed value is a value that is right on one phone.
   * Measuring it costs one ResizeObserver and makes the relationship exact
   * everywhere.
   */
  useEffect(() => {
    const el = rail.current;
    const root = shell.current;
    if (!el || !root) return;
    const observer = new ResizeObserver(([entry]) => {
      root.style.setProperty("--rail-height", `${Math.round(entry.contentRect.height)}px`);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* What a swatch that FOLLOWS another control should be drawn in, per control.
     HULL DETAIL's FULL BODY COLOUR follows the exterior; §4.9's MATCH INTERIOR
     on the rails follows the cockpit. Both would otherwise be a fixed chip
     that lies about its option — see `PxlSwatches`. */
  const mirrorColour = useMemo(
    () => ({
      lower: finish(config.exterior.hullPrimary).base,
      rails: finish(config.interior.primary).base,
    }),
    [config.exterior.hullPrimary, config.interior.primary],
  );

  const summary = useMemo(() => summariseConfiguration(config, "preview"), [config]);

  /* ── URL → state, once ──────────────────────────────────────────────────
     The only place the query string is read on this route. Anything
     unrecognised is dropped *and the address bar is corrected*, so an invalid
     link cannot be forwarded on still looking valid. Each parameter sanitises
     independently — see `parseConfiguration`.                                */
  useEffect(() => {
    const rejected = loadPxlConfigurationFromUrl(window.location.search);
    // One-shot, so it is read once and the value is reused rather than asked
    // for again — the second call would always answer false.
    const fromProduct = consumePxlEntry();
    setWebgl(supportsWebGL());
    setEntered(fromProduct);
    setHint(!pxlHintSeen());
    if (rejected.length) {
      const url = new URL(window.location.href);
      for (const param of rejected) url.searchParams.delete(param);
      window.history.replaceState(null, "", url);
    }
    track({
      name: "pxl_configurator_open",
      surface: "preview",
      entry: fromProduct ? "product" : "direct",
    });
  }, []);

  /* ── State → URL, on every change ───────────────────────────────────────*/
  useEffect(() => {
    syncPxlUrl();
    setPermalink(currentPxlPermalink());
  }, [config]);

  /* ── Back and forward ───────────────────────────────────────────────────
     The configurator writes with `replaceState`, so its own changes are not
     history entries — but arriving here from a link, going back to the product
     page and coming forward again lands on a URL whose query the store has not
     seen. Re-reading it on `popstate` is what makes the browser's own
     navigation controls agree with the boat on screen.                      */
  useEffect(() => {
    const onPop = () => loadPxlConfigurationFromUrl(window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* ── Product mode ───────────────────────────────────────────────────────*/
  useEffect(() => {
    document.documentElement.classList.add("is-immersive");
    return () => document.documentElement.classList.remove("is-immersive");
  }, []);

  /* The arrival caption, and the veil the previous route left up. Both resolve
     on their own even if the model never loads — a permanent "configure your
     PXL" over a perfectly good fallback render is worse than silence. */
  useEffect(() => {
    const id = window.setTimeout(() => setArrived(true), reducedMotion ? 0 : ARRIVAL_MS);
    return () => window.clearTimeout(id);
  }, [reducedMotion]);

  useEffect(
    () => () => {
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    },
    [],
  );

  const say = useCallback((text: string) => {
    setFeedback({ key: `${Date.now()}`, text });
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
  }, []);

  /* ── Actions ────────────────────────────────────────────────────────────*/

  const choose = useCallback(
    (control: PxlCatalogControl, option: PxlCatalogOption) => {
      const from = selectedOption(config, control);
      if (from.id === option.id) return;
      selectPxlOption(control, option);
      track({
        name: "pxl_finish_change",
        category: `${option.category}/${control.id}`,
        from: from.slug,
        to: option.slug,
      });
      // The boat changing IS the feedback. What goes to the live region is for
      // the people who cannot see it happen.
      say(
        fill(t.optionSelected, {
          control: t.controls[control.labelKey] ?? control.id,
          name: optionLabel(option, "preview") ?? option.slug,
        }),
      );
    },
    [config, say, t.controls, t.optionSelected],
  );

  /**
   * §A26 — OPENING A CATEGORY SUGGESTS ITS COMPOSITION. ONCE.
   *
   * Three conditions, and each one removes a way this could become annoying:
   *
   *   • only on the FIRST opening of a category, so stepping back and forth
   *     between EXTERIOR and INTERIOR does not swing the camera each time;
   *   • never once `orbited` is true, because a viewer who has turned the boat
   *     has stated a preference and §A26 says to respect it;
   *   • never under reduced motion, where the camera holds still by policy.
   *
   * Changing an option *within* a category never moves the camera at all —
   * §A19 is explicit that a camera jump on every engine change is the failure
   * mode here.
   */
  const openCategory = useCallback(
    (next: PxlCatalogCategory) => {
      setCategory(next);
      track({ name: "pxl_category_open", category: next.id });
      if (suggested.current.has(next.id)) return;
      suggested.current.add(next.id);
      if (orbited || reducedMotion) return;
      setView(next.suggestedView);
      track({ name: "pxl_camera_change", preset: next.suggestedView, source: "category" });
    },
    [orbited, reducedMotion],
  );

  const chooseView = useCallback((id: PxlCustomerPresetId) => {
    setView(id);
    track({ name: "pxl_camera_change", preset: id, source: "control" });
  }, []);

  const share = useCallback(async () => {
    const link = currentPxlPermalink();
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // A denied clipboard is not an error worth a dialog: the address bar is
      // already correct, which is the whole point of the URL being the state.
      return;
    }
    say(t.shareDone);
    track({ name: "pxl_share", query: currentPxlQuery(), method: "clipboard" });
  }, [say, t.shareDone]);

  const reset = useCallback(() => {
    const from = currentPxlQuery();
    /* §A22 — every category back to the one defined preview default, with no
       page reload and no GLB reload. The camera deliberately stays where it is:
       someone who has turned the boat to look at the transom and then resets
       the configuration has not asked to be moved. The open category stays
       open too, for the same reason. */
    resetPxlConfiguration();
    track({ name: "pxl_reset", from });
    say(t.reset);
  }, [say, t.reset]);

  const saveImage = useCallback(async () => {
    setSnapshotBusy(true);
    const blob = await requestPxlSnapshot();
    setSnapshotBusy(false);
    track({ name: "pxl_snapshot", ok: Boolean(blob) });
    if (!blob) {
      // The feature is allowed to be unavailable. It is not allowed to pretend,
      // and it is not allowed to keep offering itself after failing.
      setSnapshotOk(false);
      say(t.saveImageFailed);
      return;
    }
    setSnapshotOk(true);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = snapshotFilename(currentPxlQuery());
    a.click();
    URL.revokeObjectURL(url);
  }, [say, t.saveImageFailed]);

  const openRequest = useCallback(() => {
    setRequesting(true);
    track({ name: "pxl_request_start", query: currentPxlQuery() });
  }, []);

  const toggleFocus = useCallback(() => {
    setFocus((on) => {
      track({ name: "pxl_focus", on: !on });
      return !on;
    });
  }, []);

  /* Escape leaves focus mode. Not the page — a viewer who has maximised the
     product and presses Escape wants the controls back, not the exit. */
  useEffect(() => {
    if (!focus) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocus(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);

  /* The hint goes on the first interaction with the stage and stays gone. */
  const dismissHint = useCallback(() => {
    if (!hint) return;
    setHint(false);
    markPxlHintSeen();
  }, [hint]);

  const activeView: PxlCustomerPresetId = orbited && view !== "free" ? "free" : view;
  const interactive = !reducedMotion;

  /* The still that stands in until the GLB resolves, and permanently on a
     device that cannot run WebGL: the studio's own render of the boat in the
     exterior finish the visitor has actually chosen. */
  const exteriorSlug = selectedOption(config, PXL_AVAILABLE_CATEGORIES[0].controls[0]).slug;

  return (
    <div
      ref={shell}
      className={styles.shell}
      data-focus={focus || undefined}
      data-entered={entered || undefined}
    >
      {/* ── The vessel ─────────────────────────────────────────────────────
          Absolutely positioned and full-bleed, with the chrome floating over
          it. The boat does not live in a cell of a grid that the controls can
          shrink, so a narrower window compresses the rail and never the
          product.                                                            */}
      <div
        className={styles.stage}
        onPointerDown={dismissHint}
        data-cursor={finePointer && interactive ? t.dragHint : undefined}
      >
        <PxlStage
          preset={activeView}
          interactive={interactive}
          arrival
          adaptive
          priority
          label={t.sceneDescription}
          fallback={PXL_STUDY_FOR_SLUG[exteriorSlug] ?? "pxl-hero-side"}
          sizes="100vw"
        />
      </div>

      {/* ── Identity and the way out ───────────────────────────────────────
          Three siblings rather than two, so the phone layout can put the
          product name on its own line without the exit control coming with
          it — at 390px, CLOSE + DUNA + PXL + two chips do not fit on one row,
          and the thing that must not shrink is the product's name.          */}
      <header className={styles.top}>
        <Link className={styles.back} href={PXL.routes.preview} data-cursor-solid="">
          <span aria-hidden="true">←</span> {t.exit}
        </Link>

        <div className={styles.identity}>
          <span className={styles.rule} aria-hidden="true" />
          <span className={styles.marque}>{SITE.wordmark}</span>
          <h1 className={styles.model}>{PXL.name}</h1>
        </div>

        <div className={styles.topActions}>
          <button type="button" className={styles.chip} onClick={share} data-cursor-solid="">
            {t.share}
          </button>
          <button
            type="button"
            className={styles.chip}
            onClick={toggleFocus}
            aria-pressed={focus}
            data-cursor-solid=""
          >
            {focus ? t.focusExit : t.focus}
          </button>
        </div>
      </header>

      {/* ── The arrival caption, then the controls ─────────────────────────*/}
      <p className={styles.arrival} data-gone={arrived || undefined} aria-hidden="true">
        {t.arrivalCaption}
      </p>

      {hint && interactive && !focus ? (
        <p className={styles.hint} data-gone={arrived ? undefined : true} aria-hidden="true">
          {t.dragHint}
        </p>
      ) : null}

      {/* ── The control rail ───────────────────────────────────────────────
          Low, horizontal, content-sized, and two layers: the category
          navigation, then the open category's controls. §A25.              */}
      <div
        ref={rail}
        className={styles.rail}
        data-ready={arrived || undefined}
        data-lenis-prevent
      >
        {/* §A2: the index is the category's position among the categories that
            EXIST. Four of them, so they read 01–04 and never 01/05. */}
        <nav className={styles.categories} aria-label={t.categoryNav}>
          {PXL_AVAILABLE_CATEGORIES.map((c, i) => {
            const on = c.id === category.id;
            return (
              <button
                key={c.id}
                type="button"
                className={styles.category}
                data-on={on || undefined}
                aria-current={on ? "true" : undefined}
                data-cursor-solid=""
                onClick={() => openCategory(c)}
              >
                <span className={styles.categoryIndex} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={styles.categoryName}>{t.categories[c.id]}</span>
              </button>
            );
          })}
        </nav>

        {/* The second row: the open category's controls, then the actions.
            A wrapper rather than two children of the rail, because the two have
            to share one line and be able to give way to each other — the
            controls scroll, the actions never shrink. */}
        <div className={styles.railBody}>
        {/* The open category. Keyed on its id so the controls animate in as a
            group rather than morphing between two categories' rows. */}
        <div className={styles.controls} key={category.id}>
          {category.controls.map((control) => {
            const current = selectedOption(config, control);
            const name = optionLabel(current, "preview") ?? current.slug;
            const label = t.controls[control.labelKey] ?? control.id;
            return (
              <section className={styles.group} key={control.id}>
                <div className={styles.groupHead}>
                  <h2 className={styles.label}>{label}</h2>
                  <p className={styles.value}>{name}</p>
                </div>
                <PxlSwatches
                  options={control.options}
                  value={current.id}
                  onChange={(option) => choose(control, option)}
                  groupLabel={label}
                  optionLabel={(n) => fill(t.optionLabel, { control: label, name: n })}
                  mirrorColour={
                    mirrorColour[control.id as keyof typeof mirrorColour]
                  }
                />
              </section>
            );
          })}

          <section className={`${styles.group} ${styles.viewGroup}`}>
            <div className={styles.groupHead}>
              <h2 className={styles.label}>{t.viewHeading}</h2>
              <p className={styles.value}>{t.views[activeView]}</p>
            </div>
            {/* The five authored compositions. FREE is a state the camera
                reaches, not an instruction anybody would give, so it is named
                in the line above and never offered as a button — while the
                viewer has the camera, none of these is selected, and choosing
                one is how they hand it back. */}
            <div className={styles.views} role="radiogroup" aria-label={t.viewHeading}>
              <button
                type="button"
                aria-pressed={night}
                className={styles.view}
                data-on={night || undefined}
                onClick={() => setNight((on) => !on)}
              >
                {t.night}
              </button>
              {PXL_CONFIGURATOR_VIEW_CONTROLS.map((id) => {
                const on = id === activeView;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={styles.view}
                    data-on={on || undefined}
                    data-cursor-solid=""
                    onClick={() => chooseView(id)}
                  >
                    {t.views[id]}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className={styles.actions}>
          {/* Marked once, beside the controls rather than in a footnote
              somewhere else on the page. It costs one line, it is beside the
              thing it qualifies, and it removes itself the day the catalogue
              stops answering `PXL_CATALOGUE_IS_PROVISIONAL`. */}
          {PXL_CATALOGUE_IS_PROVISIONAL ? (
            <p className={styles.provisional} title={t.provisionalNames}>
              {t.provisionalShort}
            </p>
          ) : null}
          <button type="button" className={styles.ghost} onClick={reset} data-cursor-solid="">
            {t.reset}
          </button>
          {/* Secondary, and only while it works. Not in the primary rail and
              never a fabricated hosted URL — the file is produced on this
              machine and saved to this machine. */}
          {webgl && snapshotOk !== false ? (
            <button
              type="button"
              className={`${styles.ghost} ${styles.snapshot}`}
              onClick={saveImage}
              disabled={snapshotBusy}
              data-cursor-solid=""
            >
              {snapshotBusy ? t.saveImageBusy : t.saveImage}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.primary}
            onClick={openRequest}
            data-cursor-solid=""
          >
            {t.cta}
          </button>
        </div>
        </div>
      </div>

      {/* ── What the canvas cannot say ─────────────────────────────────────
          The 3D object is not accessible content, so the state it represents is
          stated in the DOM — the model, every selected option and the view the
          camera is holding, in a sentence, updated as they change. Not
          decoration for a screen reader: it is the only place some visitors can
          read what is currently on screen. Derived from the summary, so a new
          category joins it without this markup changing.                     */}
      <p className={styles.srOnly}>
        {PXL.fullName}.{" "}
        {summary
          .map((line) => `${t.controls[line.labelKey] ?? line.control}: ${line.value ?? line.slug}`)
          .join(". ")}
        . {t.viewHeading}: {t.views[activeView]}.
      </p>
      <p className={styles.srOnly} role="status" aria-live="polite">
        {feedback?.text ?? ""}
      </p>

      {/* Visible confirmation, brief and singular. No toast stack. */}
      <p className={styles.toast} data-on={feedback ? true : undefined} aria-hidden="true">
        {feedback?.text}
      </p>

      <PxlRequestPanel
        open={requesting}
        onClose={() => setRequesting(false)}
        t={t}
        product={{ id: "pxl", name: PXL.fullName, published: PXL.published }}
        configuration={config}
        summary={summary}
        configurationUrl={permalink}
        sourcePage={PXL.routes.previewConfigure}
        categoryLabel={(key) => t.controls[key] ?? key}
      />

      {/* The curtain the previous route left up, lifted on the first paint.
          See `pxlEntry` for why the flag crosses in session storage. */}
      {entered && !reducedMotion ? <div className={styles.veil} aria-hidden="true" /> : null}
    </div>
  );
}
