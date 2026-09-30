"use server";

import { refresh } from "next/cache";
import { normalizePhone } from "@/lib/phone";
import { AdminError, authorize, run, type ActionResult } from "./auth";
import type { ImportRow } from "./import-fields";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max: number) => (v === null || v === undefined ? "" : String(v).trim().slice(0, max));

export type ManualEntryInput = { date: string; orders: string; sales: string; staffId: string; note: string };

/** A day's sales outside the website (shop, Instagram cash…), owner only. Counts in the dashboard. */
export async function saveManualEntry(input: ManualEntryInput): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("owner");
    if (!DAY.test(input.date)) throw new AdminError("Choose the day.");
    const orders = Number(input.orders);
    const sales = Number(input.sales);
    if (!Number.isInteger(orders) || orders < 0 || orders > 10000) throw new AdminError("Orders: a whole number.");
    if (!Number.isFinite(sales) || sales < 0 || sales > 1_000_000) throw new AdminError("Sales: check the amount.");
    const { error } = await db.from("manual_entries").insert({
      entry_date: input.date,
      orders_count: orders,
      sales_cents: Math.round(sales * 100),
      staff_id: UUID.test(input.staffId) ? input.staffId : null,
      note: str(input.note, 300) || null,
    });
    if (error) throw error;
    refresh();
  });
}

export async function deleteManualEntry(id: string): Promise<ActionResult> {
  return run(async () => {
    if (!UUID.test(id)) throw new AdminError("Invalid entry.");
    const { db } = await authorize("owner");
    const { error } = await db.from("manual_entries").delete().eq("id", id);
    if (error) throw error;
    refresh();
  });
}


function toDay(value: string): string | null {
  const v = value.trim();
  if (DAY.test(v.slice(0, 10))) return v.slice(0, 10);
  // 31/12/2025 or 31-12-2025 (day first, as in Lebanon)
  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

/**
 * Old delivery-company orders (CSV / Excel), kept apart from website
 * orders. Their phones count for the "first order free delivery" check.
 * The same order (source + reference) is never imported twice.
 */
export async function importOrders(input: { source: string; rows: ImportRow[] }): Promise<ActionResult<{ saved: number; skipped: number }>> {
  return run(async () => {
    const { db, staff } = await authorize("owner");
    const source = str(input.source, 60);
    if (!source) throw new AdminError("Name the source, e.g. the delivery company.");
    if (!Array.isArray(input.rows) || input.rows.length === 0) throw new AdminError("Nothing to import.");
    if (input.rows.length > 5000) throw new AdminError("Up to 5000 rows at a time: split the file.");

    const batch = crypto.randomUUID();
    let skipped = 0;
    const rows = input.rows.flatMap((r) => {
      const phoneRaw = str(r.phone, 40);
      const totalText = str(r.total, 30).replace(/[^0-9.,-]/g, "").replace(",", ".");
      const total = totalText ? Math.round(Number(totalText) * 100) : null;
      const name = str(r.customer_name, 120);
      if (!phoneRaw && !name) {
        skipped++;
        return [];
      }
      return [
        {
          source,
          batch_id: batch,
          external_ref: str(r.external_ref, 80) || null,
          order_date: r.order_date ? toDay(str(r.order_date, 40)) : null,
          customer_name: name || null,
          phone_raw: phoneRaw || null,
          phone: phoneRaw ? normalizePhone(phoneRaw) : null,
          area: str(r.area, 120) || null,
          address: str(r.address, 500) || null,
          items: str(r.items, 1000) || null,
          total_cents: total !== null && Number.isFinite(total) && total >= 0 ? total : null,
          status: str(r.status, 40) || null,
          raw: r,
          imported_by: staff.id,
        },
      ];
    });

    let saved = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { data, error } = await db
        .from("imported_orders")
        .upsert(chunk, { onConflict: "source,external_ref", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      saved += data?.length ?? 0;
    }
    refresh();
    return { saved, skipped: skipped + (rows.length - saved) };
  });
}
