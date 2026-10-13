"use client";

import { useSyncExternalStore } from "react";
import type {
  ChainConnection,
  FontKey,
  Localized,
  MaterialKey,
  ProductArt,
  SizeOption,
} from "@/lib/catalog/types";
import type { CartItemInput } from "@/lib/checkout/types";
import { createLocalStore } from "./local-store";

// The bag, saved in the browser. It only holds what the customer chose plus
// what's needed to draw the line (name, art); prices shown from here are an
// estimate until the server quote arrives, and the order is always priced
// again on the server (place_order).

export type CartItem = {
  id: string;
  slug: string;
  /** Snapshot for drawing the line without loading the catalog. */
  name: Localized;
  art: ProductArt;
  sizeKind?: SizeOption["kind"];
  material: MaterialKey;
  /** Both languages of a color made in the admin, saved with the line (built-in metals are named from materials.ts). */
  materialName?: Localized;
  text?: string;
  font?: FontKey;
  size?: number;
  connection?: ChainConnection;
  /** A charm design: the charms on the chain, in order (shape slugs and "stock:<id>"). */
  charms?: string[];
  /** Names of those charms to show in the bag. */
  charmNames?: Localized[];
  /** Price when added (USD). Display only. */
  unitPrice: number;
  qty: number;
};

export const MAX_QTY = 20;
export const MAX_LINES = 30;

// v3: Rose Gold is gone (stainless steel metals only); older bags are dropped.
// v2: metals and fonts changed (no 14K, no gift box option).
const items = createLocalStore<CartItem[]>("livre:cart:v3", []);
const coupon = createLocalStore<string>("livre:coupon", "");
// The drawer is not saved: it opens when something is added.
let drawerOpen = false;
const drawerListeners = new Set<() => void>();

function setDrawer(open: boolean) {
  drawerOpen = open;
  drawerListeners.forEach((l) => l());
}

const sameDesign = (a: Omit<CartItem, "id" | "qty">, b: Omit<CartItem, "id" | "qty">) =>
  a.slug === b.slug &&
  a.material === b.material &&
  a.text === b.text &&
  a.font === b.font &&
  a.size === b.size &&
  a.connection === b.connection &&
  (a.charms ?? []).join(",") === (b.charms ?? []).join(",");

export function addToCart(item: Omit<CartItem, "id" | "qty">) {
  const list = items.read();
  const same = list.find((i) => sameDesign(i, item));
  if (same) {
    items.write(list.map((i) => (i === same ? { ...i, qty: Math.min(MAX_QTY, i.qty + 1) } : i)));
  } else if (list.length < MAX_LINES) {
    items.write([...list, { ...item, id: crypto.randomUUID(), qty: 1 }]);
  }
  setDrawer(true);
}

/** The bag as it is now (to carry it to another browser). Browser only. */
export const readBag = () => items.read();

/** Lines that came from another browser (already checked and priced by the server): added to the bag, never doubled. */
export function restoreToCart(lines: Omit<CartItem, "id">[]) {
  let list = items.read();
  for (const line of lines) {
    const same = list.find((i) => sameDesign(i, line));
    if (same) list = list.map((i) => (i === same ? { ...i, qty: Math.max(i.qty, Math.min(MAX_QTY, line.qty)) } : i));
    else if (list.length < MAX_LINES) list = [...list, { ...line, qty: Math.min(MAX_QTY, line.qty), id: crypto.randomUUID() }];
  }
  items.write(list);
}

export function setQty(id: string, qty: number) {
  items.write(
    items.read().map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : i)),
  );
}

export function removeFromCart(id: string) {
  items.write(items.read().filter((i) => i.id !== id));
}

export function clearCart() {
  items.write([]);
  coupon.write("");
}

export function setCoupon(code: string) {
  coupon.write(code.trim().toUpperCase());
}

export const closeCart = () => setDrawer(false);

export function useCart(): CartItem[] {
  return useSyncExternalStore(items.subscribe, items.read, items.serverSnapshot);
}

export function useCartCount(): number {
  return useCart().reduce((sum, i) => sum + i.qty, 0);
}

export function useCoupon(): string {
  return useSyncExternalStore(coupon.subscribe, coupon.read, coupon.serverSnapshot);
}

export function useCartDrawer(): boolean {
  return useSyncExternalStore(
    (l) => {
      drawerListeners.add(l);
      return () => drawerListeners.delete(l);
    },
    () => drawerOpen,
    () => false,
  );
}

/** What the server needs to price a line: never a price. */
export function toInput(item: CartItem): CartItemInput {
  return {
    product: item.slug,
    material: item.material,
    qty: item.qty,
    text: item.text,
    font: item.font,
    size: item.size,
    connection: item.connection,
    charms: item.charms,
  };
}
