import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv, getSupabaseSecretKey } from "./env";

// Cookie-less clients for reading the catalog on the server. Safe inside
// cached functions and at build time (no request data).

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** Reads as the public (anon) role: Row Level Security applies. */
export function createPublicClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient<Database>(url, publishableKey, options);
}

/**
 * Secret-key client (bypasses RLS). SERVER ONLY, for trusted code such as
 * place_order or admin actions. Null until SUPABASE_SECRET_KEY is set.
 */
export function createAdminClient() {
  const secret = getSupabaseSecretKey();
  if (!secret) return null;
  const { url } = getSupabaseEnv();
  return createClient<Database>(url, secret, options);
}
