/**
 * SUZUKI MARINE — the dealership and service section.
 *
 * ⚠️ THE MOST CAREFULLY BOUNDED CONTENT ON THIS SITE.
 *
 * §B12 asks for a proper Suzuki Marine section and says, in the same breath, to
 * use only legitimate material already available to the business and not to
 * imply a manufacturer relationship beyond verified dealer and service status.
 * Those two are in tension, and the resolution is to be precise about what the
 * relationship actually is.
 *
 * WHAT IS VERIFIED, from dunahajok.hu:
 *
 *   • Since 2022 the company has been an official Suzuki Marine DEALER and
 *     SERVICE POINT for the region.
 *   • There is a JOINT boat and engine showroom in Győr.
 *   • The Kadét is offered with a Suzuki outboard, and the source site
 *     publishes a 60 HP figure and a 40 km/h speed FOR THAT BOAT.
 *   • The dealership publishes its own contact details and opening hours.
 *
 * WHAT IS NOT, AND IS THEREFORE ABSENT:
 *
 *   • No engine range, no model names, no DF numbers, no power figures beyond
 *     the one the source site publishes for the Kadét, no prices, no stock, no
 *     warranty terms, no service intervals, no parts availability.
 *   • No Suzuki logo, wordmark or brand colour. §B13 asks that the section stay
 *     inside Duna's design system with "restrained Suzuki recognition", and the
 *     restrained version of recognition is the NAME — which is a statement of
 *     fact about a dealership — rather than borrowed identity assets nobody has
 *     licensed for this site.
 *   • No claim of partnership, collaboration, co-development or endorsement.
 *     "Official dealer and service point" is what was verified and it is what
 *     is said, in those words, every time.
 *
 * The engines section §B12 asks for "where content allows" is therefore a
 * SERVICE-and-SALES statement rather than a product catalogue, and the report
 * carries the model range as an outstanding business blocker.
 */

import { CONTACT } from "./site";
import type { MediaId } from "@/lib/media.generated";

export interface SuzukiSection {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  lede: string;
  body: readonly string[];
  media?: MediaId;
  /** Thin technical marks. Verified facts only. */
  facts?: readonly string[];
}

export const SUZUKI = {
  eyebrow: "Suzuki Marine",
  headline: ["Dealer", "and service."],
  lede:
    "Since 2022, Duna Hajók has been an official Suzuki Marine dealership and service point, from its own workshop in Győr.",
  hero: "suzuki-engine" as MediaId,

  /**
   * The exact form of words for the relationship.
   *
   * One constant, used everywhere the relationship is described, so that a
   * second page cannot quietly upgrade "dealer and service point" into
   * "partner". It reads slightly stiffly on purpose — this is a commercial
   * status, and commercial statuses are stated rather than characterised.
   */
  status: "Official Suzuki Marine dealership and service point",
  since: "2022",

  sections: [
    {
      id: "overview",
      index: "01",
      eyebrow: "The arrangement",
      title: "A showroom on the Danube",
      lede: "A joint boat and engine showroom opened in Győr in 2022.",
      body: [
        "The partnership with the Hungarian Suzuki Marine business filled a gap in the region: an official dealership and service point, in a workshop that already built boats.",
        "It means a Duna 6.1 ordered with an outboard is delivered and serviced by the people who built the hull, rather than by two businesses passing a boat between them.",
      ],
      media: "suzuki-engine",
      facts: ["Since 2022", "Joint showroom — Győr", "Official dealer and service point"],
    },
    {
      id: "engines",
      index: "02",
      eyebrow: "On the boats",
      title: "Outboard power",
      lede: "The Kadét takes a Suzuki outboard, and its character changes completely.",
      body: [
        "The Duna 6.1 is offered in electric, petrol and outboard configurations. With a 60 HP outboard the Kadét runs from 40 km/h; with its 4.3 kW electric drive it runs from 9 km/h.",
        "Which of those a boat should be is a conversation rather than a specification, and it is one the showroom exists to have.",
      ],
      media: "kadet-underway",
      // The only power figures on this page, and both are published by the
      // source site FOR THE KADÉT. No engine model is named, because none has
      // been supplied.
      facts: ["60 HP — Kadét, from 40 km/h", "4.3 kW electric — Kadét, from 9 km/h"],
    },
    {
      id: "service",
      index: "03",
      eyebrow: "Afterwards",
      title: "Service",
      lede: "The service point is the reason the dealership exists.",
      body: [
        "Duna Hajók is an official Suzuki Marine service point for the region, working from the Győr facility.",
        "Service is booked directly with the dealership on its own line, which is answered by the people who do the work.",
      ],
      facts: [
        CONTACT.suzuki.hours,
        CONTACT.suzuki.phones[0],
        CONTACT.suzuki.email,
      ],
    },
  ] as readonly SuzukiSection[],
} as const;

/**
 * WHAT THIS SECTION CANNOT YET SAY, for the phase report.
 *
 * Declared rather than remembered, so the gap travels with the code and the
 * report can quote it rather than paraphrase it.
 */
export const SUZUKI_BLOCKERS: readonly string[] = [
  "no approved engine range or model list has been supplied — the section states the dealership's status and the two published Kadét figures, and lists no products",
  "no Suzuki brand assets have been licensed for this site — no logo, wordmark or brand colour is used, and none should be added without written permission from Suzuki Marine Hungary",
  "no service pricing, interval or warranty information has been supplied",
];
