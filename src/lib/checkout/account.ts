import "server-only";
import { findProduct, getCatalog } from "@/lib/catalog";
import type { PointsRules } from "@/lib/catalog/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";
import { verifiedCustomer } from "./customer";
import { orderPoints } from "./points";
import { orderTracking, type Tracking } from "./tracking";
import type { OrderStatus } from "./types";

// "My account": her last order, her LIVRE Points and the tracking of her
// orders, for the customer this browser is verified as (Google login, or the
// device remembered after a trusted order). Server only.

const dollars = (cents: number) => cents / 100;
const MAX_ORDERS = 10;

export type AccountOrder = {
  number: number;
  status: OrderStatus;
  placedAt: string;
  total: number;
  items: { name: string; text: string | null; qty: number }[];
  points: { earned: number; toEarn: number };
  tracking: Tracking;
};

export type Account = {
  name: string;
  /** Points balance and what it is worth. */
  points: { balance: number; value: number };
  rules: PointsRules;
  orders: AccountOrder[];
};

/** null = nobody is signed in on this browser. */
export async function loadAccount(locale: "en" | "ar"): Promise<Account | null> {
  if (!isSupabaseConfigured()) return null;
  const { customerId, authUserId, authName } = await verifiedCustomer();
  const db = createAdminClient();
  const catalog = await getCatalog();
  if (!customerId || !db) {
    return authUserId ? { name: authName ?? "", points: { balance: 0, value: 0 }, rules: catalog.settings.points, orders: [] } : null;
  }

  const [{ data: profile }, { data: s }, { data: orders }] = await Promise.all([
    db.rpc("customer_profile", { p_customer_id: customerId }),
    db.from("site_settings").select("points_redeem_points, points_redeem_cents").eq("id", 1).maybeSingle(),
    db
      .from("orders")
      .select(
        `id, number, status, created_at, total_cents, subtotal_cents, discount_cents, points_discount_cents, carrier, tracking_number, area_id,
         order_items (product_slug, product_name, custom_text, qty)`,
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(MAX_ORDERS),
  ]);
  const me = profile as { name?: string; points?: number } | null;
  const balance = Math.max(0, me?.points ?? 0);
  const value = s ? Math.floor(balance / s.points_redeem_points) * dollars(s.points_redeem_cents) : 0;

  const list = await Promise.all(
    (orders ?? []).map(async (o): Promise<AccountOrder> => {
      const [points, tracking] = await Promise.all([orderPoints(db, o), orderTracking(db, o, locale, catalog.settings)]);
      return {
        number: o.number,
        status: o.status,
        placedAt: o.created_at,
        total: dollars(o.total_cents),
        items: o.order_items.map((i) => ({
          name: findProduct(catalog, i.product_slug)?.name[locale] ?? i.product_name,
          text: i.custom_text,
          qty: i.qty,
        })),
        points,
        tracking,
      };
    }),
  );

  return {
    name: me?.name ?? "",
    points: { balance, value },
    rules: catalog.settings.points,
    orders: list,
  };
}
