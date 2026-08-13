"use client";

/**
 * SECTION 05 — Crafted to be touched.
 *
 * Starts inside the material. The frame opens from a macro of a hand-finished
 * teak gunwale and pulls back, dissolving through to the whole boat at its
 * mooring, so the surface you were looking at turns out to be part of a hull.
 *
 * Implemented as a match-dissolve between two plates rather than a single
 * deep zoom: the source photography tops out at 1920px, and scaling one image
 * far enough to make the reveal read would visibly soften it. Two plates keep
 * both ends sharp. (A true 6000px macro plate is on the asset list — see
 * ASSET_REQUIREMENTS.md, CRAFT-01.)
 *
 * Pinned only from tablet up and only with motion enabled. On a phone the
 * same story is told by stacking, because a long pinned section on a phone is
 * a trap, not an experience.
 */

import { useEffect, useRef } from "react";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import { DisplayLines, SectionLabel } from "@/components/primitives/Type";
import { Reveal } from "@/components/primitives/Reveal";
import { SceneSlot } from "@/components/scene/SceneSlot";
import { gsap, ScrollTrigger } from "@/lib/motion";
import styles from "./CraftSection.module.css";

export function CraftSection() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        pinned: "(min-width: 48rem) and (prefers-reduced-motion: no-preference)",
        stacked: "(max-width: 47.99rem), (prefers-reduced-motion: reduce)",
      },
      (context) => {
        if (!context.conditions?.pinned) return;

        const macro = el.querySelector(`.${styles.macro}`);
        const wide = el.querySelector(`.${styles.wide}`);
        const type = el.querySelector(`.${styles.type}`);

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "+=180%",
            pin: el.querySelector(`.${styles.stage}`),
            scrub: 0.8,
            anticipatePin: 1,
          },
        });

        tl.fromTo(macro, { scale: 1.55 }, { scale: 1, ease: "none" }, 0)
          .fromTo(wide, { scale: 1.18 }, { scale: 1, ease: "none" }, 0)
          .fromTo(wide, { opacity: 0 }, { opacity: 1, duration: 0.32, ease: "none" }, 0.34)
          .fromTo(type, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.22, ease: "none" }, 0.5);

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      },
    );

    ScrollTrigger.refresh();
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} id="craft" className={`${styles.section} is-dark`} data-ground="dark">
      <div className={styles.stage}>
        <SceneSlot scene="material-explorer" priority={2} className={styles.slot}>
          <div className={styles.plates}>
            <div className={styles.macro}>
              <CinematicMedia
                id="teak-rail"
                sizes="100vw"
                ratio="auto"
                reveal={false}
                parallax={false}
                className={styles.plate}
                objectPosition="42% 62%"
              />
            </div>
            <div className={styles.wide}>
              <CinematicMedia
                id="teak-bow"
                sizes="100vw"
                ratio="auto"
                reveal={false}
                parallax={false}
                className={styles.plate}
                objectPosition="56% 50%"
              />
            </div>
          </div>
        </SceneSlot>

        <div className={styles.type}>
          <SectionLabel index="05" className={styles.label}>
            Material
          </SectionLabel>
          <DisplayLines size="d1" reveal={false} lines={["Crafted", "to be touched."]} />
          <p className={`${styles.sub} t-lead`}>
            Hand-finished details. Built in Győr.
          </p>
        </div>
      </div>

      {/* Non-pinned reading copy, below the stage on every viewport. */}
      <div className={styles.tail}>
        <Reveal className={styles.tailCopy} stagger>
          <p className="t-body">
            The deck is laid plank by plank in teak, and the interior joinery is cut in the same
            workshop that has been making one-off furniture since 1991. The high-value use of wood
            is partly a reference to the past — and partly a decision about what lasts.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
