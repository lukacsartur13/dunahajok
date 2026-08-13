"use client";

/**
 * Scene inspector — `?sceneDebug=1`, development builds only.
 *
 * Opt-in, dev-gated, and dead code in a production bundle: the whole component
 * is behind a `process.env.NODE_ENV` check that the compiler folds away. There
 * is no toggle in the shipped UI and no dependency added for it.
 *
 * It polls the stage object on a timer rather than subscribing to the frame
 * loop, because a debug overlay that re-renders React sixty times a second
 * measures itself instead of the scene.
 */

import { Fragment, useEffect, useState } from "react";
import { getSceneSlots } from "@/components/scene/SceneSlot";
import { stage } from "./stageState";

const POLL_MS = 250;

function useDebugEnabled(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    setOn(new URLSearchParams(window.location.search).get("sceneDebug") === "1");
  }, []);
  return on;
}

export function SceneDebug() {
  const enabled = useDebugEnabled();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    // A console handle on the live state, so the sequence can be parked at any
    // point and inspected without hunting for the scroll position that
    // produces it:  __duna.heroProgress = 0.42
    // ScrollTrigger reclaims the value on the next scroll, which is the right
    // behaviour — this is an inspection aid, not an override.
    (window as unknown as { __duna: typeof stage }).__duna = stage;

    const id = window.setInterval(() => tick((n) => n + 1), POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (process.env.NODE_ENV === "production" || !enabled) return null;

  const slots = getSceneSlots();
  const hero = stage.slots["hero-vessel"];
  const fps = stage.frameMs > 0.01 ? Math.min(60, Math.round(1000 / stage.frameMs)) : 60;

  const rows: Array<[string, string]> = [
    ["status", stage.status],
    ["vessel", stage.vesselSource],
    ["tier", stage.quality],
    ["dpr", stage.dpr.toFixed(2)],
    ["reduced", String(stage.reducedMotion)],
    ["hero p", stage.heroProgress.toFixed(3)],
    ["time", stage.time.toFixed(1) + "s"],
    ["ready", String(stage.ready)],
    ["draws", String(stage.drawCalls)],
    ["tris", stage.triangles.toLocaleString("en-GB")],
    ["cpu/frame", stage.frameMs.toFixed(2) + "ms"],
    ["≈fps cap", String(fps)],
    [
      "hero box",
      hero
        ? `${Math.round(hero.width)}×${Math.round(hero.height)} @${Math.round(
            hero.top,
          )} ${hero.visible ? "vis" : "off"}`
        : "—",
    ],
    ["slots", slots.map((s) => s.id).join(", ") || "—"],
  ];

  return (
    <div
      style={{
        position: "fixed",
        // Top-right on purpose: the scenes live in full-bleed bands, and a
        // panel in a corner one of them occupies is a panel that hides the
        // thing it is reporting on.
        insetBlockStart: "3.5rem",
        insetInlineEnd: "0.75rem",
        zIndex: 999,
        padding: "0.6rem 0.75rem",
        background: "rgba(6,10,11,0.86)",
        color: "#f1f0eb",
        font: "10px/1.5 ui-monospace, SFMono-Regular, monospace",
        letterSpacing: "0.04em",
        border: "1px solid rgba(241,240,235,0.16)",
        pointerEvents: "none",
        display: "grid",
        gridTemplateColumns: "auto auto",
        columnGap: "0.9rem",
        textTransform: "uppercase",
      }}
    >
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <span style={{ opacity: 0.45 }}>{label}</span>
          <span>{value}</span>
        </Fragment>
      ))}
    </div>
  );
}
