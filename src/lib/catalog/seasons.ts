import "server-only";
import { unstable_cache } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { CATALOG_TAG } from "./index";
import type { Localized } from "./types";

// Season and collection pages (brief §8.3b): /valentines, /mothers-day,
// /ramadan... created in the admin (collections table) with start and end
// dates. Only running ones are shown.

export type Season = {
  slug: string;
  title: Localized;
  description: Localized;
  couponCode: string | null;
  endsAt: string | null;
  productSlugs: string[];
};

const loadSeasons = unstable_cache(
  async () => {
    const db = createPublicClient();
    const { data } = await db
      .from("collections")
      .select("slug, title_en, title_ar, description_en, description_ar, coupon_code, starts_at, ends_at, collection_products (sort_order, products (slug))")
      .eq("is_active", true);
    return (data ?? []).map((c) => ({
      slug: c.slug,
      title: { en: c.title_en, ar: c.title_ar },
      description: { en: c.description_en, ar: c.description_ar },
      couponCode: c.coupon_code,
      startsAt: c.starts_at,
      endsAt: c.ends_at,
      productSlugs: [...c.collection_products].sort((a, b) => a.sort_order - b.sort_order).flatMap((cp) => (cp.products ? [cp.products.slug] : [])),
    }));
  },
  ["seasons-v1"],
  { tags: [CATALOG_TAG], revalidate: 600 },
);

export async function getSeason(slug: string): Promise<Season | null> {
  if (!isSupabaseConfigured() || !/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const now = Date.now();
  const season = (await loadSeasons()).find(
    (s) => s.slug === slug && (!s.startsAt || Date.parse(s.startsAt) <= now) && (!s.endsAt || Date.parse(s.endsAt) > now),
  );
  if (!season) return null;
  return {
    slug: season.slug,
    title: season.title,
    description: season.description,
    couponCode: season.couponCode,
    endsAt: season.endsAt,
    productSlugs: season.productSlugs,
  };
}
