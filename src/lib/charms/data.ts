import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";

// What the Charms page needs from the database: the price of one charm and the
// most charms on a chain (Settings), and the charms with photos that staff
// added or imported (family "charms" or "turkish", in gold or silver).

export type CharmFamily = "charms" | "turkish";

export type StockCharm = {
  id: string;
  name: { en: string; ar: string };
  imageUrl: string;
  /** USD; the default charm price when staff set none. */
  price: number;
  inStock: boolean;
  family: CharmFamily;
  /** null = shown in both metals. */
  metal: "gold" | "silver" | null;
};

export const DEFAULT_CHARM_PRICE_CENTS = 950;
export const DEFAULT_CHARM_MAX = 12;

type ItemRow = {
  id: string;
  name_en: string;
  name_ar: string;
  image_url: string;
  price_cents: number | null;
  in_stock: boolean;
  family?: string;
  metal?: string | null;
};

export async function getCharmData(): Promise<{ priceCents: number; max: number; stock: StockCharm[] }> {
  const db = isSupabaseConfigured() ? createAdminClient() : null;
  if (!db) return { priceCents: DEFAULT_CHARM_PRICE_CENTS, max: DEFAULT_CHARM_MAX, stock: [] };

  // family / metal / charm_max come from the Phase 1 database update; before it
  // the page works as it did (every listed charm is a Turkish one).
  const [settingsNew, itemsNew] = await Promise.all([
    db.from("site_settings").select("charm_price_cents, charm_max").eq("id", 1).maybeSingle(),
    db
      .from("charm_items")
      .select("id, name_en, name_ar, image_url, price_cents, in_stock, family, metal")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at", { ascending: false }),
  ]);
  const settings = settingsNew.error
    ? (await db.from("site_settings").select("charm_price_cents").eq("id", 1).maybeSingle()).data
    : settingsNew.data;
  const items: ItemRow[] =
    (itemsNew.error
      ? (
          await db
            .from("charm_items")
            .select("id, name_en, name_ar, image_url, price_cents, in_stock")
            .eq("is_active", true)
            .order("sort_order")
            .order("created_at", { ascending: false })
          ).data
      : itemsNew.data) ?? [];

  const priceCents = settings?.charm_price_cents ?? DEFAULT_CHARM_PRICE_CENTS;
  return {
    priceCents,
    max: (settings as { charm_max?: number } | null)?.charm_max ?? DEFAULT_CHARM_MAX,
    stock: items.map((i) => ({
      id: i.id,
      name: { en: i.name_en, ar: i.name_ar },
      imageUrl: i.image_url,
      price: (i.price_cents ?? priceCents) / 100,
      inStock: i.in_stock,
      family: i.family === "charms" ? "charms" : "turkish",
      metal: i.metal === "gold" || i.metal === "silver" ? i.metal : null,
    })),
  };
}
