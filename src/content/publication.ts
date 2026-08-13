/**
 * WHAT IS NOT PUBLISHED, AND WHERE IT LIVES.
 *
 * Three separate files have to agree about this: `robots.ts` writes the
 * disallow list, `app/preview/layout.tsx` writes the meta robots directives,
 * and `content/pxl.ts` decides which address the PXL experience is served
 * from. When those three disagree, the failure is silent and the consequence
 * is an unannounced product in a search index — which is not a bug anyone
 * notices in review, and is not one that can be taken back.
 *
 * So they read from here instead, and this module imports nothing at all so
 * that `npm test` can assert the agreement. §3 and §36 as a data structure.
 */

/**
 * Path prefixes that must never be indexed.
 *
 * `/dev/` is the model inspection bench — an instrument, not a page. `/preview/`
 * is the staging path for finished experiences attached to unpublished
 * products, and it is the more dangerous of the two precisely because what is
 * there does not look provisional.
 */
export const UNINDEXED_PREFIXES = ["/dev/", "/preview/"] as const;

/** True when a route is covered by the disallow list. Used by the tests. */
export function isUnindexedRoute(route: string): boolean {
  return UNINDEXED_PREFIXES.some((prefix) => route.startsWith(prefix));
}

/**
 * Routes that take over the viewport as a product experience.
 *
 * These are the routes where the site's own chrome — header, footer and the
 * opening sequence — stands down, because the page is not a document with a
 * boat on it, it is the boat.
 *
 * It matters for the PRELOADER in particular. That sequence waits on the
 * homepage's hero photograph before releasing the page, which is exactly right
 * on the homepage and exactly wrong on a deep link into the configurator: the
 * visitor waits a second for an asset their page will never show, and Phase
 * Three §57 asks for the opposite — a composed product almost immediately. So
 * these routes skip it and compose themselves instead, which they are already
 * built to do (see the fallback render in `PxlStage`).
 *
 * The same list as the unindexed prefixes today, and deliberately a separate
 * function: the two are the same by coincidence of what has been built, not by
 * definition. A published `/boats/pxl/configure` would be immersive and
 * indexable at once.
 */
export function isImmersiveRoute(route: string): boolean {
  return (
    route === PXL_ROUTES.previewConfigure ||
    route === PXL_ROUTES.configure ||
    route.startsWith("/dev/")
  );
}

/**
 * The meta robots directives for a staging surface.
 *
 * `nosnippet` and `noimageindex` are not belt-and-braces decoration. A snippet
 * or a thumbnail is a fragment of an unpublished product escaping into a
 * surface nobody at Duna approved, and unlike the page itself, a cached
 * snippet cannot be withdrawn by changing a route.
 */
export const PREVIEW_ROBOTS = {
  index: false,
  follow: false,
  nocache: true,
  noarchive: true,
  nosnippet: true,
  noimageindex: true,
} as const;

/**
 * The PXL's addresses.
 *
 * Here rather than in `content/pxl.ts` because that module reaches for the
 * generated media table and therefore cannot be imported by a test that runs
 * on plain node. The routes are the part a test needs to see — specifically,
 * that the two built ones are under a disallowed prefix and the two reserved
 * ones are not built.
 */
export const PXL_ROUTES = {
  /** RESERVED. Public, once there is a published product. */
  product: "/boats/pxl",
  configure: "/boats/pxl/configure",
  /** BUILT, and unindexed. The customer-facing experience, at staging. */
  preview: "/preview/pxl",
  previewConfigure: "/preview/pxl/configure",
  /** The development bench. Never linked from a customer surface. */
  inspect: "/dev/pxl",
} as const;
