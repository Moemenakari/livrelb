"use server";

import { refresh } from "next/cache";
import { authorize, AdminError, run, type ActionResult } from "./auth";
import { isMissingColumn } from "@/lib/supabase/compat";
import { orderStatuses, type AdminOrderStatus } from "./format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new AdminError("Invalid order.");
  return value;
}

/**
 * New → Confirmed → In production → Out for delivery → Delivered, or
 * Cancelled. Delivered gives the LIVRE Points automatically and cancelling
 * takes them back (database trigger orders_points); cancelling needs
 * orders.cancel (checked here and by orders_guard), every change is logged.
 */
export async function setOrderStatus(orderId: string, status: AdminOrderStatus): Promise<ActionResult> {
  return run(async () => {
    if (!orderStatuses.includes(status)) throw new AdminError("Invalid status.");
    const { db } = await authorize(status === "cancelled" ? "orders.cancel" : "orders.edit");
    let { error, count } = await db.from("orders").update({ status }, { count: "exact" }).eq("id", uuid(orderId)).is("deleted_at", null);
    // Before the admin redesign database update there is no deleted_at.
    if (isMissingColumn(error)) ({ error, count } = await db.from("orders").update({ status }, { count: "exact" }).eq("id", uuid(orderId)));
    if (error) throw error;
    if (!count) throw new AdminError("Nothing changed. Is this order deleted, or are you not allowed to change it?");
    refresh();
  });
}

export const deleteReasons = ["test", "error", "other"] as const;
export type DeleteReason = (typeof deleteReasons)[number];

/**
 * Delete an order without losing it: it stays in the Orders list as a red line
 * with the reason and who deleted it, and stops counting in sales and points.
 * Needs orders.cancel (orders_guard checks it again).
 */
export async function deleteOrder(orderId: string, reason: DeleteReason, note: string): Promise<ActionResult> {
  return run(async () => {
    if (!deleteReasons.includes(reason)) throw new AdminError("Choose why you are deleting it.");
    const text = String(note ?? "").trim().slice(0, 500);
    if (reason === "other" && !text) throw new AdminError("Write the reason.");
    const { db } = await authorize("orders.cancel");
    const { error, count } = await db
      .from("orders")
      .update({ deleted_at: new Date().toISOString(), delete_reason: reason, delete_note: text || null }, { count: "exact" })
      .eq("id", uuid(orderId))
      .is("deleted_at", null);
    if (error) throw error;
    if (!count) throw new AdminError("This order is already deleted.");
    refresh();
  });
}

/** Bring a deleted order back (its points are recalculated by the database). */
export async function restoreOrder(orderId: string): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("orders.cancel");
    const { error } = await db
      .from("orders")
      .update({ deleted_at: null })
      .eq("id", uuid(orderId));
    if (error) throw error;
    refresh();
  });
}

/** An internal note on the order (shown in Totals, never to the customer). */
export async function addOrderNote(orderId: string, note: string): Promise<ActionResult> {
  return run(async () => {
    const text = String(note ?? "").trim().slice(0, 500);
    if (!text) throw new AdminError("Write the note.");
    const { db } = await authorize("orders.edit");
    const { error } = await db.rpc("add_order_adjustment", {
      p_order_id: uuid(orderId),
      p_type: "other",
      p_value: 0,
      p_note: text,
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
 * Only for orders delivered before points became automatic: gives their points
 * now (approve_order_points), once per order, and makes the one-use thank-you
 * coupon. New orders get their points the moment they are marked Delivered.
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

// Tracking. These save without refreshing the whole page (the card keeps its
// own list), so they feel instant.

const note = (v: unknown) => String(v ?? "").trim().slice(0, 140);

/** A line on the customer's tracking page (a note from staff). */
export async function addTrackingNote(orderId: string, text: string): Promise<ActionResult<{ id: string; createdAt: string }>> {
  return run(async () => {
    const title = note(text);
    if (!title) throw new AdminError("Write the update for the customer.");
    const { db, staff } = await authorize("orders.edit");
    const { data, error } = await db
      .from("order_events")
      .insert({ order_id: uuid(orderId), title_en: title, title_ar: title, created_by: staff.id })
      .select("id, created_at")
      .single();
    if (error) throw error;
    return { id: data.id, createdAt: data.created_at };
  });
}

/** Fix the wording of a note staff wrote. */
export async function updateTrackingNote(id: string, text: string): Promise<ActionResult> {
  return run(async () => {
    const title = note(text);
    if (!title) throw new AdminError("Write the update for the customer.");
    const { db } = await authorize("orders.edit");
    const { error, count } = await db
      .from("order_events")
      .update({ title_en: title, title_ar: title }, { count: "exact" })
      .eq("id", uuid(id))
      .is("status", null);
    if (error) throw error;
    if (!count) throw new AdminError("This update can't be changed.");
  });
}

/** Remove a note staff wrote (status lines of the order can't be removed). */
export async function deleteTrackingNote(id: string): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("orders.edit");
    const { error, count } = await db.from("order_events").delete({ count: "exact" }).eq("id", uuid(id)).is("status", null);
    if (error) throw error;
    if (!count) throw new AdminError("This update can't be removed.");
  });
}

/** Courier name and tracking number shown on the customer's tracking page (empty = remove). */
export async function saveShipping(orderId: string, carrier: string, trackingNumber: string): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("orders.edit");
    const { error } = await db
      .from("orders")
      .update({ carrier: carrier.trim().slice(0, 60) || null, tracking_number: trackingNumber.trim().slice(0, 60) || null })
      .eq("id", uuid(orderId));
    if (error) throw error;
  });
}
