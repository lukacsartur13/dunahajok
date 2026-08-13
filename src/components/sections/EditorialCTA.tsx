"use client";

/**
 * SECTION 10 — Where will Duna take you?
 *
 * The page closes where it opened: on water, with a waterline and a wake.
 * The plate is full-bleed and the wake laid over it continues past the bottom
 * edge into the footer, so the two sections are structurally one object — the
 * page is circular rather than merely long.
 */

import { CONTACT } from "@/content/site";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import { DisplayLines, SectionLabel } from "@/components/primitives/Type";
import { ActionLink } from "@/components/primitives/ActionLink";
import { WakeLine } from "@/components/primitives/WakeLine";
import { SceneSlot } from "@/components/scene/SceneSlot";
import styles from "./EditorialCTA.module.css";

export function EditorialCTA() {
  return (
    <section id="contact" className={`${styles.section} is-dark`} data-ground="dark">
      <SceneSlot scene="wake-water" priority={4} className={styles.slot}>
        {/* The same boat, the same river as the hero — the page closes where
            it opened. */}
        <CinematicMedia
          id="hero-danube-alt"
          sizes="100vw"
          ratio="auto"
          parallax={0.45}
          scrim={0.88}
          className={styles.plate}
          objectPosition="50% 40%"
        />
      </SceneSlot>

      <div className={styles.content}>
        <SectionLabel index="10" className={styles.label}>
          Enquire
        </SectionLabel>

        <DisplayLines
          size="d1"
          className={styles.headline}
          lines={["Where will Duna", "take you?"]}
        />

        <div className={styles.actions}>
          <ActionLink
            href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Private viewing — Duna 6.1")}`}
            variant="primary"
          >
            Arrange a private viewing
          </ActionLink>
          <ActionLink href={CONTACT.phoneHref}>{CONTACT.phone}</ActionLink>
        </div>
      </div>

      {/* Runs off the bottom edge and is picked up by the footer. */}
      <WakeLine variant="field" origin={0.34} className={styles.wake} />
    </section>
  );
}
