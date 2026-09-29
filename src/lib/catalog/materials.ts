import type { FontKey, Localized, Material, MaterialKey } from "./types";

// materials table (brief §7). Price modifiers are SAMPLE values [CONFIRM].
export const materials: Record<MaterialKey, Material> = {
  silver: {
    key: "silver",
    name: { en: "Sterling Silver", ar: "فضة إسترلينية" },
    tone: "silver",
    swatch: "#c9ccd1",
    priceModifier: 0,
  },
  gold18: {
    key: "gold18",
    name: { en: "18K Gold Plating", ar: "طلاء ذهب عيار 18" },
    tone: "gold",
    swatch: "#d9b76e",
    priceModifier: 5,
  },
  rose: {
    key: "rose",
    name: { en: "Rose Gold Plating", ar: "طلاء ذهب وردي" },
    tone: "rose",
    swatch: "#e2a98f",
    priceModifier: 5,
  },
  gold14: {
    key: "gold14",
    name: { en: "14K Gold", ar: "ذهب عيار 14" },
    tone: "gold",
    swatch: "#c9a04f",
    priceModifier: 180,
  },
  whiteGold14: {
    key: "whiteGold14",
    name: { en: "14K White Gold", ar: "ذهب أبيض عيار 14" },
    tone: "silver",
    swatch: "#e4e2dc",
    priceModifier: 180,
  },
};

export const allMaterials: MaterialKey[] = [
  "silver",
  "gold18",
  "rose",
  "gold14",
  "whiteGold14",
];

// fonts table: our own names (brief §7). The font files behind each name
// live in src/components/preview/script-fonts.ts.
export const fontNames: Record<FontKey, Localized> = {
  beirut: { en: "Beirut", ar: "بيروت" },
  byblos: { en: "Byblos", ar: "جبيل" },
  batroun: { en: "Batroun", ar: "البترون" },
};
