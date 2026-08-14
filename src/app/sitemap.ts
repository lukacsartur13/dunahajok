import type { MetadataRoute } from "next";
import { INDEXABLE_ROUTES } from "@/content/routes";
import { LANGUAGES, SITE } from "@/content/site";

/**
 * THE SITEMAP, DERIVED.
 *
 * Phase One shipped one route and listed it literally. Phase Four ships
 * fourteen, and a hand-written list of fourteen is a list that will be
 * thirteen the first time somebody adds a page in a hurry.
 *
 * So it maps over `INDEXABLE_ROUTES`, which is `ROUTES` filtered on `built &&
 * indexable`. Two consequences worth stating:
 *
 *   • THE PXL CANNOT APPEAR HERE. Its preview routes are not in `ROUTES` at
 *     all — they live in `publication.ts` under a disallowed prefix — and its
 *     reserved public routes are not built. There is no edit to this file that
 *     could put an unannounced product in the sitemap without somebody first
 *     declaring it as a built, indexable route.
 *   • A ROUTE THAT IS NOT IN THE TABLE IS NOT IN THE SITEMAP. That is the
 *     failure mode this trades for, and it is the safe one: a missing page is
 *     found by a crawl, an unannounced one is not un-found.
 *
 * PRIORITY IS DERIVED FROM DEPTH rather than assigned. The home page is 1, a
 * top-level section is 0.8, a page below one is 0.6. Hand-tuned priorities are
 * a well-known way to say nothing — a sitemap where everything is 0.9 carries
 * no signal at all — and depth is at least a fact.
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const modified = new Date();

  return INDEXABLE_ROUTES.map((route) => {
    const depth = route.path === "/" ? 0 : route.path.split("/").filter(Boolean).length;
    return {
      url: `${SITE.url}${route.path === "/" ? "" : route.path}`,
      lastModified: modified,
      changeFrequency: depth === 0 ? ("monthly" as const) : ("yearly" as const),
      priority: depth === 0 ? 1 : depth === 1 ? 0.8 : 0.6,
      // The language table still points at the legacy WordPress translations.
      // Declared on the home page only, because that is the only route whose
      // legacy counterpart is known — claiming an alternate for /craft/design
      // that resolves to a different site's home page would be worse than
      // claiming none.
      ...(route.path === "/"
        ? {
            alternates: {
              languages: Object.fromEntries(LANGUAGES.map((l) => [l.code, l.href])),
            },
          }
        : {}),
    };
  });
}
