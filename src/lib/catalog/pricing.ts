import type { MaterialKey } from "./types";

// Suggested price of each metal relative to the gold price. ONLY used to
// pre-fill the empty price fields when a product is created in the admin
// (Phase 4); the owner or staff can change every price. Prices always come
// from product_materials, never from these factors.
export const suggestedPriceFactor: Record<MaterialKey, number> = {
  silver: 1,
  gold: 1,
  rose: 1,
  doubleGold: 3,
};
