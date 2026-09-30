"use server";

import { cookies } from "next/headers";
import { ORDERS_COOKIE } from "@/lib/checkout/cookies";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/security/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";
import { whish } from "./whish";

// Whish online payment for an order placed from this browser (Phase 4 A5).
// Behind site_settings.whish_online_enabled AND the Whish API keys: while
// either is missing every call answers "not_available" and Whish stays
// manual (we send our Whish details after confirming the order).

export type WhishError =
  | "not_available"
  | "wallet_invalid"
  | "otp_invalid"
  | "otp_expired"
  | "rate_limited"
  | "failed";

export type WhishStart = { ok: true; paymentId: string } | { ok: false; error: WhishError };
export type WhishConfirm = { ok: true } | { ok: false; error: WhishError };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_OTP_ATTEMPTS = 5;

async function enabled() {
  if (!isSupabaseConfigured() || !whish.isConfigured()) return null;
  const db = createAdminClient();
  if (!db) return null;
  const { data } = await db.from("site_settings").select("whish_online_enabled").eq("id", 1).maybeSingle();
  return data?.whish_online_enabled ? db : null;
}

/** Order ids this browser placed (httpOnly cookie set by placeOrder). */
async function myOrders(): Promise<string[]> {
  return ((await cookies()).get(ORDERS_COOKIE)?.value ?? "").split(".").filter((id) => UUID.test(id));
}

/** Step 1: the customer's Whish phone; Whish sends her an OTP. */
export async function startWhishPayment(input: { orderNumber: unknown; wallet: unknown }): Promise<WhishStart> {
  const db = await enabled();
  if (!db) return { ok: false, error: "not_available" };
  const number = typeof input.orderNumber === "number" && Number.isInteger(input.orderNumber) ? input.orderNumber : 0;
  const wallet = typeof input.wallet === "string" ? normalizePhone(input.wallet.slice(0, 30)) : null;
  if (!wallet) return { ok: false, error: "wallet_invalid" };
  if (!(await rateLimit("payment", wallet))) return { ok: false, error: "rate_limited" };

  const { data: order } = await db
    .from("orders")
    .select("id, number, status, payment_method, total_cents")
    .eq("number", number)
    .maybeSingle();
  if (!order || !(await myOrders()).includes(order.id)) return { ok: false, error: "not_available" };
  if (order.payment_method !== "whish" || order.status === "cancelled" || order.total_cents <= 0) {
    return { ok: false, error: "not_available" };
  }
  const { data: paid } = await db.from("payments").select("id").eq("order_id", order.id).eq("status", "paid").limit(1);
  if (paid && paid.length > 0) return { ok: false, error: "not_available" };

  const { data: payment, error } = await db
    .from("payments")
    .insert({
      order_id: order.id,
      provider: "whish",
      amount_cents: order.total_cents,
      wallet_last4: wallet.slice(-4),
    })
    .select("id")
    .single();
  if (error || !payment) return { ok: false, error: "failed" };

  const started = await whish.start({
    reference: payment.id,
    amountCents: order.total_cents,
    currency: "USD",
    walletPhone: wallet,
    orderNumber: order.number,
  });
  if (!started.ok) {
    await db.from("payments").update({ status: "failed", error_code: started.error }).eq("id", payment.id);
    return {
      ok: false,
      error: started.error === "wallet_invalid" ? "wallet_invalid" : started.error === "not_configured" ? "not_available" : "failed",
    };
  }
  await db.from("payments").update({ status: "otp_sent", provider_ref: started.providerRef }).eq("id", payment.id);
  return { ok: true, paymentId: payment.id };
}

/** Step 2: the OTP she received from Whish. */
export async function confirmWhishPayment(input: { paymentId: unknown; otp: unknown }): Promise<WhishConfirm> {
  const db = await enabled();
  if (!db) return { ok: false, error: "not_available" };
  const paymentId = typeof input.paymentId === "string" && UUID.test(input.paymentId) ? input.paymentId : null;
  const otp = typeof input.otp === "string" ? input.otp.replace(/\s/g, "") : "";
  if (!paymentId || !/^\d{4,8}$/.test(otp)) return { ok: false, error: "otp_invalid" };
  if (!(await rateLimit("payment"))) return { ok: false, error: "rate_limited" };

  const { data: payment } = await db
    .from("payments")
    .select("id, order_id, status, provider_ref, otp_attempts")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || !(await myOrders()).includes(payment.order_id)) return { ok: false, error: "not_available" };
  if (payment.status === "paid") return { ok: true };
  if (payment.status !== "otp_sent" || !payment.provider_ref) return { ok: false, error: "otp_expired" };
  if (payment.otp_attempts >= MAX_OTP_ATTEMPTS) return { ok: false, error: "otp_expired" };

  await db.from("payments").update({ otp_attempts: payment.otp_attempts + 1 }).eq("id", payment.id);
  const result = await whish.confirm(payment.provider_ref, otp);
  if (!result.ok) {
    if (result.error === "otp_expired") {
      await db.from("payments").update({ status: "failed", error_code: "otp_expired" }).eq("id", payment.id);
    }
    return {
      ok: false,
      error: result.error === "not_configured" ? "not_available" : result.error === "provider_error" ? "failed" : result.error,
    };
  }
  await db.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", payment.id);
  return { ok: true };
}
