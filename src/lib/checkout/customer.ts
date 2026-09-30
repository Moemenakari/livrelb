import "server-only";
import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { getSupabaseEnv, getSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";
import { CUSTOMER_COOKIE, CUSTOMER_MAX_AGE } from "./cookies";
import type { SavedCustomer } from "./types";

// Who is at the checkout, as verified by the server (never by phone):
// 1. her Google login (Supabase Auth) linked to a customer, or
// 2. this browser, remembered after her first order: an httpOnly cookie
//    "<customer id>.<issued>.<HMAC>" signed with a server secret.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secret(): string | undefined {
  return process.env.CUSTOMER_COOKIE_SECRET || getSupabaseSecretKey();
}

async function hmac(data: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Constant-time string compare. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function readDeviceCookie(value: string | undefined): Promise<string | null> {
  const key = secret();
  if (!value || !key) return null;
  const [id, issued, sig] = value.split(".");
  if (!id || !issued || !sig || !UUID.test(id)) return null;
  const age = Date.now() / 1000 - Number(issued);
  if (!Number.isFinite(age) || age < 0 || age > CUSTOMER_MAX_AGE) return null;
  return same(sig, await hmac(`${id}.${issued}`, key)) ? id : null;
}

/** Remembers this browser as the customer (after a trusted order). */
export async function rememberCustomer(customerId: string) {
  const key = secret();
  if (!key || !UUID.test(customerId)) return;
  const issued = String(Math.floor(Date.now() / 1000));
  const value = `${customerId}.${issued}.${await hmac(`${customerId}.${issued}`, key)}`;
  (await cookies()).set(CUSTOMER_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CUSTOMER_MAX_AGE,
  });
}

export async function forgetCustomer() {
  const jar = await cookies();
  jar.delete(CUSTOMER_COOKIE);
  if (jar.getAll().some((c) => c.name.startsWith("sb-"))) {
    await (await createSessionClient()).auth.signOut();
  }
}

/** The Google login, when this browser has a Supabase session. */
async function sessionUserId(): Promise<string | null> {
  const jar = await cookies();
  if (!isSupabaseConfigured() || !jar.getAll().some((c) => c.name.startsWith("sb-"))) return null;
  const { data } = await (await createSessionClient()).auth.getUser();
  return data.user?.id ?? null;
}

export type VerifiedCustomer = {
  /** The customer this browser is verified as, if any. */
  customerId: string | null;
  /** Her Google login, if signed in (linked at her next order). */
  authUserId: string | null;
};

export async function verifiedCustomer(): Promise<VerifiedCustomer> {
  const db = isSupabaseConfigured() ? createAdminClient() : null;
  if (!db) return { customerId: null, authUserId: null };
  const authUserId = await sessionUserId();
  if (authUserId) {
    const { data } = await db.from("customers").select("id").eq("auth_user_id", authUserId).maybeSingle();
    if (data) return { customerId: data.id, authUserId };
  }
  const device = await readDeviceCookie((await cookies()).get(CUSTOMER_COOKIE)?.value);
  return { customerId: device, authUserId };
}

/** Saved details to prefill the checkout, and her points. */
export async function savedCustomer(): Promise<SavedCustomer | null> {
  const { customerId, authUserId } = await verifiedCustomer();
  const db = createAdminClient();
  if (!customerId || !db) return authUserId ? { google: true } : null;
  const { data } = await db.rpc("customer_profile", { p_customer_id: customerId });
  if (!data) return null;
  const c = data as { name: string; phone: string; area: string | null; address: string | null; points: number };
  // The checkout saves "address\nbuilding / floor".
  const [address, ...building] = (c.address ?? "").split("\n");
  return {
    google: Boolean(authUserId),
    name: c.name,
    phone: c.phone,
    area: c.area ?? "",
    address,
    building: building.join(" "),
    points: c.points,
  };
}

/**
 * Whether "Continue with Google" can be offered: the Google provider is
 * switched on in Supabase (checked once an hour).
 */
export const googleLoginEnabled = unstable_cache(
  async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    try {
      const { url, publishableKey } = getSupabaseEnv();
      const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: publishableKey } });
      if (!res.ok) return false;
      const settings = (await res.json()) as { external?: { google?: boolean } };
      return settings.external?.google === true;
    } catch {
      return false;
    }
  },
  ["google-login-enabled"],
  { revalidate: 3600 },
);
