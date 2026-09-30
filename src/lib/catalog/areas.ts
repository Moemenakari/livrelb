import type { Localized } from "./types";

// SAMPLE delivery areas (areas table): seed data, and the checkout's list
// when Supabase is not configured.
export const sampleAreas: { slug: string; name: Localized }[] = [
  { slug: "beirut", name: { en: "Beirut", ar: "بيروت" } },
  { slug: "mount-lebanon", name: { en: "Mount Lebanon", ar: "جبل لبنان" } },
  { slug: "north", name: { en: "North", ar: "الشمال" } },
  { slug: "south", name: { en: "South", ar: "الجنوب" } },
  { slug: "bekaa", name: { en: "Bekaa", ar: "البقاع" } },
];
