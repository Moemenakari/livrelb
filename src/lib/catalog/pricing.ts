import type { MaterialKey } from "./types";

// Suggested price of each metal relative to the gold price. ONLY used to
// pre-fill the empty price fields in the admin; the owner or staff can change
// every price. null = no suggestion, typed by hand. Prices always come from
// product_materials, never from these factors.
export const suggestedPriceFactor: Record<MaterialKey, number | null> = {
  gold: 1,
  silver: 1,
  doubleGold: 3,
  doubleSilver: null,
  steel: null,
};
