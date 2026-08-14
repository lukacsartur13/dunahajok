import type { Metadata } from "next";
import { CABIN } from "@/content/boats";
import { ROUTES } from "@/content/routes";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/page/PageIntro";
import { Movement } from "@/components/page/Movement";
import { SpecTable } from "@/components/page/SpecTable";
import { CabinReveal } from "@/components/page/ProductSignature";
import { ActionLink } from "@/components/primitives/ActionLink";
import { Reveal } from "@/components/primitives/Reveal";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import styles from "@/components/page/Page.module.css";

export const metadata: Metadata = pageMetadata({
  route: "cabin",
  title: "Duna 6.1 Cabin",
  description:
    "A six-metre motorboat with a hand-laid teak deck, teak interior joinery, a sun deck and a sleeping cabin for three. Winner of the BIG SEE Product Design Award 2023. Built in Győr.",
  image: "cabin-studio-profile",
});

/**
 * THE CABIN — §B4.
 *
 * §B4 sets out nine movements and asks for a product experience rather than a
 * specification page. The nine are all here; what makes it an experience rather
 * than a template is the rhythm they are given.
 *
 * THE CABIN'S RHYTHM IS SLOW AND CENTRED. Movements alternate but start on the
 * left, the ledes are short, the paragraphs are long, and the page carries one
 * full-bleed plate and one pinned reveal. It is a boat finished like furniture
 * and the page is composed like a piece of furniture: symmetrical, unhurried,
 * and warm — `tone: "warm"` in the route table pulls the ground toward the
 * timber, which is what the boat is actually made of.
 *
 * Compare `duna-61-kadet/page.tsx`, which uses the same components in a
 * different order at a different cadence and does not look like this page. §B5
 * asks for exactly that: not a duplicate with the images changed.
 *
 * WHAT IS NOT HERE. No price — the figure exists in `boats.ts` and is
 * deliberately not rendered, for the reason the README already records. No
 * configurator, because the 6.1 is not configurable and §B4 says none is
 * required. No fabricated equipment list.
 */
export default function CabinPage() {
  return (
    <>
      {/* 01 — Cinematic opening */}
      <PageIntro
        route={ROUTES.cabin}
        eyebrow="Duna 6.1"
        section="Boats"
        headline={["Cabin"]}
        lede={CABIN.strapline}
        media={CABIN.hero}
        scale="full"
        line="profile"
      >
        <div className={styles.actions}>
          <ActionLink href={ROUTES.privateViewing.path} variant="primary">
            Arrange a private viewing
          </ActionLink>
          <ActionLink href={ROUTES.kadet.path}>Compare with the Kadét</ActionLink>
        </div>
      </PageIntro>

      <div className={styles.movements}>
        {/* 02 — Design statement */}
        <Movement
          id="design"
          index="01"
          eyebrow="The idea"
          title="The first boat of our own development"
          lede="Luxury solutions held inside a six-metre hull."
          body={[
            CABIN.copy,
            "The decision to draw it was taken in 2016, after many years of building interiors and renovating other people's vessels. It was completed in 2020 — and in the same year the Hungarian Design Award selected it among its exhibited works.",
          ]}
          media="cabin-studio-bow"
          side="left"
          annotations={["Concept 2016", "Completed 2020", "CE category C"]}
        />

        {/* 03 — Exterior */}
        <Movement
          id="exterior"
          index="02"
          eyebrow="Outside"
          title="A deck laid by hand"
          lede="The teak is the first thing you stand on and the last thing you notice going."
          body={[
            "The exterior character of the 6.1 is set by its hand-laid teak deck, which runs forward to a sun deck and aft to the bathing platform. It is the same timber, laid by the same people, that the company has been working since 1991.",
            "The hull is six metres and ten centimetres long and two and a quarter wide, with a draft of sixty-five centimetres — shallow enough for the Danube's own margins.",
          ]}
          media="cabin-exterior"
          side="right"
          ratio="3 / 2"
        />

        {/* 04 — Interior. THE SIGNATURE MOMENT, §B6. */}
        <CabinReveal
          exterior="cabin-studio-profile"
          interior="cabin-cockpit"
          caption="Duna 6.1 Cabin — outside, and within"
        />

        <Movement
          id="interior"
          index="03"
          eyebrow="Inside"
          title="A cabin for three"
          lede="Teak joinery, a folding table, and somewhere to sleep."
          body={[
            "Below the screen the 6.1 Cabin carries teak interior joinery, upholstered seating and a folding teak table. It sleeps three.",
            "Enclosing a six-metre boat is the hard part of the design: the volume has to be usable without the hull becoming a box, and the cabin has to be a room rather than a hatch. That is the problem the 6.1 was drawn to solve.",
          ]}
          media="cabin-interior"
          side="left"
        />

        {/* 05 — Craftsmanship */}
        <Movement
          id="craft"
          index="04"
          eyebrow="How"
          title="Made in a manufactory system"
          lede="Individually designed, made by hand, in one building in Győr."
          body={[
            "The company describes its own method as a manufactory system: work organised around individually designed pieces made by hand rather than around a production line. It is how the carpentry business was set up in 1991 and how the boats are built now.",
            "Nothing is finished elsewhere. A boat that leaves the workshop is a boat that was made in it.",
          ]}
          media="cabin-studio-helm"
          side="right"
          annotations={["Győr", "Hand-laid teak", "Fitted joinery"]}
        />
      </div>

      {/* 06 — Verified specifications */}
      <section className={`${styles.section} is-light`} data-ground="light" id="specifications">
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className="t-label">Specifications</p>
            <h2 className={`${styles.sectionTitle} t-display`}>Verified figures</h2>
          </div>
          <SpecTable
            specs={CABIN.specs}
            source="Transcribed from dunahajok.hu — Duna 6.1 Cabin"
            note="Price is published by the yard and is deliberately not shown here; it is quoted directly, against a specification agreed with the customer."
          />
        </div>
      </section>

      <div className={styles.movements}>
        {/* 07 — Propulsion */}
        <Movement
          id="propulsion"
          index="05"
          eyebrow="Drive"
          title="Electric, petrol or outboard"
          lede="The 6.1 was completed as an electric boat."
          body={[
            "It is offered in electric, petrol and outboard configurations. In electric form the Cabin runs from 10 kW and 15 km/h, and the hull is quiet enough that the river stays the loudest thing aboard.",
            "Since 2022 the yard has also been an official Suzuki Marine dealer and service point, so an outboard configuration is supported from the same workshop that built the hull.",
          ]}
          media="workshop-engine"
          side="left"
          bleed
          annotations={["10 kW from", "15 km/h", "Electric · petrol · outboard"]}
        />
      </div>

      {/* 08 — Gallery */}
      <section className={`${styles.section} is-light`} data-ground="light" id="gallery">
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className="t-label">Gallery</p>
            <h2 className={`${styles.sectionTitle} t-display`}>The Cabin, at rest</h2>
          </div>
        </div>
        <Reveal stagger className={styles.gallery}>
          {(["cabin-helm", "cabin-cockpit", "cabin-studio-profile"] as const).map((id) => (
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

      {/* 09 — Private viewing */}
      <section className={`${styles.section} is-dark`} data-ground="dark">
        <div className={styles.shell}>
          <div className={styles.notice}>
            <h2 className={`${styles.noticeHeading} t-display`}>See one</h2>
            <p className="t-body">
              Every 6.1 is built to order. A private viewing at the Győr workshop
              is the way to see the joinery before it is yours.
            </p>
            <div className={styles.actions}>
              <ActionLink href={ROUTES.privateViewing.path} variant="primary">
                Arrange a private viewing
              </ActionLink>
              <ActionLink href={ROUTES.craftMaterials.path}>See the materials</ActionLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
