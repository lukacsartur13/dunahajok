/**
 * Heritage, awards, and the Tradition / Design / Innovation sequence.
 *
 * SOURCE OF TRUTH — dunahajok.hu/en/about-the-company/ and /en/awards/
 * (retrieved 2026-08-07), cross-checked against the German pages.
 *
 * ⚠ ONE UNRESOLVED SOURCE CONFLICT
 * The awards page carries a section headed "HUNGARIAN DESIGN AWARD 2023 —
 * EXHIBITED WORKS" whose body text says the Kadét was entered "in 2020".
 * The German page repeats the same contradiction, so it is not a translation
 * slip. That entry therefore ships WITHOUT a year (`year: null`) until the
 * client confirms which is correct. Do not guess it back in.
 */

import type { MediaId } from "@/lib/media.generated";

/* ── Section 04 — Tradition / Design / Innovation ───────────────────────── */

export interface StoryChapter {
  id: string;
  index: string;
  title: string;
  /** Sits in the section label. Deliberately not the title — repeating the
   *  word immediately above the headline wastes the one line of context the
   *  label is there to give. */
  eyebrow: string;
  lede: string;
  copy: string;
  media: MediaId;
  /** Drives the chapter's ground and the annotation language. */
  tone: "warm" | "technical" | "dark";
  annotations: readonly string[];
}

export const STORY_CHAPTERS: readonly StoryChapter[] = [
  {
    id: "tradition",
    index: "01",
    title: "Tradition",
    eyebrow: "The workshop",
    lede: "A joinery workshop before it was ever a boatyard.",
    copy:
      "The company grew out of a business established in 1991: a manufactory-system carpentry firm specialising in high-quality, individually designed interior joinery, shipbuilding and ship renovation. The teak that ends up on a 6.1 deck is cut by people who have been cutting it for three decades.",
    media: "teak-deck",
    tone: "warm",
    annotations: ["Est. 1991", "Manufactory system", "Teak / hand-laid"],
  },
  {
    id: "design",
    index: "02",
    title: "Design",
    eyebrow: "The drawing",
    lede: "In 2016 we decided to draw our own hull.",
    copy:
      "Many years of professional experience and the opinions of our customers were folded into one concept. The result was the Duna 6.1, completed in 2020. Tradition, design and innovation were the words written down during that development — they have been the philosophy of the company ever since.",
    media: "design-render",
    tone: "technical",
    annotations: ["Concept 2016", "6.10 m LOA", "CE category C"],
  },
  {
    id: "innovation",
    index: "03",
    title: "Innovation",
    eyebrow: "The drive",
    lede: "Electric first. Outboard when the water asks for it.",
    copy:
      "The 6.1 was completed as an electric boat and is offered in electric, petrol and outboard configurations. Since 2022 we have been an official Suzuki Marine dealer and service point, filling a gap in the region from our own workshop in Győr.",
    media: "workshop-engine",
    tone: "dark",
    annotations: ["Electric drive", "Suzuki Marine", "Own factory / Győr"],
  },
];

/* ── Section 07 — Heritage timeline ─────────────────────────────────────── */

export interface Milestone {
  year: string;
  title: string;
  copy: string;
  /** The timeline rule changes material as the story moves forward. */
  material: "wood" | "pencil" | "hull" | "wake";
  media?: MediaId;
}

export const MILESTONES: readonly Milestone[] = [
  {
    year: "1991",
    title: "A business is established",
    copy:
      "The carpentry business from which Duna Enterior Kft. later emerged. High-quality, unique, well-designed interior joinery — and, from the start, shipbuilding and ship renovation.",
    material: "wood",
    media: "heritage-salon",
  },
  {
    year: "2016",
    title: "A boat of our own",
    copy:
      "The decision to develop our own vessel and, with it, a new Hungarian brand: DUNA BOATS.",
    material: "pencil",
    media: "design-render",
  },
  {
    year: "2020",
    title: "Duna 6.1",
    copy:
      "The concept is completed as the Duna 6.1 electric boat. In the same year the Duna 6.1 Cabin is selected among the exhibited works of the Hungarian Design Award.",
    material: "hull",
    media: "cabin-studio-profile",
  },
  {
    year: "2022",
    title: "Suzuki Marine",
    copy:
      "A partnership with the Hungarian Suzuki Marine business. A joint boat and engine showroom opens in Győr; the company becomes an official dealership and service point for the region.",
    material: "hull",
    media: "gyor-facility",
  },
  {
    year: "2023",
    title: "BIG SEE, Ljubljana",
    copy:
      "The Duna 6.1 Cabin wins the BIG SEE international award in the product design category. In the same year the Kadét takes Boat category II at the Budapest Boat Show novelty competition.",
    material: "wake",
    media: "cabin-exterior",
  },
];

/* ── Section 08 — Awards ────────────────────────────────────────────────── */

export interface Award {
  /** `null` where the source site is self-contradictory. See file header. */
  year: string | null;
  title: string;
  subject: string;
  result: string;
  detail: string;
}

export const AWARDS: readonly Award[] = [
  {
    year: "2023",
    title: "BIG SEE Product Design Award",
    subject: "Duna 6.1 Cabin",
    result: "Winner",
    detail:
      "The BIG SEE award recognises the best architecture, interior design and design solutions across 21 countries of the South-East European region. Founded by Zavod Big, Ljubljana. Accepted in Ljubljana by Péter Győrffy and Szilvia Győrffy-Domokos.",
  },
  {
    year: "2023",
    title: "Budapest Boat Show — Novelty competition",
    subject: "Duna 6.1 Kadét",
    result: "Boat category II",
    detail:
      "Also awarded the special prize for the best-rated and greenest product of the show.",
  },
  {
    year: "2020",
    title: "Hungarian Design Award",
    subject: "Duna 6.1 Cabin",
    result: "Selected for exhibition",
    detail:
      "Selected among the best projects and admitted to the exhibition, with inclusion in the internationally published yearbook.",
  },
  {
    year: null,
    title: "Hungarian Design Award",
    subject: "Duna 6.1 Kadét",
    result: "Selected for exhibition",
    detail:
      "Selected among the exhibited works of the Hungarian Design Award.",
  },
];

export const AWARDS_HEADLINE = ["Design,", "recognized."] as const;
