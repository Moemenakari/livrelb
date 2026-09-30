import { iconShapes, type IconShape, type ShapeGroup } from "./shapes.generated";

// The Charms page catalog: 200+ shapes (Lucide icons as SVG) plus every
// letter (Latin and Arabic) and digit as a charm of its own.

export type { IconShape, ShapeGroup };

export type GlyphShape = {
  slug: string;
  group: "letters" | "arabic" | "numbers";
  name: { en: string; ar: string };
  glyph: string;
};
export type CharmShape = IconShape | GlyphShape;
export type CharmGroup = ShapeGroup | GlyphShape["group"];

export const isGlyph = (s: CharmShape): s is GlyphShape => "glyph" in s;

const latin = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const arabic = [..."ابتثجحخدذرزسشصضطظعغفقكلمنهوي"];
const digits = Array.from({ length: 10 }, (_, i) => String(i));

const glyphs: GlyphShape[] = [
  ...latin.map((g) => ({ slug: `letter-${g.toLowerCase()}`, group: "letters" as const, name: { en: `Letter ${g}`, ar: `حرف ${g}` }, glyph: g })),
  ...arabic.map((g, i) => ({ slug: `arabic-${i + 1}`, group: "arabic" as const, name: { en: `Arabic letter ${g}`, ar: `حرف ${g}` }, glyph: g })),
  ...digits.map((g) => ({ slug: `number-${g}`, group: "numbers" as const, name: { en: `Number ${g}`, ar: `رقم ${g}` }, glyph: g })),
];

/** Order on the page: love and sky first, then the letters. */
export const allShapes: CharmShape[] = [...iconShapes, ...glyphs];

export const groupOrder: CharmGroup[] = ["love", "sky", "nature", "animals", "symbols", "fun", "letters", "arabic", "numbers"];

export const MAX_CHARMS = 12;
export const LETTERS_MAX = 10;

const bySlug = new Map(allShapes.map((s) => [s.slug, s]));
export const findShape = (slug: string) => bySlug.get(slug);
