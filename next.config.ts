import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Local media is pre-derived to AVIF/WebP by `npm run assets`, so the
    // optimizer mainly handles resizing. Keep the ladder tight — this site
    // only ever serves full-bleed or half-bleed art.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [420, 640, 828, 1080, 1440, 1920, 2560],
    imageSizes: [220, 320, 480],
  },
  experimental: {
    optimizePackageImports: ["gsap"],
  },
};

export default nextConfig;
