"use client";

/**
 * SECTION 01 — Hero.
 *
 * The organising idea is the waterline.
 *
 * A single hairline divides the frame. Above it: air, silence, type. Below it:
 * the river. The wordmark rests its baseline exactly on that line — a hull
 * sitting on water — and the wake opens out of it to the right. The photograph
 * occupies everything below, meeting the waterline at the hull rake so the two
 * geometries agree.
 *
 * Motion is deliberately small: the plate breathes open, the type rises once,
 * and on scroll the whole upper register drifts away slightly faster than the
 * page while the plate holds. Nothing is pinned — the first screen should feel
 * calm, and pinning a hero makes a site feel like it is arguing with you.
 *
 * The plate is a SceneSlot: when the Phase Two `hero-vessel` scene lands it
 * replaces the photograph in place, with no change to this composition.
 */

import { useEffect, useRef } from "react";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import { DisplayLines, SectionLabel } from "@/components/primitives/Type";
import { ActionLink } from "@/components/primitives/ActionLink";
import { WakeLine } from "@/components/primitives/WakeLine";
import { SceneSlot } from "@/components/scene/SceneSlot";
import { useIntroReady } from "@/lib/intro";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./Hero.module.css";

export function Hero() {
  const ready = useIntroReady();
  const root = useRef<HTMLElement>(null);
  const mark = useRef<HTMLParagraphElement>(null);

  /* Entrance — held until the preloader hands over. */
  useEffect(() => {
    const el = root.current;
    if (!el || !ready) return;

    if (prefersReducedMotion()) {
      gsap.set(el.querySelectorAll("[data-hero-in]"), { opacity: 1, y: 0 });
      gsap.set(mark.current, { opacity: 1, yPercent: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "hull" } })
        .fromTo(
          mark.current,
          { yPercent: 26, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 1.5 },
          0,
        )
        .fromTo(
          el.querySelectorAll("[data-hero-in]"),
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 1.1, stagger: 0.09 },
          0.25,
        );
    }, el);

    return () => ctx.revert();
  }, [ready]);

  /* Departure — the upper register leaves a little faster than the page. */
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.to(el.querySelector(`.${styles.upper}`), {
        yPercent: -26,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.8 },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="top" className={`${styles.hero} is-dark`} data-ground="dark">
      <div className={styles.upper}>
        <div className={styles.head}>
          <SectionLabel index="01" className={styles.kicker}>
            <span data-hero-in>Hungarian boatbuilding since 1991</span>
          </SectionLabel>

          <div className={styles.headline}>
            <h1 className="u-sr">
              Duna Hajók — born on the Danube, built beyond convention. Hand-built teak motorboats
              from Győr, Hungary.
            </h1>
            <DisplayLines
              as="p"
              size="d3"
              reveal={false}
              className={styles.claim}
              lines={["Born on the Danube.", "Built beyond convention."]}
            />
          </div>

          <div className={styles.actions} data-hero-in>
            <ActionLink href="#product" variant="primary">
              Explore Duna 6.1
            </ActionLink>
            <ActionLink href="#heritage">Discover the story</ActionLink>
          </div>
        </div>

        {/* The wordmark. Its baseline is the waterline. */}
        <div className={styles.markRow}>
          <p ref={mark} className={`${styles.mark} t-display`} aria-hidden="true">
            DUNA
          </p>
          {/* The wake leaves the wordmark along the waterline. */}
          <span className={styles.wakeWrap}>
            <WakeLine variant="quiet" origin={0.03} animate={false} />
          </span>
        </div>
      </div>

      <div className={styles.waterline} aria-hidden="true" />

      <div className={styles.plate}>
        <SceneSlot scene="hero-vessel" priority={0}>
          <CinematicMedia
            id="hero-danube"
            priority
            reveal={false}
            parallax={0.5}
            sizes="100vw"
            ratio="auto"
            objectPosition="50% 46%"
            className={styles.plateMedia}
          />
        </SceneSlot>

        <p className={`${styles.scroll} t-label`} data-hero-in>
          <span className={styles.scrollRule} aria-hidden="true" />
          Scroll
        </p>
      </div>
    </section>
  );
}
