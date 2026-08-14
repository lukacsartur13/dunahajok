"use client";

/**
 * THE CHRONICLE — §B10's "go deeper" made structural.
 *
 * One band per date, each with the year set at display scale, the image at a
 * size the homepage's timeline cannot spend, and a rule running down the page
 * that changes material as the story moves forward — timber, then pencil, then
 * hull, then wake. That progression is `Milestone.material`, which the homepage
 * timeline already carries and only ever uses to tint a hairline; here it is
 * given room to be the thing the eye follows.
 *
 * §B23: on this page the wake IS the timeline. It is the same motif the
 * homepage draws as water, drawn as a spine.
 */

import { Reveal } from "@/components/primitives/Reveal";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import type { Milestone } from "@/content/story";
import styles from "./heritage.module.css";

export function HeritageChronicle({ milestones }: { milestones: readonly Milestone[] }) {
  return (
    <div className={`${styles.chronicle} is-light`} data-ground="light">
      {/* The spine. One element for the whole page rather than one per band, so
          it is genuinely continuous — a rule assembled from five segments has
          four joins in it, and at these lengths they show. */}
      <div className={styles.spine} aria-hidden="true" />

      <ol className={styles.list}>
        {milestones.map((milestone) => (
          <li
            key={milestone.year}
            className={styles.entry}
            data-material={milestone.material}
          >
            <div className={styles.marker} aria-hidden="true" />

            <div className={styles.entryBody}>
              <Reveal>
                <p className={styles.year}>{milestone.year}</p>
              </Reveal>
              <Reveal delay={0.06}>
                <h2 className={`${styles.title} t-display`}>{milestone.title}</h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className={`${styles.copy} t-body`}>{milestone.copy}</p>
              </Reveal>
            </div>

            {milestone.media ? (
              <div className={styles.entryMedia}>
                <CinematicMedia
                  id={milestone.media}
                  sizes="(max-width: 60rem) 100vw, 42vw"
                  ratio="3 / 2"
                  cut="lead"
                />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
