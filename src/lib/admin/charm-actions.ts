"use server";

import { refresh, revalidatePath } from "next/cache";
import { createUploadUrl, isR2Configured } from "@/lib/storage/r2";
import { authorize, AdminError, run, type ActionResult } from "./auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** New → Contacted → Done, for a charm design a customer sent from the Charms page. */
export async function setCharmStatus(id: string, status: "new" | "contacted" | "done"): Promise<ActionResult> {
  return run(async () => {
    if (!UUID.test(id) || !["new", "contacted", "done"].includes(status)) throw new AdminError("Invalid request.");
    const { db, staff } = await authorize("orders.edit");
    const { error } = await db
      .from("charm_requests")
      .update({ status, handled_by: status === "new" ? null : staff.id })
      .eq("id", id);
    if (error) throw error;
    refresh();
  });
}

export type CharmItemInput = {
  id: string | null;
  url: string;
  nameEn: string;
  nameAr: string;
  /** Empty = the standard charm price from Settings. */
  price: string;
  inStock: boolean;
  isActive: boolean;
  order: string;
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const MAX_IMAGE = 8 * 1024 * 1024;

/** A signed upload link for the photo of one Turkish charm. */
export async function createCharmItemUpload(input: { contentType: string; size: number }): Promise<ActionResult<{ uploadUrl: string; publicUrl: string }>> {
  return run(async () => {
    await authorize("products.edit");
    if (!isR2Configured()) throw new AdminError("Photo storage (Cloudflare R2) isn't set up yet.");
    if (input.contentType !== "image/webp" && input.contentType !== "image/jpeg" && input.contentType !== "image/png") {
      throw new AdminError("Use a photo (JPG, PNG, WebP).");
    }
    if (!Number.isFinite(input.size) || input.size <= 0 || input.size > MAX_IMAGE) throw new AdminError("This file is too big (max 8 MB).");
    const target = await createUploadUrl({ folder: "charm-items", contentType: input.contentType });
    return { uploadUrl: target.uploadUrl, publicUrl: target.publicUrl };
  });
}

/** Add or edit a Turkish charm in stock (shown on the Charms page). */
export async function saveCharmItem(input: CharmItemInput): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("products.edit");
    const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
    if (!base || !input.url.startsWith(`${base}/`) || input.url.length > 500) throw new AdminError("Upload the photo again.");
    const nameEn = str(input.nameEn, 80);
    const nameAr = str(input.nameAr, 80) || nameEn;
    if (!nameEn) throw new AdminError("Write the charm's name.");
    let price: number | null = null;
    if (input.price.trim()) {
      const n = Number(input.price);
      if (!Number.isFinite(n) || n < 0 || n > 10000) throw new AdminError("Price: check the amount (or leave it empty).");
      price = Math.round(n * 100);
    }
    const row = {
      image_url: input.url,
      name_en: nameEn,
      name_ar: nameAr,
      price_cents: price,
      in_stock: Boolean(input.inStock),
      is_active: Boolean(input.isActive),
      sort_order: Math.round(Number(input.order) || 0),
    };
    const { error } = input.id && UUID.test(input.id) ? await db.from("charm_items").update(row).eq("id", input.id) : await db.from("charm_items").insert(row);
    if (error) throw error;
    revalidatePath("/[locale]/charms", "page");
    refresh();
  });
}

export async function deleteCharmItem(id: string): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("products.edit");
    if (!UUID.test(id)) throw new AdminError("Invalid charm.");
    const { error } = await db.from("charm_items").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/[locale]/charms", "page");
    refresh();
  });
}
