/**
 * PXL configurator — every user-visible string, in one place.
 *
 * §70 asks for a localisation-ready structure and explicitly says not to build
 * a second i18n system. There is no first one: the site is single-locale today
 * and `LANGUAGES` in `site.ts` links to the legacy WordPress translations
 * rather than routing anything. So this is not an i18n framework and does not
 * try to be — it is a table, keyed by locale, read through one function. When
 * the site gains real routing, this file becomes a consumer of it and no
 * component changes, which is the whole requirement.
 *
 * WHAT IS NOT HERE. Colour names live in `pxlPalette` beside the material
 * parameters they describe, because a finish is product data with a display
 * name attached, not a UI label — and because translating "Sage Green" before
 * the yard has approved that it *is* the name would be translating a guess.
 * Category and view labels are here, because those are interface vocabulary.
 *
 * PXL IS NEVER TRANSLATED (§71). It does not appear as a key.
 */

import type { PxlCategoryId } from "@/webgl/scenes/pxl/pxlConfig";
import type { PxlCustomerPresetId } from "@/webgl/scenes/pxl/pxlPresets";

export type PxlLocale = "en" | "hu";

export interface PxlStrings {
  /** Above the product name. */
  eyebrow: string;
  /** The single sentence that says what can be configured. See §29. */
  scopeNote: string;
  /**
   * Category names, keyed on the catalogue's own ids.
   *
   * `Record<PxlCategoryId, …>` rather than a loose map, so a category added to
   * `pxlCatalog` without a name here is a compile error rather than a tab
   * rendering its own id at a customer.
   */
  categories: Record<PxlCategoryId, string>;
  /**
   * Control names, keyed on `PxlCatalogControl.labelKey`.
   *
   * A separate table from `categories` because a category with one control
   * names them differently from a category with three: EXTERIOR's single
   * control is not labelled a second time under the tab that already says
   * EXTERIOR, while INTERIOR's three each need a name of their own.
   */
  controls: Record<string, string>;
  /** Accessible name pattern for an option. `{name}` is the option. */
  optionLabel: string;
  /** Announced when a selection changes. `{control}` and `{name}`. */
  optionSelected: string;
  /** The rail's own name, for assistive technology. */
  categoryNav: string;
  viewHeading: string;
  /**
   * The name of each view a CUSTOMER can reach.
   *
   * Deliberately not `Record<PxlPresetId, string>` from Phase 4.1 on. §20 adds
   * four reference compositions whose whole purpose is to be compared against a
   * delivered drawing, and §31 keeps them off every customer surface — so they
   * are not in the view rail, they are not in this table, and requiring a
   * localised name for them would have meant inventing customer vocabulary for
   * something no customer will see. Their labels live on the preset itself,
   * where the development bench reads them.
   *
   * `detail` is here despite also being unexposed: it is a *product* view that
   * happens to be withheld pending the console revision, and it gets a name so
   * that the day it is exposed is a one-line change. A reference camera is never
   * going to be exposed.
   */
  views: Record<PxlCustomerPresetId, string>;
  /** Accessible name pattern for a swatch. `{name}` is the colour. */
  colourOptionLabel: string;
  /** Announced when the selection changes. */
  colourSelected: string;
  summaryHeading: string;
  share: string;
  shareDone: string;
  cta: string;
  /** Under the CTA — what pressing it does and does not do. */
  ctaNote: string;
  reset: string;
  loading: string;
  /** Hint under the stage on pointer devices. */
  orbitHint: string;
  orbitHintTouch: string;
  /** The canvas's accessible description. §73. */
  sceneDescription: string;
  /** Shown instead of the configurator when WebGL cannot run. §49. */
  fallbackHeading: string;
  fallbackBody: string;

  /* ── Phase Three: the customer-facing experience ───────────────────────── */

  /** The technical annotation above the product name. §39. */
  modelLabel: string;
  /** The CTA that enters product mode from the editorial page. */
  enter: string;
  /** Leaving the configurator, back to the product it belongs to. */
  exit: string;
  /** The immersive view, and the way out of it. */
  focus: string;
  focusExit: string;
  /** One-time interaction hint over the stage. Hidden after the first drag. */
  dragHint: string;
  /** The compositional-arrival caption. Brief, then gone. */
  arrivalCaption: string;
  /** The finish has no approved public name. Preview surfaces say so once. */
  provisionalNames: string;
  /** The same fact as a marker beside the name itself. One or two words. */
  provisionalShort: string;
  /** Secondary action: a client-side render of the current configuration. */
  saveImage: string;
  saveImageBusy: string;
  saveImageFailed: string;

  /* Request flow. */
  requestHeading: string;
  /** What the request is and is not. Shown above the fields. */
  requestIntro: string;
  requestName: string;
  requestEmail: string;
  requestPhone: string;
  requestMessage: string;
  requestOptional: string;
  requestSubmit: string;
  requestCancel: string;
  requestInvalidName: string;
  requestInvalidEmail: string;
  /**
   * THE HONEST ENDING. No approved destination exists, so the flow says so and
   * hands the message to the customer's own mail client. §32.
   */
  requestNoDestination: string;
  requestOpenMail: string;

  /* The editorial preview page. */
  previewNotice: string;
  previewLede: string;
  observedHeading: string;
  specsHeading: string;
  specsPending: string;
}

const EN: PxlStrings = {
  eyebrow: "Configure",
  scopeNote: "Preview configuration. Options are provisional and not yet approved for order.",
  categories: {
    exterior: "Exterior",
    hull_detail: "Hull",
    interior: "Interior",
    propulsion: "Propulsion",
    /* PHASE 4.4 §25. The category Phase Four deferred, offered now that the
       aft boarding platform gives it something to contain. */
    equipment: "Equipment",
  },
  controls: {
    exteriorFinish: "Finish",
    lowerTreatment: "Lower hull",
    interiorPrimary: "Cockpit",
    interiorSecondary: "Console",
    interiorSurface: "Surface",
    propulsion: "Drive",
    boardingPlatform: "Boarding platform",
  },
  optionLabel: "{control}: {name}",
  optionSelected: "{control} set to {name}",
  categoryNav: "Configuration categories",
  viewHeading: "View",
  views: {
    hero_3q: "Three-quarter",
    side: "Profile",
    bow_3q: "Bow",
    stern_3q: "Stern",
    interior: "Cockpit",
    detail: "Detail",
    free: "Free",
  },
  colourOptionLabel: "Exterior colour: {name}",
  colourSelected: "Exterior colour set to {name}",
  summaryHeading: "Your configuration",
  share: "Copy link",
  shareDone: "Link copied",
  cta: "Request this configuration",
  ctaNote: "Sends your configuration to the yard. No order is placed.",
  reset: "Reset",
  loading: "Loading",
  orbitHint: "Drag to turn · scroll to zoom",
  orbitHintTouch: "Drag to turn · pinch to zoom",
  sceneDescription: "Interactive 3D view of the Duna PXL boat.",
  fallbackHeading: "3D view unavailable",
  fallbackBody:
    "This browser cannot run the interactive view. The renders below show the same boat in each exterior colour.",

  modelLabel: "Model",
  enter: "Configure your PXL",
  exit: "Close",
  focus: "Focus",
  focusExit: "Exit focus",
  dragHint: "Drag to explore",
  arrivalCaption: "Configure your PXL",
  provisionalNames: "Colour names are provisional and not yet approved.",
  provisionalShort: "Provisional name",
  saveImage: "Save image",
  saveImageBusy: "Rendering",
  saveImageFailed: "Image unavailable",

  requestHeading: "Request this configuration",
  requestIntro:
    "Your configuration is attached. Nothing is ordered and no price is quoted.",
  requestName: "Name",
  requestEmail: "Email",
  requestPhone: "Phone",
  requestMessage: "Message",
  requestOptional: "Optional",
  requestSubmit: "Continue",
  requestCancel: "Cancel",
  requestInvalidName: "Please enter your name.",
  requestInvalidEmail: "Please enter a valid email address.",
  requestNoDestination:
    "This is a preview. Requests are not yet received here, so your message opens in your own mail application, addressed to the yard, with the configuration attached. Nothing is sent by this page.",
  requestOpenMail: "Open in mail",

  previewNotice: "Preview — unpublished product",
  previewLede: "A new open boat, in development.",
  observedHeading: "What the design shows",
  specsHeading: "Specifications",
  specsPending: "Not yet published by the yard.",
};

/**
 * Hungarian.
 *
 * Duna Hajók is a Győr yard and Hungarian is the home language, so this is the
 * translation that will actually be used first. It is written as interface
 * Hungarian — short, imperative-free, no marketing — to match the English.
 */
const HU: PxlStrings = {
  eyebrow: "Összeállítás",
  scopeNote: "Előnézeti összeállítás. Az opciók ideiglenesek, megrendelésre még nem jóváhagyottak.",
  categories: {
    exterior: "Külső",
    hull_detail: "Hajótest",
    interior: "Belső tér",
    propulsion: "Hajtás",
    equipment: "Felszereltség",
  },
  controls: {
    exteriorFinish: "Szín",
    lowerTreatment: "Alsó hajótest",
    interiorPrimary: "Utastér",
    interiorSecondary: "Konzol",
    interiorSurface: "Felület",
    propulsion: "Hajtómű",
    boardingPlatform: "Beszállóplató",
  },
  optionLabel: "{control}: {name}",
  optionSelected: "{control} beállítva: {name}",
  categoryNav: "Összeállítási kategóriák",
  viewHeading: "Nézet",
  views: {
    hero_3q: "Háromnegyed",
    side: "Oldalnézet",
    bow_3q: "Orr",
    stern_3q: "Tat",
    interior: "Utastér",
    detail: "Részlet",
    free: "Szabad",
  },
  colourOptionLabel: "Külső szín: {name}",
  colourSelected: "A külső szín beállítva: {name}",
  summaryHeading: "Az Ön összeállítása",
  share: "Link másolása",
  shareDone: "Link másolva",
  cta: "Ajánlatkérés erre az összeállításra",
  ctaNote: "Az összeállítást elküldi a hajógyárnak. Megrendelés nem történik.",
  reset: "Alaphelyzet",
  loading: "Betöltés",
  orbitHint: "Húzza az elforgatáshoz · görgetéssel nagyítható",
  orbitHintTouch: "Húzza az elforgatáshoz · csippentéssel nagyítható",
  sceneDescription: "A Duna PXL hajó interaktív 3D nézete.",
  fallbackHeading: "A 3D nézet nem érhető el",
  fallbackBody:
    "Ez a böngésző nem tudja megjeleníteni az interaktív nézetet. Az alábbi látványtervek ugyanazt a hajót mutatják minden külső színben.",

  modelLabel: "Modell",
  enter: "Állítsa össze a PXL-t",
  exit: "Bezárás",
  focus: "Teljes nézet",
  focusExit: "Kilépés",
  dragHint: "Húzza a körbeforgatáshoz",
  arrivalCaption: "Állítsa össze a PXL-t",
  provisionalNames: "A színek elnevezése ideiglenes, még nem jóváhagyott.",
  provisionalShort: "Ideiglenes elnevezés",
  saveImage: "Kép mentése",
  saveImageBusy: "Készítés",
  saveImageFailed: "A kép nem érhető el",

  requestHeading: "Ajánlatkérés erre az összeállításra",
  requestIntro:
    "Az összeállítás automatikusan csatolva. Megrendelés nem történik, árajánlat nem készül.",
  requestName: "Név",
  requestEmail: "E-mail",
  requestPhone: "Telefon",
  requestMessage: "Üzenet",
  requestOptional: "Nem kötelező",
  requestSubmit: "Tovább",
  requestCancel: "Mégse",
  requestInvalidName: "Kérjük, adja meg a nevét.",
  requestInvalidEmail: "Kérjük, adjon meg érvényes e-mail címet.",
  requestNoDestination:
    "Ez egy előnézet. A kérések fogadása még nincs beállítva, ezért az üzenet az Ön saját levelezőprogramjában nyílik meg, a hajógyár címére, az összeállítással együtt. Ez az oldal semmit nem küld el.",
  requestOpenMail: "Megnyitás levelezőben",

  previewNotice: "Előnézet — nem publikált termék",
  previewLede: "Új, nyitott hajó, fejlesztés alatt.",
  observedHeading: "Amit a terv mutat",
  specsHeading: "Műszaki adatok",
  specsPending: "A hajógyár még nem tette közzé.",
};

const TABLES: Record<PxlLocale, PxlStrings> = { en: EN, hu: HU };

/** Falls back to English for any locale that has not been translated yet. */
export function pxlStrings(locale: string = "en"): PxlStrings {
  return TABLES[locale as PxlLocale] ?? EN;
}

/** `fill("Exterior colour: {name}", { name: "Navy" })`. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
}
