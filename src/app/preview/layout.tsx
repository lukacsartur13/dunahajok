import type { Metadata } from "next";
import { PREVIEW_ROBOTS } from "@/content/publication";

/**
 * /preview — the staging segment.
 *
 * Everything under here is a finished, customer-shaped surface for a product
 * the yard has not published. That combination is the reason this layout
 * exists: the risk is not that the pages are unfinished, it is that they are
 * *not*, and a finished product page for an unannounced boat is exactly the
 * thing that must not reach an index, a share card or a search result.
 *
 * So the guarantee is made at the segment rather than at each page. A route
 * added under `/preview` inherits `noindex, nofollow, noarchive` whether or not
 * whoever adds it remembers to, which is the only version of this rule that
 * survives contact with a second developer. `robots.ts` disallows the path as
 * well; see the note there for why both are needed.
 *
 * `nosnippet` and `noimageindex` are not decoration either. A snippet or a
 * thumbnail is a fragment of an unpublished product escaping into a surface
 * nobody at Duna approved — and unlike the page itself, a cached snippet cannot
 * be taken back by changing a route.
 */
export const metadata: Metadata = {
  robots: {
    ...PREVIEW_ROBOTS,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
