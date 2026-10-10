"use server";

import { cookies } from "next/headers";
import { findProduct, getCatalog } from "@/lib/catalog";
import { allMaterials, isFontKey } from "@/lib/catalog/materials";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/security/rate-limit";
import type { Json } from "@/lib/supabase/database.types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingColumn } from "@/lib/supabase/compat";
import { createAdminClient } from "@/lib/supabase/public";
import { ORDERS_COOKIE, ORDERS_MAX_AGE, REF_CODE, REF_COOKIE } from "./cookies";
import { forgetCustomer, rememberCustomer, verifiedCustomer } from "./customer";
import { orderPoints } from "./points";
import { orderTracking, type Tracking } from "./tracking";
import type {
  CartItemInput,
  CheckoutError,
  CheckoutInput,
  CheckoutResult,
  OrderStatus,
  QuoteLine,
  QuoteResult,
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

/** Charm keys of a charm design: shape slugs and stock charms ("stock:<uuid>"), at most 30. */
function cleanCharms(raw: unknown[]): string[] {
  return raw
    .filter((k): k is string => typeof k === "string" && /^(stock:[0-9a-f-]{36}|[a-z0-9-]{1,40})$/i.test(k))
    .map((k) => k.toLowerCase())
    .slice(0, 30);
}

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
      // A charm design: shape slugs and "stock:<id>"; the database checks and prices each one.
      charms: Array.isArray(i.charms) ? cleanCharms(i.charms) : undefined,
    });
  }
  return items;
}

type DbQuote = {
  lines: ({ error: string } | { unit_price_cents: number; line_total_cents: number })[];
  subtotal_cents: number;
  discount_cents: number;
  coupon: { code: string; error?: string; min_order_cents?: number } | null;
  points_balance: number;
  points_value_cents: number;
  points_used: number;
  points_discount_cents: number;
  points_to_earn: number;
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
  usePoints?: boolean;
}): Promise<QuoteResult> {
  const db = admin();
  if (!db) return { ok: false, error: "unavailable" };
  const items = cleanItems(input.items);
  if (!items) return { ok: false, error: "invalid" };

  // Points only for the customer the server verified, never from the browser.
  const { customerId } = await verifiedCustomer();
  const { data, error } = await db.rpc("quote_order", {
    p_items: items as unknown as Json,
    p_coupon_code: str(input.coupon, 30) || undefined,
    p_phone: str(input.phone, 30) || undefined,
    p_area: str(input.area, 40) || undefined,
    p_customer_id: customerId ?? undefined,
    p_use_points: input.usePoints === true,
  });
  if (error || !data) return { ok: false, error: "unavailable" };

  const q = data as unknown as DbQuote;
  // Old prices come from the catalog (same database, cached): only lines the
  // database priced count.
  const catalog = await getCatalog();
  const saleSavings = items.reduce((sum, item, i) => {
    if ("error" in q.lines[i]) return sum;
    const offer = findProduct(catalog, item.product)?.offers.find((o) => o.material === item.material);
    const save = offer?.compareAtPrice ? Math.max(0, offer.compareAtPrice - offer.price) : 0;
    return sum + save * item.qty;
  }, 0);
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
      saleSavings: Math.round(saleSavings * 100) / 100,
      discount: dollars(q.discount_cents),
      coupon: q.coupon
        ? {
            code: q.coupon.code,
            error: q.coupon.error as "coupon_invalid" | "coupon_min_order" | undefined,
            minOrder: q.coupon.min_order_cents ? dollars(q.coupon.min_order_cents) : undefined,
          }
        : null,
      points: {
        balance: q.points_balance,
        value: dollars(q.points_value_cents),
        used: q.points_used,
        discount: dollars(q.points_discount_cents),
        toEarn: q.points_to_earn,
      },
      delivery: dollars(q.delivery_fee_cents),
      isFirstOrder: q.is_first_order,
      total: dollars(q.total_cents),
      freeShippingOver: dollars(q.free_shipping_threshold_cents),
      firstOrderFreeDelivery: q.first_order_free_delivery,
    },
  };
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

  // Honeypot filled: a bot. Answer like a failure, save nothing.
  if (str(input.website, 200)) return { ok: false, error: "failed" };

  const name = str(input.name, 101);
  if (!name || name.length > 100) return { ok: false, error: "name_required" };
  const e164 = normalizePhone(str(input.phone, 30));
  if (!e164) return { ok: false, error: "phone_invalid" };
  if (!(await rateLimit("checkout", e164))) return { ok: false, error: "rate_limited" };
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
  const helper = UUID.test(str(input.helper, 40)) ? str(input.helper, 40) : undefined;
  const requestId = UUID.test(str(input.requestId, 40)) ? str(input.requestId, 40) : crypto.randomUUID();

  const jar = await cookies();
  const ref = jar.get(REF_COOKIE)?.value;
  const { customerId, authUserId, authEmail } = await verifiedCustomer();
  // Checkout needs an account (Google or email) unless the owner switched that off in Settings.
  if (!authUserId) {
    const { data: rule } = await db.from("site_settings").select("checkout_requires_login").eq("id", 1).maybeSingle();
    if (rule?.checkout_requires_login ?? true) return { ok: false, error: "login_required" };
  }

  // Her account (made when she signed in) has no phone yet: she gives it here, once.
  // A number that already belongs to another customer is never taken over.
  if (customerId) {
    const { data: mine } = await db.from("customers").select("phone").eq("id", customerId).maybeSingle();
    if (mine && !mine.phone) {
      const { data: owner } = await db.from("customers").select("id").eq("phone", e164).maybeSingle();
      if (owner && owner.id !== customerId) return { ok: false, error: "phone_taken" };
      const { error: saveError } = await db.from("customers").update({ phone: e164 }).eq("id", customerId);
      if (saveError) return { ok: false, error: "phone_taken" };
    }
  }

  const { data, error } = await db.rpc("place_order", {
    p_customer: { name, phone: str(input.phone, 30), area, address: building ? `${address}\n${building}` : address },
    p_items: items as unknown as Json,
    // Nothing is paid on the site: the team confirms every order on WhatsApp.
    p_payment_method: "cod",
    p_coupon_code: str(input.coupon, 30) || undefined,
    p_helper_staff_id: helper,
    p_ref_code: ref && REF_CODE.test(ref) ? ref : undefined,
    p_notes: notes || undefined,
    p_request_id: requestId,
    p_customer_id: customerId ?? undefined,
    p_use_points: input.usePoints === true,
    p_auth_user_id: authUserId ?? undefined,
  });
  if (error || !data) {
    const code = error?.message.split(":")[0].trim() ?? "";
    // A product, metal, size or font that changed since it was added.
    const lineError = /_unavailable$|^text_invalid$|^qty_invalid$|^charms_invalid$/.test(code);
    return { ok: false, error: dbErrors[code] ?? (lineError ? "cart_changed" : "failed") };
  }

  const order = data as { order_id: string; number: number; customer_id: string; trusted: boolean };
  // We keep her email (Google or email login), to know the real person.
  if (authUserId && authEmail && order.trusted) await db.from("customers").update({ email: authEmail }).eq("id", order.customer_id);
  // Next time this browser's checkout is prefilled (only when the database
  // trusts it with this customer: see place_order).
  if (order.trusted) await rememberCustomer(order.customer_id);
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

/** "Not you? Clear": forget this browser (and sign out of Google). */
export async function clearSavedCustomer(): Promise<void> {
  await forgetCustomer();
}

export type TrackState =
  | { status: "idle" }
  | { status: "not_found"; number: string; phone: string }
  | { status: "rate_limited"; number: string; phone: string }
  | {
      status: "found";
      number: number;
      orderStatus: OrderStatus;
      placedAt: string;
      total: number;
      /** Points this order earned, or will earn once confirmed (0 = none). */
      points: { earned: number; toEarn: number };
      tracking: Tracking;
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
  if (!(await rateLimit("track", e164))) return { status: "rate_limited", number, phone };

  // Deleted orders can't be tracked (before the admin redesign database update there is no deleted_at).
  const lookup = (live: boolean) => {
    const q = db
      .from("orders")
      .select(
        `id, number, status, created_at, total_cents, subtotal_cents, discount_cents, points_discount_cents, carrier, tracking_number, area_id,
         order_items (product_slug, product_name, custom_text, qty)`,
      )
      .eq("number", Number(number))
      .eq("phone", e164);
    return (live ? q.is("deleted_at", null) : q).maybeSingle();
  };
  let found = await lookup(true);
  if (isMissingColumn(found.error)) found = await lookup(false);
  const data = found.data;
  if (!data) return notFound;
  const catalog = await getCatalog();
  const [points, tracking] = await Promise.all([
    orderPoints(db, data),
    orderTracking(db, data, locale, catalog.settings),
  ]);
  return {
    status: "found",
    number: data.number,
    orderStatus: data.status,
    placedAt: data.created_at,
    total: dollars(data.total_cents),
    points,
    tracking,
    items: data.order_items.map((i) => ({
      name: findProduct(catalog, i.product_slug)?.name[locale] ?? i.product_name,
      text: i.custom_text,
      qty: i.qty,
    })),
  };
}

export type PointsState =
  | { status: "idle" }
  | { status: "not_found" | "rate_limited"; number: string; phone: string }
  | { status: "found"; points: number; value: number };

/**
 * "My points" on /track: an order number + the phone it was placed with
 * (same proof as tracking) shows that customer's LIVRE Points balance.
 */
export async function lookupPoints(_prev: PointsState, form: FormData): Promise<PointsState> {
  const number = str(form.get("number"), 12).replace(/\D/g, "");
  const phone = str(form.get("phone"), 30);
  const notFound = { status: "not_found" as const, number, phone };
  const db = admin();
  const e164 = normalizePhone(phone);
  if (!db || !number || !e164) return notFound;
  if (!(await rateLimit("points", e164))) return { status: "rate_limited", number, phone };

  const lookup = (live: boolean) => {
    const q = db.from("orders").select("customer_id").eq("number", Number(number)).eq("phone", e164);
    return (live ? q.is("deleted_at", null) : q).maybeSingle();
  };
  let found = await lookup(true);
  if (isMissingColumn(found.error)) found = await lookup(false);
  const order = found.data;
  if (!order) return notFound;
  const [{ data: profile }, { data: s }] = await Promise.all([
    db.rpc("customer_profile", { p_customer_id: order.customer_id }),
    db.from("site_settings").select("points_redeem_points, points_redeem_cents").eq("id", 1).maybeSingle(),
  ]);
  const points = Math.max(0, (profile as { points?: number } | null)?.points ?? 0);
  const value = s ? Math.floor(points / s.points_redeem_points) * dollars(s.points_redeem_cents) : 0;
  return { status: "found", points, value };
}
