import type { NextConfig } from "next";

/**
 * TWO TARGETS, ONE BUILD.
 *
 * By default this is the site as it will ship to dunahajok.hu: a Next server,
 * the image optimiser doing its job, everything at the domain root.
 *
 * With `GITHUB_PAGES=true` it becomes a static export mounted at
 * `/dunahajok/`, for the demo at lukacsartur13.github.io. That target is only
 * possible because **every route in this app prerenders** — `next build`
 * reports all of them as `○ (Static)`. There is no server component doing
 * request-time work anywhere, so there is nothing for a server to do.
 *
 * The flag is opt-in rather than the default so that a normal `npm run build`,
 * `npm run dev` and `npm run qa` are completely unaffected by the existence of
 * the demo. Nothing about the production target changes.
 */
const pages = process.env.GITHUB_PAGES === "true";

/**
 * The sub-path GitHub Pages serves a project site from.
 *
 * Next rewrites its own URLs from this — `next/image`, `next/link`, the script
 * and CSS tags. What it cannot rewrite is a path handed to something that is
 * not Next: three's GLTF loader and the preloader's raw `Image()`. Those go
 * through `asset()` in `src/lib/basePath.ts`, which reads the value below.
 */
const basePath = pages ? "/dunahajok" : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  ...(pages
    ? {
        output: "export" as const,
        basePath,
        /**
         * Trailing slashes, so that `/preview/pxl/configure` is emitted as
         * `…/configure/index.html`. Without it the export writes
         * `…/configure.html`, which GitHub Pages serves only at the exact
         * `.html` URL — and every internal link points at the extensionless
         * one.
         */
        trailingSlash: true,
      }
    : {}),

  images: {
    // Local media is pre-derived to AVIF/WebP by `npm run assets`, so the
    // optimizer mainly handles resizing. Keep the ladder tight — this site
    // only ever serves full-bleed or half-bleed art.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [420, 640, 828, 1080, 1440, 1920, 2560],
    imageSizes: [220, 320, 480],
    /**
     * There is no optimiser on a static host. The sources are already AVIF and
     * WebP at sensible sizes — see `npm run assets` — so what is lost is the
     * responsive resizing ladder, not the format conversion. `sizes` is still
     * honoured by the browser; it simply picks from one candidate.
     */
    ...(pages ? { unoptimized: true } : {}),
  },

  /**
   * Published to the client bundle so `asset()` can read it. Next inlines
   * `process.env.NEXT_PUBLIC_*` at build time as a literal text substitution.
   */
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },

  experimental: {
    optimizePackageImports: ["gsap"],
  },
};

export default nextConfig;
