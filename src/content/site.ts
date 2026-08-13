/**
 * Site-level facts and navigation.
 *
 * Every value here is transcribed from dunahajok.hu. Nothing is invented.
 * When the site becomes multilingual, this module is what gets a locale
 * dimension — the components already read everything through it.
 */

export const SITE = {
  name: "Duna Hajók",
  nameLatin: "Duna Boats",
  wordmark: "DUNA",
  tagline: "Born on the Danube. Built beyond convention.",
  description:
    "Duna Hajók builds the Duna 6.1 — a hand-finished teak motorboat designed on the Danube and built in Győr, Hungary. Electric and Suzuki outboard power. BIG SEE Product Design Award winner.",
  /** Set to the production origin before launch; used for canonical + OG. */
  url: "https://dunahajok.hu",
  legacyUrl: "https://dunahajok.hu/en/duna-hajok-english/",
  foundedYear: 1991,
  locale: "en",
} as const;

export const CONTACT = {
  company: "Duna Enterior Kft.",
  addressLines: ["Ikrényi út 14.", "H-9025 Győr", "Hungary"],
  street: "Ikrényi út 14.",
  postalCode: "9025",
  city: "Győr",
  country: "HU",
  phone: "+36 30 939 7598",
  phoneHref: "tel:+36309397598",
  email: "info@dunahajok.hu",
  suzuki: {
    label: "Suzuki Marine dealership & service",
    phones: ["+36 30 161 7105", "+36 30 939 7598"],
    email: "suzuki@dunahajok.hu",
    hours: "Monday–Friday 09:00–15:00",
  },
  lead: {
    name: "Péter Győrffy",
    role: "Managing director",
    email: "office@dunaenterior.hu",
  },
} as const;

export const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/dunahajok" },
  { label: "Instagram", href: "https://www.instagram.com/dunahajok_/" },
  {
    label: "YouTube",
    href: "https://www.youtube.com/channel/UC1p5l611EOWk0x6-XecTSxw",
  },
] as const;

export interface NavNode {
  label: string;
  href: string;
  /** Index shown alongside the label in the overlay menu. */
  index?: string;
  children?: ReadonlyArray<{ label: string; href: string }>;
  /** Routes not yet built in Phase One resolve to the section anchor. */
  phase?: 1 | 2;
}

/**
 * Full information architecture. Phase One builds the homepage, so `phase: 2`
 * entries currently anchor into the relevant homepage section rather than
 * 404ing — the shape is already correct for when the routes land.
 */
export const NAV: readonly NavNode[] = [
  {
    label: "Duna 6.1",
    href: "#product",
    index: "01",
    phase: 2,
    children: [
      { label: "Overview", href: "#product" },
      { label: "Cabin", href: "#product" },
      { label: "Kadét", href: "#product" },
      { label: "Compare", href: "#specifications" },
      { label: "Configure", href: "#power" },
    ],
  },
  {
    label: "Craft",
    href: "#craft",
    index: "02",
    phase: 2,
    children: [
      { label: "Design", href: "#story" },
      { label: "Manufacturing", href: "#gyor" },
      { label: "Materials", href: "#craft" },
      { label: "Electric", href: "#power" },
    ],
  },
  {
    label: "Story",
    href: "#heritage",
    index: "03",
    phase: 2,
    children: [
      { label: "Heritage", href: "#heritage" },
      { label: "Awards", href: "#awards" },
    ],
  },
  {
    label: "Suzuki Marine",
    href: "#power",
    index: "04",
    phase: 2,
    children: [
      { label: "Engines", href: "#power" },
      { label: "Service", href: "#power" },
    ],
  },
  { label: "Journal", href: "#heritage", index: "05", phase: 2 },
  { label: "Contact", href: "#contact", index: "06", phase: 2 },
] as const;

export const LANGUAGES = [
  { code: "en", label: "EN", href: "https://dunahajok.hu/en/duna-hajok-english/" },
  { code: "hu", label: "HU", href: "https://dunahajok.hu/" },
  { code: "de", label: "DE", href: "https://dunahajok.hu/de/duna-hajok-deutsch/" },
  { code: "sk", label: "SK", href: "https://dunahajok.hu/sk/duna-hajok-slovencina/" },
] as const;

export const LEGAL = [
  { label: "Privacy policy", href: "https://dunahajok.hu/en/privacy-policy/" },
  { label: "Impressum", href: "https://dunahajok.hu/en/impressum/" },
] as const;
