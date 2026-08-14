"use client";

/**
 * ONE NUMBERED MOVEMENT OF AN EDITORIAL PAGE.
 *
 * The Craft pages, the Suzuki section and the two product pages are all built
 * from this. That is a decision worth defending, because the obvious
 * alternative — a bespoke component per page — is what produces a site whose
 * pages are individually beautiful and collectively unrelated.
 *
 * The variation §B22 asks for is carried by three inputs rather than by three
 * implementations:
 *
 *   • SIDE. Movements alternate, and a page can start on either side. Cabin
 *     opens on the left and reads as composed; Kadét opens on the right and
 *     reads as faster, because the eye is thrown across the measure before it
 *     settles.
 *   • BLEED. A full-width plate breaks the rhythm. Design uses two, Cabin one,
 *     Materials none — the macros are the page there and a bleed would be a
 *     bleed inside a bleed.
 *   • ANNOTATIONS. The thin mono marks along the rule. A technical page carries
 *     three per movement; a warm one carries none.
 *
 * Nothing here knows which page it is on, and no page has a copy of it.
 */

import { Reveal } from "@/components/primitives/Reveal";
import { SectionLabel } from "@/components/primitives/Type";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import type { MediaId } from "@/lib/media.generated";
import styles from "./Page.module.css";

export interface MovementProps {
  index: string;
  eyebrow: string;
  title: string;
  lede: string;
  body: readonly string[];
  media?: MediaId;
  /** Which side the media sits on. Ignored when `bleed` is set. */
  side?: "left" | "right";
  bleed?: boolean;
  annotations?: readonly string[];
  /** The media's aspect. A portrait plate reads slower than a landscape one. */
  ratio?: string;
  id?: string;
}

export function Movement({
  index,
  eyebrow,
  title,
  lede,
  body,
  media,
  side = "left",
  bleed = false,
  annotations,
  ratio,
  id,
}: MovementProps) {
  return (
    <section
      className={styles.movement}
      data-side={media && !bleed ? side : undefined}
      data-bleed={bleed || undefined}
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      {media ? (
        <div className={styles.movementMedia}>
          <CinematicMedia
            id={media}
            sizes={bleed ? "100vw" : "(max-width: 60rem) 100vw, 50vw"}
            ratio={ratio ?? (bleed ? "21 / 9" : "4 / 3")}
            cut={bleed ? "both" : side === "left" ? "lead" : "none"}
          />
        </div>
      ) : null}

      <div className={styles.movementBody}>
        <SectionLabel index={index}>{eyebrow}</SectionLabel>

        <Reveal>
          <h2 className={`${styles.movementTitle} t-display`} id={id ? `${id}-title` : undefined}>
            {title}
          </h2>
        </Reveal>

        <Reveal delay={0.08}>
          <p className={`${styles.movementLede} t-lead`}>{lede}</p>
        </Reveal>

        <Reveal stagger delay={0.14} className={styles.movementProse}>
          {body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="t-body">
              {paragraph}
            </p>
          ))}
        </Reveal>

        {annotations?.length ? (
          <Reveal delay={0.2}>
            {/* The thin technical marks. A list rather than a paragraph,
                because they are separate facts and a screen reader should be
                able to step through them as such. */}
            <ul className={styles.annotations}>
              {annotations.map((note) => (
                <li key={note} className="t-label">
                  {note}
                </li>
              ))}
            </ul>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
