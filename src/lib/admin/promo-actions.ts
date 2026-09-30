"use server";

import { refresh, revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";
import { AdminError, authorize, run, type ActionResult } from "./auth";
import { fromLocalInput } from "./format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const id = (v: unknown) => (typeof v === "string" && UUID.test(v) ? v : null);

function window(startsLocal: string, endsLocal: string) {
  const starts_at = fromLocalInput(startsLocal);
  const ends_at = fromLocalInput(endsLocal);
  if (starts_at && ends_at && ends_at <= starts_at) throw new AdminError("The end must be after the start.");
  return { starts_at, ends_at };
}

export type CouponInput = {
  id: string | null;
  code: string;
  type: "percent" | "fixed" | "free_delivery";
  value: string;
  minOrder: string;
  starts: string;
  ends: string;
  maxUses: string;
  staffId: string;
  isPublic: boolean;
  isActive: boolean;
};

/** Coupons and employees' personal codes (AMAL10). Public ones show on product pages. */
export async function saveCoupon(input: CouponInput): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("coupons.manage");
    const code = str(input.code, 30).toUpperCase();
    if (!/^[A-Z0-9-]{3,30}$/.test(code)) throw new AdminError("Code: 3–30 letters, numbers or dashes, e.g. STORY15.");
    if (!["percent", "fixed", "free_delivery"].includes(input.type)) throw new AdminError("Choose a coupon type.");
    const raw = Number(input.value || 0);
    const value = input.type === "fixed" ? Math.round(raw * 100) : input.type === "percent" ? Math.round(raw) : 0;
    if (input.type === "percent" && (value < 1 || value > 100)) throw new AdminError("Percent must be 1–100.");
    if (input.type === "fixed" && value <= 0) throw new AdminError("Enter the amount off.");
    const minOrder = Math.round(Number(input.minOrder || 0) * 100);
    const maxUses = input.maxUses ? Math.round(Number(input.maxUses)) : null;
    if (!Number.isFinite(minOrder) || minOrder < 0) throw new AdminError("Check the minimum order.");
    if (maxUses !== null && (!Number.isFinite(maxUses) || maxUses < 1)) throw new AdminError("Max uses must be 1 or more, or empty.");
    const row = {
      code,
      type: input.type,
      value,
      min_order_cents: minOrder,
      max_uses: maxUses,
      staff_id: id(input.staffId),
      is_public: Boolean(input.isPublic) && !id(input.staffId),
      is_active: Boolean(input.isActive),
      ...window(input.starts, input.ends),
    };
    const couponId = id(input.id);
    const { error } = couponId ? await db.from("coupons").update(row).eq("id", couponId) : await db.from("coupons").insert(row);
    if (error) throw error;
    revalidateTag(CATALOG_TAG, { expire: 0 });
    refresh();
  });
}

export type PromotionInput = {
  id: string | null;
  placement: "hero" | "promo_bar";
  headlineEn: string;
  headlineAr: string;
  code: string;
  percent: string;
  starts: string;
  ends: string;
  isActive: boolean;
};

/** Homepage headline + countdown (hero) and the promo bar under the header. */
export async function savePromotion(input: PromotionInput): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("coupons.manage");
    if (input.placement !== "hero" && input.placement !== "promo_bar") throw new AdminError("Invalid placement.");
    const percent = Math.round(Number(input.percent));
    if (!(percent >= 1 && percent <= 100)) throw new AdminError("Percent must be 1–100.");
    const code = str(input.code, 30).toUpperCase();
    if (input.placement === "promo_bar" && !/^[A-Z0-9-]{3,30}$/.test(code)) throw new AdminError("The promo bar needs a code, e.g. STORY15.");
    const row = {
      placement: input.placement,
      headline_en: str(input.headlineEn, 160) || null,
      headline_ar: str(input.headlineAr, 160) || null,
      code: code || null,
      percent,
      is_active: Boolean(input.isActive),
      ...window(input.starts, input.ends),
    };
    const promoId = id(input.id);
    const { error } = promoId ? await db.from("promotions").update(row).eq("id", promoId) : await db.from("promotions").insert(row);
    if (error) throw error;
    revalidateTag(CATALOG_TAG, { expire: 0 });
    refresh();
  });
}

export type SeasonInput = {
  id: string | null;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  couponCode: string;
  starts: string;
  ends: string;
  isActive: boolean;
  products: string[];
};

/** Season / collection pages (Valentine's, Mother's Day, Ramadan…) with dates and products. */
export async function saveSeason(input: SeasonInput): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("collections.manage");
    const slug = str(input.slug, 60).toLowerCase();
    if (!SLUG.test(slug)) throw new AdminError("Link: a-z, 0-9 and dashes, e.g. mothers-day.");
    const titleEn = str(input.titleEn, 120);
    const titleAr = str(input.titleAr, 120);
    if (!titleEn || !titleAr) throw new AdminError("Write the title in English and Arabic.");
    const row = {
      slug,
      title_en: titleEn,
      title_ar: titleAr,
      description_en: str(input.descriptionEn, 2000),
      description_ar: str(input.descriptionAr, 2000),
      coupon_code: str(input.couponCode, 30).toUpperCase() || null,
      is_active: Boolean(input.isActive),
      ...window(input.starts, input.ends),
    };
    let seasonId = id(input.id);
    if (seasonId) {
      const { error } = await db.from("collections").update(row).eq("id", seasonId);
      if (error) throw error;
    } else {
      const { data, error } = await db.from("collections").insert(row).select("id").single();
      if (error) throw error;
      seasonId = data.id;
    }
    const products = [...new Set((input.products ?? []).filter((p) => UUID.test(p)))].slice(0, 200);
    const { error: delError } = await db.from("collection_products").delete().eq("collection_id", seasonId);
    if (delError) throw delError;
    if (products.length) {
      const { error } = await db
        .from("collection_products")
        .insert(products.map((product_id, i) => ({ collection_id: seasonId!, product_id, sort_order: i })));
      if (error) throw error;
    }
    revalidateTag(CATALOG_TAG, { expire: 0 });
    refresh();
  });
}
