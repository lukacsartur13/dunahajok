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
  /**
   * ONE SECTION AT A TIME — the copy the step flow needs.
   *
   * The configurator walks the categories rather than showing all of them, so
   * three things have to be sayable that a single-screen rail never needed:
   * where you are (`stepCounter`), where you are going (`nextSection` /
   * `previousSection`), and what the section you are on is FOR
   * (`categoryIntro`).
   */
  stepCounter: string;
  nextSection: string;
  previousSection: string;
  /** One sentence per section. What this part of the boat is. */
  categoryIntro: Record<PxlCategoryId, string>;
  /**
   * WHAT A CONTROL ACTUALLY CHANGES ON THE BOAT, keyed on `labelKey`.
   *
   * Written against `PXL_ZONES`, which is where the answer really lives: each
   * sentence names the surfaces its control's channel repaints, and nothing
   * else. That is the difference between context and marketing — "paints the
   * topsides, the gunwale capping and the cockpit liner" is checkable against
   * the model, and it is the sentence that stops a viewer wondering why the
   * bottom did not move with it.
   *
   * NOT `PxlCatalogOption.note`, which is next door and looks like it would do:
   * that field is a DEVELOPMENT string documenting what has yet to be approved,
   * and its own doc comment says it is never rendered to a customer.
   */
  controlNotes: Record<string, string>;
  /**
   * What stands where a configurator normally prints a price.
   *
   * Not an omission and not a placeholder for one. No price has been approved
   * for anything in this catalogue, so the line says so — the alternative is a
   * row of "0 Ft" that reads as free, or a blank that reads as forgotten.
   */
  noPrice: string;
  /** How many options a control offers. `{count}`. */
  optionCount: string;
  /** Accessible name pattern for an option. `{name}` is the option. */
  optionLabel: string;
  /** Announced when a selection changes. `{control}` and `{name}`. */
  optionSelected: string;
  /** The rail's own name, for assistive technology. */
  categoryNav: string;
  viewHeading: string;
  /** §4.9 — the night toggle beside the view picker. */
  night: string;
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
  /**
   * WHAT THE POINTER IS STANDING ON, shown in the cursor's own label while it
   * is over something that answers a click.
   *
   * Four strings rather than one, because the boat has two kinds of moving part
   * and each of them has two states. A seat that is already open must not go on
   * offering to open; a bimini does not "open" in any language — it is struck
   * and raised. The scene picks between them from the live lid and stow state,
   * so the label is always the verb the next click will actually perform.
   */
  openHint: string;
  closeHint: string;
  stowHint: string;
  raiseHint: string;
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
    glazingTint: "Windscreen",
    railTreatment: "Grab rails",
    propulsion: "Drive",
    boardingPlatform: "Boarding platform",
    bimini: "Bimini top",
    coolBox: "Cool box",
    audio: "Cockpit speakers",
    speakerLight: "Speaker lights",
  },
  stepCounter: "{index} / {total}",
  nextSection: "Next · {name}",
  previousSection: "Back · {name}",
  categoryIntro: {
    exterior: "The colour the boat is known by from the bank. Six delivered studies, one choice.",
    hull_detail: "Where the topsides colour stops and the bottom begins.",
    interior: "The cockpit you sit in — leather, console, surface, screen and rails.",
    propulsion: "What stands on the transom.",
    equipment: "What is fitted to this boat, and what is left off it.",
  },
  controlNotes: {
    exteriorFinish:
      "Paints the topsides, the gunwale capping and the cockpit liner. The bottom and the sheer band are set on their own.",
    lowerTreatment:
      "How far the topsides colour travels: the bottom keeps its own dark, or the hull colour runs down to the keel.",
    interiorPrimary:
      "The leather — cockpit upholstery, the driver's squab and the three cushion lids.",
    interiorSecondary:
      "The helm console's panel, and the cool box if one is fitted. The dark shell around it and the dash do not change.",
    interiorSurface:
      "The character of the same moulding, smooth or grained. The colour does not change with it.",
    glazingTint: "How dark the acrylic screen reads. Its shape and its frame are unchanged.",
    railTreatment:
      "Whether the grab rails and the bimini frame follow the cockpit leather or stay satin black.",
    propulsion:
      "Which drive stands on the transom. These are neutral proxies for proportion — no make and no power figure.",
    boardingPlatform: "The teak platform and the stern spoiler, abaft the transom.",
    bimini:
      "A three-bow top over the helm. Once it is up, click the canopy on the boat to strike it.",
    coolBox:
      "An insulated locker on the sole, forward of the console. Click its lid on the boat to open it.",
    audio: "Four flush speakers in the cockpit's inner wall, each with a lit ring.",
    speakerLight: "What those rings do after dark. Turn Night on to see it.",
  },
  noPrice: "No price quoted",
  optionCount: "{count} options",
  optionLabel: "{control}: {name}",
  optionSelected: "{control} set to {name}",
  categoryNav: "Configuration categories",
  viewHeading: "View",
  night: "Night",
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
  openHint: "Click to open",
  closeHint: "Click to close",
  stowHint: "Click to stow",
  raiseHint: "Click to raise",
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
    glazingTint: "Szélvédő",
    railTreatment: "Kapaszkodók",
    propulsion: "Hajtómű",
    boardingPlatform: "Beszállóplató",
    bimini: "Bimini tető",
    coolBox: "Hűtőláda",
    audio: "Hangszórók",
    speakerLight: "Hangszóró világítás",
  },
  stepCounter: "{index} / {total}",
  nextSection: "Tovább · {name}",
  previousSection: "Vissza · {name}",
  categoryIntro: {
    exterior: "Ez a szín látszik a partról. Hat átadott színtanulmány, egy döntés.",
    hull_detail: "Ahol a felső szín véget ér, és a fenék elkezdődik.",
    interior: "Az utastér, amiben ül — bőr, konzol, felület, szélvédő és kapaszkodók.",
    propulsion: "Ami a tükrön áll.",
    equipment: "Mi kerül fel erre a hajóra, és mi marad le róla.",
  },
  controlNotes: {
    exteriorFinish:
      "A felső hajótestet, a szegélylécet és az utastér burkolatát festi. A fenék és a szegélysáv külön áll.",
    lowerTreatment:
      "Meddig ér le a felső szín: a fenék marad a saját sötétjében, vagy a hajótest színe fut le a gerincig.",
    interiorPrimary:
      "A bőr — az utastér kárpitja, a vezetőülés párnája és a három ülőláda-fedél.",
    interiorSecondary:
      "A kormánykonzol panelja, és a hűtőláda, ha van. A körülötte lévő sötét burkolat és a műszerfal nem változik.",
    interiorSurface:
      "Ugyanannak a burkolatnak a jellege, sima vagy szemcsés. A szín nem változik vele.",
    glazingTint: "Milyen sötét az akril szélvédő. A formája és a kerete változatlan.",
    railTreatment:
      "A kapaszkodók és a bimini váz a kárpit bőrét követik, vagy szatén feketék maradnak.",
    propulsion:
      "Milyen hajtómű áll a tükrön. Ezek semleges arány-modellek — márkát és teljesítményt nem adunk meg.",
    boardingPlatform: "A teak plató és a tatspoiler, a tükör mögött.",
    bimini:
      "Háromíves tető a kormányállás fölött. Ha áll, kattintson a ponyvára a hajón a lehajtásához.",
    coolBox:
      "Szigetelt láda a padlón, a konzol előtt. Kattintson a fedelére a hajón a kinyitásához.",
    audio: "Négy süllyesztett hangszóró az utastér belső falában, mindegyik világító gyűrűvel.",
    speakerLight: "Mit csinálnak ezek a gyűrűk sötétedés után. Kapcsolja be az Éjszaka nézetet.",
  },
  noPrice: "Ár nincs megadva",
  optionCount: "{count} lehetőség",
  optionLabel: "{control}: {name}",
  optionSelected: "{control} beállítva: {name}",
  categoryNav: "Összeállítási kategóriák",
  viewHeading: "Nézet",
  night: "Éjszaka",
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
  openHint: "Kattintson a kinyitáshoz",
  closeHint: "Kattintson a lecsukáshoz",
  stowHint: "Kattintson a lehajtáshoz",
  raiseHint: "Kattintson a felállításhoz",
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
