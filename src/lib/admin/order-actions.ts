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
