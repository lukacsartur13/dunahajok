"use client";

/**
 * CHAPTER 00–01 — ARRIVAL, then THE RIVER.
 *
 * Phase One built this as two stacked registers: type above a hairline, a
 * letterboxed strip of river below it. That composition had the vessel cropped
 * in half at the bottom of the frame with sixty per cent of the screen holding
 * nothing, and it is the reason the old homepage read as a website rather than
 * as Duna. Phase 5 inverts it.
 *
 * The river is now the whole frame. The waterline is a line drawn ACROSS the
 * photograph rather than a border between a photograph and a void, and the
 * wordmark still rests its baseline exactly on that line — a hull sitting on
 * water — which was the one idea from Phase One worth keeping intact.
 *
 * The arrival and the hero are a single continuous moment (§7, §8). There is no
 * loader that finishes and a homepage that then appears. The page opens almost
 * empty: near-black, one hairline, nothing else. A single disturbance travels
 * along that line; the wake opens behind it; and the veil the disturbance is
 * travelling over lifts to reveal the river that was underneath the whole time.
 * The wake that ends the arrival is the same wake the hero is composed around.
 *
 * Scroll is authored 0 → 1 across the section's own height and is NOT pinned —
 * §47, and because pinning the first screen makes a site feel like it is
 * arguing with the visitor. The same range already drives the WebGL camera
 * through `trackHeroProgress`, so the DOM sequence below and `heroConfig`'s
 * authored camera states are two halves of one choreography.
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

  /* ── ARRIVAL ───────────────────────────────────────────────────────────
     Held until the preloader hands over, then played once. The order matters
     and is the whole idea: line, then disturbance, then wake, then river. The
     river arrives LAST, out of the wake, rather than being the backdrop the
     wake is drawn on top of. */
  useEffect(() => {
    const el = root.current;
    if (!el || !ready) return;

    /* Reduced motion gets the composed end state, not a hidden one (§55): the
       river is up, the wake is drawn, the type has landed. The arrival is a
       piece of choreography, and choreography is exactly what this visitor has
       asked not to be shown. */
    if (prefersReducedMotion()) {
      gsap.set(el.querySelectorAll("[data-hero-in]"), { opacity: 1, y: 0 });
      gsap.set(mark.current, { opacity: 1, yPercent: 0 });
      gsap.set(el.querySelector(`.${styles.veil}`), { opacity: 0 });
      gsap.set(el.querySelector(`.${styles.wakeWrap}`), { opacity: 0.55, scaleX: 1 });
      gsap.set(el.querySelector(`.${styles.waterline}`), { opacity: 0.16 });
      gsap.set(el.querySelector(`.${styles.disturbance}`), { opacity: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "hull" } });

      tl
        /* The wordmark settles onto the line it is sitting on. */
        .fromTo(
          mark.current,
          { yPercent: 22, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 1.3 },
          0,
        )
        /* One disturbance crosses the still water. This is the only thing that
           moves for the first second of the site's existence. */
        .fromTo(
          `.${styles.disturbance}`,
          { xPercent: -30, opacity: 0 },
          { xPercent: 0, opacity: 1, duration: 0.5, ease: "glide" },
          0.35,
        )
        .to(
          `.${styles.disturbance}`,
          { xPercent: 118, opacity: 0, duration: 1.5, ease: "glide" },
          0.85,
        )
        /* The wake opens out of it, from nothing, along the line. */
        .fromTo(
          `.${styles.wakeWrap}`,
          { scaleX: 0.04, opacity: 0 },
          { scaleX: 1, opacity: 0.55, duration: 1.9, ease: "glide" },
          0.95,
        )
        /* …and the river resolves underneath the wake it just made. This is
           the loader→hero seam, and there is deliberately nothing at it: the
           veil is already lifting while the wake is still opening. */
        .to(`.${styles.veil}`, { opacity: 0, duration: 2.1, ease: "glide" }, 1.15)
        /* The drawn line steps back as the real river arrives behind it. It has
           carried the whole arrival on a black field; over moving water it
           would only be noise. */
        .fromTo(
          `.${styles.waterline}`,
          { opacity: 0.55 },
          { opacity: 0.16, duration: 1.8, ease: "glide" },
          1.4,
        )
        .fromTo(
          el.querySelectorAll("[data-hero-in]"),
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 1.1, stagger: 0.1 },
          1.5,
        );
    }, el);

    return () => ctx.revert();
  }, [ready]);

  /* ── DEPARTURE ─────────────────────────────────────────────────────────
     The authored scroll sequence from the storyboard, expressed as one scrubbed
     timeline over the section's own range so every beat is a position rather
     than a duration. The percentages in the comments are the storyboard's.

     Type leaves before the vessel does, and faster, so that the composition
     resolves from "a headline over a picture" into "a boat" — §11's "the
     product needs to emerge" is a subtraction, not an addition. */
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.8 },
      });

      /* 0.30 → 0.90 the upper register separates and goes. */
      tl.to(`.${styles.register}`, { yPercent: -32, opacity: 0 }, 0.3);
      /* 0.15 → 1.00 the wordmark leaves along the waterline, not upward:
         it is a hull, and hulls travel. */
      tl.to(`.${styles.mark}`, { xPercent: -14, opacity: 0 }, 0.15);
      /* 0.45 → 1.00 the plate pushes forward — the only scale move in the
         chapter, and it is what converts stillness into travel. */
      tl.to(`.${styles.field}`, { scale: 1.12 }, 0.45);
      /* 0.60 → 1.00 the wake develops and takes the frame, handing the page to
         the wake→line chapter at full width. */
      tl.to(`.${styles.wakeWrap}`, { opacity: 0.9, scaleY: 2.4 }, 0.6);
      /* The waterline itself brightens as everything else leaves, so the last
         thing on screen is the line the next chapter is about. */
      tl.to(`.${styles.waterline}`, { opacity: 1 }, 0.6);
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="top" className={`${styles.hero} is-dark`} data-ground="dark">
      {/* ── The river. Full bleed, behind everything. ────────────────────── */}
      <div className={styles.field}>
        <SceneSlot scene="hero-vessel" priority={0} className={styles.slot}>
          {/* `hero-danube-alt`, not `hero-danube`: the Phase One plate is a
              three-quarter snapshot with the hull cut by the frame edge and no
              horizon in it at all, which is why the old hero's waterline had
              nothing to sit on. This one is a full profile — the sheer runs
              the width of the frame, the wake trails astern, and the far bank
              gives a real waterline for the drawn one to continue. It is also
              the boat the rest of the page draws: chapter 03's line is this
              silhouette. */}
          <CinematicMedia
            id="hero-danube-alt"
            priority
            reveal={false}
            parallax={false}
            sizes="100vw"
            ratio="auto"
            objectPosition="54% 64%"
            className={styles.plate}
          />
        </SceneSlot>
      </div>

      {/* Structural grade — the type's legibility ground. Never animated. */}
      <div className={styles.desaturate} aria-hidden="true" />
      <div className={styles.grade} aria-hidden="true" />

      {/* The arrival blackout. Starts opaque, lifts out of the wake. */}
      <div className={styles.veil} aria-hidden="true" />

      {/* ── The waterline, and what happens on it. ───────────────────────── */}
      <div className={styles.line} aria-hidden="true">
        <span className={styles.waterline} />
        <span className={styles.wakeWrap}>
          <WakeLine variant="quiet" origin={0.06} animate={false} />
        </span>
        <span className={styles.disturbance} />
      </div>

      {/* ── Type. Distributed, not stacked. ─────────────────────────────── */}
      <div className={styles.register}>
        <SectionLabel index="01" className={styles.kicker}>
          <span data-hero-in>Hungarian boatbuilding since 1991</span>
        </SectionLabel>

        <div className={styles.claimWrap}>
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
          <span className={styles.entry} data-hero-in>
            <ActionLink href="#product">Explore Duna 6.1</ActionLink>
          </span>
        </div>
      </div>

      {/* The wordmark. Its baseline is the waterline. */}
      <p ref={mark} className={`${styles.mark} t-display`} aria-hidden="true">
        DUNA
      </p>

      <p className={`${styles.scroll} t-label`} data-hero-in>
        <span className={styles.scrollRule} aria-hidden="true" />
        Scroll
      </p>
    </section>
  );
}
