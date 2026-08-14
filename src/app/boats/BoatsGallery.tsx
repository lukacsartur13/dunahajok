"use client";

/**
 * THE FAMILY GALLERY — §B3.
 *
 * Each boat takes a full band of the page and is given the character it
 * actually has, rather than a card in a grid where the only difference is the
 * photograph. Cabin is set on warm paper and reads as composed: the type
 * settles, the image is inset, the traits are a quiet list. Kadét is set on the
 * river-dark ground and reads as faster: the image is full-bleed, the profile
 * runs off the edge of the frame, and the traits are set as a single line.
 *
 * THE VERTICAL TRANSITION §B3 ASKS FOR is the ground changing under the
 * visitor as they scroll from one boat to the next — paper to depth — with the
 * raked cut between them. That is the site's own section language rather than a
 * carousel, and it survives without JavaScript, which a carousel does not.
 *
 * WHY THIS IS A CLIENT COMPONENT AND THE PAGE IS NOT. The page decides WHICH
 * boats exist, on the server, so an unpublished one never reaches the browser.
 * This decides how they LOOK, and it needs the reveal primitives, which are
 * client components. The seam is deliberately at the publication boundary.
 */

import Link from "next/link";
import { Reveal } from "@/components/primitives/Reveal";
import { DisplayLines } from "@/components/primitives/Type";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import { ActionLink } from "@/components/primitives/ActionLink";
import { WakeLine } from "@/components/primitives/WakeLine";
import type { MediaId } from "@/lib/media.generated";
import type { Spec } from "@/content/boats";
import styles from "./BoatsGallery.module.css";

export interface GalleryBoat {
  id: string;
  name: string;
  character: string;
  strapline: string;
  copy: string;
  traits: readonly string[];
  hero: MediaId;
  lifestyle: MediaId;
  href: string;
  specs: readonly Spec[];
}

export function BoatsGallery({ boats }: { boats: readonly GalleryBoat[] }) {
  return (
    <div className={styles.gallery}>
      {boats.map((boat, index) => {
        /* The alternation is derived from position rather than from the boat,
           so a third model joins the rhythm instead of needing a rule of its
           own. Cabin is first and therefore light; Kadét is second and
           therefore dark, which happens to be exactly right for both. */
        const dark = index % 2 === 1;
        return (
          <section
            key={boat.id}
            className={`${styles.boat} ${dark ? "is-dark" : "is-light"}`}
            data-dark={dark || undefined}
            data-ground={dark ? "dark" : "light"}
            aria-labelledby={`boat-${boat.id}`}
          >
            {dark ? (
              <WakeLine variant="field" origin={0.24} className={styles.wake} />
            ) : null}

            <div className={styles.media}>
              <CinematicMedia
                id={dark ? boat.lifestyle : boat.hero}
                sizes="(max-width: 60rem) 100vw, 62vw"
                ratio={dark ? "21 / 9" : "4 / 3"}
                cut={dark ? "both" : "lead"}
                scrim={dark ? 0.34 : 0}
              />
            </div>

            <div className={styles.body}>
              <p className={`${styles.character} t-label`}>{boat.character}</p>

              {/* An `h2`, which is `DisplayLines`' default and correct here:
                  the page's `h1` is its opening headline, and each boat is a
                  section of it. */}
              <DisplayLines
                size="d2"
                lines={[boat.name]}
                className={styles.name}
                id={`boat-${boat.id}`}
              />

              <Reveal delay={0.08}>
                <p className={`${styles.strapline} t-lead`}>{boat.strapline}</p>
              </Reveal>

              <Reveal delay={0.14}>
                <p className={`${styles.copy} t-body`}>{boat.copy}</p>
              </Reveal>

              {/* Four figures, not seven. The overview's job is to separate the
                  two boats; the full table belongs on the product page, and
                  repeating it here would make the visitor read it twice to
                  find the two numbers that differ. */}
              <Reveal delay={0.18}>
                <dl className={styles.specs}>
                  {boat.specs.map((spec) => (
                    <div key={spec.label} className={styles.spec}>
                      <dt className={`${styles.specLabel} t-label`}>{spec.label}</dt>
                      <dd className={styles.specValue}>
                        {spec.value}
                        {spec.unit ? <span className={styles.unit}> {spec.unit}</span> : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Reveal>

              <Reveal delay={0.22}>
                <ul className={styles.traits}>
                  {boat.traits.map((trait) => (
                    <li key={trait} className="t-label">
                      {trait}
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={0.26}>
                <ActionLink href={boat.href} variant="primary">
                  {boat.name}
                </ActionLink>
              </Reveal>
            </div>
          </section>
        );
      })}

      {/* The way on. A range page that ends at the last boat leaves the visitor
          with nowhere to go but back. */}
      <section className={`${styles.tail} is-light`} data-ground="light">
        <div className={styles.tailInner}>
          <p className={`${styles.character} t-label`}>Both boats</p>
          <p className={`${styles.strapline} t-lead`}>
            Every 6.1 is built to order in Győr. A private viewing is the way to
            see one.
          </p>
          <div className={styles.tailActions}>
            <ActionLink href="/contact/private-viewing" variant="primary">
              Arrange a private viewing
            </ActionLink>
            <ActionLink href="/craft/manufacturing">See how they are built</ActionLink>
          </div>
        </div>
      </section>
    </div>
  );
}
