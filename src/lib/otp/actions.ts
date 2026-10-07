"use server";

import { cookies } from "next/headers";
import { OTP_COOKIE, OTP_MAX_AGE } from "@/lib/checkout/cookies";
import { verifiedCustomer } from "@/lib/checkout/customer";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/security/rate-limit";
import { hmac, same } from "@/lib/security/sign";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";
import { sendWhatsappCode, whatsappOtpConfigured } from "./whatsapp";
import { grantPhoneVerification, rememberVerifiedPhone, signingKey } from "./verified";

// Phone verification on WhatsApp. The code is never stored: the cookie holds
// "<phone>.<expires>.<HMAC(phone.expires.code)>" signed with a server secret, so
// only someone who received the code can make the same signature. Sending a code
// costs money, so it needs a signed-in customer and is rate limited per IP and phone.

export type OtpError = "not_available" | "login_required" | "phone_invalid" | "rate_limited" | "send_failed" | "code_invalid" | "code_expired";

export type SendResult = { ok: true } | { ok: false; error: OtpError };
export type VerifyResult = { ok: true; points: number } | { ok: false; error: OtpError };

/** A random 6-digit code. */
function newCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}

export async function sendPhoneCode(input: { phone: string; locale: string }): Promise<SendResult> {
  const key = signingKey();
  if (!whatsappOtpConfigured() || !key || !isSupabaseConfigured()) return { ok: false, error: "not_available" };
  const phone = normalizePhone(typeof input.phone === "string" ? input.phone.slice(0, 30) : "");
  if (!phone) return { ok: false, error: "phone_invalid" };
  // Only a signed-in (or remembered) customer: nobody can make us pay for codes sent to strangers.
  const { authUserId, customerId } = await verifiedCustomer();
  if (!authUserId && !customerId) return { ok: false, error: "login_required" };
  if (!(await rateLimit("otp", phone))) return { ok: false, error: "rate_limited" };

  const code = newCode();
  const expires = String(Math.floor(Date.now() / 1000) + OTP_MAX_AGE);
  const sent = await sendWhatsappCode(phone.replace(/\D/g, ""), code, input.locale === "ar" ? "ar" : "en");
  if (!sent.ok) return { ok: false, error: "send_failed" };

  (await cookies()).set(OTP_COOKIE, `${phone}.${expires}.${await hmac(`${phone}.${expires}.${code}`, key)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OTP_MAX_AGE,
  });
  return { ok: true };
}

export async function verifyPhoneCode(input: { phone: string; code: string }): Promise<VerifyResult> {
  const key = signingKey();
  if (!key || !isSupabaseConfigured()) return { ok: false, error: "not_available" };
  const phone = normalizePhone(typeof input.phone === "string" ? input.phone.slice(0, 30) : "");
  const code = typeof input.code === "string" ? input.code.replace(/\s/g, "") : "";
  if (!phone) return { ok: false, error: "phone_invalid" };
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "code_invalid" };
  if (!(await rateLimit("otpcheck", phone))) return { ok: false, error: "rate_limited" };

  const jar = await cookies();
  const [p, expires, sig] = (jar.get(OTP_COOKIE)?.value ?? "").split(".");
  if (!p || !expires || !sig || p !== phone) return { ok: false, error: "code_expired" };
  if (Number(expires) < Date.now() / 1000) return { ok: false, error: "code_expired" };
  if (!same(sig, await hmac(`${phone}.${expires}.${code}`, key))) return { ok: false, error: "code_invalid" };

  jar.delete(OTP_COOKIE);
  await rememberVerifiedPhone(phone);

  // Already a customer with this number: her account is marked now and she gets the points
  // at once; a new customer gets them with her first order (placeOrder).
  let points = 0;
  const db = createAdminClient();
  const { customerId } = await verifiedCustomer();
  if (db && customerId) points = await grantPhoneVerification(db, customerId, phone);
  return { ok: true, points };
}
