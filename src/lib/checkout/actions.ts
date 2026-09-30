"use server";

import { cookies } from "next/headers";
import { findProduct, getCatalog } from "@/lib/catalog";
import { allMaterials, isFontKey } from "@/lib/catalog/materials";
import { normalizePhone } from "@/lib/phone";
import type { Json } from "@/lib/supabase/database.types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";
import { ORDERS_COOKIE, ORDERS_MAX_AGE, REF_CODE, REF_COOKIE } from "./cookies";
import type {
  CartItemInput,
  CheckoutError,
  CheckoutInput,
  CheckoutResult,
  OrderStatus,
  QuoteLine,
  QuoteResult,
  ReturningCustomer,
} from "./types";

// Server functions for the cart and checkout. They are reachable by anyone
// with a POST, so every input is checked here and priced again in the
// database (quote_order / place_order); the browser never sends a price.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{1,80}$/;
const dollars = (cents: number) => cents / 100;

function admin() {
  return isSupabaseConfigured() ? createAdminClient() : null;
}

const str = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** Only the fields and values place_order understands; null if malformed. */
function cleanItems(raw: unknown): CartItemInput[] | null {
  if (!Array.isArray(raw) || raw.length > 30) return null;
  const items: CartItemInput[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const i = r as Record<string, unknown>;
    if (typeof i.product !== "string" || !SLUG.test(i.product)) return null;
    if (!allMaterials.includes(i.material as CartItemInput["material"])) return null;
    if (!Number.isInteger(i.qty) || (i.qty as number) < 1 || (i.qty as number) > 20) return null;
    items.push({
      product: i.product,
      material: i.material as CartItemInput["material"],
      qty: i.qty as number,
      text: typeof i.text === "string" ? i.text.trim().slice(0, 20) : undefined,
      font: isFontKey(i.font as string) ? (i.font as CartItemInput["font"]) : undefined,
      size: typeof i.size === "number" && Number.isFinite(i.size) ? i.size : undefined,
      connection: i.connection === "sides" || i.connection === "center" ? i.connection : undefined,
    });
  }
  return items;
}

type DbQuote = {
  lines: ({ error: string } | { unit_price_cents: number; line_total_cents: number })[];
  subtotal_cents: number;
  discount_cents: number;
  coupon: { code: string; error?: string; min_order_cents?: number } | null;
  delivery_fee_cents: number;
  is_first_order: boolean | null;
  total_cents: number;
  free_shipping_threshold_cents: number;
  first_order_free_delivery: boolean;
};

/** Prices the bag for the cart and checkout summary (nothing is saved). */
export async function quoteCart(input: {
  items: unknown;
  coupon?: string;
  phone?: string;
  area?: string;
}): Promise<QuoteResult> {
  const db = admin();
  if (!db) return { ok: false, error: "unavailable" };
  const items = cleanItems(input.items);
  if (!items) return { ok: false, error: "invalid" };

  const { data, error } = await db.rpc("quote_order", {
    p_items: items as unknown as Json,
    p_coupon_code: str(input.coupon, 30) || undefined,
    p_phone: str(input.phone, 30) || undefined,
    p_area: str(input.area, 40) || undefined,
  });
  if (error || !data) return { ok: false, error: "unavailable" };

  const q = data as unknown as DbQuote;
  return {
    ok: true,
    quote: {
      lines: q.lines.map(
        (l): QuoteLine =>
          "error" in l
            ? { error: l.error as Extract<QuoteLine, { error: string }>["error"] }
            : { unitPrice: dollars(l.unit_price_cents), lineTotal: dollars(l.line_total_cents) },
      ),
      subtotal: dollars(q.subtotal_cents),
      discount: dollars(q.discount_cents),
      coupon: q.coupon
        ? {
            code: q.coupon.code,
            error: q.coupon.error as "coupon_invalid" | "coupon_min_order" | undefined,
            minOrder: q.coupon.min_order_cents ? dollars(q.coupon.min_order_cents) : undefined,
          }
        : null,
      delivery: dollars(q.delivery_fee_cents),
      isFirstOrder: q.is_first_order,
      total: dollars(q.total_cents),
      freeShippingOver: dollars(q.free_shipping_threshold_cents),
      firstOrderFreeDelivery: q.first_order_free_delivery,
    },
  };
}

/**
 * Returning customer, found by phone: her saved name, area and address to
 * prefill the checkout. Null when the phone is new (or invalid).
 */
export async function findCustomer(phone: string): Promise<ReturningCustomer | null> {
  const db = admin();
  const e164 = normalizePhone(str(phone, 30));
  if (!db || !e164) return null;
  const { data } = await db
    .from("customers")
    .select("name, address, areas (slug)")
    .eq("phone", e164)
    .maybeSingle();
  if (!data) return null;
  return { name: data.name, area: data.areas?.slug ?? null, address: data.address };
}

const dbErrors: Partial<Record<string, CheckoutError>> = {
  name_required: "name_required",
  phone_invalid: "phone_invalid",
  area_invalid: "area_invalid",
  text_too_long: "text_too_long",
  coupon_invalid: "coupon_invalid",
  coupon_min_order: "coupon_min_order",
  cart_invalid: "cart_invalid",
};

/** Creates the order (place_order) and remembers it in this browser. */
export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const db = admin();
  if (!db) return { ok: false, error: "unavailable" };

  const name = str(input.name, 101);
  if (!name || name.length > 100) return { ok: false, error: "name_required" };
  if (!normalizePhone(str(input.phone, 30))) return { ok: false, error: "phone_invalid" };
  const area = str(input.area, 40);
  if (!SLUG.test(area)) return { ok: false, error: "area_invalid" };
  const address = str(input.address, 401);
  if (!address) return { ok: false, error: "address_required" };
  const building = str(input.building, 101);
  const notes = str(input.notes, 1001);
  if (address.length > 400 || building.length > 100 || notes.length > 1000) {
    return { ok: false, error: "text_too_long" };
  }
  const items = cleanItems(input.items);
  if (!items || items.length === 0) return { ok: false, error: "cart_invalid" };
  const payment = input.payment === "whish" ? "whish" : "cod";
  const helper = UUID.test(str(input.helper, 40)) ? str(input.helper, 40) : undefined;
  const requestId = UUID.test(str(input.requestId, 40)) ? str(input.requestId, 40) : crypto.randomUUID();

  const jar = await cookies();
  const ref = jar.get(REF_COOKIE)?.value;

  const { data, error } = await db.rpc("place_order", {
    p_customer: { name, phone: str(input.phone, 30), area, address: building ? `${address}\n${building}` : address },
    p_items: items as unknown as Json,
    p_payment_method: payment,
    p_coupon_code: str(input.coupon, 30) || undefined,
    p_helper_staff_id: helper,
    p_ref_code: ref && REF_CODE.test(ref) ? ref : undefined,
    p_notes: notes || undefined,
    p_request_id: requestId,
  });
  if (error || !data) {
    const code = error?.message.split(":")[0].trim() ?? "";
    // A product, metal, size or font that changed since it was added.
    const lineError = /_unavailable$|^text_invalid$|^qty_invalid$/.test(code);
    return { ok: false, error: dbErrors[code] ?? (lineError ? "cart_changed" : "failed") };
  }

  const order = data as { order_id: string; number: number };
  const placed = (jar.get(ORDERS_COOKIE)?.value ?? "").split(".").filter((id) => UUID.test(id));
  jar.set(ORDERS_COOKIE, [...placed.filter((id) => id !== order.order_id), order.order_id].slice(-10).join("."), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ORDERS_MAX_AGE,
  });
  return { ok: true, number: order.number };
}

export type TrackState =
  | { status: "idle" }
  | { status: "not_found"; number: string; phone: string }
  | {
      status: "found";
      number: number;
      orderStatus: OrderStatus;
      placedAt: string;
      total: number;
      items: { name: string; text: string | null; qty: number }[];
    };

/** "Track my order": order number + the phone it was placed with. No login. */
export async function trackOrder(_prev: TrackState, form: FormData): Promise<TrackState> {
  const number = str(form.get("number"), 12).replace(/\D/g, "");
  const locale = form.get("locale") === "ar" ? "ar" : "en";
  const phone = str(form.get("phone"), 30);
  const notFound = { status: "not_found" as const, number, phone };
  const db = admin();
  const e164 = normalizePhone(phone);
  if (!db || !number || !e164) return notFound;

  const { data } = await db
    .from("orders")
    .select("number, status, created_at, total_cents, order_items (product_slug, product_name, custom_text, qty)")
    .eq("number", Number(number))
    .eq("phone", e164)
    .maybeSingle();
  if (!data) return notFound;
  const catalog = await getCatalog();
  return {
    status: "found",
    number: data.number,
    orderStatus: data.status,
    placedAt: data.created_at,
    total: dollars(data.total_cents),
    items: data.order_items.map((i) => ({
      name: findProduct(catalog, i.product_slug)?.name[locale] ?? i.product_name,
      text: i.custom_text,
      qty: i.qty,
    })),
  };
}
