"use client";

/**
 * SECTION 04 — Tradition / Design / Innovation.
 *
 * The three words the company wrote down during the 6.1's development, given
 * three grounds: timber-warm, drawing-office off-white, and river-dark. The
 * chapters butt directly against each other and each media plate is cut at
 * the hull rake, so the transition between them is a single raked seam rather
 * than a gap — the sequence reads as one movement in three parts.
 *
 * The closing lockup is the only place on the homepage where all three words
 * appear together, which is what makes it land.
 */

import { STORY_CHAPTERS, type StoryChapter } from "@/content/story";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import { DisplayLines, SectionLabel } from "@/components/primitives/Type";
import { Reveal } from "@/components/primitives/Reveal";
import { WakeLine } from "@/components/primitives/WakeLine";
import styles from "./StorySequence.module.css";

export function StorySequence() {
  return (
    <section id="story" className={styles.section} aria-labelledby="story-title">
      <h2 id="story-title" className="u-sr">
        Tradition, design, innovation — the Duna philosophy
      </h2>

      {STORY_CHAPTERS.map((chapter, i) => (
        <Chapter key={chapter.id} chapter={chapter} flip={i % 2 === 1} />
      ))}

      <div className={`${styles.lockup} is-dark`} data-ground="dark">
        <WakeLine variant="field" origin={0.72} className={styles.lockupWake} />
        <DisplayLines
          size="d1"
          className={styles.lockupType}
          lines={["Tradition.", "Design.", "Innovation.", <em key="e">This is Duna.</em>]}
        />
      </div>
    </section>
  );
}

function Chapter({ chapter, flip }: { chapter: StoryChapter; flip: boolean }) {
  const dark = chapter.tone === "dark";

  return (
    <article
      id={chapter.id}
      className={[
        styles.chapter,
        styles[`tone-${chapter.tone}`],
        flip ? styles.flip : "",
        dark ? "is-dark" : "is-light",
      ]
        .filter(Boolean)
        .join(" ")}
      data-ground={dark ? "dark" : "light"}
    >
      <div className={styles.media}>
        <CinematicMedia
          id={chapter.media}
          sizes="(max-width: 61.25rem) 100vw, 52vw"
          ratio="4 / 3"
          cut={flip ? "top" : "bottom"}
          parallax={0.7}
        />
      </div>

      <div className={styles.body}>
        <SectionLabel index={`04 · ${chapter.index}`}>{chapter.eyebrow}</SectionLabel>

        <DisplayLines
          as="h3"
          size="d2"
          editorial={chapter.tone === "warm"}
          className={styles.title}
          lines={[chapter.title]}
        />

        <Reveal className={styles.copy} stagger delay={0.1}>
          <p className="t-lead">{chapter.lede}</p>
          <p className="t-body">{chapter.copy}</p>
        </Reveal>

        <Reveal as="ul" className={`${styles.annotations} t-label`} stagger delay={0.2}>
          {chapter.annotations.map((note) => (
            <li key={note}>
              <span className={styles.annotationTick} aria-hidden="true" />
              {note}
            </li>
          ))}
        </Reveal>
      </div>
    </article>
  );
}
