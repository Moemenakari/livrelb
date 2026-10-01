"use server";

import { refresh, revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";
import { allMaterials, isFontKey } from "@/lib/catalog/materials";
import type { Json } from "@/lib/supabase/database.types";
import { createUploadUrl, isR2Configured } from "@/lib/storage/r2";
import { AdminError, authorize, run, type ActionResult } from "./auth";
import { artPresets, artKey, MAX_PHOTOS, type ProductForm } from "./product-types";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const text = (value: unknown, max: number, label: string, required = false): string => {
  const s = typeof value === "string" ? value.trim() : "";
  if (required && !s) throw new AdminError(`${label} is required.`);
  if (s.length > max) throw new AdminError(`${label} is too long (max ${max} characters).`);
  return s;
};

const cents = (value: string, label: string, required: boolean): number | null => {
  const v = String(value ?? "").trim();
  if (!v) {
    if (required) throw new AdminError(`${label}: enter a price.`);
    return null;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100000) throw new AdminError(`${label}: check the price.`);
  return Math.round(n * 100);
};

/** Photos must come from our image storage (R2), never from another site. */
function mediaAllowed(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
  return Boolean(base && url.startsWith(`${base}/`)) && url.length < 500;
}

/** Validates the editor's form on the server and builds admin_save_product's input. */
function toPayload(f: ProductForm, existingMedia: Set<string>) {
  const slug = text(f.slug, 80, "Link (slug)", true).toLowerCase();
  if (!SLUG.test(slug)) throw new AdminError("The link (slug) may only use a-z, 0-9 and dashes, e.g. cursive-name-necklace.");

  const materials = (f.materials ?? []).map((m) => {
    if (!allMaterials.includes(m.key)) throw new AdminError("Unknown material.");
    const price = cents(m.price, `Price (${m.key})`, true)!;
    if (price <= 0) throw new AdminError(`Price (${m.key}) must be more than 0.`);
    const compare = cents(m.compareAt, `Old price (${m.key})`, false);
    if (compare !== null && compare <= price) throw new AdminError(`Old price (${m.key}) must be higher than the price, or empty.`);
    return { key: m.key, price_cents: price, compare_at_price_cents: compare, is_default: Boolean(m.isDefault) };
  });
  if (materials.length === 0) throw new AdminError("Add at least one material with a price.");
  if (new Set(materials.map((m) => m.key)).size !== materials.length) throw new AdminError("Each material only once.");
  if (!materials.some((m) => m.is_default)) materials[0].is_default = true;
  const firstDefault = materials.findIndex((m) => m.is_default);
  materials.forEach((m, i) => (m.is_default = i === firstDefault));

  const options = (f.options ?? []).map((o) => {
    if (!["chain", "bracelet", "ring"].includes(o.kind)) throw new AdminError("Unknown size type.");
    const value = Number(o.value);
    if (!/^\d{1,3}(\.\d)?$/.test(String(o.value).trim()) || value <= 0) throw new AdminError(`Size "${o.value}" isn't valid (e.g. 45 or 16.5).`);
    const modifier = Number(String(o.modifier ?? "").trim() || "0");
    if (!Number.isFinite(modifier) || Math.abs(modifier) > 10000) throw new AdminError(`Size ${o.value}: check the price change.`);
    return { kind: o.kind, value, price_modifier_cents: Math.round(modifier * 100), is_default: Boolean(o.isDefault) };
  });
  if (new Set(options.map((o) => o.value)).size !== options.length) throw new AdminError("Each size only once.");
  if (options.length > 0) {
    const d = Math.max(0, options.findIndex((o) => o.is_default));
    options.forEach((o, i) => (o.is_default = i === d));
  }

  const fonts = [...new Set((f.fonts ?? []).filter((k) => isFontKey(k)))];
  const personalization = f.personalization === "name" || f.personalization === "initial" ? f.personalization : null;
  if (personalization && fonts.length === 0) throw new AdminError("Choose at least one font for a personalized piece.");
  const maxLength = Math.round(Number(f.maxLength) || 10);
  if (personalization && (maxLength < 1 || maxLength > 20)) throw new AdminError("Max letters must be between 1 and 20.");

  const media = (f.media ?? []).map((m) => {
    if (!mediaAllowed(m.url) && !existingMedia.has(m.url)) throw new AdminError("A photo isn't from our image storage. Upload it again.");
    return {
      url: m.url,
      type: m.type === "video" ? "video" : "image",
      alt_en: text(m.altEn, 200, "Photo description"),
      alt_ar: text(m.altAr, 200, "Photo description"),
    };
  });
  if (media.filter((m) => m.type === "image").length > MAX_PHOTOS) throw new AdminError(`Up to ${MAX_PHOTOS} photos.`);
  if (media.filter((m) => m.type === "video").length > 1) throw new AdminError("Only one video.");

  const art = artPresets.find((p) => artKey(p.art) === artKey(f.art))?.art ?? artPresets[0].art;
  const stock = f.stock === null || (f.stock as unknown) === "" ? null : Math.round(Number(f.stock));
  if (stock !== null && (!Number.isFinite(stock) || stock < 0)) throw new AdminError("Stock must be 0 or more, or empty.");

  return {
    id: f.id && UUID.test(f.id) ? f.id : null,
    slug,
    name_en: text(f.nameEn, 120, "Name (English)", true),
    name_ar: text(f.nameAr, 120, "Name (Arabic)", true),
    summary_en: text(f.summaryEn, 300, "Tagline (English)"),
    summary_ar: text(f.summaryAr, 300, "Tagline (Arabic)"),
    description_en: text(f.descriptionEn, 5000, "Description (English)"),
    description_ar: text(f.descriptionAr, 5000, "Description (Arabic)"),
    details_en: text(f.detailsEn, 3000, "Size & materials (English)"),
    details_ar: text(f.detailsAr, 3000, "Size & materials (Arabic)"),
    status: ["draft", "active", "archived"].includes(f.status) ? f.status : "draft",
    style: text(f.style, 40, "Style") || null,
    is_best_seller: Boolean(f.isBestSeller),
    is_new: Boolean(f.isNew),
    free_delivery: Boolean(f.freeDelivery),
    free_gift_box: f.freeGiftBox !== false,
    personalization,
    max_length: personalization ? maxLength : null,
    sample_text: text(f.sampleText, 20, "Sample name") || null,
    chain_connections: (f.connections ?? []).filter((c) => c === "sides" || c === "center"),
    art,
    stock_qty: stock,
    materials,
    options,
    fonts,
    categories: (f.categories ?? []).filter((c) => SLUG.test(c)),
    media,
  };
}

/** Creates or updates a product with all its parts (one transaction, as the staff member). */
export async function saveProduct(form: ProductForm): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { db } = await authorize(form.id ? "products.edit" : "products.create");
    let existing = new Set<string>();
    if (form.id) {
      const { data } = await db.from("product_media").select("url").eq("product_id", form.id);
      existing = new Set((data ?? []).map((m) => m.url));
    }
    const payload = toPayload(form, existing);
    const { data, error } = await db.rpc("admin_save_product", { p: payload as unknown as Json });
    if (error) throw error;
    revalidateTag(CATALOG_TAG, { expire: 0 });
    refresh();
    return { id: data as string };
  });
}

/** Deletes a product. Products that were ordered can't be deleted: hide them instead. */
export async function deleteProduct(id: string): Promise<ActionResult> {
  return run(async () => {
    if (!UUID.test(id)) throw new AdminError("Invalid product.");
    const { db } = await authorize("products.delete");
    const { count } = await db.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id);
    if (count) throw new AdminError("This product was ordered before. Set it to Hidden instead of deleting it.");
    const { error, count: deleted } = await db.from("products").delete({ count: "exact" }).eq("id", id);
    if (error) throw error;
    if (!deleted) throw new AdminError("You don't have permission to do this.");
    revalidateTag(CATALOG_TAG, { expire: 0 });
  });
}

/** Quick show / hide from the product list. */
export async function setProductStatus(id: string, status: "active" | "draft" | "archived"): Promise<ActionResult> {
  return run(async () => {
    if (!UUID.test(id) || !["active", "draft", "archived"].includes(status)) throw new AdminError("Invalid value.");
    const { db } = await authorize("products.edit");
    const { error } = await db.from("products").update({ status }).eq("id", id);
    if (error) throw error;
    revalidateTag(CATALOG_TAG, { expire: 0 });
    refresh();
  });
}

const uploadTypes = ["image/webp", "image/jpeg", "image/png", "video/mp4", "video/webm"];
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 60 * 1024 * 1024;

/** A signed, 10-minute upload URL for one photo or video (browser → R2 directly). */
export async function createMediaUpload(input: {
  slug: string;
  contentType: string;
  size: number;
}): Promise<ActionResult<{ uploadUrl: string; publicUrl: string }>> {
  return run(async () => {
    await authorize("products.edit");
    if (!isR2Configured()) {
      throw new AdminError("Photo storage (Cloudflare R2) isn't set up yet. Add the R2 keys to the server settings first.");
    }
    if (!uploadTypes.includes(input.contentType)) throw new AdminError("Use a photo (JPG, PNG, WebP) or a video (MP4, WebM).");
    const max = input.contentType.startsWith("video/") ? MAX_VIDEO : MAX_IMAGE;
    if (!Number.isFinite(input.size) || input.size <= 0 || input.size > max) {
      throw new AdminError(`This file is too big (max ${max / 1024 / 1024} MB).`);
    }
    const slug = SLUG.test(input.slug) ? input.slug : "new";
    const target = await createUploadUrl({ folder: `products/${slug}`, contentType: input.contentType });
    return { uploadUrl: target.uploadUrl, publicUrl: target.publicUrl };
  });
}
