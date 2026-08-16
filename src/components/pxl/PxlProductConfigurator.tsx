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
 * §4.12 — THE CAMERA FOLLOWS THE SUBJECT, AND ONLY THE SUBJECT.
 *
 * Every control names a composition in `PXL_SUBJECT_SHOTS`, and the camera
 * travels to it whenever the SUBJECT changes: arriving at a section takes it
 * to that section's first control, and touching a different control takes it
 * there. Changing the VALUE of the control it is already showing moves nothing
 * — which is the whole of what keeps this watchable. §A19 named the failure
 * mode exactly: a camera that jumps on every engine change means you never see
 * the engine change, because the frame is moving while it happens.
 *
 * This replaces §A26's once-per-category rule, and the reason it can is that
 * the move stopped being a suggestion. A suggestion about a wide product shot
 * is worth making once and then dropping; showing the part a decision is about
 * is worth doing every time the decision comes round again.
 *
 * THERE IS NO VIEW RAIL ANY MORE, and the camera is why it could go. Five
 * named compositions were worth offering when the alternative was standing
 * wherever the last section left you; now every control names its own shot and
 * the walk puts the camera on the thing being decided. What is left for a
 * viewer to want is a closer look from their own angle, and a drag already
 * gives them that — riding on top of whatever composition is held, until the
 * next subject move folds it in and starts from there.
 *
 * NIGHT SURVIVED THE RAIL IT LIVED IN, because it is not a camera. It moved to
 * the one control whose result cannot be judged in daylight and appears only
 * when that control has something lit to show. See `lit`.
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
  PXL_AVAILABLE_CONTROLS,
  optionLabel,
  selectedOption,
  summariseConfiguration,
  zoneVisible,
} from "@/webgl/scenes/pxl/pxlConfig";
import { finish } from "@/webgl/scenes/pxl/pxlPalette";
import {
  PXL_DEFAULT_PRESET,
  PXL_SUBJECT_SHOTS,
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

/**
 * The control that decides whether there is anything to see after dark.
 *
 * Found by `labelKey` rather than by index or id, because that is the key the
 * copy table and the subject shots are already on — three places agreeing on
 * one name beats three places agreeing on three.
 */
const RING = PXL_AVAILABLE_CONTROLS.find((c) => c.labelKey === "speakerLight") ?? null;

/** How long a confirmation stays up. Long enough to read, short enough to ignore. */
const FEEDBACK_MS = 2400;
/** The arrival caption's life. Brief, then the controls are the page. */
const ARRIVAL_MS = 1600;

type Feedback = { key: string; text: string } | null;

/**
 * The composition a section opens on: its first control's, if that control has
 * one authored.
 *
 * FIRST rather than "the section's own", and the section no longer names a
 * camera at all in this path. A section is a heading over a stack of controls
 * and its first control is what the panel puts at the top of that stack — so
 * arriving at INTERIOR and being shown the cockpit leather is the camera
 * agreeing with the reading order rather than with a second, separate opinion
 * about what the section is mainly about.
 */
function firstShot(category: PxlCatalogCategory): string | null {
  for (const control of category.controls) {
    if (PXL_SUBJECT_SHOTS[control.labelKey]) return control.labelKey;
  }
  return null;
}

export function PxlProductConfigurator() {
  const t = pxlStrings(SITE.locale);
  const config = usePxlConfiguration();
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();

  /* §4.9 — night. A way of LOOKING at the boat, so it lives beside the camera
     rather than in the configuration: it is not in the URL and a shared link
     opens in daylight. What the rings are set to travels, because that is a
     specification. */
  const [night, setNight] = useState(false);
  /**
   * WHICH SECTION IS OPEN, AS AN INDEX RATHER THAN AS THE CATEGORY ITSELF.
   *
   * The flow walks the sections in order, so "where am I" and "what is next"
   * are both questions about a position — and a position is the only thing
   * both the counter and the two move buttons can be derived from without a
   * second source of truth. The category is looked up from it.
   */
  const [step, setStep] = useState(0);
  const category: PxlCatalogCategory = PXL_AVAILABLE_CATEGORIES[step];
  /**
   * §4.12 — WHAT THE CAMERA IS SHOWING, as a control's `labelKey`.
   *
   * The subject rather than the value, and that distinction is the whole of
   * what keeps this from being the failure mode §A19 warned about. A camera
   * that jumped on every option click would be unwatchable — you would never
   * see the change you just made, because the frame would be moving while it
   * happened. So the camera follows the SUBJECT: arriving at a section takes
   * it to that section's first control, touching a different control takes it
   * there, and changing the value of the control it is already showing moves
   * nothing at all. You make the change in a frame that is holding still,
   * which is the only frame you can see a change in.
   */
  const [subject, setSubject] = useState<string | null>(
    () => firstShot(PXL_AVAILABLE_CATEGORIES[0]),
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
  const feedbackTimer = useRef<number | null>(null);
  const shell = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  /**
   * Publish the bottom bar's real height as `--bar-height`.
   *
   * The overlays that sit above it — the interaction hint, the confirmation
   * line — have to clear it, and its height is not a constant: it changes with
   * the language, with the type scale, with the safe-area inset, and
   * completely between the three compositions. A guessed value is a value that
   * is right on one phone. Measuring it costs one ResizeObserver and makes the
   * relationship exact everywhere.
   *
   * THE BAR RATHER THAN THE PANEL, since the flow became a walk. The panel is
   * now a full-height column down one side, so its height is the viewport's
   * and measuring it would tell the overlays to clear the whole screen. What
   * they actually have to clear is the strip along the bottom.
   */
  useEffect(() => {
    const root = shell.current;
    if (!root) return;
    /* Two boxes, one observer. On a phone the three surfaces stack — navigator
       over tray over bar — and each one has to be told where the one below it
       ends. On a desktop the tray is a column and only `--bar-height` is read.
       Both are published either way: a variable that is set and unused costs
       nothing, and a breakpoint that had to remember to start measuring is a
       breakpoint that will forget. */
    const boxes: [HTMLElement | null, string][] = [
      [bar.current, "--bar-height"],
      [rail.current, "--tray-height"],
    ];
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const name = boxes.find(([el]) => el === entry.target)?.[1];
        if (!name) continue;
        /* THE BORDER BOX, NOT `contentRect`. What the surfaces above have to
           clear is the space this one OCCUPIES, and `contentRect` is the
           content box — it leaves out the bar's own padding and its
           safe-area inset, which together are the thickest part of it. The
           symptom is a tray whose last line sits a couple of centimetres
           under the buttons. */
        const box = entry.borderBoxSize?.[0]?.blockSize;
        const height = box ?? (entry.target as HTMLElement).getBoundingClientRect().height;
        root.style.setProperty(name, `${Math.round(height)}px`);
      }
    });
    for (const [el] of boxes) if (el) observer.observe(el);
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

  /**
   * WHETHER THERE ARE LIGHTS ON THIS BOAT, and therefore whether night is on
   * offer at all.
   *
   * BOTH HALVES, because either one alone is a lie. A ring colour with no
   * speakers fitted lights nothing — `pxl_audio_none` hides `speaker_light`,
   * so the finish is applied to a mesh that is not drawn. Speakers with the
   * ring OFF are four grilles. Only the pair puts something on the boat that
   * the dark is worth seeing.
   *
   * Read off the configuration rather than tracked alongside it: `zoneVisible`
   * is the same function the scene asks, so the switch cannot disagree with
   * what is actually drawn.
   */
  const lit =
    RING !== null &&
    zoneVisible(config, "speaker_light") &&
    selectedOption(config, RING).slug !== "off";

  /* NIGHT CANNOT OUTLIVE THE LIGHTS. Its switch lives under the ring control
     and disappears with it, so a night that stayed on after the speakers came
     off would be a dark boat with nothing on screen to turn the lights back
     up — the interface having taken something away and kept the consequence. */
  useEffect(() => {
    if (!lit) setNight(false);
  }, [lit]);

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
      /* Touching a control the camera is not showing moves it there; touching
         the one it is already showing moves nothing. See the note on
         `subject` — this is the line that decides it. */
      if (PXL_SUBJECT_SHOTS[control.labelKey] && subject !== control.labelKey) {
        setSubject(control.labelKey);
        track({ name: "pxl_camera_change", preset: control.labelKey, source: "control" });
      }
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
    [config, say, subject, t.controls, t.optionSelected],
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
  const goToStep = useCallback(
    (index: number) => {
      /* Clamped rather than wrapped. This is a walk through a boat, and the
         section after the last one is not the first one again — it is the end
         of the walk, which is what the bottom bar offers instead. */
      const next = PXL_AVAILABLE_CATEGORIES[
        Math.min(Math.max(index, 0), PXL_AVAILABLE_CATEGORIES.length - 1)
      ];
      setStep(PXL_AVAILABLE_CATEGORIES.indexOf(next));
      track({ name: "pxl_category_open", category: next.id });
      /* EVERY TIME, NOT ONCE — and this replaces §A26's first-entry rule.
         That rule existed because the camera move was a SUGGESTION about a
         whole-boat view, and re-suggesting the same wide shot on every visit
         to a section was noise. The move is not a suggestion any more: it is
         how the section shows you the part it is about, so a section you come
         back to has to show it again. Coming back to EQUIPMENT and being left
         looking at the bow would be the interface forgetting what it is for.

         Reduced motion still opts out of the travel, but not of the
         composition: `PxlProductScene` completes the transition in one frame
         rather than easing it, so the shot arrives without the movement. */
      const shot = firstShot(next);
      if (shot) {
        setSubject(shot);
        track({ name: "pxl_camera_change", preset: next.suggestedView, source: "category" });
      }
    },
    [],
  );

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
        {/* `night` IS A PROP, NOT A LOCAL MOOD, and it had been missing here
            since §4.9 shipped it. The toggle set state, the chip lit up, and
            the scene was never told — the flag lives in `pxlView`, and the
            only way into `pxlView` from a page is through this component. The
            development bench passed it and the customer-facing route did not,
            which is exactly why nobody caught it: the feature worked
            everywhere it was being tested. */}
        <PxlStage
          preset={PXL_DEFAULT_PRESET}
          shot={subject}
          night={night}
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

        {/* Focus only. Copying the link moved to the bottom bar, beside the
            other thing a finished configuration can be used for — two share
            buttons on one screen is one of them nobody presses. */}
        <div className={styles.topActions}>
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

      {/* ── THE SECTION NAVIGATOR ──────────────────────────────────────────
          One section at a time, and the bar is what makes that legible rather
          than restrictive: the walk's length, the position in it, and every
          other stop by name and reachable in one click. A flow that hides
          where it is going is a wizard; this is a contents page that happens
          to be horizontal.                                                  */}
      <nav className={styles.steps} aria-label={t.categoryNav} data-ready={arrived || undefined}>
        <p className={styles.stepCount} aria-hidden="true">
          {fill(t.stepCounter, {
            index: String(step + 1),
            total: String(PXL_AVAILABLE_CATEGORIES.length),
          })}
        </p>
        <ol className={styles.stepList}>
          {PXL_AVAILABLE_CATEGORIES.map((c, i) => {
            const on = i === step;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={styles.step}
                  data-on={on || undefined}
                  data-done={i < step || undefined}
                  aria-current={on ? "step" : undefined}
                  data-cursor-solid=""
                  onClick={() => goToStep(i)}
                >
                  {t.categories[c.id]}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ── THE SECTION PANEL ──────────────────────────────────────────────
          The open section, down one side, with room to say things. The rail
          this replaces was a band across the bottom, and a band has room for
          a label and a row of discs and nothing else — which is why the boat
          could be recoloured without the interface ever explaining what it
          had painted. A column has room for the sentence.                   */}
      <aside
        ref={rail}
        className={styles.rail}
        data-ready={arrived || undefined}
        aria-label={t.categories[category.id]}
        data-lenis-prevent
      >
        {/* Keyed on the section, so a change of section arrives as one
            movement rather than as eleven controls morphing into five. */}
        <div className={styles.railScroll} key={category.id}>
          <header className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t.categories[category.id]}</h2>
            <p className={styles.sectionLead}>{t.categoryIntro[category.id]}</p>
          </header>

          {category.controls.map((control) => {
            const current = selectedOption(config, control);
            const name = optionLabel(current, "preview") ?? current.slug;
            const label = t.controls[control.labelKey] ?? control.id;
            return (
              <section className={styles.card} key={control.id}>
                {/* WHAT IS BEING SET, WHAT IT IS SET TO, AND WHAT THAT COSTS —
                    in that order, because that is the order the question is
                    asked in. The third line is the honest one: no price has
                    been approved for anything here, so it says so rather than
                    printing a zero that would read as free. */}
                <p className={styles.cardLabel}>{label}</p>
                <p className={styles.cardValue} aria-live="polite">
                  {name}
                </p>
                <p className={styles.cardPrice}>{t.noPrice}</p>
                {t.controlNotes[control.labelKey] ? (
                  <p className={styles.cardNote}>{t.controlNotes[control.labelKey]}</p>
                ) : null}
                <PxlSwatches
                  options={control.options}
                  value={current.id}
                  onChange={(option) => choose(control, option)}
                  groupLabel={label}
                  optionLabel={(n) => fill(t.optionLabel, { control: label, name: n })}
                  mirrorColour={mirrorColour[control.id as keyof typeof mirrorColour]}
                />
                <p className={styles.cardCount}>
                  {fill(t.optionCount, { count: String(control.options.length) })}
                </p>
                {/* UNDER THE LIGHTS, AND ONLY WHEN THERE ARE LIGHTS.
                    Night is not a specification and never has been — it does
                    not travel in the URL and a shared link opens in daylight —
                    so it does not get a card of its own. It belongs to the one
                    control whose result cannot be judged in daylight, and it
                    appears the moment that control has something to show. */}
                {control.labelKey === "speakerLight" && lit ? (
                  <label className={styles.night}>
                    <input
                      type="checkbox"
                      className={styles.nightInput}
                      checked={night}
                      onChange={() => setNight((on) => !on)}
                    />
                    <span className={styles.nightTrack} aria-hidden="true">
                      <span className={styles.nightKnob} />
                    </span>
                    <span className={styles.nightLabel}>{t.night}</span>
                  </label>
                ) : null}
              </section>
            );
          })}

          <div className={styles.panelFoot}>
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
            {/* Secondary, and only while it works. Never a fabricated hosted
                URL — the file is produced on this machine and saved to it. */}
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
          </div>
        </div>
      </aside>

      {/* ── THE BOTTOM BAR ─────────────────────────────────────────────────
          THE DECISION ON THE LEFT, THE WALK ON THE RIGHT — the two groups
          swapped sides, and the reason they can is that the reason they were
          apart is unchanged: the move buttons are the flow's own controls and
          the CTA is what the flow is for, so they never share an edge. A
          "next" sitting beside "request this configuration" is a next
          somebody presses by mistake once.

          BACK STILL COMES BEFORE NEXT inside its group, and that is the one
          thing not mirrored. Forward belongs at the edge you are travelling
          toward; a bar reading "next, back" left to right asks the eye to run
          the walk backwards.                                                */}
      <div className={styles.bar} ref={bar} data-ready={arrived || undefined}>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            onClick={openRequest}
            data-cursor-solid=""
          >
            {t.cta}
          </button>
          <button type="button" className={styles.ghost} onClick={share} data-cursor-solid="">
            {t.share}
          </button>
        </div>

        <div className={styles.move}>
          {/* Rendered rather than disabled at the ends. A permanently greyed
              control at step one is a control that has to be read and
              dismissed on every visit. */}
          {step > 0 ? (
            <button
              type="button"
              className={styles.ghost}
              onClick={() => goToStep(step - 1)}
              data-cursor-solid=""
            >
              {fill(t.previousSection, {
                name: t.categories[PXL_AVAILABLE_CATEGORIES[step - 1].id],
              })}
            </button>
          ) : null}
          {step < PXL_AVAILABLE_CATEGORIES.length - 1 ? (
            <button
              type="button"
              className={styles.next}
              onClick={() => goToStep(step + 1)}
              data-cursor-solid=""
            >
              {fill(t.nextSection, {
                name: t.categories[PXL_AVAILABLE_CATEGORIES[step + 1].id],
              })}
            </button>
          ) : null}
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
        {subject ? `. ${t.viewHeading}: ${t.controls[subject] ?? subject}` : ""}.
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
