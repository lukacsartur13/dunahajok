import type { Metadata } from "next";
import { KADET } from "@/content/boats";
import { ROUTES } from "@/content/routes";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/page/PageIntro";
import { Movement } from "@/components/page/Movement";
import { SpecTable } from "@/components/page/SpecTable";
import { RacingLine } from "@/components/page/ProductSignature";
import { ActionLink } from "@/components/primitives/ActionLink";
import { Reveal } from "@/components/primitives/Reveal";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import styles from "@/components/page/Page.module.css";

export const metadata: Metadata = pageMetadata({
  route: "kadet",
  title: "Duna 6.1 Kadét",
  description:
    "An open six-metre motorboat with a hand-made teak deck and analogue gauges. Suzuki outboard from 40 km/h, or a 4.3 kW electric drive. Boat category II, Budapest Boat Show 2023.",
  image: "kadet-exterior",
});

/**
 * THE KADÉT — §B5.
 *
 * §B5 asks for a DIFFERENT RHYTHM from the Cabin, and is explicit that
 * duplicating that page with new images is not it. So the differences are
 * structural rather than cosmetic:
 *
 *   • SEVEN MOVEMENTS TO THE CABIN'S NINE, and they are shorter. The Kadét is
 *     an open boat with less to explain and the page reads faster because there
 *     is genuinely less between the visitor and the water.
 *   • THE OPPOSITE ALTERNATION. This page starts on the RIGHT, so the eye is
 *     thrown across the measure before it settles. The Cabin starts on the left
 *     and reads as composed; the same components in the other order read as
 *     quicker, and nothing in the CSS had to change to do it.
 *   • THE DARK GROUND. `tone: "depth"` — the Kadét is photographed underway and
 *     the page is set on the river rather than on paper.
 *   • THE SIGNATURE IS A LINE, NOT A REVEAL. The Cabin's moment takes you
 *     inside a boat you cannot see into. The Kadét has no inside; its moment is
 *     the profile, drawn along the sheer as you scroll past it (§B6).
 *   • NO PINNED SECTION. The Cabin pins for a viewport; this page never stops
 *     the scroll, because stopping it is the opposite of what the boat is.
 *
 * The specification block is also placed differently — early rather than late.
 * A sporting boat's figures are part of the argument, and holding them to the
 * end would be holding back the thing a Kadét visitor came for.
 */
export default function KadetPage() {
  return (
    <>
      <PageIntro
        route={ROUTES.kadet}
        eyebrow="Duna 6.1"
        section="Boats"
        headline={["Kadét"]}
        lede={KADET.strapline}
        media={KADET.hero}
        scale="full"
        line="profile"
      >
        <div className={styles.actions}>
          <ActionLink href={ROUTES.privateViewing.path} variant="primary">
            Arrange a private viewing
          </ActionLink>
          <ActionLink href={ROUTES.cabin.path}>Compare with the Cabin</ActionLink>
        </div>
      </PageIntro>

      {/* THE SIGNATURE, EARLY. §B6's racing line, placed second rather than
          mid-page: the profile is the Kadét's whole argument and the page makes
          it before it starts explaining. */}
      <RacingLine media="kadet-underway" caption="Duna 6.1 Kadét — sheer line" />

      <div className={styles.movements}>
        <Movement
          id="open"
          index="01"
          eyebrow="The idea"
          title="An open boat, answering to the old world"
          lede="Analogue by choice, not by omission."
          body={[KADET.copy]}
          media="kadet-exterior"
          side="right"
          annotations={["Open cockpit", "Analogue gauges", "Tilting helm seat"]}
        />

        <Movement
          id="deck"
          index="02"
          eyebrow="Outside"
          title="The deck sets the character"
          lede="Hand-made teak, on a hull two metres and ten wide."
          body={[
            "The exterior character of the Kadét is set by its hand-made teak deck. The hull is the same 6.10 m platform as the Cabin, fifteen centimetres narrower and five shallower, with nothing above the sheer to interrupt it.",
            "What that buys is the whole boat at once: no cabin, no bulkhead, and a cockpit that runs from the helm to the transom.",
          ]}
          media="teak-bow"
          side="left"
          ratio="3 / 2"
        />
      </div>

      {/* Specifications, early. See the file note. */}
      <section className={`${styles.section} is-dark`} data-ground="dark" id="specifications">
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className="t-label">Specifications</p>
            <h2 className={`${styles.sectionTitle} t-display`}>Verified figures</h2>
          </div>
          <SpecTable
            specs={KADET.specs}
            source="Transcribed from dunahajok.hu — Duna 6.1 Kadét"
            note="Two speeds are published because there are two boats here: the same hull with an outboard, and the same hull with an electric drive. Price is quoted directly."
          />
        </div>
      </section>

      <div className={styles.movements}>
        <Movement
          id="helm"
          index="03"
          eyebrow="At the helm"
          title="Gauges you read rather than swipe"
          lede="The dashboard carries analogue instruments for a classic feel."
          body={[
            "The Kadét's dashboard is analogue by design. It is a decision about what a small boat should feel like to drive rather than a limitation of what could be fitted.",
            "The helm seat tilts, so the cockpit reconfigures around the people in it — standing at speed, seated at rest, and the same seat either way.",
          ]}
          media="kadet-dash"
          side="right"
        />

        <Movement
          id="power"
          index="04"
          eyebrow="Drive"
          title="Sixty horsepower, or silence"
          lede="The same hull, two completely different boats."
          body={[
            "With a Suzuki outboard the Kadét runs from 40 km/h. With its 4.3 kW electric drive it runs from 9 km/h and makes almost no noise at all.",
            "Since 2022 Duna Hajók has been an official Suzuki Marine dealer and service point, so the outboard configuration is sold and serviced from the workshop that built the hull.",
          ]}
          media="kadet-underway"
          side="left"
          bleed
          annotations={["60 HP — from 40 km/h", "4.3 kW electric — from 9 km/h"]}
        />

        <Movement
          id="recognition"
          index="05"
          eyebrow="2023"
          title="Boat category II, Budapest"
          lede="And the special prize for the best-rated and greenest product of the show."
          body={[
            "The Kadét took second place in the Boat category of the Budapest Boat Show novelty competition in 2023, together with the show's special prize for its best-rated and greenest product.",
            "It has also been selected among the exhibited works of the Hungarian Design Award.",
          ]}
          media="pair-onshore"
          side="right"
        />
      </div>

      <section className={`${styles.section} is-dark`} data-ground="dark" id="gallery">
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className="t-label">Gallery</p>
            <h2 className={`${styles.sectionTitle} t-display`}>Underway</h2>
          </div>
        </div>
        <Reveal stagger className={styles.gallery}>
          {(["kadet-underway", "kadet-dash", "kadet-exterior"] as const).map((id) => (
            <CinematicMedia
              key={id}
              id={id}
              sizes="(max-width: 60rem) 100vw, 33vw"
              ratio="4 / 5"
              cut="none"
            />
          ))}
        </Reveal>
      </section>

      <section className={`${styles.section} is-light`} data-ground="light">
        <div className={styles.shell}>
          <div className={styles.notice}>
            <h2 className={`${styles.noticeHeading} t-display`}>Take one out</h2>
            <p className="t-body">
              The Kadét is built to order in Győr, and the difference between the
              outboard and the electric boat is a decision best made on the water.
            </p>
            <div className={styles.actions}>
              <ActionLink href={ROUTES.privateViewing.path} variant="primary">
                Arrange a private viewing
              </ActionLink>
              <ActionLink href={ROUTES.suzuki.path}>Suzuki Marine</ActionLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
