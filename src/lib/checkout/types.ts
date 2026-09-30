import type { ChainConnection, FontKey, MaterialKey } from "@/lib/catalog/types";

// Shapes shared by the cart, the checkout form and the server functions in
// ./actions.ts. Money is in USD (the database keeps cents).

/** One cart line as sent to the server: choices only, never a price. */
export type CartItemInput = {
  product: string;
  material: MaterialKey;
  qty: number;
  text?: string;
  font?: FontKey;
  size?: number;
  connection?: ChainConnection;
};

/** Why a line or a coupon can't be used (from the database). */
export type LineError =
  | "product_unavailable"
  | "material_unavailable"
  | "size_unavailable"
  | "text_invalid"
  | "font_unavailable"
  | "connection_unavailable"
  | "qty_invalid";

export type QuoteLine = { error: LineError } | { error?: undefined; unitPrice: number; lineTotal: number };

export type Quote = {
  lines: QuoteLine[];
  subtotal: number;
  /** Sale savings: (old price - price) of every piece, so "Items" shows the price before discount. */
  saleSavings: number;
  discount: number;
  coupon: { code: string; error?: "coupon_invalid" | "coupon_min_order"; minOrder?: number } | null;
  /** LIVRE Points of the verified customer (0 for everyone else). */
  points: {
    balance: number;
    /** What the whole balance is worth (USD, whole redeem units). */
    value: number;
    /** Spent on this bag when "Use my points" is on. */
    used: number;
    discount: number;
    /** Earned once the order is confirmed. */
    toEarn: number;
  };
  delivery: number;
  /** null until a phone number is known. */
  isFirstOrder: boolean | null;
  total: number;
  freeShippingOver: number;
  firstOrderFreeDelivery: boolean;
};

export type QuoteResult = { ok: true; quote: Quote } | { ok: false; error: "unavailable" | "invalid" };

export type AreaOption = { slug: string; name: string };
export type HelperOption = { id: string; name: string };

export type CheckoutInput = {
  requestId: string;
  name: string;
  phone: string;
  area: string;
  address: string;
  building: string;
  notes: string;
  coupon: string;
  helper: string;
  payment: "cod" | "whish";
  usePoints: boolean;
  /** Honeypot field: empty for people. */
  website?: string;
  items: CartItemInput[];
};

/** Errors the checkout form shows next to a field or above the button. */
export type CheckoutError =
  | "name_required"
  | "phone_invalid"
  | "area_invalid"
  | "address_required"
  | "text_too_long"
  | "coupon_invalid"
  | "coupon_min_order"
  | "cart_invalid"
  | "cart_changed"
  | "unavailable"
  | "rate_limited"
  | "failed";

export type CheckoutResult = { ok: true; number: number } | { ok: false; error: CheckoutError };

/**
 * The customer this browser is verified as (remembered device or Google):
 * her saved details prefill the checkout. `google` alone: signed in with
 * Google but no order yet.
 */
export type SavedCustomer = {
  google: boolean;
  name?: string;
  phone?: string;
  area?: string;
  address?: string;
  building?: string;
  points?: number;
};

/** Order status steps shown on the confirmation and tracking pages. */
export const orderSteps = ["pending", "confirmed", "in_production", "shipped", "delivered"] as const;
export type OrderStatus = (typeof orderSteps)[number] | "cancelled";
