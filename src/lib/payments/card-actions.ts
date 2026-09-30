"use server";

import { cookies, headers } from "next/headers";
import { ORDERS_COOKIE } from "@/lib/checkout/cookies";
import { rateLimit } from "@/lib/security/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";
import { cardConfigured, createCardSession, type CardSession } from "./card";

// Pay an order placed from this browser by Visa / Mastercard. Behind
// site_settings.card_online_enabled AND the gateway keys.

export type CardStart = ({ ok: true } & CardSession) | { ok: false; error: "not_available" | "rate_limited" | "failed" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function startCardPayment(input: { orderNumber: unknown; locale: unknown }): Promise<CardStart> {
  if (!isSupabaseConfigured() || !cardConfigured()) return { ok: false, error: "not_available" };
  const db = createAdminClient();
  if (!db) return { ok: false, error: "not_available" };
  const { data: s } = await db.from("site_settings").select("card_online_enabled").eq("id", 1).maybeSingle();
  if (!s?.card_online_enabled) return { ok: false, error: "not_available" };

  const number = typeof input.orderNumber === "number" && Number.isInteger(input.orderNumber) ? input.orderNumber : 0;
  const locale = input.locale === "ar" ? "ar" : "en";
  if (!(await rateLimit("payment"))) return { ok: false, error: "rate_limited" };

  const mine = ((await cookies()).get(ORDERS_COOKIE)?.value ?? "").split(".").filter((id) => UUID.test(id));
  const { data: order } = await db
    .from("orders")
    .select("id, number, status, payment_method, total_cents")
    .eq("number", number)
    .maybeSingle();
  if (!order || !mine.includes(order.id)) return { ok: false, error: "not_available" };
  if (order.payment_method !== "card" || order.status === "cancelled" || order.total_cents <= 0) {
    return { ok: false, error: "not_available" };
  }
  const { data: paid } = await db.from("payments").select("id").eq("order_id", order.id).eq("status", "paid").limit(1);
  if (paid && paid.length > 0) return { ok: false, error: "not_available" };

  const { data: payment, error } = await db
    .from("payments")
    .insert({ order_id: order.id, provider: "card", amount_cents: order.total_cents })
    .select("id")
    .single();
  if (error || !payment) return { ok: false, error: "failed" };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const session = await createCardSession({
    reference: payment.id,
    amountCents: order.total_cents,
    orderNumber: order.number,
    returnUrl: `${proto}://${host}/api/card/return?payment=${payment.id}&order=${order.number}&locale=${locale}`,
  });
  if (!session) {
    await db.from("payments").update({ status: "failed", error_code: "session" }).eq("id", payment.id);
    return { ok: false, error: "failed" };
  }
  await db.from("payments").update({ status: "otp_sent", provider_ref: session.sessionId }).eq("id", payment.id);
  return { ok: true, ...session };
}
