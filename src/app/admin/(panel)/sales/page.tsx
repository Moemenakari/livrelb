import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { nameOf, staffNames } from "@/lib/admin/data";
import { money } from "@/lib/admin/format";
import { can } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { SalesTools } from "@/components/admin/sales-tools";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Sales tools" };

// Manual daily entries (sales outside the website) and the import of old
// delivery-company orders. Adding and importing: owner only.
export default async function SalesPage() {
  const staff = await requireStaff();
  if (!can(staff, "sales.view")) return <NoAccess />;
  const db = await createClient();
  const [{ data: entries }, names, { count }] = await Promise.all([
    db.from("manual_entries").select("id, entry_date, orders_count, sales_cents, staff_id, note").order("entry_date", { ascending: false }).limit(30),
    staffNames(),
    db.from("imported_orders").select("id", { count: "exact", head: true }),
  ]);
  return (
    <>
      <PageHeader title="Sales tools" subtitle="Manual entries count in the dashboard's Today, week and month." />
      <SalesTools
        isOwner={staff.isOwner}
        importedCount={count ?? 0}
        staff={names.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name }))}
        entries={(entries ?? []).map((e) => ({
          id: e.id,
          date: e.entry_date,
          orders: e.orders_count,
          sales: money(e.sales_cents),
          staff: nameOf(names, e.staff_id),
          note: e.note,
        }))}
      />
    </>
  );
}
