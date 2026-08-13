"use client";

/**
 * SECTION 09 — Choose your power.
 *
 * Two propulsion personalities on one hull, presented as a real choice the
 * visitor makes rather than two paragraphs side by side. The selector is a
 * native tablist — arrow keys, Home/End, roving tabindex — because a control
 * this central has to work without a mouse.
 *
 * `onModeChange` is deliberately part of the public API even though nothing
 * consumes it yet: the Phase Two `drivetrain` scene will subscribe to it to
 * drive the 3D cutaway, and having the seam here now means that lands as a
 * prop, not a rewrite.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { POWER_MODES } from "@/content/boats";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import { DisplayLines, SectionLabel } from "@/components/primitives/Type";
import { ActionLink } from "@/components/primitives/ActionLink";
import { SceneSlot } from "@/components/scene/SceneSlot";
import { CONTACT } from "@/content/site";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./PowerSelector.module.css";

type ModeId = (typeof POWER_MODES)[number]["id"];

interface PowerSelectorProps {
  /** Phase Two hook: notified whenever the visitor changes propulsion. */
  onModeChange?: (mode: ModeId) => void;
}

export function PowerSelector({ onModeChange }: PowerSelectorProps) {
  const [active, setActive] = useState<ModeId>("electric");
  const tabs = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const select = useCallback(
    (mode: ModeId) => {
      setActive(mode);
      onModeChange?.(mode);
    },
    [onModeChange],
  );

  /* Cross-fade the panel contents on change. */
  useEffect(() => {
    const el = panel.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-power-item]"),
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.05, ease: "hull", overwrite: true },
      );
    }, el);

    return () => ctx.revert();
  }, [active]);

  /* Roving arrow-key navigation across the two options. */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const order = POWER_MODES.map((m) => m.id);
    const index = order.indexOf(active);
    let next: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % order.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (index - 1 + order.length) % order.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = order.length - 1;
    if (next === null) return;

    event.preventDefault();
    select(order[next]);
    tabs.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  };

  const mode = POWER_MODES.find((m) => m.id === active) ?? POWER_MODES[0];

  return (
    <section id="power" className={`${styles.section} is-dark`} data-ground="dark">
      <div className={styles.head}>
        <SectionLabel index="09">Propulsion</SectionLabel>
        <DisplayLines size="d1" lines={["Choose", "your power."]} />
      </div>

      <div
        ref={tabs}
        className={styles.tabs}
        role="tablist"
        aria-label="Propulsion"
        onKeyDown={onKeyDown}
      >
        {POWER_MODES.map((option) => {
          const selected = option.id === active;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              id={`power-tab-${option.id}`}
              aria-selected={selected}
              aria-controls={`power-panel-${option.id}`}
              tabIndex={selected ? 0 : -1}
              className={`${styles.tab} ${selected ? styles.tabActive : ""}`}
              onClick={() => select(option.id)}
            >
              <span className={`${styles.tabKicker} t-label`}>{option.kicker}</span>
              <span className={styles.tabLabel}>{option.label}</span>
            </button>
          );
        })}
        <span className={styles.tabRule} data-active={active} aria-hidden="true" />
      </div>

      <div
        ref={panel}
        className={styles.panel}
        role="tabpanel"
        id={`power-panel-${mode.id}`}
        aria-labelledby={`power-tab-${mode.id}`}
        tabIndex={0}
      >
        <SceneSlot scene="drivetrain" priority={3} className={styles.slot}>
          <CinematicMedia
            key={mode.media}
            id={mode.media}
            ratio="4 / 3"
            sizes="(max-width: 61.25rem) 100vw, 46vw"
            parallax={0.4}
            cut="lead"
          />
        </SceneSlot>

        <div className={styles.body}>
          <h3 className={styles.headline} data-power-item>
            {mode.headline}
          </h3>
          <p className={styles.copy} data-power-item>
            {mode.copy}
          </p>

          <dl className={styles.figures} data-power-item>
            {mode.figures.map((figure) => (
              <div key={figure.label} className={styles.figure}>
                <dt className={`${styles.figureLabel} t-label`}>{figure.label}</dt>
                <dd className={styles.figureValue}>
                  {figure.value}
                  {"unit" in figure && figure.unit ? (
                    <span className={styles.figureUnit}>{figure.unit}</span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>

          <p className={`${styles.note} t-label`} data-power-item>
            {mode.note}
          </p>

          <div data-power-item>
            <ActionLink href={`mailto:${CONTACT.suzuki.email}`}>Talk to the workshop</ActionLink>
          </div>
        </div>
      </div>
    </section>
  );
}
