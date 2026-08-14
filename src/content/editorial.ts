/**
 * PROJECTS AND JOURNAL — the two architectures with no content yet.
 *
 * ⚠️ BOTH ARRAYS ARE EMPTY, AND THAT IS THE DELIVERABLE.
 *
 * §B14 asks for a Projects area built from VERIFIED work only, with enough
 * substance per entry to justify a case study, and says explicitly: do not
 * create empty cards. §B16 asks for a Journal architecture and says, just as
 * plainly: do not fabricate articles to fill it.
 *
 * Nothing verified exists for either. The source site publishes the company's
 * history, its two boats, its awards and its Suzuki dealership; it does not
 * publish a project archive, a restoration case study or a news feed. What it
 * does establish — and this is the one thing these pages are built on — is that
 * the business has done SHIPBUILDING AND SHIP RENOVATION since 1991, alongside
 * the interior joinery it started as.
 *
 * So the two pages are built as follows, and the distinction between them is
 * deliberate:
 *
 *   • PROJECTS is a real page about a real capability, with the case-study
 *     architecture behind it and no case studies in it. It says what the yard
 *     does, says that individual projects have not been published, and offers
 *     the way to ask about one. That is a page; a grid of three invented
 *     restorations would not be.
 *   • JOURNAL is architecture only — an index that states it is not yet
 *     publishing and an article template that is complete and unused. §B16 asks
 *     for exactly this, "even if content volume is initially small", and small
 *     here is zero.
 *
 * NEITHER IS IN THE SITEMAP'S PRIORITY TIER and both are honest about their own
 * state. Filling them is a content task with a shape already waiting, which is
 * the whole reason to build the shape now.
 */

import type { MediaId } from "@/lib/media.generated";

/* ── Projects ──────────────────────────────────────────────────────────────*/

/**
 * §B15's reusable case-study template, as a type.
 *
 * Every section after `hero` is OPTIONAL, which is §B15's real requirement:
 * "allow projects to omit sections without leaving empty visual shells". A
 * restoration with no process photography should render a shorter page, not a
 * page with a heading over nothing — and the way to guarantee that is to make
 * the absence unrepresentable as an empty string.
 */
export interface Project {
  slug: string;
  title: string;
  /** One line. What the project was. */
  summary: string;
  /** Year or range, as published. Null when the yard has not stated one. */
  year: string | null;
  hero: MediaId;
  /** Label / value pairs. Only facts the yard has published. */
  facts?: readonly { label: string; value: string }[];
  /** The narrative. Each entry is a paragraph. */
  story?: readonly string[];
  /** What made it difficult. Omitted when nobody has described one. */
  challenge?: readonly string[];
  /** How it was done. */
  process?: readonly string[];
  gallery?: readonly MediaId[];
  /** What the boat is now. */
  result?: readonly string[];
}

/**
 * EMPTY, AND NOT A PLACEHOLDER.
 *
 * A single invented entry here would be a case study on a boatbuilder's site
 * describing work that may not have happened, on a boat that may not exist, for
 * a customer who did not consent to it. There is no version of that which is
 * worth a filled grid.
 */
export const PROJECTS: readonly Project[] = [];

/**
 * What the yard does, stated from the verified record.
 *
 * This is what the Projects page is actually made of. Every clause traces to
 * the company history on dunahajok.hu: shipbuilding and ship renovation from
 * 1991, individually designed joinery, the Győr facility, and the Suzuki
 * service point.
 */
export const PROJECT_CAPABILITIES: readonly {
  id: string;
  title: string;
  body: string;
}[] = [
  {
    id: "shipbuilding",
    title: "Shipbuilding",
    body:
      "Shipbuilding has been part of the business since it was established in 1991, alongside the interior joinery it began as. The Duna 6.1 is the first vessel of the company's own design.",
  },
  {
    id: "renovation",
    title: "Ship renovation",
    body:
      "Ship renovation has run alongside the new-build work for the same three decades — the reason a carpentry firm on the Danube ended up drawing a hull.",
  },
  {
    id: "joinery",
    title: "Marine joinery",
    body:
      "High-quality, individually designed interior joinery, made in a manufactory system. It is what the teak on a 6.1 deck and the fitted interior of a Cabin are made by.",
  },
  {
    id: "service",
    title: "Engine service",
    body:
      "Since 2022 the workshop has been an official Suzuki Marine service point for the region, so engine work is done in the same building as the woodwork.",
  },
];

/**
 * WHY THERE ARE NO CASE STUDIES, in the words the page uses.
 *
 * Written here rather than in the component so that it is reviewed as content
 * and translated as content. It is not an apology and it is not a "coming
 * soon" — it states a fact and offers the alternative.
 */
export const PROJECTS_NOTICE = {
  heading: "Individual projects",
  body:
    "Duna Hajók has not published case studies of individual commissions. Restoration and custom marine work is discussed directly, and photography of past work is shared on request.",
  cta: "Ask about a project",
} as const;

/* ── Journal ───────────────────────────────────────────────────────────────*/

export interface JournalArticle {
  slug: string;
  title: string;
  /** ISO 8601 date. Ordering and the `datePublished` in structured data. */
  date: string;
  /** One line, used on the index and as the meta description. */
  standfirst: string;
  category: "News" | "Design" | "Production" | "Events" | "Suzuki";
  hero: MediaId;
  /** Paragraphs. A future editor's only required field beyond the above. */
  body: readonly string[];
  gallery?: readonly MediaId[];
}

/**
 * EMPTY. §B16: "Do not fabricate articles just to fill it."
 *
 * The index, the article template, the category vocabulary, the ordering, the
 * structured data and the metadata are all built and all exercised by the
 * empty case. Publishing the first article is adding an object to this array.
 */
export const JOURNAL: readonly JournalArticle[] = [];

export const JOURNAL_NOTICE = {
  heading: "The Journal",
  body:
    "Duna Hajók is preparing its journal — build notes, boat shows, design process and the work of the yard. Nothing has been published yet, and nothing has been invented to stand in for it.",
} as const;

/** Newest first. Defined here so the index and the article page cannot differ. */
export function journalByDate(): readonly JournalArticle[] {
  return [...JOURNAL].sort((a, b) => b.date.localeCompare(a.date));
}

export function findArticle(slug: string): JournalArticle | undefined {
  return JOURNAL.find((a) => a.slug === slug);
}

export function findProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
