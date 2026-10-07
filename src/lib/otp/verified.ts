import "server-only";
import { cookies } from "next/headers";
import { PHONE_COOKIE, PHONE_MAX_AGE } from "@/lib/checkout/cookies";
import { hmac, same } from "@/lib/security/sign";
import { getSupabaseSecretKey } from "@/lib/supabase/env";
import type { createAdminClient } from "@/lib/supabase/public";

// A phone she verified on WhatsApp is remembered in this browser (a signed,
// httpOnly cookie) and, once she has ordered, on her account
// (customers.phone_verified_at), so she never verifies the same phone again.

type Db = NonNullable<ReturnType<typeof createAdminClient>>;

/** Points are only ever given once, and this note marks them in the ledger. */
const REWARD_NOTE = "Phone verified";
export const DEFAULT_VERIFY_POINTS = 10;

export function signingKey(): string | undefined {
  return process.env.CUSTOMER_COOKIE_SECRET || getSupabaseSecretKey();
}

/** Remembers this browser's verified phone (E.164). */
export async function rememberVerifiedPhone(phone: string) {
  const key = signingKey();
  if (!key) return;
  const issued = String(Math.floor(Date.now() / 1000));
  (await cookies()).set(PHONE_COOKIE, `${phone}.${issued}.${await hmac(`${phone}.${issued}`, key)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PHONE_MAX_AGE,
  });
}

/** The phone this browser verified, or null. */
export async function verifiedPhoneOfBrowser(): Promise<string | null> {
  const key = signingKey();
  const value = (await cookies()).get(PHONE_COOKIE)?.value;
  if (!key || !value) return null;
  const [phone, issued, sig] = value.split(".");
  if (!phone || !issued || !sig || !/^\+[1-9]\d{6,14}$/.test(phone)) return null;
  const age = Date.now() / 1000 - Number(issued);
  if (!Number.isFinite(age) || age < 0 || age > PHONE_MAX_AGE) return null;
  return same(sig, await hmac(`${phone}.${issued}`, key)) ? phone : null;
}

/** Points for verifying a phone (Settings); the default until the Phase 1 phone update is applied. */
async function rewardPoints(db: Db): Promise<number> {
  const { data, error } = await db.from("site_settings").select("phone_verify_points").eq("id", 1).maybeSingle();
  return error ? DEFAULT_VERIFY_POINTS : (data?.phone_verify_points ?? DEFAULT_VERIFY_POINTS);
}

/**
 * Marks a customer's phone as verified and gives the reward, once. `phone` is the number she
 * verified; it only counts when it is the customer's own number. Returns the points given now (0 when
 * they were given before).
 */
export async function grantPhoneVerification(db: Db, customerId: string, phone: string): Promise<number> {
  try {
    const { data: customer } = await db.from("customers").select("phone, phone_verified_at").eq("id", customerId).maybeSingle();
    if (!customer || customer.phone !== phone) return 0;
    if (!customer.phone_verified_at) {
      await db.from("customers").update({ phone_verified_at: new Date().toISOString() }).eq("id", customerId);
    }
    const { data: given } = await db.from("points_ledger").select("id").eq("customer_id", customerId).eq("note", REWARD_NOTE).limit(1);
    if (given && given.length > 0) return 0;
    const points = await rewardPoints(db);
    if (points <= 0) return 0;
    const { error } = await db.from("points_ledger").insert({ customer_id: customerId, delta: points, reason: "adjust", note: REWARD_NOTE });
    return error ? 0 : points;
  } catch {
    // The order or the verification itself must never fail because of the reward.
    return 0;
  }
}
