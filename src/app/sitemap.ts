import type { MetadataRoute } from "next";
import { LANGUAGES, SITE } from "@/content/site";

/**
 * Phase One ships one route. The alternates map is already wired to the
 * language table, so adding /hu, /de and /sk is a change to content/site.ts
 * rather than to this file.
 */
/**
 * Emitted as a file, not served by a handler.
 *
 * Required by `output: "export"`, which cannot know that this route has no
 * request-time behaviour unless it is told. Inert in the server build — the
 * route was already static there — so it costs nothing on the production
 * target and unblocks the GitHub Pages one.
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
      alternates: {
        languages: Object.fromEntries(LANGUAGES.map((l) => [l.code, l.href])),
      },
    },
  ];
}
