"use client";

/**
 * SECTION 07 — Heritage.
 *
 * The rule running through the timeline is the story: it starts as wood grain,
 * becomes a drawn pencil line, hardens into a hull section, and finally opens
 * into a wake. Each milestone changes the material of the segment that leads
 * into it, so the graphic language earns its own narrative rather than just
 * decorating one.
 *
 * Desktop travels horizontally under a pin — a timeline is one of the few
 * things a pin is genuinely for. The pin distance is bounded by the number of
 * milestones so it can never become an endless corridor. Below 61.25rem it is
 * an ordinary vertical list: same rule, same materials, no pin, no hijack.
 *
 * The markup is an <ol> either way, so the sequence is real for a screen
 * reader and the section is fully keyboard-navigable.
 */

import { useEffect, useRef } from "react";
import { MILESTONES, type Milestone } from "@/content/story";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import { DisplayLines, SectionLabel } from "@/components/primitives/Type";
import { gsap, ScrollTrigger } from "@/lib/motion";
import styles from "./Timeline.module.css";

export function Timeline() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const viewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const rail = track.current;
    const frame = viewport.current;
    if (!el || !rail || !frame) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 61.25rem) and (prefers-reduced-motion: no-preference)", () => {
      // The track is `width: max-content`, so its own scrollWidth and
      // clientWidth are identical — the overflow lives in the frame around it.
      const distance = () => Math.max(0, rail.scrollWidth - frame.clientWidth);
      if (distance() <= 0) return;

      const tween = gsap.to(rail, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          // Bounded by content width, so adding a milestone lengthens the pin
          // proportionally instead of by a magic number.
          end: () => `+=${distance() + window.innerHeight * 0.2}`,
          pin: true,
          scrub: 0.7,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });

    ScrollTrigger.refresh();
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} id="heritage" className={`${styles.section} is-light`} data-ground="light">
      <div className={styles.head}>
        <SectionLabel index="07">Heritage</SectionLabel>
        <DisplayLines size="d2" lines={["A workshop,", "then a boatyard."]} />
      </div>

      <div ref={viewport} className={styles.viewport}>
        <ol ref={track} className={styles.track}>
          {MILESTONES.map((milestone, i) => (
            <Entry key={milestone.year} milestone={milestone} first={i === 0} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function Entry({ milestone, first }: { milestone: Milestone; first: boolean }) {
  return (
    <li className={styles.entry}>
      {/* The rule leading *into* this milestone, in the material of the era. */}
      <span
        className={[styles.rail, styles[`rail-${milestone.material}`], first ? styles.railFirst : ""]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      >
        <span className={styles.node} />
      </span>

      <div className={styles.entryBody}>
        <p className={styles.year}>{milestone.year}</p>
        <h3 className={styles.entryTitle}>{milestone.title}</h3>
        <p className={styles.entryCopy}>{milestone.copy}</p>
      </div>

      {milestone.media ? (
        <CinematicMedia
          id={milestone.media}
          ratio="4 / 3"
          sizes="(max-width: 61.25rem) 88vw, 26rem"
          parallax={false}
          className={styles.entryMedia}
        />
      ) : null}
    </li>
  );
}
