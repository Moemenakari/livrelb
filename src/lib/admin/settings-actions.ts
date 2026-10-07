"use server";

import { refresh, revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";
import { AdminError, authorize, run, type ActionResult } from "./auth";

export type SettingsInput = {
  deliveryFee: string;
  freeShippingOver: string;
  firstOrderFree: boolean;
  daysMin: string;
  daysMax: string;
  deliveryTimeEn: string;
  deliveryTimeAr: string;
  shippingInfoEn: string;
  shippingInfoAr: string;
  whatsapp: string;
  instagram: string;
  pointsEnabled: boolean;
  pointsPerStep: string;
  pointsStepDollars: string;
  rewardPercent: string;
  rewardDays: string;
  pointsPerReview: string;
  redeemPoints: string;
  redeemDollars: string;
  announcements: { en: string; ar: string }[];
  whishOnline: boolean;
  cardOnline: boolean;
  charmPrice: string;
  /** Checkout needs an account (Google or email). */
  requireLogin: boolean;
  /** From the Phase 1 database update (always there now). */
  charmMax?: string;
  metaPixelId: string;
  ga4Id: string;
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const whole = (v: string, label: string, min: number, max: number) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new AdminError(`${label}: ${min}–${max}.`);
  return n;
};
const centsOf = (v: string, label: string) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 10000) throw new AdminError(`${label}: check the amount.`);
  return Math.round(n * 100);
};

/** Shop settings (owner only): delivery, contacts, LIVRE Points, announcement bar. */
export async function saveSettings(input: SettingsInput): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("owner");
    const daysMin = whole(input.daysMin, "Delivery days (from)", 0, 60);
    const daysMax = whole(input.daysMax, "Delivery days (to)", daysMin, 90);
    const whatsapp = str(input.whatsapp, 20).replace(/\D/g, "");
    if (whatsapp && !/^[1-9]\d{7,14}$/.test(whatsapp)) throw new AdminError("WhatsApp: the full number with the country code, e.g. 96170123456.");
    const instagram = str(input.instagram, 200);
    if (instagram && !/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._/-]+$/.test(instagram)) {
      throw new AdminError("Instagram: the full link, e.g. https://instagram.com/livrelb.");
    }
    const metaPixelId = str(input.metaPixelId, 20).replace(/\s/g, "");
    if (metaPixelId && !/^\d{10,20}$/.test(metaPixelId)) throw new AdminError("Meta Pixel ID: digits only (10 to 20).");
    const ga4Id = str(input.ga4Id, 20).replace(/\s/g, "").toUpperCase();
    if (ga4Id && !/^G-[A-Z0-9]{4,20}$/.test(ga4Id)) throw new AdminError("GA4 ID: looks like G-XXXXXXXXXX.");
    const announcements = (input.announcements ?? [])
      .map((a) => ({ en: str(a.en, 160), ar: str(a.ar, 160) || str(a.en, 160) }))
      .filter((a) => a.en);
    if (announcements.length > 8) throw new AdminError("Up to 8 announcements.");

    const { error } = await db
      .from("site_settings")
      .update({
        delivery_fee_cents: centsOf(input.deliveryFee, "Delivery fee"),
        free_shipping_threshold_cents: centsOf(input.freeShippingOver, "Free delivery over"),
        first_order_free_delivery: Boolean(input.firstOrderFree),
        delivery_days_min: daysMin,
        delivery_days_max: daysMax,
        delivery_time_en: str(input.deliveryTimeEn, 120),
        delivery_time_ar: str(input.deliveryTimeAr, 120),
        shipping_info_en: str(input.shippingInfoEn, 3000),
        shipping_info_ar: str(input.shippingInfoAr, 3000),
        whatsapp_number: whatsapp,
        instagram_url: instagram,
        points_enabled: Boolean(input.pointsEnabled),
        points_per_step: whole(input.pointsPerStep, "Points per step", 0, 100000),
        points_per_review: whole(input.pointsPerReview, "Points per review", 0, 10000),
        points_redeem_points: whole(input.redeemPoints, "Points to redeem", 1, 100000),
        points_redeem_cents: centsOf(input.redeemDollars, "Their value"),
        announcements,
        points_step_cents: centsOf(input.pointsStepDollars, "Points step"),
        reward_coupon_percent: whole(input.rewardPercent, "Reward coupon %", 1, 100),
        reward_coupon_days: whole(input.rewardDays, "Reward coupon days", 1, 365),
        whish_online_enabled: Boolean(input.whishOnline),
        card_online_enabled: Boolean(input.cardOnline),
        charm_price_cents: centsOf(input.charmPrice, "Charm price"),
        checkout_requires_login: Boolean(input.requireLogin),
        ...(input.charmMax !== undefined ? { charm_max: whole(input.charmMax, "Most charms on a chain", 1, 30) } : {}),
        meta_pixel_id: metaPixelId,
        ga4_id: ga4Id,
      })
      .eq("id", 1);
    if (error) throw error;
    revalidateTag(CATALOG_TAG, { expire: 0 });
    refresh();
  });
}
