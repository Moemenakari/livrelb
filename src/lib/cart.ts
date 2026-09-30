"use client";

import { useSyncExternalStore } from "react";
import type { FontKey, MaterialKey, ChainConnection } from "@/lib/catalog/types";
import { createLocalStore } from "./local-store";

// Minimal bag so "Add to cart" works in the storefront phase. Checkout,
// phone accounts and orders come in Phase 4 (brief §10), which will read
// these items.

export type CartItem = {
  id: string;
  slug: string;
  material: MaterialKey;
  text?: string;
  font?: FontKey;
  size?: number;
  connection?: ChainConnection;
  giftBox: boolean;
  unitPrice: number;
  qty: number;
};

const store = createLocalStore<CartItem[]>("livre:cart", []);

export function addToCart(item: Omit<CartItem, "id" | "qty">) {
  const items = store.read();
  const same = items.find(
    (i) =>
      i.slug === item.slug &&
      i.material === item.material &&
      i.text === item.text &&
      i.font === item.font &&
      i.size === item.size &&
      i.connection === item.connection &&
      i.giftBox === item.giftBox,
  );
  store.write(
    same
      ? items.map((i) => (i === same ? { ...i, qty: i.qty + 1 } : i))
      : [...items, { ...item, id: crypto.randomUUID(), qty: 1 }],
  );
}

export function useCartCount(): number {
  const items = useSyncExternalStore(store.subscribe, store.read, store.serverSnapshot);
  return items.reduce((sum, i) => sum + i.qty, 0);
}
