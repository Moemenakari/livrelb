"use server";

import { findShape, MAX_CHARMS } from "@/lib/charms";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/security/rate-limit";
import { createUploadUrl, isR2Configured } from "@/lib/storage/r2";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";
import { DEFAULT_CHARM_PRICE_CENTS } from "./data";

// The Charms page: a customer sends the charms she chose (drawn shapes, the
// Turkish charms in stock, or a photo of what she wants). Every charm costs
// the price in Settings (a stock charm can have its own). The total is
// worked out here, never taken from the browser. Staff see the request in
// the admin and confirm on WhatsApp.

export type CharmRequestInput = {
  name: string;
  phone: string;
  /** Shape slugs ("heart"...) and stock charms ("stock:<id>"). */
  items: string[];
  metal: "gold" | "silver";
  note: string;
  imageUrl: string;
  /** Honeypot: empty for people. */
  website?: string;
};

export type CharmRequestResult =
  | { ok: true; ref: string; totalCents: number | null }
  | { ok: false; error: "name_required" | "phone_invalid" | "empty_design" | "rate_limited" | "failed" };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function submitCharmRequest(input: CharmRequestInput): Promise<CharmRequestResult> {
  // A bot filled the hidden field: pretend it worked.
  if (str(input.website, 50)) return { ok: true, ref: "0000", totalCents: null };
  const name = str(input.name, 80);
  if (!name) return { ok: false, error: "name_required" };
  const phone = normalizePhone(str(input.phone, 30));
  if (!phone) return { ok: false, error: "phone_invalid" };

  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
  const imageUrl = str(input.imageUrl, 500);
  const photo = imageUrl && base && imageUrl.startsWith(`${base}/charms/`) ? imageUrl : "";
  const picked = (Array.isArray(input.items) ? input.items : []).filter((s): s is string => typeof s === "string").slice(0, MAX_CHARMS);
  if (picked.length === 0 && !photo) return { ok: false, error: "empty_design" };

  if (!isSupabaseConfigured()) return { ok: false, error: "failed" };
  const db = createAdminClient();
  if (!db) return { ok: false, error: "failed" };
  if (!(await rateLimit("charm", phone))) return { ok: false, error: "rate_limited" };

  // Price every charm from the database: a drawn shape = the charm price,
  // a stock charm = its own price or the charm price.
  const [{ data: s }, { data: stock }] = await Promise.all([
    db.from("site_settings").select("charm_price_cents").eq("id", 1).maybeSingle(),
    db.from("charm_items").select("id, price_cents, in_stock").eq("is_active", true),
  ]);
  const unit = s?.charm_price_cents ?? DEFAULT_CHARM_PRICE_CENTS;
  const stockById = new Map((stock ?? []).map((i) => [i.id, i]));
  let total = 0;
  const kept: string[] = [];
  for (const key of picked) {
    if (key.startsWith("stock:")) {
      const id = key.slice(6);
      const item = UUID.test(id) ? stockById.get(id) : undefined;
      if (!item || !item.in_stock) continue;
      total += item.price_cents ?? unit;
      kept.push(key);
    } else if (findShape(key)) {
      total += unit;
      kept.push(key);
    }
  }
  if (kept.length === 0 && !photo) return { ok: false, error: "empty_design" };

  const { data, error } = await db
    .from("charm_requests")
    .insert({
      name,
      phone,
      shapes: kept,
      metal: input.metal === "silver" ? "silver" : "gold",
      note: str(input.note, 1000) || null,
      image_url: photo || null,
      total_cents: kept.length > 0 ? total : null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "failed" };
  return { ok: true, ref: data.id.slice(0, 4).toUpperCase(), totalCents: kept.length > 0 ? total : null };
}

export type CharmUpload = { ok: true; uploadUrl: string; publicUrl: string } | { ok: false; error: "not_available" | "rate_limited" | "type" };

/** A short-lived link to upload one reference photo (images only). */
export async function createCharmPhotoUpload(contentType: string): Promise<CharmUpload> {
  if (!isR2Configured()) return { ok: false, error: "not_available" };
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) return { ok: false, error: "type" };
  if (!(await rateLimit("charm"))) return { ok: false, error: "rate_limited" };
  const target = await createUploadUrl({ folder: "charms", contentType });
  return { ok: true, uploadUrl: target.uploadUrl, publicUrl: target.publicUrl };
}
