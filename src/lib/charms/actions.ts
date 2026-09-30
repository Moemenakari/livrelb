"use server";

import { findShape, LETTERS_MAX, MAX_CHARMS } from "@/lib/charms";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/security/rate-limit";
import { createUploadUrl, isR2Configured } from "@/lib/storage/r2";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";

// The Charms page: a customer sends the charms she designed (shapes from the
// gallery, letters, an optional photo). Staff see the request in the admin
// and continue on WhatsApp. No prices are taken here.

export type CharmRequestInput = {
  name: string;
  phone: string;
  shapes: string[];
  letters: string;
  metal: "gold" | "silver";
  note: string;
  imageUrl: string;
  /** Honeypot: empty for people. */
  website?: string;
};

export type CharmRequestResult =
  | { ok: true; ref: string }
  | { ok: false; error: "name_required" | "phone_invalid" | "empty_design" | "rate_limited" | "failed" };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function submitCharmRequest(input: CharmRequestInput): Promise<CharmRequestResult> {
  // A bot filled the hidden field: pretend it worked.
  if (str(input.website, 50)) return { ok: true, ref: "0000" };
  const name = str(input.name, 80);
  if (!name) return { ok: false, error: "name_required" };
  const phone = normalizePhone(str(input.phone, 30));
  if (!phone) return { ok: false, error: "phone_invalid" };

  const shapes = (Array.isArray(input.shapes) ? input.shapes : [])
    .filter((s): s is string => typeof s === "string" && Boolean(findShape(s)))
    .slice(0, MAX_CHARMS);
  const letters = str(input.letters, LETTERS_MAX);
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
  const imageUrl = str(input.imageUrl, 500);
  const photo = imageUrl && base && imageUrl.startsWith(`${base}/charms/`) ? imageUrl : "";
  if (shapes.length === 0 && !letters && !photo) return { ok: false, error: "empty_design" };

  if (!isSupabaseConfigured()) return { ok: false, error: "failed" };
  const db = createAdminClient();
  if (!db) return { ok: false, error: "failed" };
  if (!(await rateLimit("charm", phone))) return { ok: false, error: "rate_limited" };

  const { data, error } = await db
    .from("charm_requests")
    .insert({
      name,
      phone,
      shapes,
      letters: letters || null,
      metal: input.metal === "silver" ? "silver" : "gold",
      note: str(input.note, 1000) || null,
      image_url: photo || null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "failed" };
  return { ok: true, ref: data.id.slice(0, 4).toUpperCase() };
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
