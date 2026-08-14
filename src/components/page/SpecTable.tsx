"use client";

/**
 * VERIFIED SPECIFICATIONS.
 *
 * §B4 asks the product pages for "verified specifications" and the word doing
 * the work is *verified*. Every figure that reaches this component comes from
 * `content/boats.ts`, whose header states that each one is transcribed verbatim
 * from dunahajok.hu and that nothing is estimated, rounded or inferred.
 *
 * So this component's job is not to decide what is true — it is to make the
 * source visible. It prints a `source` line under the table naming where the
 * figures come from, because a specification table on a boatbuilder's site is
 * the single most quotable thing on it, and a reader who wants to check should
 * be able to.
 *
 * SET AS OVERSIZED NUMERALS RATHER THAN AS A TABLE OF ROWS. A boat has seven
 * numbers, not seventy; a data table's whole value is scanning a long list, and
 * at seven it is a grid that reads as a form. The markup stays a `<dl>` — this
 * is definitions, and a screen reader should get the pairing — while the
 * presentation is typographic.
 */

import { Reveal } from "@/components/primitives/Reveal";
import type { Spec } from "@/content/boats";
import styles from "./SpecTable.module.css";

interface SpecTableProps {
  specs: readonly Spec[];
  /** Where the figures come from. Printed, not just recorded. */
  source: string;
  /** A note about what is deliberately absent — price, in every case today. */
  note?: string;
  className?: string;
}

export function SpecTable({ specs, source, note, className }: SpecTableProps) {
  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <Reveal as="dl" className={styles.grid} stagger>
        {specs.map((spec) => (
          <div key={`${spec.label}-${spec.value}`} className={styles.item}>
            <dt className={`${styles.label} t-label`}>
              {spec.label}
              {spec.note ? <span className={styles.qualifier}> · {spec.note}</span> : null}
            </dt>
            <dd className={styles.value}>
              <span className={styles.number}>{spec.value}</span>
              {spec.unit ? <span className={styles.unit}>{spec.unit}</span> : null}
            </dd>
          </div>
        ))}
      </Reveal>

      <p className={`${styles.source} t-label`}>{source}</p>
      {note ? <p className={`${styles.source} ${styles.note}`}>{note}</p> : null}
    </div>
  );
}
