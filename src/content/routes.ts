/**
 * THE SITE'S ADDRESSES, AND WHAT IS BEHIND THEM.
 *
 * One table, imported by the navigation, the sitemap, the footer, the menu and
 * the page-transition layer. Phase One had a `NAV` tree with `phase: 2` entries
 * pointing at homepage anchors, which was the honest shape for a one-page site
 * — a link that scrolls is better than a link that 404s. Phase Four builds the
 * pages, so the anchors become routes and this file is where the two facts a
 * route carries live: whether it EXISTS, and whether it may be INDEXED.
 *
 * WHY THOSE TWO ARE SEPARATE. `/preview/pxl` exists and must never be indexed;
 * `/boats/pxl` is reserved, does not exist, and will be indexable the day it
 * does. Collapsing them into one boolean is how an unannounced product ends up
 * in a search index — see `publication.ts`, which owns the disallow list this
 * agrees with.
 *
 * This module imports NOTHING, so `npm test` can assert that every navigation
 * destination resolves to a route that is declared here, and that nothing
 * declared unindexed is reachable from the public navigation.
 */

export type RouteId =
  | "home"
  | "boats"
  | "cabin"
  | "kadet"
  | "craftDesign"
  | "craftManufacturing"
  | "craftMaterials"
  | "heritage"
  | "awards"
  | "suzuki"
  | "projects"
  | "journal"
  | "contact"
  | "privateViewing";

export interface RouteSpec {
  id: RouteId;
  path: string;
  /**
   * The page's character. §B22 asks that every page belong to Duna without
   * every page looking identical, and that the difference come from emphasis
   * rather than from a second design system. This is that emphasis, as data:
   * one token the page's shell reads to set its ground, its image scale and
   * its motion cadence.
   */
  tone: "paper" | "depth" | "warm" | "technical" | "archival";
  /** False for a route that is declared but not built. */
  built: boolean;
  /** False for a route that must not appear in the sitemap or be indexed. */
  indexable: boolean;
  /** True when the route mounts a WebGL scene. Read by the performance audit. */
  webgl: boolean;
}

export const ROUTES: Readonly<Record<RouteId, RouteSpec>> = {
  home: { id: "home", path: "/", tone: "depth", built: true, indexable: true, webgl: true },

  boats: { id: "boats", path: "/boats", tone: "paper", built: true, indexable: true, webgl: false },
  cabin: {
    id: "cabin",
    path: "/boats/duna-61-cabin",
    // §B22: warm and composed. The Cabin is teak joinery in an enclosed hull,
    // and the page is graded toward the timber rather than toward the river.
    tone: "warm",
    built: true,
    indexable: true,
    webgl: false,
  },
  kadet: {
    id: "kadet",
    path: "/boats/duna-61-kadet",
    // §B22: sharper and more energetic. Dark ground, faster cuts, the profile
    // as the recurring form.
    tone: "depth",
    built: true,
    indexable: true,
    webgl: false,
  },

  craftDesign: {
    id: "craftDesign",
    path: "/craft/design",
    tone: "technical",
    built: true,
    indexable: true,
    webgl: false,
  },
  craftManufacturing: {
    id: "craftManufacturing",
    path: "/craft/manufacturing",
    tone: "depth",
    built: true,
    indexable: true,
    webgl: false,
  },
  craftMaterials: {
    id: "craftMaterials",
    path: "/craft/materials",
    tone: "warm",
    built: true,
    indexable: true,
    webgl: false,
  },

  heritage: {
    id: "heritage",
    path: "/story/heritage",
    tone: "archival",
    built: true,
    indexable: true,
    webgl: false,
  },
  awards: {
    id: "awards",
    path: "/story/awards",
    tone: "paper",
    built: true,
    indexable: true,
    webgl: false,
  },

  suzuki: {
    id: "suzuki",
    path: "/suzuki-marine",
    tone: "technical",
    built: true,
    indexable: true,
    webgl: false,
  },

  projects: {
    id: "projects",
    path: "/projects",
    tone: "paper",
    built: true,
    indexable: true,
    webgl: false,
  },
  journal: {
    id: "journal",
    path: "/journal",
    tone: "paper",
    built: true,
    indexable: true,
    webgl: false,
  },

  contact: {
    id: "contact",
    path: "/contact",
    tone: "depth",
    built: true,
    indexable: true,
    webgl: false,
  },
  privateViewing: {
    id: "privateViewing",
    path: "/contact/private-viewing",
    tone: "depth",
    built: true,
    indexable: true,
    webgl: false,
  },
};

export const ROUTE_LIST: readonly RouteSpec[] = Object.values(ROUTES);

/** Everything the sitemap may carry. Built, indexable, and nothing else. */
export const INDEXABLE_ROUTES: readonly RouteSpec[] = ROUTE_LIST.filter(
  (r) => r.built && r.indexable,
);

export function routePath(id: RouteId): string {
  return ROUTES[id].path;
}
