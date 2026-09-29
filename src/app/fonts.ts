import { Amiri, Cinzel, Readex_Pro } from "next/font/google";

// Headings: Cinzel's wide inscriptional capitals echo the lettering on the
// 1975 Lira coin. It has no Arabic glyphs, so Arabic headings use Amiri.
const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  // The generated fallback font is a local serif that has Arabic glyphs and
  // would win over Amiri in the font stack. Without it, Arabic reaches Amiri.
  adjustFontFallback: false,
});

const amiri = Amiri({
  weight: ["400", "700"],
  subsets: ["arabic"],
  variable: "--font-amiri",
  // Only Arabic pages use it; don't make English pages download it.
  preload: false,
});

// Body: one variable family drawn for both Latin and Arabic. Only the Latin
// file is preloaded; the Arabic one loads when Arabic text is on the page.
const readexPro = Readex_Pro({
  subsets: ["latin"],
  variable: "--font-readex",
});

export const fontVariables = [
  cinzel.variable,
  amiri.variable,
  readexPro.variable,
].join(" ");
