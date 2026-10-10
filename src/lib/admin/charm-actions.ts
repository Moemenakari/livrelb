"use server";

import { refresh, revalidatePath, revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";
import { createUploadUrl, isR2Configured } from "@/lib/storage/r2";
import { authorize, AdminError, run, type ActionResult } from "./auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Owner: the standard price of one charm and the most charms on one chain (Charms page). */
export async function saveCharmSettings(input: { price: string; max: string }): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("owner");
    const price = Number(input.price);
    const max = Number(input.max);
    if (!Number.isFinite(price) || price < 0 || price > 10000) throw new AdminError("Price of one charm: check the amount.");
    if (!Number.isInteger(max) || max < 1 || max > 30) throw new AdminError("Most charms on one chain: 1–30.");
    const { error } = await db.from("site_settings").update({ charm_price_cents: Math.round(price * 100), charm_max: max }).eq("id", 1);
    if (error) throw error;
    revalidateTag(CATALOG_TAG, { expire: 0 });
    revalidatePath("/[locale]/charms", "page");
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
  /** From the Phase 1 database update; undefined before it (the row is then saved without them). */
  family?: "charms" | "turkish";
  metal?: "gold" | "silver" | "";
  code?: string;
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
      ...(input.family ? { family: input.family === "charms" ? "charms" : "turkish", metal: input.metal === "gold" || input.metal === "silver" ? input.metal : null } : {}),
    };
    const { error } = input.id && UUID.test(input.id) ? await db.from("charm_items").update(row).eq("id", input.id) : await db.from("charm_items").insert(row);
    if (error) throw error;
    revalidatePath("/[locale]/charms", "page");
    refresh();
  });
}

/** priceCents: from the folder name; null = the standard charm price. Only used for a charm that is new. */
export type CharmImportRow = { family: "charms" | "turkish"; metal: "gold" | "silver"; code: string; url: string; priceCents: number | null };

const humanize = (code: string) => {
  const text = code.replace(/-/g, " ").trim();
  return (text.charAt(0).toUpperCase() + text.slice(1)).slice(0, 80);
};

/**
 * Bulk import: the photos are already uploaded; each row is one charm (family, metal and
 * price come from the folders it was in, the code from the file name). A new charm is
 * created (name from the code, price from the folder or the standard charm price); a charm
 * with the same family, metal and code only gets its new photo, so its name and price are kept.
 */
export async function importCharmItems(rows: CharmImportRow[]): Promise<ActionResult<{ created: number; updated: number }>> {
  return run(async () => {
    const { db } = await authorize("products.edit");
    const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0 || list.length > 100) throw new AdminError("Import up to 100 charms at a time.");
    for (const r of list) {
      if ((r.family !== "charms" && r.family !== "turkish") || (r.metal !== "gold" && r.metal !== "silver")) throw new AdminError("Invalid file name.");
      if (!/^[a-z0-9-]{1,60}$/.test(r.code)) throw new AdminError("Invalid file name.");
      if (r.priceCents !== null && (!Number.isInteger(r.priceCents) || r.priceCents < 0 || r.priceCents > 1_000_000)) throw new AdminError("Invalid price.");
      if (!base || !r.url.startsWith(`${base}/`) || r.url.length > 500) throw new AdminError("Upload the photos again.");
    }

    const { data: existing, error: readError } = await db
      .from("charm_items")
      .select("id, family, metal, code")
      .in("code", list.map((r) => r.code));
    if (readError) {
      throw new AdminError("The import needs the Phase 1 database update (Supabase → SQL Editor).");
    }
    const idOf = new Map((existing ?? []).map((e) => [`${e.family}|${e.metal}|${e.code}`, e.id]));

    const fresh: { family: string; metal: string; code: string; image_url: string; name_en: string; name_ar: string; price_cents: number | null }[] = [];
    let updated = 0;
    for (const r of list) {
      const id = idOf.get(`${r.family}|${r.metal}|${r.code}`);
      if (id) {
        const { error } = await db.from("charm_items").update({ image_url: r.url }).eq("id", id);
        if (error) throw error;
        updated += 1;
      } else {
        const name = humanize(r.code);
        fresh.push({ family: r.family, metal: r.metal, code: r.code, image_url: r.url, name_en: name, name_ar: name, price_cents: r.priceCents });
      }
    }
    if (fresh.length > 0) {
      const { error } = await db.from("charm_items").insert(fresh);
      if (error) throw error;
    }
    revalidatePath("/[locale]/charms", "page");
    refresh();
    return { created: fresh.length, updated };
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

export type CharmBulk = {
  ids: string[];
  /** Dollars; empty string = the standard charm price. Undefined = leave as it is. */
  price?: string;
  inStock?: boolean;
  isActive?: boolean;
};

/** Change many charms at once (price, stock, shown) or delete them. */
export async function bulkUpdateCharms(input: CharmBulk & { remove?: boolean }): Promise<ActionResult<{ count: number }>> {
  return run(async () => {
    const { db } = await authorize("products.edit");
    const ids = Array.isArray(input.ids) ? input.ids : [];
    if (ids.length === 0 || ids.length > 100 || !ids.every((id) => UUID.test(id))) throw new AdminError("Select the charms first.");

    if (input.remove) {
      const { error, count } = await db.from("charm_items").delete({ count: "exact" }).in("id", ids);
      if (error) throw error;
      revalidatePath("/[locale]/charms", "page");
      refresh();
      return { count: count ?? 0 };
    }

    const patch: { price_cents?: number | null; in_stock?: boolean; is_active?: boolean } = {};
    if (input.price !== undefined) {
      const text = input.price.trim();
      if (text === "") patch.price_cents = null;
      else {
        const n = Number(text);
        if (!Number.isFinite(n) || n < 0 || n > 10000) throw new AdminError("Price: check the amount (or leave it empty).");
        patch.price_cents = Math.round(n * 100);
      }
    }
    if (input.inStock !== undefined) patch.in_stock = Boolean(input.inStock);
    if (input.isActive !== undefined) patch.is_active = Boolean(input.isActive);
    if (Object.keys(patch).length === 0) throw new AdminError("Nothing to change.");

    const { error, count } = await db.from("charm_items").update(patch, { count: "exact" }).in("id", ids);
    if (error) throw error;
    revalidatePath("/[locale]/charms", "page");
    refresh();
    return { count: count ?? 0 };
  });
}
