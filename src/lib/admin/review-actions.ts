"use server";

import { refresh, revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";
import { normalizePhone } from "@/lib/phone";
import { createUploadUrl, isR2Configured } from "@/lib/storage/r2";
import { AdminError, authorize, run, type ActionResult } from "./auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export type ReviewInput = {
  name: string;
  city: string;
  rating: number;
  text: string;
  textAr: string;
  source: "instagram" | "whatsapp" | "website";
  productId: string;
  date: string;
  photoUrl: string;
  /** Her phone, to give her the review points once approved (optional). */
  phone: string;
  approve: boolean;
};

/** A real review received on Instagram / WhatsApp, typed in by staff. */
export async function addReview(input: ReviewInput): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("reviews.manage");
    const name = str(input.name, 80);
    const text = str(input.text, 2000);
    if (!name || !text) throw new AdminError("Write the customer's name and the review.");
    const rating = Math.round(Number(input.rating));
    if (rating < 1 || rating > 5) throw new AdminError("Rating: 1 to 5 stars.");
    if (!["instagram", "whatsapp", "website"].includes(input.source)) throw new AdminError("Choose where the review came from.");
    const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : undefined;
    const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
    const photo = str(input.photoUrl, 500);
    if (photo && !(base && photo.startsWith(`${base}/`))) throw new AdminError("Upload the photo again.");

    let customerId: string | null = null;
    if (str(input.phone, 30)) {
      const phone = normalizePhone(str(input.phone, 30));
      if (!phone) throw new AdminError("Check the phone number (or leave it empty).");
      const { data } = await db.from("customers").select("id").eq("phone", phone).maybeSingle();
      if (!data) throw new AdminError("No customer with this phone yet (points go to customers who ordered). Leave it empty.");
      customerId = data.id;
    }

    const { error } = await db.from("reviews").insert({
      customer_name: name,
      city: str(input.city, 60) || null,
      rating,
      text,
      text_ar: str(input.textAr, 2000) || null,
      source: input.source,
      product_id: UUID.test(input.productId) ? input.productId : null,
      review_date: date,
      photo_url: photo || null,
      customer_id: customerId,
      is_approved: Boolean(input.approve),
    });
    if (error) throw error;
    revalidateTag(CATALOG_TAG, { expire: 0 });
    refresh();
  });
}

/** Approve (shown in the shop, +points for her once) or hide a review. */
export async function setReviewApproved(id: string, approved: boolean): Promise<ActionResult> {
  return run(async () => {
    if (!UUID.test(id)) throw new AdminError("Invalid review.");
    const { db } = await authorize("reviews.manage");
    const { error } = await db.from("reviews").update({ is_approved: approved }).eq("id", id);
    if (error) throw error;
    revalidateTag(CATALOG_TAG, { expire: 0 });
    refresh();
  });
}

/** Signed upload URL for a review photo (WebP, made small in the browser). */
export async function createReviewPhotoUpload(size: number): Promise<ActionResult<{ uploadUrl: string; publicUrl: string }>> {
  return run(async () => {
    await authorize("reviews.manage");
    if (!isR2Configured()) throw new AdminError("Photo storage (Cloudflare R2) isn't set up yet.");
    if (!Number.isFinite(size) || size <= 0 || size > 8 * 1024 * 1024) throw new AdminError("This photo is too big.");
    const t = await createUploadUrl({ folder: "reviews", contentType: "image/webp" });
    return { uploadUrl: t.uploadUrl, publicUrl: t.publicUrl };
  });
}
