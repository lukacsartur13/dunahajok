"use client";

/**
 * THE OPTION CONTROL — one component for all four categories.
 *
 * Phase Three's version of this file took `readonly PxlFinish[]` and drew a
 * colour disc. Phase Four has four categories, and only two of them are about
 * colour: HULL DETAIL is about where a colour stops, and PROPULSION is about
 * size. §A25 warns against turning the rail into a giant form, and the way that
 * happens is one bespoke control per category — four layouts, four keyboard
 * implementations, four sets of focus bugs.
 *
 * So there is one control, and it renders whatever `PxlCatalogOption.swatch`
 * says. The three swatch kinds are declared in the catalogue beside the options
 * they belong to, which means adding a category is adding data and, at most, a
 * fourth arm to the `switch` below — never a fourth component.
 *
 * ACCESSIBILITY IS UNCHANGED FROM PHASE THREE, because it was right:
 *
 *   • ONE TAB STOP for the whole range, not six. A radiogroup is a single
 *     control with several values, and tabbing through the values one at a time
 *     is the classic mistake — on a page with six colours it is survivable, on
 *     a page with four categories and six controls it is not;
 *   • arrows move AND select, which is what `aria-checked` radios do everywhere
 *     else and, here, means the boat changes as the selection travels — the
 *     keyboard gets the same "see it change" the mouse gets;
 *   • Home and End, because a range has ends;
 *   • the selected state is carried by `aria-checked`, by a ring, and by a name
 *     printed beside the group. Never by colour alone — which matters more now
 *     than it did, because two of the three swatch kinds are not colours at all.
 */

import { useCallback, useRef, type CSSProperties, type KeyboardEvent } from "react";
import type { PxlCatalogOption } from "@/webgl/scenes/pxl/pxlCatalog";
import { optionLabel as resolveLabel } from "@/webgl/scenes/pxl/pxlConfig";
import styles from "./PxlProductConfigurator.module.css";

interface PxlSwatchesProps {
  options: readonly PxlCatalogOption[];
  /** The selected option's internal key. */
  value: string;
  onChange: (option: PxlCatalogOption) => void;
  /** Accessible name for the group — the control, in the reader's language. */
  groupLabel: string;
  /** Accessible name for one option. */
  optionLabel: (name: string) => string;
  /**
   * The colour an option that FOLLOWS another control should be drawn in.
   *
   * Two controls have one: HULL DETAIL's FULL BODY COLOUR, whose lower band is
   * genuinely the exterior's colour, and §4.9's MATCH INTERIOR on the rails,
   * which is genuinely the interior's. Passed rather than read from the store,
   * because a swatch that resolved a configuration would have to know what one
   * is — and it is per control, because the two follow different things.
   *
   * A fixed chip in either place would be a swatch that lies about its option.
   */
  mirrorColour?: string;
}

export function PxlSwatches({
  options,
  value,
  onChange,
  groupLabel,
  optionLabel,
  mirrorColour,
}: PxlSwatchesProps) {
  const group = useRef<HTMLDivElement>(null);
  const index = Math.max(0, options.findIndex((o) => o.id === value));

  const move = useCallback(
    (next: number) => {
      const wrapped = (next + options.length) % options.length;
      onChange(options[wrapped]);
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
        // `pxlConfig.optionLabel`. On a surface with no approved name the swatch
        // falls back to its URL token, which is a fact rather than a claim.
        const name = resolveLabel(option, "preview") ?? option.slug;
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
            data-kind={option.swatch.kind}
            data-cursor-solid=""
            onClick={() => onChange(option)}
          >
            <Sample option={option} mirrorColour={mirrorColour} />
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

/**
 * THE SAMPLE ITSELF.
 *
 * A COLOUR sample is not a flat disc. It carries the finish's own base under a
 * fixed sheen — a soft highlight in the upper left and a shadow toward the
 * lower right — so a clear-coated paint reads as a clear-coated paint and the
 * near-black and near-white finishes are distinguishable from the ground they
 * sit on. It is a *sample*, and a sample with no light on it is a swatch from a
 * spreadsheet.
 *
 * A WATERLINE sample is the same disc split at the chine, because the choice is
 * about where the colour stops rather than what it is. FULL BODY COLOUR draws
 * both bands in the live exterior finish, so the control answers the question
 * the option actually asks.
 *
 * A SCALE sample is a filled mark whose area is the drive's own cowling volume
 * relative to the largest — so the four marks stand in the same ratio as the
 * four objects. Area rather than height: the eye compares areas, and a bar
 * chart of engine sizes would overstate the difference by a factor of the
 * square root. The electric drive takes an outline rather than a fill, which is
 * the one place its difference in kind is stated in the interface rather than
 * only on the boat.
 */
function Sample({
  option,
  mirrorColour,
}: {
  option: PxlCatalogOption;
  mirrorColour?: string;
}) {
  const swatch = option.swatch;

  if (swatch.kind === "colour") {
    return (
      <span
        className={styles.sample}
        style={{ "--finish": swatch.value } as CSSProperties}
        aria-hidden="true"
      />
    );
  }

  if (swatch.kind === "follows") {
    return (
      <span
        className={styles.sample}
        style={{ "--finish": mirrorColour ?? "#8d9095" } as CSSProperties}
        aria-hidden="true"
      />
    );
  }

  if (swatch.kind === "waterline") {
    const upper = mirrorColour ?? "#8d9095";
    const lower = swatch.lower ?? upper;
    return (
      <span
        className={styles.sample}
        data-waterline=""
        style={
          {
            "--finish": upper,
            "--finish-lower": lower,
          } as CSSProperties
        }
        aria-hidden="true"
      />
    );
  }

  // `magnitude` is a volume fraction; its square root is the linear fraction
  // that makes the drawn AREA proportional. Floored at 0.42 so the smallest
  // drive is still a mark somebody can hit rather than a dot.
  const linear = Math.max(0.42, Math.sqrt(swatch.magnitude));
  return (
    <span
      className={styles.sample}
      data-scale=""
      data-electric={swatch.electric || undefined}
      style={{ "--scale": String(linear) } as CSSProperties}
      aria-hidden="true"
    />
  );
}
