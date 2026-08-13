import type { MetadataRoute } from "next";
import { LANGUAGES, SITE } from "@/content/site";

/**
 * Phase One ships one route. The alternates map is already wired to the
 * language table, so adding /hu, /de and /sk is a change to content/site.ts
 * rather than to this file.
 */
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
