import type { FontInfo, FontKey, FontScript, Material, MaterialKey } from "./types";

// materials table (brief §7): all stainless steel. Prices are per product
// (MaterialOffer), typed in the admin for every material.
export const materials: Record<MaterialKey, Material> = {
  gold: {
    key: "gold",
    name: { en: "Gold Stainless Steel", ar: "ستانلس ستيل ذهبي" },
    tone: "gold",
    swatch: "#d9b76e",
  },
  silver: {
    key: "silver",
    name: { en: "Silver Stainless Steel", ar: "ستانلس ستيل فضي" },
    tone: "silver",
    swatch: "#c9ccd1",
  },
  doubleGold: {
    key: "doubleGold",
    name: { en: "Double Gold Stainless Steel", ar: "ستانلس ستيل بطلاء ذهب مزدوج" },
    tone: "gold",
    swatch: "#c9a04f",
  },
  doubleSilver: {
    key: "doubleSilver",
    name: { en: "Double Silver Stainless Steel", ar: "ستانلس ستيل بطلاء فضة مزدوج" },
    tone: "silver",
    swatch: "#b4b9c0",
  },
  steel: {
    key: "steel",
    name: { en: "Stainless Steel", ar: "ستانلس ستيل" },
    // Plain steel previews in the silver metal color.
    tone: "silver",
    swatch: "#9ea3a8",
  },
};

export const allMaterials: MaterialKey[] = ["gold", "silver", "doubleGold", "doubleSilver", "steel"];

// fonts table: our own names, after Lebanese places (brief §7), each with
// its look in plain words so customers see which ones are slanted. The font
// files behind each name live in src/components/preview/script-fonts.ts.
export const fonts: Record<FontKey, FontInfo> = {
  beirut: { name: { en: "Beirut", ar: "بيروت" }, style: { en: "Italic", ar: "مايل" }, script: "latin" },
  byblos: { name: { en: "Byblos", ar: "جبيل" }, style: { en: "Italic", ar: "مايل" }, script: "latin" },
  batroun: { name: { en: "Batroun", ar: "البترون" }, style: { en: "Italic", ar: "مايل" }, script: "latin" },
  tyre: { name: { en: "Tyre", ar: "صور" }, style: { en: "Italic", ar: "مايل" }, script: "latin" },
  saida: { name: { en: "Saida", ar: "صيدا" }, style: { en: "Italic", ar: "مايل" }, script: "latin" },
  jounieh: { name: { en: "Jounieh", ar: "جونية" }, style: { en: "Italic", ar: "مايل" }, script: "latin" },
  zahle: { name: { en: "Zahle", ar: "زحلة" }, style: { en: "Thin italic", ar: "مايل رفيع" }, script: "latin" },
  ehden: { name: { en: "Ehden", ar: "إهدن" }, style: { en: "Italic", ar: "مايل" }, script: "latin" },
  faraya: { name: { en: "Faraya", ar: "فاريا" }, style: { en: "Bold italic", ar: "مايل عريض" }, script: "latin" },
  bcharre: { name: { en: "Bcharre", ar: "بشري" }, style: { en: "Italic", ar: "مايل" }, script: "latin" },
  baalbek: { name: { en: "Baalbek", ar: "بعلبك" }, style: { en: "Capitals", ar: "أحرف كبيرة" }, script: "latin" },
  anjar: { name: { en: "Anjar", ar: "عنجر" }, style: { en: "Upright", ar: "عادي" }, script: "latin" },
  tripoli: { name: { en: "Tripoli", ar: "طرابلس" }, style: { en: "Ruqaa", ar: "رقعة" }, script: "arabic" },
  harissa: { name: { en: "Harissa", ar: "حريصا" }, style: { en: "Kufi", ar: "كوفي" }, script: "arabic" },
  "deir-el-qamar": { name: { en: "Deir el Qamar", ar: "دير القمر" }, style: { en: "Naskh", ar: "نسخ" }, script: "arabic" },
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
