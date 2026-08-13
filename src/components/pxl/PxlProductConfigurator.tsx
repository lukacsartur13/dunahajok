"use client";

/**
 * THE PXL CONFIGURATOR — the customer-facing experience.
 *
 * A luxury product film that became interactive (§4), not a control panel with
 * a boat in it. Everything about the composition follows from one decision: the
 * vessel is the page, and the interface is a rail along the bottom of it. There
 * is no sidebar, because a sidebar takes a quarter of the width away from the
 * only thing worth looking at; there are no tabs, because there is one real
 * category; and there is no permanent chrome beyond a name, a way out, and the
 * controls that do something.
 *
 * WHAT IS CONFIGURABLE IS WHAT IS REAL. The category list is `map`ped from
 * `PXL_AVAILABLE_CATEGORIES`, which today has exactly one member. There are no
 * disabled INTERIOR / PROPULSION / EQUIPMENT tabs and no "01 / 04" implying
 * three more are coming (§8, §48). The day upholstery becomes real, it appears
 * here without this file changing — which is the whole reason the derivation is
 * worth having when there is only one of them.
 *
 * WHAT IT REFUSES TO SAY. No price, no specification, no availability, and no
 * colour name that the yard has not approved — the last one enforced by
 * `finishLabel` rather than by everyone remembering (§46, §47, §53).
 *
 * THE SIGNATURE MOMENT IS NOT IN THIS FILE, and that is the point. §66's
 * travelling finish belongs to the material, so it lives in the shader and the
 * scene; from here, changing a colour is one call into the store. The interface
 * does not animate the product. It asks for a different product and gets out of
 * the way.
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
  PXL_AVAILABLE_CATEGORIES,
  summariseConfiguration,
} from "@/webgl/scenes/pxl/pxlConfig";
import { finishLabel, rangeIsPubliclyNameable } from "@/webgl/scenes/pxl/pxlPalette";
import {
  PXL_CONFIGURATOR_VIEW_CONTROLS,
  type PxlPresetId,
} from "@/webgl/scenes/pxl/pxlPresets";
import { requestPxlSnapshot, snapshotFilename } from "@/webgl/scenes/pxl/pxlSnapshot";
import {
  currentPxlPermalink,
  currentPxlQuery,
  loadPxlConfigurationFromUrl,
  resetPxlConfiguration,
  setPxlConfiguration,
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
/** The arrival caption's life. §42: brief, then the controls are the page. */
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

  const [view, setView] = useState<PxlPresetId>("hero_3q");
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
   * Publish the rail's real height as `--rail-height`.
   *
   * The overlays that sit above the rail — the interaction hint, the
   * confirmation line — have to clear it, and the rail's height is not a
   * constant: it changes with the language, with the type scale, with the
   * safe-area inset, and completely between the three compositions. A guessed
   * value is a value that is right on one phone. Measuring it costs one
   * ResizeObserver and makes the relationship exact everywhere.
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

  const category = PXL_AVAILABLE_CATEGORIES[0];
  const selected = useMemo(() => {
    const id = category.read(config);
    return category.options.find((o) => o.id === id) ?? category.options[0];
  }, [category, config]);

  /* Preview, not public: this route is noindex, disallowed and linked from
     nothing, so it may print the provisional names — and says that it is doing
     so. A public surface would call `finishLabel(f, "public")`, get null for
     every finish in the range, and print no names at all. */
  const selectedName = finishLabel(selected, "preview") ?? selected.slug;
  const namesApproved = rangeIsPubliclyNameable(category.options);

  const summary = useMemo(() => summariseConfiguration(config, "preview"), [config]);

  /* ── URL → state, once ──────────────────────────────────────────────────
     The only place the query string is read on this route. §26: anything
     unrecognised is dropped *and the address bar is corrected*, so an invalid
     link cannot be forwarded on still looking valid.                        */
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
     §36. The configurator writes with `replaceState`, so its own changes are
     not history entries — but arriving here from a link, going back to the
     product page and coming forward again lands on a URL whose query the store
     has not seen. Re-reading it on `popstate` is what makes the browser's own
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
    (id: string) => {
      const from = selected.slug;
      const to = category.options.find((o) => o.id === id)?.slug ?? id;
      if (from === to) return;
      setPxlConfiguration({ exterior: { hullPrimary: id } });
      track({ name: "pxl_finish_change", category: category.id, from, to });
      // §45: the boat changing colour IS the feedback. What goes to the live
      // region is for the people who cannot see it happen.
      const option = category.options.find((o) => o.id === id);
      const name = option ? (finishLabel(option, "preview") ?? option.slug) : to;
      setFeedback({ key: `${Date.now()}`, text: fill(t.colourSelected, { name }) });
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
    },
    [category, selected.slug, t.colourSelected],
  );

  const chooseView = useCallback((id: PxlPresetId) => {
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
    // §29: one category, so no confirmation. The camera deliberately stays
    // where it is — someone who has turned the boat to look at the transom and
    // then resets the colour has not asked to be moved.
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
      // §34: the feature is allowed to be unavailable. It is not allowed to
      // pretend, and it is not allowed to keep offering itself after failing.
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

  /* §43: the hint goes on the first interaction with the stage and stays gone. */
  const dismissHint = useCallback(() => {
    if (!hint) return;
    setHint(false);
    markPxlHintSeen();
  }, [hint]);

  const activeView: PxlPresetId = orbited && view !== "free" ? "free" : view;
  const interactive = !reducedMotion;

  return (
    <div
      ref={shell}
      className={styles.shell}
      data-focus={focus || undefined}
      data-entered={entered || undefined}
    >
      {/* ── The vessel ─────────────────────────────────────────────────────
          Absolutely positioned and full-bleed, with the chrome floating over
          it. This is what §6 and §7 actually require: the boat does not live
          in a cell of a grid that the controls can shrink, so a narrower
          window compresses the rail and never the product.                  */}
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
          // §57: the strongest PXL render, in the colour the visitor has
          // actually chosen, standing in until the GLB resolves — and
          // permanently if it never does.
          fallback={PXL_STUDY_FOR_SLUG[selected.slug] ?? "pxl-hero-side"}
          sizes="100vw"
        />
      </div>

      {/* ── Identity and the way out ───────────────────────────────────────*/}
      {/* The way out, the identity and the two secondary actions.
          Three siblings rather than two, so the phone layout can put the
          product name on its own line without the exit control coming with
          it — at 390px, CLOSE + DUNA + PXL + two chips do not fit on one row,
          and the thing that must not shrink is the product's name. */}
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
          Low, horizontal, and content-sized. §6: no permanent sidebar, and
          nothing here grows to fill space it has not earned.               */}
      <div
        ref={rail}
        className={styles.rail}
        data-ready={arrived || undefined}
        data-lenis-prevent
      >
        {PXL_AVAILABLE_CATEGORIES.map((c) => (
          <section className={styles.group} key={c.id}>
            <div className={styles.groupHead}>
              <h2 className={styles.label}>{t.categories[c.id]}</h2>
              <p className={styles.value}>{selectedName}</p>
              {/* §53, marked where the name is rather than in a footnote
                  somewhere else on the page. It costs one line, it is beside
                  the thing it qualifies, and it removes itself the day
                  `rangeIsPubliclyNameable` starts answering true. */}
              {!namesApproved ? (
                <span className={styles.provisional} title={t.provisionalNames}>
                  {t.provisionalShort}
                </span>
              ) : null}
            </div>
            <PxlSwatches
              options={c.options}
              value={c.read(config)}
              onChange={choose}
              groupLabel={t.categories[c.id]}
              optionLabel={(name) => fill(t.colourOptionLabel, { name })}
            />
          </section>
        ))}

        <section className={styles.group}>
          <div className={styles.groupHead}>
            <h2 className={styles.label}>{t.viewHeading}</h2>
            <p className={styles.value}>{t.views[activeView]}</p>
          </div>
          {/* §13: the five authored compositions. FREE is a state the camera
              reaches, not an instruction anybody would give, so it is named in
              the line above and never offered as a button — while the viewer
              has the camera, none of these is selected, and choosing one is how
              they hand it back. */}
          <div className={styles.views} role="radiogroup" aria-label={t.viewHeading}>
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

        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={reset} data-cursor-solid="">
            {t.reset}
          </button>
          {/* Secondary, and only while it works. §35: not in the primary rail
              and never a fabricated hosted URL — the file is produced on this
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

      {/* ── What the canvas cannot say ─────────────────────────────────────
          §24: the 3D object is not accessible content, so the state it
          represents is stated in the DOM — the model, the selected finish and
          the view the camera is holding, in a sentence, updated as they
          change. Not decoration for a screen reader: it is the only place some
          visitors can read what is currently on screen.                     */}
      <p className={styles.srOnly}>
        {PXL.fullName}. {t.categories.exterior}: {selectedName}. {t.viewHeading}:{" "}
        {t.views[activeView]}.
      </p>
      <p className={styles.srOnly} role="status" aria-live="polite">
        {feedback?.text ?? ""}
      </p>

      {/* Visible confirmation, brief and singular. §28: no toast stack. */}
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
        categoryLabel={(id) => t.categories[id as keyof typeof t.categories] ?? id}
      />

      {/* The curtain the previous route left up, lifted on the first paint.
          See `pxlEntry` for why the flag crosses in session storage. */}
      {entered && !reducedMotion ? <div className={styles.veil} aria-hidden="true" /> : null}
    </div>
  );
}
