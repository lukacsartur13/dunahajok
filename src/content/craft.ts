/**
 * CRAFT — design, manufacturing, materials.
 *
 * SOURCE DISCIPLINE, RESTATED FOR PHASE FOUR.
 *
 * `boats.ts` opens by saying every figure in it is transcribed verbatim from
 * dunahajok.hu and that nothing is estimated, rounded or inferred. The same
 * rule governs this file, with one distinction worth naming because Phase Four
 * writes a great deal more prose than Phase One did:
 *
 *   • FACTS are transcribed. 1991, the manufactory system, the hand-laid teak,
 *     the 2016 decision, the 2020 completion, the electric drive, the Győr
 *     workshop, the Suzuki partnership. Every one of them is on the source site
 *     and none is adjusted here.
 *   • EDITORIAL COPY is condensed from those facts and says nothing they do not
 *     support. It is the same job `Boat.copy` already does — "verbatim-derived
 *     editorial summary, condensed, not embellished" — applied at page length.
 *
 * WHAT IS DELIBERATELY ABSENT. No process step nobody described, no material
 * nobody named, no supplier, no tolerance, no cure time, no lamination
 * schedule, no headcount, no floor area. A manufacturing page is the easiest
 * place on a boatbuilder's site to invent authority, and every number a visitor
 * could quote back has to have come from the yard.
 *
 * §B7 asks that technical drawings not be fabricated where none exist. None
 * exist: the delivered design material is renders and photography. The Design
 * page therefore builds its linework from the site's own geometry — the Duna
 * Line, the wake, the section marks — rather than pretending to an engineering
 * archive.
 */

import type { MediaId } from "@/lib/media.generated";

/* ── A shared editorial shape ──────────────────────────────────────────────*/

/**
 * One numbered movement of a Craft page.
 *
 * The same structure serves all three pages, and that is a decision rather
 * than a shortcut: §B22 asks that pages differ by emphasis and not by design
 * system, so the differences between Design, Manufacturing and Materials are
 * carried by `tone`, by media, and by how many movements each has — not by
 * three separate component trees that will drift.
 */
export interface CraftMovement {
  id: string;
  index: string;
  /** The technical annotation above the headline. Never a repeat of it. */
  eyebrow: string;
  title: string;
  /** One sentence. The idea of the movement. */
  lede: string;
  body: readonly string[];
  media?: MediaId;
  /** Full-bleed rather than inset. Used sparingly — twice a page at most. */
  bleed?: boolean;
  /** Thin technical marks along the movement's rule. */
  annotations?: readonly string[];
}

export interface CraftPage {
  /** The oversized opening line, broken where it should break. */
  headline: readonly string[];
  /** Sits above the headline, in mono. */
  eyebrow: string;
  lede: string;
  hero: MediaId;
  movements: readonly CraftMovement[];
}

/* ── Design — §B7 ──────────────────────────────────────────────────────────*/

/**
 * FROM LINE TO WATER.
 *
 * §B7 names the theme and asks the page to reuse the WOOD → LINE → HULL →
 * WATER → WAKE narrative. The five movements below are that sequence, and each
 * one is anchored to something the company actually did rather than to a stage
 * of a generic design process: the joinery that preceded the boat, the 2016
 * decision, the hull that resulted, the electric drive it was completed with,
 * and the recognition that followed.
 */
export const CRAFT_DESIGN: CraftPage = {
  eyebrow: "From line to water",
  headline: ["From line", "to water."],
  lede:
    "The Duna 6.1 began as a decision to stop building other people's boats and draw our own.",
  hero: "design-render",
  movements: [
    {
      id: "wood",
      index: "01",
      eyebrow: "Before the boat",
      title: "Wood",
      lede: "Three decades of joinery came first.",
      body: [
        "The company grew out of a business established in 1991: a manufactory-system carpentry firm specialising in high-quality, individually designed interior joinery — and, from the beginning, in shipbuilding and ship renovation.",
        "That order matters. The teak on a 6.1 deck is not a finish applied to a boat; it is the material the company already knew best, and the hull was drawn around what could be done with it.",
      ],
      media: "teak-deck",
      annotations: ["Est. 1991", "Manufactory system", "Interior joinery"],
    },
    {
      id: "line",
      index: "02",
      eyebrow: "The decision",
      title: "Line",
      lede: "In 2016 we decided to draw our own hull.",
      body: [
        "Many years of professional experience and the opinions of our customers were folded into a single concept, and with it a new Hungarian brand: Duna Boats.",
        "Tradition, design and innovation were the three words written down during that development. They have been the philosophy of the company ever since.",
      ],
      media: "design-render",
      bleed: true,
      annotations: ["Concept 2016", "Duna Boats"],
    },
    {
      id: "hull",
      index: "03",
      eyebrow: "The object",
      title: "Hull",
      lede: "Six metres and ten centimetres, twice.",
      body: [
        "The concept was completed in 2020 as the Duna 6.1. One platform, two boats: an enclosed Cabin finished like furniture, and an open Kadét built around the cockpit.",
        "Both are CE category C. The difference between them is not equipment — it is what the hull is asked to be.",
      ],
      media: "cabin-studio-profile",
      annotations: ["6.10 m LOA", "CE category C", "Two configurations"],
    },
    {
      id: "water",
      index: "04",
      eyebrow: "The drive",
      title: "Water",
      lede: "Completed as an electric boat, and offered three ways.",
      body: [
        "The 6.1 was finished in 2020 as an electric boat, and is offered in electric, petrol and outboard configurations. The e-drive keeps the hull quiet enough that the river stays the loudest thing aboard.",
        "Since 2022 the company has also been an official Suzuki Marine dealer and service point, so the outboard configuration is supported from the same workshop that builds the boat.",
      ],
      media: "kadet-underway",
      bleed: true,
      annotations: ["Electric first", "Petrol", "Outboard"],
    },
    {
      id: "wake",
      index: "05",
      eyebrow: "What followed",
      title: "Wake",
      lede: "The design was recognised before the yard was widely known.",
      body: [
        "In 2020 the Duna 6.1 Cabin was selected among the exhibited works of the Hungarian Design Award. In 2023 it won the BIG SEE international award in the product design category, in Ljubljana.",
        "In the same year the Kadét took second place in the Boat category of the Budapest Boat Show novelty competition, together with the special prize for the best-rated and greenest product of the show.",
      ],
      media: "cabin-exterior",
      annotations: ["2020 · Hungarian Design Award", "2023 · BIG SEE", "2023 · Budapest Boat Show"],
    },
  ],
};

/* ── Manufacturing — §B8 ───────────────────────────────────────────────────*/

/**
 * DESIGNED ON THE DANUBE. BUILT IN GYŐR.
 *
 * §B8's main statement, and §B8's warning: not a corporate "our factory" page.
 * The difference is what the movements are about. A corporate factory page is
 * about the company's capability; this is about the boat's construction, and
 * every movement answers "what is being done to the object" rather than "what
 * do we have".
 *
 * It is also SHORTER than the Design page by one movement, on purpose. There is
 * less verified material about the process than about the design history, and
 * padding it out is precisely how a manufacturing page starts inventing cure
 * times.
 */
export const CRAFT_MANUFACTURING: CraftPage = {
  eyebrow: "The workshop",
  headline: ["Designed on the Danube.", "Built in Győr."],
  lede:
    "One workshop in north-west Hungary, on the river the boats are named after.",
  hero: "gyor-facility",
  movements: [
    {
      id: "workshop",
      index: "01",
      eyebrow: "The place",
      title: "The workshop",
      lede: "Ikrényi út 14, Győr.",
      body: [
        "Duna Enterior Kft. builds in its own facility in Győr, forty kilometres from where the Danube leaves Hungary for Slovakia. The same workshop carries the joinery business the company began as, and since 2022 the Suzuki Marine showroom and service point.",
        "Nothing is finished elsewhere. A boat that leaves the building is a boat that was made in it.",
      ],
      media: "gyor-facility",
      bleed: true,
      annotations: ["Győr", "Own facility", "Since 1991"],
    },
    {
      id: "hand",
      index: "02",
      eyebrow: "The method",
      title: "Manufactory, not production line",
      lede: "The company describes its own system as a manufactory.",
      body: [
        "That is a specific claim rather than a flourish: work is organised around individually designed pieces made by hand, which is how the carpentry business was set up in 1991 and how the boats are built now.",
        "It is the reason the teak deck is hand-laid, the reason the interior joinery is fitted rather than assembled, and the reason a 6.1 can be ordered in electric, petrol or outboard configuration without either being the exception.",
      ],
      media: "workshop-engine",
      annotations: ["Hand-laid teak", "Fitted joinery", "Three drivetrains"],
    },
    {
      id: "launch",
      index: "03",
      eyebrow: "The end of it",
      title: "Off the trailer",
      lede: "Six metres of boat, and a river forty minutes away.",
      body: [
        "A finished 6.1 leaves Győr on a trailer. It is small enough to be launched from a slipway and quiet enough — in electric configuration — to be used where a petrol boat would not be welcome.",
        "That combination is the point of the platform, and it is decided in the workshop rather than at the water.",
      ],
      media: "gyor-boat-trailer",
      bleed: true,
      annotations: ["Trailerable", "Slipway launch"],
    },
  ],
};

/* ── Materials — §B9 ───────────────────────────────────────────────────────*/

/**
 * §B9 asks for large macros, material transitions, tactile scroll and minimal
 * copy. The copy here is the shortest of the three pages for exactly that
 * reason: the photographs are the argument, and a paragraph beside a macro of
 * teak grain is a paragraph competing with it.
 *
 * FOUR MATERIALS, AND NOT ONE MORE. §B9 lists teak, metal, glass, upholstery
 * and paint/composite "where factual and visually supported". Teak, metal and
 * upholstery are all three; glass and composite are not — there is no
 * photograph of either in the library and no statement from the yard about
 * lamination — so they are absent rather than illustrated with something else.
 */
export interface Material {
  id: string;
  index: string;
  name: string;
  lede: string;
  body: string;
  media: MediaId;
  /** The thin marks along the material's rule. Facts only. */
  facts: readonly string[];
}

export const MATERIALS: readonly Material[] = [
  {
    id: "teak",
    index: "01",
    name: "Teak",
    lede: "Hand-laid, on both boats.",
    body:
      "The deck is laid by hand from teak, and on the Cabin the interior joinery is teak as well. It is the material the company has worked longest and the one the hull was drawn around.",
    media: "teak-deck",
    facts: ["Hand-laid deck", "Interior joinery — Cabin", "Worked in-house since 1991"],
  },
  {
    id: "rail",
    index: "02",
    name: "Rail and fitting",
    lede: "Where the hand actually lands.",
    body:
      "Grab rails, the bow fitting and the swim platform's edge are the parts of a boat that are touched rather than looked at, and they are finished accordingly.",
    media: "teak-rail",
    facts: ["Grab rails", "Bow fitting"],
  },
  {
    id: "platform",
    index: "03",
    name: "Platform",
    lede: "The last metre of the boat.",
    body:
      "The bathing platform is the transition between the boat and the water, and it is laid in the same timber as the deck it continues.",
    media: "teak-platform",
    facts: ["Teak, continuous with the deck"],
  },
  {
    id: "upholstery",
    index: "04",
    name: "Upholstery",
    lede: "Inside the Cabin.",
    body:
      "The Cabin's saloon carries upholstered seating and a teak table, and sleeps three. The Kadét's helm seat tilts, so the open cockpit reconfigures around the people in it.",
    media: "cabin-interior",
    facts: ["Sleeps three — Cabin", "Tilting helm seat — Kadét"],
  },
];

export const CRAFT_MATERIALS: CraftPage = {
  eyebrow: "Four surfaces",
  headline: ["What a boat", "is made of."],
  lede: "Four surfaces, photographed close enough to argue with.",
  hero: "teak-bow",
  movements: [],
};

/** The three Craft pages, for the section's own navigation. */
export const CRAFT_PAGES = [
  { id: "design", label: "Design", page: CRAFT_DESIGN },
  { id: "manufacturing", label: "Manufacturing", page: CRAFT_MANUFACTURING },
  { id: "materials", label: "Materials", page: CRAFT_MATERIALS },
] as const;
