import "server-only";
import type { createAdminClient } from "@/lib/supabase/public";

type Db = NonNullable<ReturnType<typeof createAdminClient>>;

/** Points an order earned, or will earn once it is delivered. */
export async function orderPoints(
  db: Db,
  order: { id: string; status: string; subtotal_cents: number; discount_cents: number; points_discount_cents: number },
): Promise<{ earned: number; toEarn: number }> {
  const [{ data: rows }, { data: s }] = await Promise.all([
    db.from("points_ledger").select("delta").eq("order_id", order.id).eq("reason", "order"),
    db.from("site_settings").select("points_enabled, points_per_dollar, points_step_cents").eq("id", 1).maybeSingle(),
  ]);
  const earned = (rows ?? []).reduce((sum, r) => sum + r.delta, 0);
  const cents = order.subtotal_cents - order.discount_cents - order.points_discount_cents;
  // Given by staff after delivery, per full step ($20).
  const toEarn =
    earned === 0 && order.status !== "cancelled" && s?.points_enabled
      ? Math.floor((Math.max(cents, 0) / s.points_step_cents)) * s.points_step_cents * s.points_per_dollar / 100
      : 0;
  return { earned, toEarn };
}
