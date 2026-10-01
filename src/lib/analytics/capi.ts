import "server-only";
import { normalizePhone } from "@/lib/phone";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";

// Meta Conversions API (server-side events). Off until the Pixel ID is set
// in the admin Settings AND META_CAPI_TOKEN is set on the server. Personal
// data is hashed with SHA-256 before it leaves our server, as Meta requires.

export type MetaEventInput = {
  event: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";
  eventId: string;
  value: number;
  productId?: string;
  quantity?: number;
  phone?: string;
  url?: string;
  userAgent?: string;
  ip?: string;
  fbp?: string;
  fbc?: string;
};

const GRAPH_VERSION = "v21.0";

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sendMetaEvent(input: MetaEventInput): Promise<void> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token || !isSupabaseConfigured()) return;
  const db = createAdminClient();
  if (!db) return;
  const { data } = await db.from("site_settings").select("meta_pixel_id").eq("id", 1).maybeSingle();
  const pixelId = data?.meta_pixel_id;
  if (!pixelId) return;

  const e164 = input.phone ? normalizePhone(input.phone) : null;
  const userData: Record<string, unknown> = {
    ...(e164 ? { ph: [await sha256(e164.replace(/\D/g, ""))] } : {}),
    ...(input.ip ? { client_ip_address: input.ip } : {}),
    ...(input.userAgent ? { client_user_agent: input.userAgent } : {}),
    ...(input.fbp ? { fbp: input.fbp } : {}),
    ...(input.fbc ? { fbc: input.fbc } : {}),
    country: [await sha256("lb")],
  };

  const body = {
    data: [
      {
        event_name: input.event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        ...(input.url ? { event_source_url: input.url } : {}),
        user_data: userData,
        custom_data: {
          value: input.value,
          currency: "USD",
          content_type: "product",
          ...(input.productId ? { content_ids: [input.productId] } : {}),
          num_items: input.quantity ?? 1,
        },
      },
    ],
    ...(process.env.META_CAPI_TEST_CODE ? { test_event_code: process.env.META_CAPI_TEST_CODE } : {}),
  };

  try {
    await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Analytics must never break the shop.
  }
}
