"use server";

import { refresh } from "next/cache";
import { authorize, AdminError, run, type ActionResult } from "./auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** New → Contacted → Done, for a charm design a customer sent from the Charms page. */
export async function setCharmStatus(id: string, status: "new" | "contacted" | "done"): Promise<ActionResult> {
  return run(async () => {
    if (!UUID.test(id) || !["new", "contacted", "done"].includes(status)) throw new AdminError("Invalid request.");
    const { db, staff } = await authorize("orders.edit");
    const { error } = await db
      .from("charm_requests")
      .update({ status, handled_by: status === "new" ? null : staff.id })
      .eq("id", id);
    if (error) throw error;
    refresh();
  });
}
