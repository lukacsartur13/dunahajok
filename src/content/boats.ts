/**
 * Duna 6.1 product data.
 *
 * SOURCE OF TRUTH — every figure below is transcribed verbatim from
 * dunahajok.hu/en/duna-6-1-cabin-oldal-en/ and .../duna-6-1-kadet-oldal-en/
 * (retrieved 2026-08-07). Nothing here is estimated, rounded or inferred.
 * If a figure is not on the source site, it is not in this file.
 */

import type { MediaId } from "@/lib/media.generated";

export interface Spec {
  /** Oversized numeral. Kept as a string so "6.10" doesn't lose its zero. */
  value: string;
  unit?: string;
  label: string;
  /** Shown as a thin technical annotation beside the measurement rule. */
  note?: string;
}

export interface Boat {
  id: "cabin" | "kadet";
  name: string;
  fullName: string;
  /** One word for the character split in section 02. */
  character: string;
  strapline: string;
  /** Verbatim-derived editorial summary — condensed, not embellished. */
  copy: string;
  traits: readonly string[];
  /** The definitive product image — studio, isolated. Used for specs and OG. */
  hero: MediaId;
  /** On the water, in context. Used wherever the two boats appear together,
   *  so the comparison is like for like. */
  lifestyle: MediaId;
  detail: MediaId;
  interior: MediaId;
  specs: readonly Spec[];
  /** Published net price. Held in the model but deliberately not rendered on
   *  the homepage — see README, "Editorial decisions". */
  priceFrom: string;
  ceCategory: string;
  href: string;
}

export const CABIN: Boat = {
  id: "cabin",
  name: "Cabin",
  fullName: "Duna 6.1 Cabin",
  character: "Protected",
  strapline: "Compact, enclosed, finished like furniture.",
  copy:
    "The first boat of our own development. A hand-laid teak deck, teak interior joinery, a sun deck and a sleeping cabin for three — luxury solutions held inside a six-metre hull. Available in electric, petrol and outboard configurations.",
  traits: ["Refined", "Protected", "Comfortable", "Elegant"],
  hero: "cabin-studio-profile",
  lifestyle: "cabin-exterior",
  detail: "cabin-helm",
  interior: "cabin-cockpit",
  specs: [
    { value: "6.10", unit: "m", label: "Full length" },
    { value: "2.25", unit: "m", label: "Full width" },
    { value: "0.65", unit: "m", label: "Draft" },
    { value: "6", label: "Maximum crew", note: "persons" },
    { value: "1070", unit: "kg", label: "Weight", note: "from" },
    { value: "10", unit: "kW", label: "Power", note: "from" },
    { value: "15", unit: "km/h", label: "Speed" },
  ],
  priceFrom: "€68,050 net",
  ceCategory: "C",
  href: "#product",
};

export const KADET: Boat = {
  id: "kadet",
  name: "Kadét",
  fullName: "Duna 6.1 Kadét",
  character: "Open",
  strapline: "Open-built, sportingly elegant, analogue by choice.",
  copy:
    "An open boat that answers to the old world of motorboats. The exterior character is set by a hand-made teak deck; the dashboard carries analogue gauges for a classic feel. The helm seat tilts, so the cockpit reconfigures around the people in it.",
  traits: ["Open", "Sporting", "Dynamic", "Analogue"],
  hero: "kadet-exterior",
  lifestyle: "kadet-underway",
  detail: "kadet-dash",
  interior: "kadet-underway",
  specs: [
    { value: "6.10", unit: "m", label: "Total length" },
    { value: "2.10", unit: "m", label: "Total width" },
    { value: "0.60", unit: "m", label: "Draft", note: "max" },
    { value: "6", label: "Maximum crew", note: "persons" },
    { value: "970", unit: "kg", label: "Ready-to-run weight", note: "from" },
    { value: "40", unit: "km/h", label: "Speed", note: "60 HP outboard, from" },
    { value: "9", unit: "km/h", label: "Speed", note: "4.3 kW electric, from" },
  ],
  priceFrom: "€41,200 net",
  ceCategory: "C",
  href: "#product",
};

export const BOATS = [CABIN, KADET] as const;

/**
 * Section 03 — the platform figures the two boats share, plus the one that
 * separates them. Oversized numerals, not a table.
 */
export const PLATFORM_SPECS: readonly Spec[] = [
  { value: "6.10", unit: "m", label: "Length overall", note: "Cabin & Kadét" },
  { value: "2.25", unit: "m", label: "Beam", note: "Cabin — Kadét 2.10 m" },
  { value: "0.65", unit: "m", label: "Draft", note: "Cabin — Kadét 0.60 m" },
  { value: "06", label: "Persons", note: "Maximum crew" },
  { value: "C", label: "CE category", note: "Both models" },
];

/**
 * Section 09 — propulsion. Two personalities on one platform.
 * Figures per model, exactly as published.
 */
export const POWER_MODES = [
  {
    id: "electric",
    label: "Electric",
    kicker: "Quiet",
    headline: "Silence, held at speed.",
    copy:
      "The Duna 6.1 was completed in 2020 as an electric boat. The e-drive keeps the hull quiet enough that the river stays the loudest thing aboard.",
    figures: [
      { value: "10", unit: "kW", label: "Cabin, from" },
      { value: "4.3", unit: "kW", label: "Kadét e-motor" },
      { value: "9", unit: "km/h", label: "Kadét, from" },
    ],
    media: "cabin-studio-bow" as MediaId,
    note: "E'dyn e-motor",
  },
  {
    id: "suzuki",
    label: "Suzuki",
    kicker: "Range",
    headline: "Outboard, without apology.",
    copy:
      "Since 2022 we have been an official Suzuki Marine dealer and service point, with a joint showroom in Győr. The Kadét takes a Suzuki outboard and the character changes completely.",
    figures: [
      { value: "60", unit: "HP", label: "Kadét outboard" },
      { value: "40", unit: "km/h", label: "Kadét, from" },
      { value: "2022", label: "Partnership since" },
    ],
    media: "suzuki-engine" as MediaId,
    note: "Suzuki Marine — dealership & service",
  },
] as const;

export type PowerMode = (typeof POWER_MODES)[number];
