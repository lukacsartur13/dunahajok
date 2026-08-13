"use client";

/**
 * SECTION 02 — One platform. Two characters.
 *
 * Not two product cards. One frame, divided by a single raked edge — the same
 * hull line the rest of the site is cut with — with the Cabin on one side and
 * the Kadét on the other. On a fine pointer the divide follows you, so the two
 * characters are literally weighed against each other by moving your hand.
 * It is the closest a flat page gets to the Phase Two morph.
 *
 * Mobile gets a genuinely different design rather than a squeezed one: two
 * full-bleed stacked plates, each with its own plaque. No hover, no drag, no
 * information that only exists on hover.
 *
 * Wrapped in the `product-morph` SceneSlot: when the 3D Cabin↔Kadét
 * transformation lands it takes over this frame and keeps this composition.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CABIN, KADET } from "@/content/boats";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import { DisplayLines, SectionLabel } from "@/components/primitives/Type";
import { ActionLink } from "@/components/primitives/ActionLink";
import { Reveal } from "@/components/primitives/Reveal";
import { SceneSlot } from "@/components/scene/SceneSlot";
import { useDesktop, useFinePointer } from "@/lib/hooks";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./ProductSplit.module.css";

/** How far the divide may travel from centre, as a fraction of the width. */
const TRAVEL = 0.17;

export function ProductSplit() {
  const desktop = useDesktop();
  const fine = useFinePointer();
  const interactive = desktop && fine;

  const frame = useRef<HTMLDivElement>(null);
  const setSplit = useRef<((value: number) => void) | null>(null);
  const [lead, setLead] = useState<"cabin" | "kadet" | null>(null);

  useEffect(() => {
    const el = frame.current;
    if (!el || !interactive || prefersReducedMotion()) return;

    // One quickTo on a custom property drives both the clip and the rule, so
    // they can never drift apart by a frame.
    const to = gsap.quickTo(el, "--split", { duration: 0.7, ease: "power3.out" });
    setSplit.current = (value) => to(value);

    return () => {
      setSplit.current = null;
      gsap.set(el, { "--split": 50 });
    };
  }, [interactive]);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive || !setSplit.current) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      setSplit.current(50 + (ratio - 0.5) * TRAVEL * 200);
      setLead(ratio < 0.5 ? "cabin" : "kadet");
    },
    [interactive],
  );

  const onPointerLeave = useCallback(() => {
    setSplit.current?.(50);
    setLead(null);
  }, []);

  return (
    <section id="product" className={`${styles.section} is-light`} data-ground="light">
      <div className={styles.head}>
        <SectionLabel index="02">The range</SectionLabel>
        <DisplayLines size="d1" lines={["One platform.", "Two characters."]} />
        <Reveal className={styles.intro} delay={0.15}>
          <p className="t-body">
            The same 6.10-metre hull, finished two ways. One closes around you; the other opens to
            the river. Both are laid in teak by hand.
          </p>
        </Reveal>
      </div>

      <SceneSlot scene="product-morph" priority={1}>
        <div
          ref={frame}
          className={[styles.frame, lead ? styles[`lead-${lead}`] : ""].filter(Boolean).join(" ")}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          {/* Kadét fills the frame; the Cabin is clipped over it. Order matters:
              the clipped layer must be the one on top. */}
          <div className={`${styles.side} ${styles.sideB}`}>
            <CinematicMedia
              id={KADET.lifestyle}
              sizes="(max-width: 61.25rem) 100vw, 60vw"
              ratio="auto"
              reveal={false}
              parallax={0.4}
              scrim={0.55}
              cursor="Kadét"
              className={styles.media}
              objectPosition="60% 42%"
            />
            <Plaque boat={KADET} align="end" />
          </div>

          <div className={`${styles.side} ${styles.sideA}`}>
            <CinematicMedia
              id={CABIN.lifestyle}
              sizes="(max-width: 61.25rem) 100vw, 60vw"
              ratio="auto"
              reveal={false}
              parallax={0.4}
              scrim={0.55}
              cursor="Cabin"
              className={styles.media}
              objectPosition="42% 46%"
            />
            <Plaque boat={CABIN} align="start" />
          </div>

          {interactive ? <span className={styles.rule} aria-hidden="true" /> : null}
        </div>
      </SceneSlot>

      {interactive ? (
        <p className={`${styles.hint} t-label`} aria-hidden="true">
          Move to compare
        </p>
      ) : null}
    </section>
  );
}

function Plaque({ boat, align }: { boat: typeof CABIN; align: "start" | "end" }) {
  return (
    <div className={`${styles.plaque} ${styles[`plaque-${align}`]}`}>
      <p className={`${styles.plaqueKicker} t-label`}>Duna 6.1</p>
      <h3 className={`${styles.plaqueName} t-display`}>{boat.name}</h3>
      <p className={styles.plaqueLine}>{boat.strapline}</p>
      <ul className={`${styles.traits} t-label`}>
        {boat.traits.map((trait) => (
          <li key={trait}>{trait}</li>
        ))}
      </ul>
      <ActionLink href={boat.href} className={styles.plaqueAction}>
        View the {boat.name}
      </ActionLink>
    </div>
  );
}
