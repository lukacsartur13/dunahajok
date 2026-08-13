"use client";

/**
 * THE FINISH CONTROL.
 *
 * §10 asks for swatches that feel like a material sample rather than a form
 * control, and §24 asks that every one of them be operable without a pointer.
 * Those two are usually in tension — the moment a radio input is replaced with
 * something beautiful, its keyboard behaviour goes with it — so this is a real
 * radiogroup rather than a row of buttons that happen to look selected:
 *
 *   • ONE TAB STOP for the whole range, not six. A radiogroup is a single
 *     control with several values, and tabbing through the values one at a time
 *     is the classic mistake — on a page with six colours it is survivable, on
 *     a page that later has four categories it is not;
 *   • arrows move AND select, which is what `aria-checked` radios do
 *     everywhere else and, here, means the boat repaints as the selection
 *     travels — the keyboard gets the same "see it change" the mouse gets;
 *   • Home and End, because a range has ends;
 *   • the selected state is carried by `aria-checked`, by a ring, and by a name
 *     printed beside the group. Never by colour alone (§24).
 *
 * THE SWATCH IS NOT A FLAT DISC. Each one carries the finish's own base colour
 * under a fixed sheen — a soft highlight in the upper left and a shadow toward
 * the lower right — so a clear-coated paint reads as a clear-coated paint and
 * the near-black and near-white finishes are distinguishable from the ground
 * they sit on. It is a *sample*, and a sample with no light on it is a swatch
 * from a spreadsheet.
 */

import { useCallback, useRef, type KeyboardEvent } from "react";
import { finishLabel, type PxlFinish } from "@/webgl/scenes/pxl/pxlPalette";
import styles from "./PxlProductConfigurator.module.css";

interface PxlSwatchesProps {
  options: readonly PxlFinish[];
  /** The selected finish's internal key. */
  value: string;
  onChange: (id: string) => void;
  /** Accessible name for the group — the category, in the reader's language. */
  groupLabel: string;
  /** `"{name}"` pattern for a single option's accessible name. */
  optionLabel: (name: string) => string;
}

export function PxlSwatches({
  options,
  value,
  onChange,
  groupLabel,
  optionLabel,
}: PxlSwatchesProps) {
  const group = useRef<HTMLDivElement>(null);
  const index = Math.max(0, options.findIndex((o) => o.id === value));

  const move = useCallback(
    (next: number) => {
      const wrapped = (next + options.length) % options.length;
      onChange(options[wrapped].id);
      // Focus follows selection, or the next arrow press would start from
      // wherever the DOM last left the tab ring rather than from the value the
      // viewer can see is selected.
      group.current
        ?.querySelectorAll<HTMLButtonElement>("[role='radio']")
        [wrapped]?.focus();
    },
    [options, onChange],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          move(index + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          move(index - 1);
          break;
        case "Home":
          event.preventDefault();
          move(0);
          break;
        case "End":
          event.preventDefault();
          move(options.length - 1);
          break;
        default:
          break;
      }
    },
    [index, move, options.length],
  );

  return (
    <div
      ref={group}
      className={styles.swatches}
      role="radiogroup"
      aria-label={groupLabel}
      onKeyDown={onKeyDown}
    >
      {options.map((option, i) => {
        const on = i === index;
        // Never `option.previewLabel` directly — see the publication rule in
        // `pxlPalette`. On a surface with no approved name the swatch falls back
        // to its URL token, which is a fact rather than a claim.
        const name = finishLabel(option, "preview") ?? option.slug;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={optionLabel(name)}
            // The roving tab stop. Exactly one member of the group is reachable
            // by Tab; the arrows do the rest.
            tabIndex={on ? 0 : -1}
            className={styles.swatch}
            data-on={on || undefined}
            data-cursor-solid=""
            onClick={() => onChange(option.id)}
          >
            <span
              className={styles.sample}
              style={{ "--finish": option.base } as React.CSSProperties}
              aria-hidden="true"
            />
            {/* Hover and focus name it; the group's own line names it always. */}
            <span className={styles.swatchName} aria-hidden="true">
              {name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
