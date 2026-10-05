import "server-only";
import type { DayRange, StoreSettings } from "@/lib/catalog/types";
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
  /** Days to design and make the piece, then days to deliver it to the order's area. */
  times: { processing: DayRange; delivery: DayRange };
};

type OrderRow = {
  id: string;
  status: OrderStatus;
  created_at: string;
  carrier: string | null;
  tracking_number: string | null;
  area_id: string | null;
};

const DAY = 86_400_000;

/** The parcel-style timeline of an order (no personal data). Server only. */
export async function orderTracking(
  db: Db,
  order: OrderRow,
  locale: "en" | "ar",
  settings: Pick<StoreSettings, "deliveryDays" | "processingDays">,
): Promise<Tracking> {
  const [{ data }, { data: area }] = await Promise.all([
    db
      .from("order_events")
      .select("id, title_en, title_ar, note_en, note_ar, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false }),
    order.area_id
      ? db.from("areas").select("delivery_days_min, delivery_days_max").eq("id", order.area_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const processing = settings.processingDays;
  const delivery =
    area && area.delivery_days_min !== null && area.delivery_days_max !== null
      ? { min: area.delivery_days_min, max: area.delivery_days_max }
      : settings.deliveryDays;

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
      ? {
          from: new Date(placed + (processing.min + delivery.min) * DAY).toISOString(),
          to: new Date(placed + (processing.max + delivery.max) * DAY).toISOString(),
        }
      : null,
    times: { processing, delivery },
  };
}
