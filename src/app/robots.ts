import type { MetadataRoute } from "next";
import { UNINDEXED_PREFIXES } from "@/content/publication";
import { SITE } from "@/content/site";

/**
 * Emitted as a file, not served by a handler.
 *
 * Required by `output: "export"`, which cannot know that this route has no
 * request-time behaviour unless it is told. Inert in the server build — the
 * route was already static there — so it costs nothing on the production
 * target and unblocks the GitHub Pages one.
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    // `/dev` is the model inspection bench — a development instrument, not a
    // page. `/preview` is the staging path for products the yard has not
    // published: the PXL experience there is finished and customer-shaped, and
    // that is exactly why it must not be indexed — a crawler cannot tell a
    // finished interface for an unannounced boat from a product launch.
    //
    // Both routes also send `noindex` themselves. This is the belt to that
    // brace: a disallow keeps crawlers from spending the budget, and a noindex
    // keeps anything that ignores the disallow out of the index. Neither alone
    // is sufficient — a disallowed page can still be indexed from an external
    // link, and a noindex page is only seen if it is fetched.
    rules: [{ userAgent: "*", allow: "/", disallow: [...UNINDEXED_PREFIXES] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
