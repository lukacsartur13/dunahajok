"use client";

/**
 * THE REFERENCE COMPARISON BENCH. §21, §22.
 *
 * ── WHAT IT IS FOR ─────────────────────────────────────────────────────────
 *
 * §3 asks a question that cannot be answered from one screen at a time: "if the
 * original reference image and the browser render were shown side by side, would
 * a reasonable viewer immediately understand that this is the same product
 * design?" Answering it by alt-tabbing between a JPEG and a canvas is how a
 * mismatch of four degrees in the sheer survives three phases. So this puts the
 * two in one frame, at one scale, and lets a developer fade between them.
 *
 * It is a MEASURING INSTRUMENT, not a demo. It is reachable only at
 * `?pxlReference=1`, it renders nothing at all in a production build, and §31
 * keeps it off every public surface. Nothing here is customer-facing and nothing
 * here should ever become customer-facing.
 *
 * ── WHY IT DRIVES THE DETERMINISTIC RENDERER ───────────────────────────────
 *
 * The live scene is animated: it arrives, it breathes, it drifts, and its
 * material changes take 340 ms. Every one of those makes a frame a moving
 * target, and comparing a moving target to a still plate measures the animation
 * rather than the design. So the live half is drawn through `pxlQa`'s
 * deterministic frame mode — fixed clock, named camera, configuration applied
 * with no transition — which also means the bench works in the throttled,
 * permanently-hidden tab the automated browsers give us. That was §23's whole
 * point, and this is the surface that spends it.
 *
 * It reaches the renderer through `window.__pxlQa` rather than by importing it.
 * `pxlQa` pulls in `PxlVessel`, which pulls in three and drei; importing it here
 * would drag the entire WebGL bundle into the page chunk to serve a development
 * panel. The global is published for exactly this kind of caller.
 *
 * ── ALIGNMENT IS AUTHORED, NEVER SOLVED ────────────────────────────────────
 *
 * §22 is explicit: do not distort the live model to make one screenshot line up.
 * So nothing here touches the scene. The plate is what moves — scale and offset,
 * starting from the authored values on `PxlReferencePlate.calibration` and
 * nudged by the developer — and the current numbers are always on screen so a
 * better alignment can be written back into `pxlReference` as data.
 *
 * A mismatch that cannot be nudged away is the finding. That is the point.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PXL_CONTROLS } from "@/webgl/scenes/pxl/pxlCatalog";
import {
  PXL_REFERENCE_PLATES,
  PXL_REFERENCE_PLATE_BY_ID,
  plateMediaId,
} from "@/webgl/scenes/pxl/pxlReference";
import { PXL_MEDIA } from "@/lib/pxl.media.generated";
import { asset } from "@/lib/basePath";
import styles from "./PxlReferenceBench.module.css";

/** The QA surface, as this file needs it. Typed structurally to avoid the import. */
interface QaApi {
  ready: () => boolean;
  capture: (spec: { configuration?: string; camera?: string; time?: number }) => string | null;
}

function qa(): QaApi | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { __pxlQa?: QaApi }).__pxlQa ?? null;
}

/**
 * The two modes §22 asks for, and deliberately not a third.
 *
 * A CSS `mix-blend-mode: difference` layer was built here and then removed. The
 * idea is sound — where two images agree the result goes to black, so a
 * mismatched sheer shows as a bright band whose thickness is the error — but the
 * live half is an opaque frame with the scene's own backdrop baked into it, and
 * blending it against the plate never produced a usable image however the
 * stacking contexts were arranged. Shipping a control that silently does nothing
 * is worse than not shipping it.
 *
 * The numerical form of that same comparison already exists and works:
 * `scripts/pxl/reference-qa.mjs` rasterises the model's silhouette against the
 * plate's and reports the deviation at twenty-one stations, with no GPU. If a
 * visual difference layer is wanted later, the way to get it is a transparent
 * clear in the deterministic renderer — not a blend mode over an opaque frame.
 */
type Mode = "overlay" | "side_by_side";

interface Calibration {
  scale: number;
  x: number;
  y: number;
}

export function PxlReferenceBench() {
  /* The production build compiles this component to a constant `null`. The
     check is on the literal so the bundler can prove it and drop the rest. */
  if (process.env.NODE_ENV === "production") return null;
  return <Bench />;
}

function Bench() {
  const [enabled, setEnabled] = useState(false);
  const [plateId, setPlateId] = useState(PXL_REFERENCE_PLATES[0].id);
  const [mode, setMode] = useState<Mode>("overlay");
  const [opacity, setOpacity] = useState(0.5);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [calibration, setCalibration] = useState<Calibration>(
    PXL_REFERENCE_PLATES[0].calibration,
  );
  const [frame, setFrame] = useState<string | null>(null);
  const [note, setNote] = useState<string>("");
  const attempts = useRef(0);

  /* §21's entry point. Read once — the flag is not meant to be toggled live. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEnabled(params.get("pxlReference") === "1");
  }, []);

  const plate = PXL_REFERENCE_PLATE_BY_ID.get(plateId) ?? PXL_REFERENCE_PLATES[0];

  /** The configuration, as the query string the deterministic renderer parses. */
  const configuration = useMemo(
    () =>
      Object.entries(selection)
        .map(([param, slug]) => `${param}=${slug}`)
        .join("&"),
    [selection],
  );

  /**
   * The finish on screen, which the water studies follow.
   *
   * Falls back to the control's own default rather than to a hard-coded slug,
   * so adding a finish to the catalogue cannot leave this pointing at a study
   * that no longer corresponds to anything.
   */
  const exteriorSlug = useMemo(() => {
    const control = PXL_CONTROLS.find((c) => c.param === "exterior");
    if (!control) return "sage";
    const chosen = selection.exterior;
    if (chosen) return chosen;
    return (
      control.options.find((o) => o.id === control.defaultOptionId)?.slug ??
      control.options[0]?.slug ??
      "sage"
    );
  }, [selection.exterior]);

  const mediaId = plateMediaId(plate.id, exteriorSlug);
  const media = PXL_MEDIA[mediaId as keyof typeof PXL_MEDIA] ?? PXL_MEDIA["pxl-hero-side"];

  /* Reset the nudge whenever the plate changes: the authored value is the
     starting point for each pairing, and carrying one plate's offset onto the
     next is how a developer ends up measuring their own slider. */
  useEffect(() => {
    setCalibration(plate.calibration);
  }, [plate]);

  /**
   * Draw the live half.
   *
   * The scene may not have mounted yet — this panel and the WebGL canvas come up
   * independently — so a miss re-arms on a timer instead of failing. It gives up
   * after a while rather than spinning forever, and says so on screen, because a
   * bench that is silently retrying looks exactly like a bench that is broken.
   */
  const draw = useCallback(() => {
    const api = qa();
    /* MISSING AND NOT-READY ARE THE SAME WAIT, and treating them differently was
       a bug worth one screenshot: `pxlQa` installs itself at module scope inside
       the lazily-loaded PXL chunk, so for the first moments after this panel
       mounts the global genuinely does not exist yet. Reporting that as "is this
       a production build?" is a confident answer to the wrong question. */
    if (!api || !api.ready()) {
      attempts.current += 1;
      if (attempts.current > 40) {
        setNote(
          api
            ? "the PXL scene has not mounted; the live half cannot be drawn"
            : "window.__pxlQa never appeared — is this a production build?",
        );
        return;
      }
      setNote(api ? "waiting for the scene…" : "waiting for the PXL chunk…");
      window.setTimeout(draw, 250);
      return;
    }
    const url = api.capture({ camera: plate.preset, configuration });
    if (!url) {
      setNote("the frame did not render — see the console");
      return;
    }
    attempts.current = 0;
    setNote("");
    setFrame(url);
  }, [plate.preset, configuration]);

  useEffect(() => {
    if (!enabled) return;
    draw();
  }, [enabled, draw]);

  if (!enabled) return null;

  const plateStyle = {
    transform: `translate(-50%, -50%) translate(${calibration.x * 100}%, ${
      calibration.y * 100
    }%) scale(${calibration.scale})`,
  };

  const stacked = mode === "overlay";
  const liveStyle = stacked ? { opacity } : undefined;

  /**
   * PORTALLED TO THE BODY, and it is not optional.
   *
   * The bench is `position: fixed; z-index: 9998`, and it was still being painted
   * OVER by the WebGL canvas — which sits at `--z-scene: 40`. Forty is not
   * greater than 9998; the two numbers were never being compared. `PxlConfigurator`
   * wraps its content in a stacking context of its own at `--z-content: 10`, and a
   * z-index only ranks a box against its siblings inside that context, so the
   * whole panel was competing at 10 against a canvas at 40 and losing.
   *
   * This cost a genuinely confusing half hour: the canvas draws the same boat the
   * bench was about to draw, so "the plate is missing and the live frame is
   * enormous" looked exactly like a layout bug in this file — and the DOM
   * measurements said the two images were laid out correctly at half width the
   * whole time, because they were. They were simply underneath.
   *
   * A portal to `document.body` puts the panel in the root stacking context,
   * where 9998 means what it says.
   */
  const panel = (
    <aside className={styles.bench} aria-label="PXL reference comparison (development)">
      <header className={styles.head}>
        <strong className={styles.title}>REFERENCE ↔ LIVE</strong>
        <span className={styles.checks}>{plate.checks}</span>
      </header>

      <div className={stacked ? styles.stageOverlay : styles.stageSplit}>
        <figure className={styles.pane}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a raw <img>
              on purpose: next/image would letterbox and lazy-load the plate, and
              this panel needs the pixels unprocessed and present to measure. */}
          <img
            className={styles.plate}
            src={asset(media.src)}
            alt={`Reference plate: ${plate.id}`}
            /* Fully opaque, always. Only the LIVE layer fades — fading both
               against the dark stage behind them means that at the middle of
               the slider you are looking at 50% of each over 50% of a grey
               nothing, which is the one position a silhouette comparison most
               needs to be clean. */
            style={stacked ? plateStyle : undefined}
          />
          {!stacked && <figcaption>REFERENCE — {media.id}</figcaption>}
        </figure>

        <figure className={styles.pane}>
          {frame ? (
            /* eslint-disable-next-line @next/next/no-img-element -- a data URL
                read straight back from the drawing buffer; see pxlQa. */
            <img
              className={styles.live}
              src={frame}
              alt={`Live render: ${plate.preset}`}
              style={liveStyle}
            />
          ) : (
            <div className={styles.empty}>{note || "…"}</div>
          )}
          {!stacked && <figcaption>LIVE — {plate.preset}</figcaption>}
        </figure>
      </div>

      <div className={styles.controls}>
        <label className={styles.field}>
          <span>Plate</span>
          <select value={plateId} onChange={(e) => setPlateId(e.target.value)}>
            {PXL_REFERENCE_PLATES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} → {p.preset}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="overlay">opacity overlay</option>
            <option value="side_by_side">side by side</option>
          </select>
        </label>

        {mode === "overlay" && (
          <label className={styles.field}>
            <span>REF ↔ LIVE {opacity.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
            />
          </label>
        )}

        {/* Every configurable control, straight off the catalogue. §21 lists
            finish, lower treatment, interior and propulsion; deriving the set
            means the bench gains a control the day the catalogue does. */}
        {PXL_CONTROLS.map((control) => (
          <label key={control.param} className={styles.field}>
            <span>{control.param}</span>
            <select
              value={
                selection[control.param] ??
                control.options.find((o) => o.id === control.defaultOptionId)?.slug ??
                ""
              }
              onChange={(e) =>
                setSelection((prev) => ({ ...prev, [control.param]: e.target.value }))
              }
            >
              {control.options.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.previewLabel}
                </option>
              ))}
            </select>
          </label>
        ))}

        {stacked && (
          <>
            <label className={styles.field}>
              <span>plate scale {calibration.scale.toFixed(3)}</span>
              <input
                type="range"
                min={0.4}
                max={2.6}
                step={0.005}
                value={calibration.scale}
                onChange={(e) =>
                  setCalibration((c) => ({ ...c, scale: Number(e.target.value) }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>plate x {calibration.x.toFixed(3)}</span>
              <input
                type="range"
                min={-0.8}
                max={0.8}
                step={0.002}
                value={calibration.x}
                onChange={(e) => setCalibration((c) => ({ ...c, x: Number(e.target.value) }))}
              />
            </label>
            <label className={styles.field}>
              <span>plate y {calibration.y.toFixed(3)}</span>
              <input
                type="range"
                min={-0.8}
                max={0.8}
                step={0.002}
                value={calibration.y}
                onChange={(e) => setCalibration((c) => ({ ...c, y: Number(e.target.value) }))}
              />
            </label>
          </>
        )}

        <button type="button" className={styles.button} onClick={draw}>
          redraw
        </button>
      </div>

      {/* The calibration as it would be written back into `pxlReference`. §22
          asks for authored alignment values; this is the line to paste. */}
      <footer className={styles.foot}>
        <code>
          {plate.id}: calibration: {"{"} scale: {calibration.scale.toFixed(3)}, x:{" "}
          {calibration.x.toFixed(3)}, y: {calibration.y.toFixed(3)} {"}"}
        </code>
        <span className={styles.source}>plate source: {plate.file}</span>
        {note && <span className={styles.note}>{note}</span>}
      </footer>
    </aside>
  );

  return createPortal(panel, document.body);
}
