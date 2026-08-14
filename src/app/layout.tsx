import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import { CONTACT, LANGUAGES, SITE } from "@/content/site";
import { Header } from "@/components/chrome/Header";
import { Footer } from "@/components/chrome/Footer";
import { Preloader } from "@/components/chrome/Preloader";
import { CustomCursor } from "@/components/chrome/CustomCursor";
import { SmoothScroll } from "@/components/chrome/SmoothScroll";
import { RouteTransition } from "@/components/chrome/RouteTransition";
import { WebGLStageMount } from "@/webgl/stage/WebGLStageMount";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.nameLatin,
  authors: [{ name: CONTACT.company }],
  keywords: [
    "Duna Hajók",
    "Duna Boats",
    "Duna 6.1",
    "Duna 6.1 Cabin",
    "Duna 6.1 Kadét",
    "electric boat",
    "teak motorboat",
    "Hungarian boatbuilding",
    "Győr",
    "Suzuki Marine",
  ],
  alternates: {
    canonical: "/",
    languages: Object.fromEntries(LANGUAGES.map((l) => [l.code, l.href])),
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_GB",
    alternateLocale: ["hu_HU", "de_DE", "sk_SK"],
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    images: [
      {
        url: "/media/hero-danube.webp",
        width: 1920,
        height: 1081,
        alt: "A Duna 6.1 under way on the Danube.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: ["/media/hero-danube.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f0eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e0f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={SITE.locale} className={fontVariables}>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>
        <a className="u-skip" href="#main">
          Skip to content
        </a>

        <Preloader />
        <SmoothScroll />
        {/* One canvas for the whole site. Fixed at the root so it outlives
            every section, transparent except inside a live SceneSlot, and
            code-split so the DOM-first page never waits on a renderer. */}
        <WebGLStageMount />
        <CustomCursor />
        {/* §B21. Above the page and the canvas, below the menu and the header,
            so both stay operable while a route change crosses the frame. */}
        <RouteTransition />
        <Header />

        <main id="main">{children}</main>

        <Footer />
      </body>
    </html>
  );
}
