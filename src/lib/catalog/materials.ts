import type { FontInfo, FontKey, FontScript, Material, MaterialKey } from "./types";

// materials table (brief §7). Prices are per product (MaterialOffer):
// Silver, Gold and Rose Gold cost the base price, Double Gold Stainless
// Steel three times it.
export const materials: Record<MaterialKey, Material> = {
  silver: {
    key: "silver",
    name: { en: "Silver", ar: "فضة" },
    tone: "silver",
    swatch: "#c9ccd1",
  },
  gold: {
    key: "gold",
    name: { en: "Gold", ar: "ذهب" },
    tone: "gold",
    swatch: "#d9b76e",
  },
  rose: {
    key: "rose",
    name: { en: "Rose Gold", ar: "ذهب وردي" },
    tone: "rose",
    swatch: "#e2a98f",
  },
  doubleGold: {
    key: "doubleGold",
    name: { en: "Double Gold Stainless Steel", ar: "ستانلس ستيل بطلاء ذهب مزدوج" },
    // Previews in the gold metal color.
    tone: "gold",
    swatch: "#c9a04f",
  },
};

export const allMaterials: MaterialKey[] = ["silver", "gold", "rose", "doubleGold"];

// fonts table: our own names, after Lebanese places (brief §7). The font
// files behind each name live in src/components/preview/script-fonts.ts.
export const fonts: Record<FontKey, FontInfo> = {
  beirut: { name: { en: "Beirut", ar: "بيروت" }, script: "latin" },
  byblos: { name: { en: "Byblos", ar: "جبيل" }, script: "latin" },
  batroun: { name: { en: "Batroun", ar: "البترون" }, script: "latin" },
  tyre: { name: { en: "Tyre", ar: "صور" }, script: "latin" },
  saida: { name: { en: "Saida", ar: "صيدا" }, script: "latin" },
  jounieh: { name: { en: "Jounieh", ar: "جونية" }, script: "latin" },
  zahle: { name: { en: "Zahle", ar: "زحلة" }, script: "latin" },
  ehden: { name: { en: "Ehden", ar: "إهدن" }, script: "latin" },
  faraya: { name: { en: "Faraya", ar: "فاريا" }, script: "latin" },
  bcharre: { name: { en: "Bcharre", ar: "بشري" }, script: "latin" },
  baalbek: { name: { en: "Baalbek", ar: "بعلبك" }, script: "latin" },
  anjar: { name: { en: "Anjar", ar: "عنجر" }, script: "latin" },
  tripoli: { name: { en: "Tripoli", ar: "طرابلس" }, script: "arabic" },
  harissa: { name: { en: "Harissa", ar: "حريصا" }, script: "arabic" },
  "deir-el-qamar": { name: { en: "Deir el Qamar", ar: "دير القمر" }, script: "arabic" },
};

/** All 15 fonts in display order. */
export const allFonts = Object.keys(fonts) as FontKey[];

export const isFontKey = (k: string | undefined): k is FontKey => Boolean(k && k in fonts);

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

export function isArabic(text: string): boolean {
  return ARABIC.test(text);
}

export function textScript(text: string): FontScript {
  return isArabic(text) ? "arabic" : "latin";
}

/**
 * The font to draw a text in when none was picked: the product's first
 * (default) font written in the text's script, else its default font.
 */
export function defaultFontFor(allowed: FontKey[], text: string): FontKey | undefined {
  const script = textScript(text);
  return allowed.find((f) => fonts[f].script === script) ?? allowed[0];
}
