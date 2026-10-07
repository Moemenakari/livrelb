"use server";

import { refresh, revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";
import { AdminError, authorize, run, type ActionResult } from "./auth";

export type AreaInput = {
  /** null = a new area. */
  id: string | null;
  nameEn: string;
  nameAr: string;
  /** Dollars; empty = the shop's delivery fee. */
  fee: string;
  /** Empty = the shop's delivery days. */
  daysMin: string;
  daysMax: string;
  active: boolean;
};

export type DeliveryInput = { processingMin: string; processingMax: string; areas: AreaInput[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const whole = (v: string, label: string, min: number, max: number) => {
  const n = Number(v);
  if (v.trim() === "" || !Number.isInteger(n) || n < min || n > max) throw new AdminError(`${label}: a whole number ${min}–${max}.`);
  return n;
};
const slugOf = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/** Delivery & times page (owner only): days to make a piece, and each area's fee and delivery days. */
export async function saveDelivery(input: DeliveryInput): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("owner");
    const processingMin = whole(input.processingMin, "Making days (from)", 0, 60);
    const processingMax = whole(input.processingMax, "Making days (to)", processingMin, 60);
    const list = Array.isArray(input.areas) ? input.areas : [];
    if (list.length > 40) throw new AdminError("Up to 40 areas.");

    const rows = list.map((a, i) => {
      const nameEn = str(a.nameEn, 60);
      // The website is English only: the Arabic column keeps what was there, else the English name.
      const nameAr = str(a.nameAr, 60) || nameEn;
      if (!nameEn) throw new AdminError(`Area ${i + 1}: write the name.`);
      if (a.id !== null && !UUID.test(String(a.id))) throw new AdminError("Reload the page and try again.");
      const feeText = str(a.fee, 12);
      const fee = feeText === "" ? null : Number(feeText);
      if (fee !== null && (!Number.isFinite(fee) || fee < 0 || fee > 1000)) throw new AdminError(`${nameEn}: check the delivery fee.`);
      const hasDays = str(a.daysMin, 3) !== "" || str(a.daysMax, 3) !== "";
      const daysMin = hasDays ? whole(str(a.daysMin, 3), `${nameEn} delivery days (from)`, 0, 60) : null;
      const daysMax = hasDays ? whole(str(a.daysMax, 3) || String(daysMin), `${nameEn} delivery days (to)`, daysMin ?? 0, 90) : null;
      return {
        id: a.id,
        name_en: nameEn,
        name_ar: nameAr,
        delivery_fee_cents: fee === null ? null : Math.round(fee * 100),
        delivery_days_min: daysMin,
        delivery_days_max: daysMax,
        is_active: Boolean(a.active),
        sort_order: i,
      };
    });

    // New areas get their address from the English name: check it is free
    // before anything is written, so a mistake never leaves half a save.
    const { data: existing } = await db.from("areas").select("slug");
    const taken = new Set((existing ?? []).map((a) => a.slug));
    const writes = rows.map(({ id, ...row }) => {
      if (id) return { id, row, slug: null };
      const slug = slugOf(row.name_en);
      if (!slug) throw new AdminError(`${row.name_en}: use English letters in the English name.`);
      if (taken.has(slug)) throw new AdminError(`${row.name_en}: this area already exists.`);
      taken.add(slug);
      return { id: null, row, slug };
    });

    try {
      const { error: settingsError } = await db
        .from("site_settings")
        .update({ processing_days_min: processingMin, processing_days_max: processingMax })
        .eq("id", 1);
      if (settingsError) throw settingsError;

      for (const { id, row, slug } of writes) {
        const { error } = id ? await db.from("areas").update(row).eq("id", id) : await db.from("areas").insert({ ...row, slug: slug! });
        if (error) throw error;
      }
    } finally {
      // Whatever was saved shows in the shop right away, even after a failure.
      revalidateTag(CATALOG_TAG, { expire: 0 });
    }
    refresh();
  });
}
