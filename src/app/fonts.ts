import {
  Cormorant_Garamond,
  IBM_Plex_Sans_Arabic,
  Jost,
  Noto_Naskh_Arabic,
} from "next/font/google";

// Brief §2: an elegant thin serif for headings, a clean light sans for body.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
});

// Arabic pair. Not preloaded: only Arabic text uses them, so English pages
// don't download them.
const notoNaskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-naskh",
  preload: false,
});

const plexArabic = IBM_Plex_Sans_Arabic({
  weight: ["400", "500", "600"],
  subsets: ["arabic"],
  variable: "--font-plex-arabic",
  preload: false,
});

export const fontVariables = [
  cormorant.variable,
  jost.variable,
  notoNaskh.variable,
  plexArabic.variable,
].join(" ");
