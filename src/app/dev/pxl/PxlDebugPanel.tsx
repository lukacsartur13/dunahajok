"use client";

/**
 * THE INSPECTION BENCH — `?debug=1` only.
 *
 * §88 asks for a controlled debug surface and §17 asks that the framing
 * telemetry survive into this phase. Both are here, and neither is reachable
 * without typing the parameter: the configurator beside it is the thing being
 * judged, and a permanent readout of draw calls over the top of it changes what
 * people look at.
 *
 * Everything printed is measured, not asserted. The mesh table comes from the
 * zone contract the pipeline writes; the counters come from the renderer's own
 * `gl.info`; the framing comes from projecting the vessel's bounding box
 * through the live camera. A number here that disagrees with the phase report
 * means the phase report is wrong.
 */

import { useEffect, useState } from "react";
import {
  PXL_CHANNEL_OPTIONS,
  finishForChannel,
} from "@/webgl/scenes/pxl/pxlConfig";
import {
  PXL_CATEGORIES,
  PXL_DEFERRED_CATEGORIES,
  PXL_DRIVE_SPECS,
} from "@/webgl/scenes/pxl/pxlCatalog";
import {
  PXL_CONSOLE_REVISION,
  PXL_MODEL,
  PXL_UNSUPPORTED_CHANNELS,
  PXL_ZONES,
} from "@/webgl/scenes/pxl/pxlModel";
import { PXL_ALL_FINISHES } from "@/webgl/scenes/pxl/pxlPalette";
import { pxlTelemetry } from "@/webgl/scenes/pxl/pxlTelemetry";
import { currentPxlQuery, usePxlConfiguration } from "@/webgl/scenes/pxl/pxlStore";
import { stage } from "@/webgl/stage/stageState";
import styles from "./PxlDebugPanel.module.css";

/** Live counters. Polled at a rate a human can read, not per frame. */
function useTick(active: boolean): void {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => set((n) => n + 1), 300);
    return () => window.clearInterval(id);
  }, [active]);
}

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export function PxlDebugPanel() {
  const [open, setOpen] = useState(true);
  const config = usePxlConfiguration();
  useTick(open);

  return (
    <aside className={styles.panel} data-open={open || undefined} data-lenis-prevent>
      <button type="button" className={styles.toggle} onClick={() => setOpen((v) => !v)}>
        {open ? "hide telemetry" : "telemetry"}
      </button>

      {open ? (
        <div className={styles.body}>
          <section>
            <h2>camera</h2>
            <dl>
              <dt>preset</dt>
              <dd>
                {pxlTelemetry.preset}
                {pxlTelemetry.orbited ? " (orbited)" : ""}
              </dd>
              <dt>orbit</dt>
              <dd>
                az {pxlTelemetry.azimuth.toFixed(1)}° · el {pxlTelemetry.elevation.toFixed(1)}°
              </dd>
              <dt>distance</dt>
              <dd>{pxlTelemetry.distance.toFixed(2)} m</dd>
              <dt>vfov</dt>
              <dd>{pxlTelemetry.fov.toFixed(1)}°</dd>
              <dt>slot</dt>
              <dd>
                {Math.round(pxlTelemetry.slotWidth)}×{Math.round(pxlTelemetry.slotHeight)}
              </dd>
              <dt>coverage</dt>
              <dd>
                {pct(pxlTelemetry.fillX)} × {pct(pxlTelemetry.fillY)}
                {pxlTelemetry.clipped ? " — CLIPPED" : ""}
              </dd>
              <dt>margins</dt>
              <dd>
                L {pct(pxlTelemetry.marginLeft)} · R {pct(pxlTelemetry.marginRight)} · T{" "}
                {pct(pxlTelemetry.marginTop)} · B {pct(pxlTelemetry.marginBottom)}
              </dd>
            </dl>
          </section>

          <section>
            <h2>renderer</h2>
            <dl>
              <dt>status</dt>
              <dd>{stage.status}</dd>
              <dt>tier</dt>
              <dd>{stage.quality}</dd>
              <dt>dpr</dt>
              <dd>{stage.dpr.toFixed(2)}</dd>
              <dt>draw calls</dt>
              <dd>{stage.drawCalls}</dd>
              <dt>triangles</dt>
              <dd>{stage.triangles.toLocaleString("en-GB")}</dd>
              <dt>cpu/frame</dt>
              <dd>{stage.frameMs.toFixed(2)} ms</dd>
              <dt>reduced motion</dt>
              <dd>{String(stage.reducedMotion)}</dd>
            </dl>
          </section>

          <section>
            <h2>configuration</h2>
            <dl>
              <dt>query</dt>
              <dd>{currentPxlQuery() || "(default)"}</dd>
              <dt>finish transition</dt>
              <dd>{pxlTelemetry.finishing ? "running" : "settled"}</dd>
            </dl>
            <table className={styles.table}>
              <tbody>
                {Object.keys(PXL_CHANNEL_OPTIONS).map((channel) => (
                  <tr key={channel}>
                    <td>{channel}</td>
                    <td>{finishForChannel(config, channel) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>categories</h2>
            <table className={styles.table}>
              <tbody>
                {PXL_CATEGORIES.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>
                      {c.controls
                        .map((control) => `${control.param} (${control.options.length})`)
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
                {PXL_DEFERRED_CATEGORIES.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>unavailable — {c.unavailable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>meshes · material roles</h2>
            <table className={styles.table}>
              <tbody>
                {PXL_ZONES.map((z) => (
                  <tr key={z.id}>
                    <td>{z.id}</td>
                    <td>{z.role}</td>
                    <td>{z.channel ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>finishes</h2>
            <table className={styles.table}>
              <tbody>
                {PXL_ALL_FINISHES.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <span className={styles.dot} style={{ background: f.base }} />
                      {f.slug}
                    </td>
                    <td>{f.base}</td>
                    <td>
                      r {f.roughness} · m {f.metalness} · cc {f.clearcoat}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>asset</h2>
            <dl>
              <dt>url</dt>
              <dd>{PXL_MODEL.url}</dd>
              <dt>revision</dt>
              <dd>{PXL_CONSOLE_REVISION}</dd>
              <dt>loa · beam</dt>
              <dd>
                {PXL_MODEL.loa.toFixed(3)} × {PXL_MODEL.beam.toFixed(3)} m
              </dd>
              <dt>draft below y=0</dt>
              <dd>{PXL_MODEL.draft.toFixed(3)} m — visual calibration, not flotation</dd>
            </dl>
          </section>

          <section>
            <h2>channels the asset cannot serve</h2>
            <ul>
              {Object.entries(PXL_UNSUPPORTED_CHANNELS).map(([channel, why]) => (
                <li key={channel}>
                  <code>{channel}</code> — {why}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </aside>
  );
}
