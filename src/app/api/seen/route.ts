import { verifiedCustomer } from "@/lib/checkout/customer";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";

// POST /api/seen: a remembered customer (or one signed in with Google) is back.
// Stamps customers.last_seen_at, at most once an hour, for the admin's
// "Last visit" column. Only browsers with the customer flag cookie call it.
export async function POST() {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isSupabaseConfigured()) return new Response(null, { status: 204, headers });
  const { customerId } = await verifiedCustomer();
  const db = createAdminClient();
  if (customerId && db) {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    await db
      .from("customers")
      .update({ last_seen_at: now.toISOString() })
      .eq("id", customerId)
      .or(`last_seen_at.is.null,last_seen_at.lt.${hourAgo}`);
  }
  return new Response(null, { status: 204, headers });
}
