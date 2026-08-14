"use client";

/**
 * THE TWO SIGNATURE MOMENTS — §B6.
 *
 * §B6 asks that Cabin and Kadét each carry at least one memorable interaction,
 * and — importantly — says not to reach for WebGL where high-quality DOM and
 * media work does the job better. Both of these are exactly that case:
 *
 *   • THE CABIN'S REVEAL is a transition between two photographs of the same
 *     boat taken from the same position, outside and inside. There is no
 *     geometry to render; the whole content of the moment is the crossfade and
 *     the mask that carries it, and a WebGL implementation would be a shader
 *     doing what `clip-path` already does at zero cost.
 *   • THE KADÉT'S RACING LINE is a stroke drawn along the boat's own profile as
 *     the section is scrolled. It is one SVG path of a few hundred bytes.
 *     Putting it on a canvas would mean loading a renderer to draw a line.
 *
 * Both are scroll-driven rather than autoplaying, both resolve completely under
 * reduced motion (the Cabin shows the interior, the Kadét shows the finished
 * line), and both are `aria-hidden` decoration over content that is already in
 * the DOM — nothing a visitor needs is inside the effect.
 */

import { useEffect, useRef } from "react";
import Image from "next/image";
import { MEDIA, type MediaId } from "@/lib/media.generated";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/motion";
import styles from "./ProductSignature.module.css";
import { asset } from "@/lib/basePath";

/* ── Cabin — the reveal ────────────────────────────────────────────────────*/

interface CabinRevealProps {
  /** The boat from outside. */
  exterior: MediaId;
  /** The same boat from within. */
  interior: MediaId;
  caption: string;
}

/**
 * §B6's "interior/reveal transition".
 *
 * Two plates stacked, the inner one masked to a raked band that opens across
 * the frame as the section is scrolled — the Duna Line doing the work a wipe
 * would otherwise do arbitrarily. The outer plate is what the visitor arrives
 * at, and by the time the section leaves the viewport they are inside the boat.
 *
 * WHY IT IS PINNED. Without a pin the reveal happens while the frame is also
 * travelling, and the two motions fight; the eye reads the scroll rather than
 * the transition. Pinning for one viewport height costs the page nothing — the
 * section is one screen tall by design — and it is what makes the moment a
 * moment rather than an effect that happens to occur.
 */
export function CabinReveal({ exterior, interior, caption }: CabinRevealProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const inner = el.querySelector<HTMLElement>("[data-reveal-inner]");
    if (!inner) return;

    if (prefersReducedMotion()) {
      // Resolved, not skipped. Somebody who has asked for less motion still
      // gets to see inside the boat — they simply get there without the wipe.
      gsap.set(inner, { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        inner,
        // A raked band starting off the leading edge. The two extra points
        // carry the rake: the mask's top edge runs ahead of its bottom by the
        // hull angle, so the interior arrives along the Duna Line.
        { clipPath: "polygon(0 0, 0 0, -14% 100%, -14% 100%)" },
        {
          clipPath: "polygon(0 0, 114% 0, 100% 100%, 0 100%)",
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "+=90%",
            scrub: 0.6,
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, []);

  const outside = MEDIA[exterior];
  const inside = MEDIA[interior];

  return (
    <section className={styles.reveal} ref={root} aria-label={caption}>
      <div className={styles.revealFrame}>
        <Image
          src={asset(outside.src)}
          alt={outside.alt}
          width={outside.width}
          height={outside.height}
          sizes="100vw"
          placeholder="blur"
          blurDataURL={outside.blurDataURL}
          className={styles.plate}
        />
        {/* The inner plate carries no alt: it is the same subject from a second
            position, and a screen reader that has already been told what the
            frame contains does not need it twice. The section's own label is
            what describes the moment. */}
        <div className={styles.revealInner} data-reveal-inner>
          <Image
            src={asset(inside.src)}
            alt=""
            width={inside.width}
            height={inside.height}
            sizes="100vw"
            placeholder="blur"
            blurDataURL={inside.blurDataURL}
            className={styles.plate}
          />
        </div>
      </div>
      <p className={`${styles.revealCaption} t-label`}>{caption}</p>
    </section>
  );
}

/* ── Kadét — the racing line ───────────────────────────────────────────────*/

interface RacingLineProps {
  media: MediaId;
  caption: string;
}

/**
 * §B6's "profile / racing-line sequence".
 *
 * The boat in profile, with a stroke drawn along its sheer as the section
 * crosses the viewport, and the plate itself travelling slightly against the
 * scroll. The line is authored to the 6.1's own profile rather than generated,
 * for the same reason `WakeLine`'s curves are: a hand-authored path reads as
 * designed and is identical on the server and the client, and a generated one
 * reads as noise.
 *
 * It is the Kadét's version of the wake (§B23) — the same motif, drawn as a
 * hull line rather than as water, on the one page where the boat's profile IS
 * the subject.
 */
export function RacingLine({ media, caption }: RacingLineProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const path = el.querySelector<SVGPathElement>("[data-line]");
    if (!path) return;

    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

    if (prefersReducedMotion()) {
      gsap.set(path, { strokeDashoffset: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.to(path, {
        strokeDashoffset: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 62%", scrub: 0.8 },
      });
      gsap.fromTo(
        el.querySelector("[data-plate]"),
        { yPercent: 4 },
        {
          yPercent: -4,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.9 },
        },
      );
    }, el);

    return () => ctx.revert();
  }, []);

  const plate = MEDIA[media];

  return (
    <section className={styles.line} ref={root} aria-label={caption}>
      <div className={styles.lineFrame}>
        <div className={styles.linePlate} data-plate>
          <Image
            src={asset(plate.src)}
            alt={plate.alt}
            width={plate.width}
            height={plate.height}
            sizes="100vw"
            placeholder="blur"
            blurDataURL={plate.blurDataURL}
            className={styles.plate}
          />
        </div>

        {/* Authored to the 6.1's sheer: a long rise from the transom, a flat
            run through amidships, and the sharp lift into the bow that is the
            boat's most recognisable single line. */}
        <svg
          className={styles.lineSvg}
          viewBox="0 0 1200 300"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            data-line
            d="M40 214 C 220 208, 400 198, 620 184 C 800 172, 960 152, 1160 96"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <p className={`${styles.lineCaption} t-label`}>{caption}</p>
    </section>
  );
}
