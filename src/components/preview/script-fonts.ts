import { Aref_Ruqaa, Great_Vibes, Pacifico, Satisfy } from "next/font/google";
import type { FontKey } from "@/lib/catalog/types";

// Font files behind our own font names (fonts table, brief §7). Only the
// default script is preloaded; the others load when a preview first uses
// them. No metric-adjusted fallback: the fallback (Arial) has Arabic glyphs
// and would steal Arabic names from Aref Ruqaa.
const satisfy = Satisfy({
  weight: "400",
  subsets: ["latin"],
  adjustFontFallback: false,
  fallback: ["cursive"],
});

const greatVibes = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["cursive"],
});

const pacifico = Pacifico({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["cursive"],
});

// Arabic names in every font: Ruqaa joins letters like handwriting.
const arefRuqaa = Aref_Ruqaa({
  weight: "700",
  subsets: ["arabic"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["serif"],
});

const latin: Record<FontKey, string> = {
  beirut: satisfy.style.fontFamily,
  byblos: greatVibes.style.fontFamily,
  batroun: pacifico.style.fontFamily,
};

// Pacifico is much heavier than the others; draw it a little smaller.
export const fontScale: Record<FontKey, number> = {
  beirut: 1,
  byblos: 1.12,
  batroun: 0.86,
};

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

export function isArabic(text: string): boolean {
  return ARABIC.test(text);
}

/** CSS font-family list for a name. Arabic text puts the Arabic face first. */
export function scriptFamily(font: FontKey, arabic: boolean): string {
  return arabic
    ? `${arefRuqaa.style.fontFamily}, ${latin[font]}`
    : `${latin[font]}, ${arefRuqaa.style.fontFamily}`;
}

export function scriptWeight(arabic: boolean): number {
  return arabic ? 700 : 400;
}
