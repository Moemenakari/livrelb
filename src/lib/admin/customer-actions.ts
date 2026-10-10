"use server";

import { refresh } from "next/cache";
import { isMissingColumn } from "@/lib/supabase/compat";
import { AdminError, authorize, run, type ActionResult } from "./auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Owner only: the customer's employee (kept forever, brief §5). Logged by customers_guard. */
export async function reassignCustomer(customerId: string, staffId: string | null): Promise<ActionResult> {
  return run(async () => {
    if (!UUID.test(customerId) || (staffId && !UUID.test(staffId))) throw new AdminError("Invalid value.");
    const { db } = await authorize("owner");
    const { error } = await db
      .from("customers")
      .update({ referred_by_staff_id: staffId, referred_at: staffId ? new Date().toISOString() : null })
      .eq("id", customerId);
    if (error) throw error;
    refresh();
  });
}

/** Add or remove points by hand (reason "adjust", signed by the staff member). */
export async function adjustPoints(customerId: string, delta: number, note: string): Promise<ActionResult> {
  return run(async () => {
    if (!UUID.test(customerId)) throw new AdminError("Invalid customer.");
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) throw new AdminError("Enter a whole number of points.");
    const why = note.trim().slice(0, 200);
    if (!why) throw new AdminError("Write why (it's kept in the points history).");
    const { db, staff } = await authorize("orders.edit");
    const { error } = await db
      .from("points_ledger")
      .insert({ customer_id: customerId, delta, reason: "adjust", note: why, created_by: staff.id });
    if (error) throw error;
    refresh();
  });
}

/**
 * Staff chat with the customer on WhatsApp, then mark her number Verified (or
 * not). Only verified customers can pay cash on delivery. Who and when are kept.
 */
export async function setPhoneVerified(customerId: string, verified: boolean): Promise<ActionResult> {
  return run(async () => {
    if (!UUID.test(customerId)) throw new AdminError("Invalid customer.");
    const { db, staff } = await authorize("orders.edit");
    const at = verified ? new Date().toISOString() : null;
    let { error } = await db.from("customers").update({ phone_verified_at: at, phone_verified_by: verified ? staff.id : null }).eq("id", customerId);
    // Before the admin redesign database update there is no "who verified" column.
    if (isMissingColumn(error)) ({ error } = await db.from("customers").update({ phone_verified_at: at }).eq("id", customerId));
    if (error) throw error;
    refresh();
  });
}
