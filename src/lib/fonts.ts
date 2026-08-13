import { Archivo, Instrument_Serif, IBM_Plex_Mono } from "next/font/google";

/**
 * Typographic system.
 *
 * The intended faces are a Suisse/Diatype-class neo-grotesk and an editorial
 * display serif. Those are commercially licensed, so Phase One ships the
 * closest legally free structural equivalents. Everything downstream reads
 * `--font-display` / `--font-serif` / `--font-mono`, so swapping in the
 * licensed families is a change to this file alone.
 *
 *   display  Archivo         → stand-in for Suisse Int'l / ABC Diatype.
 *                              Variable width axis (62–125) does the heavy
 *                              lifting for monumental headlines.
 *   serif    Instrument Serif → stand-in for an editorial didone/transitional.
 *   mono     IBM Plex Mono    → technical annotations, measurements, indices.
 */

export const fontDisplay = Archivo({
  subsets: ["latin", "latin-ext"], // latin-ext carries Ő/Ű/É for Győr, Kadét
  axes: ["wdth"],
  display: "swap",
  variable: "--font-display",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
});

export const fontSerif = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const fontMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
});

export const fontVariables = `${fontDisplay.variable} ${fontSerif.variable} ${fontMono.variable}`;
