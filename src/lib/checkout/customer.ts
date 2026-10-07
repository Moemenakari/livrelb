import "server-only";
import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { getSupabaseEnv, getSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";
import { hmac, same } from "@/lib/security/sign";
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

type SessionUser = { id: string; email: string | null; name: string | null };

/** The Google login, when this browser has a Supabase session. */
async function sessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  if (!isSupabaseConfigured() || !jar.getAll().some((c) => c.name.startsWith("sb-"))) return null;
  const { data } = await (await createSessionClient()).auth.getUser();
  const user = data.user;
  if (!user) return null;
  const meta = user.user_metadata as { full_name?: unknown; name?: unknown } | undefined;
  const name = typeof meta?.full_name === "string" ? meta.full_name : typeof meta?.name === "string" ? meta.name : null;
  return { id: user.id, email: user.email ?? null, name };
}

export type VerifiedCustomer = {
  /** The customer this browser is verified as, if any. */
  customerId: string | null;
  /** Her Google login, if signed in (linked at her next order). */
  authUserId: string | null;
  /** The email and name Google shares: kept with her account, to know the real person. */
  authEmail: string | null;
  authName: string | null;
};

export async function verifiedCustomer(): Promise<VerifiedCustomer> {
  const db = isSupabaseConfigured() ? createAdminClient() : null;
  if (!db) return { customerId: null, authUserId: null, authEmail: null, authName: null };
  const user = await sessionUser();
  const auth = { authUserId: user?.id ?? null, authEmail: user?.email ?? null, authName: user?.name ?? null };
  if (user) {
    const { data } = await db.from("customers").select("id").eq("auth_user_id", user.id).maybeSingle();
    if (data) return { customerId: data.id, ...auth };
  }
  const device = await readDeviceCookie((await cookies()).get(CUSTOMER_COOKIE)?.value);
  return { customerId: device, ...auth };
}

/** Saved details to prefill the checkout, and her points. */
export async function savedCustomer(): Promise<SavedCustomer | null> {
  if (!isSupabaseConfigured()) return null;
  const { customerId, authUserId, authEmail, authName } = await verifiedCustomer();
  const db = createAdminClient();
  // Signed in with Google but no order yet: her Google name starts the form.
  if (!customerId || !db) return authUserId ? { google: true, name: authName ?? undefined, email: authEmail ?? undefined } : null;
  const [{ data }, { data: verified }] = await Promise.all([
    db.rpc("customer_profile", { p_customer_id: customerId }),
    db.from("customers").select("phone_verified_at").eq("id", customerId).maybeSingle(),
  ]);
  if (!data) return null;
  const c = data as { name: string; phone: string; area: string | null; address: string | null; points: number };
  // The checkout saves "address\nbuilding / floor".
  const [address, ...building] = (c.address ?? "").split("\n");
  return {
    google: Boolean(authUserId),
    email: authEmail ?? undefined,
    phoneVerified: Boolean(verified?.phone_verified_at),
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
