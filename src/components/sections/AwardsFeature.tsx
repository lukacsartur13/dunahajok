/**
 * SECTION 08 — Design, recognized.
 *
 * No grid of badge logos. Awards are set as an editorial index: the year at
 * display scale, the body in plain type, negative space doing the work of
 * saying "this matters". The one award without a confirmed year renders its
 * marker as a dash rather than a guess — see content/story.ts.
 */

import { AWARDS, AWARDS_HEADLINE } from "@/content/story";
import { DisplayLines, SectionLabel } from "@/components/primitives/Type";
import { Reveal } from "@/components/primitives/Reveal";
import { WakeLine } from "@/components/primitives/WakeLine";
import styles from "./AwardsFeature.module.css";

export function AwardsFeature() {
  return (
    <section id="awards" className={`${styles.section} is-dark`} data-ground="dark">
      <WakeLine variant="field" origin={0.82} className={styles.wake} />

      <div className={styles.inner}>
        <div className={styles.head}>
          <SectionLabel index="08">Recognition</SectionLabel>
          <DisplayLines size="d1" lines={[...AWARDS_HEADLINE]} className={styles.headline} />
        </div>

        <Reveal as="ol" className={styles.list} stagger>
          {AWARDS.map((award) => (
            <li key={`${award.title}-${award.subject}`} className={styles.item}>
              <p className={styles.year} aria-hidden={award.year === null}>
                {award.year ?? "—"}
              </p>
              <div className={styles.itemBody}>
                <h3 className={styles.itemTitle}>
                  {award.title}
                  {/* The rake slash is decorative; screen readers get a comma
                      so the award and its subject don't run together. */}
                  <span className="u-sr">, </span>
                  <span className="t-slash" aria-hidden="true">
                    /
                  </span>
                  <span className={styles.subject}>{award.subject}</span>
                </h3>
                <p className={`${styles.result} t-label`}>{award.result}</p>
                <p className={styles.detail}>{award.detail}</p>
              </div>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
