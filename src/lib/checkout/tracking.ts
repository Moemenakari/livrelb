import "server-only";
import type { createAdminClient } from "@/lib/supabase/public";
import type { OrderStatus } from "./types";

type Db = NonNullable<ReturnType<typeof createAdminClient>>;

export type Tracking = {
  /** Newest first, in the page language. */
  events: { id: string; title: string; note: string | null; at: string }[];
  carrier: string | null;
  trackingNumber: string | null;
  /** Estimated delivery window (ISO dates), only while the order is on its way. */
  eta: { from: string; to: string } | null;
};

type OrderRow = {
  id: string;
  status: OrderStatus;
  created_at: string;
  carrier: string | null;
  tracking_number: string | null;
};

const DAY = 86_400_000;

/** The parcel-style timeline of an order (no personal data). Server only. */
export async function orderTracking(
  db: Db,
  order: OrderRow,
  locale: "en" | "ar",
  days: { min: number; max: number },
): Promise<Tracking> {
  const { data } = await db
    .from("order_events")
    .select("id, title_en, title_ar, note_en, note_ar, created_at")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false });

  const events = (data ?? []).map((e) => ({
    id: e.id,
    title: (locale === "ar" ? e.title_ar : e.title_en) || e.title_en,
    note: (locale === "ar" ? e.note_ar : e.note_en) || e.note_en,
    at: e.created_at,
  }));

  const open = order.status !== "delivered" && order.status !== "cancelled";
  const placed = new Date(order.created_at).getTime();
  return {
    events,
    carrier: order.carrier,
    trackingNumber: order.tracking_number,
    eta: open
      ? { from: new Date(placed + days.min * DAY).toISOString(), to: new Date(placed + days.max * DAY).toISOString() }
      : null,
  };
}
