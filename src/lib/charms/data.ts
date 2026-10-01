import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";

// What the Charms page needs from the database: the price of one charm
// (Settings) and the Turkish charms in stock that staff added with photos.

export type StockCharm = {
  id: string;
  name: { en: string; ar: string };
  imageUrl: string;
  /** USD; the default charm price when staff set none. */
  price: number;
  inStock: boolean;
};

export const DEFAULT_CHARM_PRICE_CENTS = 1300;

export async function getCharmData(): Promise<{ priceCents: number; stock: StockCharm[] }> {
  const db = isSupabaseConfigured() ? createAdminClient() : null;
  if (!db) return { priceCents: DEFAULT_CHARM_PRICE_CENTS, stock: [] };
  const [{ data: s }, { data: items }] = await Promise.all([
    db.from("site_settings").select("charm_price_cents").eq("id", 1).maybeSingle(),
    db
      .from("charm_items")
      .select("id, name_en, name_ar, image_url, price_cents, in_stock")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at", { ascending: false }),
  ]);
  const priceCents = s?.charm_price_cents ?? DEFAULT_CHARM_PRICE_CENTS;
  return {
    priceCents,
    stock: (items ?? []).map((i) => ({
      id: i.id,
      name: { en: i.name_en, ar: i.name_ar },
      imageUrl: i.image_url,
      price: (i.price_cents ?? priceCents) / 100,
      inStock: i.in_stock,
    })),
  };
}
