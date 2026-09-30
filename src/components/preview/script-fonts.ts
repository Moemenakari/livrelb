import {
  Alex_Brush,
  Allura,
  Amiri,
  Aref_Ruqaa,
  Cinzel,
  Dancing_Script,
  Great_Vibes,
  Italianno,
  Pacifico,
  Parisienne,
  Pinyon_Script,
  Playfair_Display,
  Reem_Kufi,
  Sacramento,
  Satisfy,
} from "next/font/google";
import { fonts, isArabic } from "@/lib/catalog/materials";
import type { FontKey } from "@/lib/catalog/types";

export { isArabic };

// The Google Fonts behind our font names (fonts table, brief §7), all
// self-hosted by next/font. Only Beirut, the default of most pieces, is
// preloaded: a font file downloads the first time text is drawn in it, so
// the font picker only pulls the others once it scrolls into view.
// No metric-adjusted fallback: the fallback (Arial) has Arabic glyphs and
// would steal Arabic names from the Arabic fonts.
// next/font options must be literals (no spread), hence the repetition.
const greatVibes = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  adjustFontFallback: false,
  fallback: ["cursive"],
});
const allura = Allura({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["cursive"],
});
const parisienne = Parisienne({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["cursive"],
});
const alexBrush = Alex_Brush({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["cursive"],
});
const pinyonScript = Pinyon_Script({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["cursive"],
});
const dancingScript = Dancing_Script({
  weight: "600",
  subsets: ["latin"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["cursive"],
});
const sacramento = Sacramento({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["cursive"],
});
const italianno = Italianno({
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
const satisfy = Satisfy({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["cursive"],
});
const cinzel = Cinzel({
  weight: "500",
  subsets: ["latin"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["serif"],
});
const playfair = Playfair_Display({
  weight: "500",
  subsets: ["latin"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["serif"],
});
const arefRuqaa = Aref_Ruqaa({
  weight: "700",
  subsets: ["arabic"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["serif"],
});
const reemKufi = Reem_Kufi({
  weight: "500",
  subsets: ["arabic"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["sans-serif"],
});
const amiri = Amiri({
  weight: "700",
  subsets: ["arabic"],
  preload: false,
  adjustFontFallback: false,
  fallback: ["serif"],
});

type Face = { family: string; weight: number; /** Size next to the other fonts. */ scale: number };

const face = (font: { style: { fontFamily: string } }, weight: number, scale: number): Face => ({
  family: font.style.fontFamily,
  weight,
  scale,
});

// Scales even out how big each font draws at the same font size (Pacifico
// and the capitals fonts are much bigger than the thin scripts).
const faces: Record<FontKey, Face> = {
  beirut: face(greatVibes, 400, 1.12),
  byblos: face(allura, 400, 1.12),
  batroun: face(parisienne, 400, 0.95),
  tyre: face(alexBrush, 400, 1.05),
  saida: face(pinyonScript, 400, 1),
  jounieh: face(dancingScript, 600, 0.92),
  zahle: face(sacramento, 400, 1.15),
  ehden: face(italianno, 400, 1.25),
  faraya: face(pacifico, 400, 0.86),
  bcharre: face(satisfy, 400, 1),
  baalbek: face(cinzel, 500, 0.72),
  anjar: face(playfair, 500, 0.8),
  tripoli: face(arefRuqaa, 700, 1),
  harissa: face(reemKufi, 500, 0.85),
  "deir-el-qamar": face(amiri, 700, 0.95),
};

/**
 * How to draw a text in a font. A Latin font can't write Arabic letters, so
 * an Arabic name in a Latin font is drawn in Tripoli (Aref Ruqaa).
 */
export function scriptFace(font: FontKey, text: string): Face {
  if (fonts[font].script === "latin" && isArabic(text)) return faces.tripoli;
  return faces[font];
}
