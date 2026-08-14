/**
 * PAGE METADATA, IN ONE PLACE.
 *
 * §B25 asks that every new public page carry a unique title, a unique
 * description, a canonical, correct heading structure and OG metadata. Four of
 * those five are metadata and the fifth is markup, so this file owns the four
 * and the components own the fifth.
 *
 * WHY A BUILDER RATHER THAN A `metadata` OBJECT PER PAGE. Next lets every route
 * export its own, and thirteen hand-written objects is thirteen chances to
 * forget the canonical — which is the one that matters most and the one nobody
 * notices missing. Going through here means a page supplies the two strings
 * only it can know and inherits everything that should not vary.
 *
 * THE CANONICAL COMES FROM THE ROUTE TABLE, not from a string the page passes.
 * A canonical that disagrees with the address it is served at is worse than no
 * canonical at all, and the only way to be sure they agree is for both to come
 * from `ROUTES`.
 */

import type { Metadata } from "next";
import { SITE } from "@/content/site";
import { ROUTES, type RouteId } from "@/content/routes";
import { MEDIA, type MediaId } from "@/lib/media.generated";

interface PageMetaInput {
  route: RouteId;
  /**
   * The page's own title, WITHOUT the site name. The root layout's template
   * appends it — duplicating it here is the commonest way a title ends up
   * reading "Craft — Duna Hajók — Duna Hajók".
   */
  title: string;
  /**
   * One sentence, unique to this page, describing what is on it.
   *
   * §B25 asks for unique descriptions and the failure mode is subtler than
   * duplication: a description that describes the COMPANY rather than the PAGE
   * is unique and useless. Each one below answers "what will I find here".
   */
  description: string;
  /** The page's own social image. Falls back to the site's hero. */
  image?: MediaId;
}

export function pageMetadata({ route, title, description, image }: PageMetaInput): Metadata {
  const spec = ROUTES[route];
  const media = image ? MEDIA[image] : null;

  return {
    title,
    description,
    alternates: { canonical: spec.path },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      locale: "en_GB",
      title: `${title} — ${SITE.name}`,
      description,
      url: spec.path,
      ...(media
        ? {
            images: [
              {
                url: media.src,
                width: media.width,
                height: media.height,
                alt: media.alt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${SITE.name}`,
      description,
      ...(media ? { images: [media.src] } : {}),
    },
    /**
     * Explicit rather than inherited, and only where the route table says so.
     *
     * Every route in `ROUTES` is indexable today, so this is uniform — but it
     * is derived rather than assumed, so that adding an unindexed public route
     * (a thank-you page, a campaign landing) is a data change and not a thing
     * somebody has to remember to write into the page.
     */
    robots: spec.indexable
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } }
      : { index: false, follow: false },
  };
}
