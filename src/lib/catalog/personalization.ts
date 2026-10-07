import type { Localized } from "./types";

// What a customer can write on a personalized piece. Name pieces offer all four
// kinds; letter pieces (initials) offer the last three. The order stores the text
// only (the name, the letter, the digits, or the zodiac symbol).

export type PersonalizationType = "name" | "letter" | "number" | "zodiac";

/** The most digits of a number (a birth day: 17). */
export const NUMBER_MAX = 2;

export const typesFor = (kind: "name" | "initial"): PersonalizationType[] =>
  kind === "name" ? ["name", "letter", "number", "zodiac"] : ["letter", "number", "zodiac"];

export const zodiacSigns: { symbol: string; name: Localized }[] = [
  { symbol: "♈", name: { en: "Aries", ar: "الحمل" } },
  { symbol: "♉", name: { en: "Taurus", ar: "الثور" } },
  { symbol: "♊", name: { en: "Gemini", ar: "الجوزاء" } },
  { symbol: "♋", name: { en: "Cancer", ar: "السرطان" } },
  { symbol: "♌", name: { en: "Leo", ar: "الأسد" } },
  { symbol: "♍", name: { en: "Virgo", ar: "العذراء" } },
  { symbol: "♎", name: { en: "Libra", ar: "الميزان" } },
  { symbol: "♏", name: { en: "Scorpio", ar: "العقرب" } },
  { symbol: "♐", name: { en: "Sagittarius", ar: "القوس" } },
  { symbol: "♑", name: { en: "Capricorn", ar: "الجدي" } },
  { symbol: "♒", name: { en: "Aquarius", ar: "الدلو" } },
  { symbol: "♓", name: { en: "Pisces", ar: "الحوت" } },
];

const symbols = new Set(zodiacSigns.map((z) => z.symbol));
export const isZodiac = (text: string) => symbols.has(text);

/** The kind a piece opens with, from its sample text: a sign, a number, a letter or a name. */
export function defaultTypeFor(kind: "name" | "initial", sample: string): PersonalizationType {
  if (isZodiac(sample)) return "zodiac";
  if (/^[0-9]{1,2}$/.test(sample)) return "number";
  return kind === "initial" ? "letter" : "name";
}

/** The kind of what is typed, to keep the choice when a link carries a text (?name=7). */
export function typeOfText(text: string, fallback: PersonalizationType): PersonalizationType {
  if (isZodiac(text)) return "zodiac";
  return fallback;
}
