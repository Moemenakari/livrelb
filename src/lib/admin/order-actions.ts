"use server";

import { refresh } from "next/cache";
import { authorize, AdminError, run, type ActionResult } from "./auth";
import { orderStatuses, type AdminOrderStatus } from "./format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new AdminError("Invalid order.");
  return value;
}

/**
 * New → Confirmed → In production → Out for delivery → Delivered, or
 * Cancelled. Confirming gives the LIVRE Points and cancelling takes them
 * back (database trigger orders_points); cancelling needs orders.cancel
 * (checked here and by orders_guard), every change is logged.
 */
export async function setOrderStatus(orderId: string, status: AdminOrderStatus): Promise<ActionResult> {
  return run(async () => {
    if (!orderStatuses.includes(status)) throw new AdminError("Invalid status.");
    const { db } = await authorize(status === "cancelled" ? "orders.cancel" : "orders.edit");
    const { error, count } = await db.from("orders").update({ status }, { count: "exact" }).eq("id", uuid(orderId));
    if (error) throw error;
    if (!count) throw new AdminError("You don't have permission to do this.");
    refresh();
  });
}

const adjustmentTypes = ["gift", "discount_percent", "free_delivery", "extra_delivery", "other"] as const;
export type AdjustmentType = (typeof adjustmentTypes)[number];

/** Gift, % discount, free delivery, extra delivery fee or a note (add_order_adjustment). */
export async function addAdjustment(
  orderId: string,
  input: { type: AdjustmentType; value: number; note: string },
): Promise<ActionResult> {
  return run(async () => {
    if (!adjustmentTypes.includes(input.type)) throw new AdminError("Invalid adjustment.");
    const value = Number(input.value);
    if (!Number.isFinite(value) || Math.abs(value) > 100000) throw new AdminError("Please check the amount.");
    const note = String(input.note ?? "").trim().slice(0, 500);
    if (input.type === "other" && value === 0 && !note) throw new AdminError("Write a note or an amount.");
    const { db } = await authorize("orders.edit");
    const { error } = await db.rpc("add_order_adjustment", {
      p_order_id: uuid(orderId),
      p_type: input.type,
      p_value: value,
      p_note: note || undefined,
    });
    if (error) throw error;
    refresh();
  });
}

/** Owner only: credit an order to another employee (logged by orders_guard). */
export async function reassignOrder(orderId: string, staffId: string | null): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("owner");
    const { error } = await db
      .from("orders")
      .update({ staff_id: staffId ? uuid(staffId) : null })
      .eq("id", uuid(orderId));
    if (error) throw error;
    refresh();
  });
}

export type PointsApproval = {
  points: number;
  balance: number;
  couponCode: string;
  couponPercent: number;
  couponEndsAt: string;
  customerName: string;
  customerPhone: string;
  orderNumber: number;
};

/**
 * Staff approve an order's LIVRE Points after delivery (approve_order_points):
 * once per order, per $20, and it makes a one-use reward coupon. The result
 * feeds the "thank you" message.
 */
export async function approveOrderPoints(orderId: string): Promise<ActionResult<PointsApproval>> {
  return run(async () => {
    const { db } = await authorize("orders.edit");
    const { data, error } = await db.rpc("approve_order_points", { p_order_id: uuid(orderId) });
    if (error) {
      if (/already approved|Delivered|under the points step|Not allowed/.test(error.message)) {
        throw new AdminError(error.message);
      }
      throw error;
    }
    const r = data as Record<string, string | number>;
    refresh();
    return {
      points: Number(r.points),
      balance: Number(r.balance),
      couponCode: String(r.coupon_code),
      couponPercent: Number(r.coupon_percent),
      couponEndsAt: String(r.coupon_ends_at),
      customerName: String(r.customer_name),
      customerPhone: String(r.customer_phone),
      orderNumber: Number(r.order_number),
    };
  });
}

/** A line on the customer's tracking page (note from staff, shown to the customer). */
export async function addTrackingNote(orderId: string, en: string, ar: string): Promise<ActionResult> {
  return run(async () => {
    const titleEn = en.trim().slice(0, 140);
    const titleAr = ar.trim().slice(0, 140) || titleEn;
    if (!titleEn) throw new AdminError("Write the update for the customer.");
    const { db, staff } = await authorize("orders.edit");
    const { error } = await db.from("order_events").insert({
      order_id: uuid(orderId),
      title_en: titleEn,
      title_ar: titleAr,
      created_by: staff.id,
    });
    if (error) throw error;
    refresh();
  });
}

/** Courier name and tracking number shown on the customer's tracking page. */
export async function saveShipping(orderId: string, carrier: string, trackingNumber: string): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("orders.edit");
    const { error } = await db
      .from("orders")
      .update({ carrier: carrier.trim().slice(0, 60) || null, tracking_number: trackingNumber.trim().slice(0, 60) || null })
      .eq("id", uuid(orderId));
    if (error) throw error;
    refresh();
  });
}
