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
  /** A transfer or deposit still to be confirmed by the team; null when nothing is due. */
  payment: { due: number; reported: boolean; confirmed: boolean } | null;
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
  const { customerId } = await verifiedCustomer();
  const db = createAdminClient();
  if (!customerId || !db) return null;

  const catalog = await getCatalog();
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

  // What is still to pay by transfer (after the Phase 1 database update; before it, nothing).
  const ids = (orders ?? []).map((o) => o.id);
  const { data: pay, error: payError } = ids.length
    ? await db.from("orders").select("id, deposit_cents, payment_reported_at, payment_confirmed_at").in("id", ids)
    : { data: null, error: null };
  const payById = new Map((payError ? [] : (pay ?? [])).map((p) => [p.id, p]));

  const list = await Promise.all(
    (orders ?? []).map(async (o): Promise<AccountOrder> => {
      const [points, tracking] = await Promise.all([orderPoints(db, o), orderTracking(db, o, locale, catalog.settings)]);
      const p = payById.get(o.id);
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
        payment:
          p && p.deposit_cents > 0 && o.status !== "cancelled"
            ? { due: dollars(p.deposit_cents), reported: Boolean(p.payment_reported_at), confirmed: Boolean(p.payment_confirmed_at) }
            : null,
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
