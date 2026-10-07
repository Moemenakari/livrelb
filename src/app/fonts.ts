import {
  Cormorant_Garamond,
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

// Arabic serif for Arabic names and letters on the pieces. Not preloaded: only Arabic text uses it.
const notoNaskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-naskh",
  preload: false,
});


export const fontVariables = [
  cormorant.variable,
  jost.variable,
  notoNaskh.variable,
].join(" ");
