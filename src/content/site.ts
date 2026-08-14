import { ROUTES } from "./routes";

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
  /**
   * The image the fullscreen menu shows while this entry is hovered. §B20.
   *
   * On the entry rather than in a lookup keyed by label, because a label is a
   * translatable string and a lookup keyed on one breaks the day the menu is
   * translated — which is exactly the failure this site is being built to
   * avoid.
   */
  plate?: string;
}

/**
 * THE INFORMATION ARCHITECTURE, AS ROUTES.
 *
 * Phase One declared this tree with `phase: 2` entries pointing at homepage
 * anchors, because the pages did not exist and a link that scrolls is better
 * than a link that 404s. Phase Four builds them, so every href below is a real
 * route and `phase` is gone.
 *
 * §B19 asks that the standard desktop header not be overcrowded and that the
 * fullscreen menu carry the deeper links. Both fall out of this one tree: the
 * header renders the top level, the overlay renders the top level AND the
 * children, and neither has a list of its own to fall out of step with.
 *
 * PXL IS ABSENT, and that is the whole of §B2's last line. It is unpublished,
 * so it is not in the navigation, not in the footer, not in the menu and not in
 * the sitemap. `content/pxl.ts` holds `published: false` and the preview routes
 * live under a disallowed prefix; this is the third of the three guarantees.
 */
export const NAV: readonly NavNode[] = [
  {
    label: "Boats",
    href: ROUTES.boats.path,
    index: "01",
    plate: "cabin-studio-profile",
    children: [
      { label: "Overview", href: ROUTES.boats.path },
      { label: "Duna 6.1 Cabin", href: ROUTES.cabin.path },
      { label: "Duna 6.1 Kadét", href: ROUTES.kadet.path },
    ],
  },
  {
    label: "Craft",
    href: ROUTES.craftDesign.path,
    index: "02",
    plate: "teak-bow",
    children: [
      { label: "Design", href: ROUTES.craftDesign.path },
      { label: "Manufacturing", href: ROUTES.craftManufacturing.path },
      { label: "Materials", href: ROUTES.craftMaterials.path },
    ],
  },
  {
    label: "Story",
    href: ROUTES.heritage.path,
    index: "03",
    plate: "heritage-steamer",
    children: [
      { label: "Heritage", href: ROUTES.heritage.path },
      { label: "Awards", href: ROUTES.awards.path },
    ],
  },
  {
    label: "Suzuki Marine",
    href: ROUTES.suzuki.path,
    index: "04",
    plate: "suzuki-engine",
  },
  {
    label: "Projects",
    href: ROUTES.projects.path,
    index: "05",
    plate: "gyor-boat-trailer",
  },
  { label: "Journal", href: ROUTES.journal.path, index: "06", plate: "brand-mark" },
  {
    label: "Contact",
    href: ROUTES.contact.path,
    index: "07",
    plate: "gyor-facility",
    children: [
      { label: "General enquiry", href: ROUTES.contact.path },
      { label: "Private viewing", href: ROUTES.privateViewing.path },
      { label: "Suzuki service", href: `${ROUTES.suzuki.path}#service` },
    ],
  },
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
