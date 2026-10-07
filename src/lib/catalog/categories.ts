import { defaultNavSort } from "@/config/navigation";
import type { Category, Localized, StyleKey } from "./types";

// categories table (brief §7). Order = navbar order (restart brief).
export const categories: Category[] = [
  {
    slug: "name-necklaces",
    name: { en: "Name Necklaces", ar: "قلادات الأسماء" },
    description: {
      en: "Your name, their name, a word that means everything. Written in gold or silver stainless steel, made to order and checked by hand before it reaches you.",
      ar: "اسمكِ، اسم من تحبين، أو كلمة تعني لكِ الكثير. بالستانلس ستيل الذهبي أو الفضي، تُصنع حسب الطلب وتُفحص يدوياً قبل أن تصلكِ.",
    },
    parent: "necklaces",
    styles: ["cursive", "arabic", "bold", "dainty", "initial", "twoFonts"],
    art: { kind: "name", variant: "necklace" },
    artSample: "Maya",
  },
  {
    slug: "necklaces",
    name: { en: "Necklaces", ar: "قلادات" },
    description: {
      en: "Name necklaces, initials, cedars and coins: everyday pieces made to be layered and loved.",
      ar: "قلادات أسماء وأحرف وأرزات وليرات: قطع يومية تُلبس معاً وتدوم.",
    },
    art: { kind: "cedar" },
  },
  {
    slug: "bracelets",
    name: { en: "Bracelets", ar: "أساور" },
    description: {
      en: "Delicate name and coin bracelets, sized for your wrist.",
      ar: "أساور ناعمة بالأسماء والليرة، على مقاس معصمكِ.",
    },
    art: { kind: "name", variant: "bracelet" },
    artSample: "Rami",
  },
  {
    slug: "mens-jewelry",
    name: { en: "Men's Jewelry", ar: "مجوهرات رجالية" },
    description: {
      en: "Bolder chains, cedar and Lira pendants, and Arabic name pieces for him.",
      ar: "سلاسل أعرض، أرزة وليرة، وقطع بأسماء عربية له.",
    },
    art: { kind: "cedar" },
  },
  {
    slug: "rings",
    name: { en: "Rings", ar: "خواتم" },
    description: {
      en: "Initial signets and dainty stacking rings.",
      ar: "خواتم بالأحرف الأولى وخواتم ناعمة تُلبس معاً.",
    },
    art: { kind: "ring", engraving: "initial" },
  },
  {
    slug: "earrings",
    name: { en: "Earrings", ar: "أقراط" },
    description: {
      en: "Huggies, pearls and little Lira coins for every day.",
      ar: "حلقات صغيرة ولؤلؤ وليرات صغيرة لكل يوم.",
    },
    art: { kind: "hoops", pearl: true },
  },
  {
    slug: "lira-collection",
    name: { en: "Lira Collection", ar: "مجموعة الليرة" },
    description: {
      en: "Inspired by the Lebanese coins we grew up with: the 1975 1 Livre, the golden 250 and the silver 500. The cedar on one side, the value on the other. A piece of home to wear every day.",
      ar: "مستوحاة من الليرات المعدنية يلي كبرنا معها: ليرة 1975، والـ٢٥٠ الذهبية، والـ٥٠٠ الفضية. الأرزة على وجه والقيمة على الآخر. قطعة من الوطن تلبسينها كل يوم.",
    },
    art: { kind: "coin", variant: "necklace" },
  },
  {
    slug: "lira-500-250",
    name: { en: "500 & 250 Lira Collection", ar: "مجموعة ليرة ٥٠٠ و٢٥٠" },
    description: {
      en: "The other Lebanese coins we grew up with: the 500 and the golden 250, made into pieces you can wear every day.",
      ar: "الليرات اللبنانية الثانية يلي كبرنا معها: ٥٠٠ والـ٢٥٠ الذهبية، بقطع تلبسينها كل يوم.",
    },
    art: { kind: "coin", variant: "necklace", coin: 250 },
  },
  {
    slug: "gifts",
    name: { en: "Gifts", ar: "هدايا" },
    description: {
      en: "Personal gifts they'll wear every day. Every order comes in our special LIVRE gift box, free.",
      ar: "هدايا شخصية تُلبس كل يوم. كل طلبية تصل في علبة هدية خاصة من LIVRE، مجاناً.",
    },
    art: { kind: "name", variant: "necklace" },
    artSample: "Love",
  },
  {
    slug: "bestsellers",
    name: { en: "Bestsellers", ar: "الأكثر مبيعاً" },
    description: {
      en: "The pieces our customers order again and again.",
      ar: "القطع التي تطلبها زبوناتنا مرة بعد مرة.",
    },
    rule: "bestsellers",
    art: { kind: "name", variant: "necklace" },
    artSample: "Nour",
  },
  {
    slug: "new",
    name: { en: "New Arrivals", ar: "وصل حديثاً" },
    navName: { en: "New", ar: "جديد" },
    description: {
      en: "Just landed: our newest designs.",
      ar: "وصلت للتو: أحدث تصاميمنا.",
    },
    rule: "new",
    art: { kind: "hoops", pearl: false },
  },
];

// "Shop by style" tiles of the homepage, in order (the database has show_on_home / home_sort).
export const defaultHomeTiles = ["name-necklaces", "lira-collection", "lira-500-250", "bracelets", "rings", "earrings", "gifts", "mens-jewelry"];
for (const category of categories) {
  const position = defaultHomeTiles.indexOf(category.slug);
  if (position >= 0) Object.assign(category, { showOnHome: true, homeSort: position });
  category.navSort = defaultNavSort(category.slug);
}

export const styleNames: Record<StyleKey, Localized> = {
  cursive: { en: "Cursive", ar: "خط متصل" },
  arabic: { en: "Arabic", ar: "عربي" },
  bold: { en: "Bold", ar: "عريض" },
  dainty: { en: "Dainty", ar: "ناعم" },
  initial: { en: "Initials", ar: "أحرف" },
  twoFonts: { en: "Pick a font", ar: "اختاري الخط" },
};

// Sample name drawn on each style's round thumbnail.
export const styleSamples: Record<StyleKey, string> = {
  cursive: "Maya",
  arabic: "ليلى",
  bold: "Jana",
  dainty: "Rita",
  initial: "M",
  twoFonts: "Sarah",
};

export const styleKeys = Object.keys(styleNames) as StyleKey[];
