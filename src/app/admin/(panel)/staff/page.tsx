import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { personalLink } from "@/lib/admin/data";
import { beirutDay, money, monthStart, prettyPhone } from "@/lib/admin/format";
import { isPermission, type Permission } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { StaffManager } from "@/components/admin/staff-forms";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Staff" };

// Owner only: employees, their permissions, links, codes and sales.
export default async function StaffPage() {
  const me = await requireStaff();
  if (!me.isOwner) return <NoAccess />;
  const db = await createClient();
  const today = beirutDay();
  const [{ data: staff }, { data: coupons }, { data: sales }] = await Promise.all([
    db.from("staff").select("id, name, phone, ref_code, role, is_active, staff_permissions!staff_permissions_staff_id_fkey (permission, allowed)").order("created_at"),
    db.from("coupons").select("code, staff_id").not("staff_id", "is", null).eq("is_active", true),
    db.rpc("admin_sales", { p_from: monthStart(today), p_to: today }),
  ]);
  const customers = await Promise.all(
    (staff ?? []).map(async (s) => {
      const { count } = await db.from("customers").select("id", { count: "exact", head: true }).eq("referred_by_staff_id", s.id);
      return [s.id, count ?? 0] as const;
    }),
  );
  const customersOf = new Map(customers);

  return (
    <>
      <PageHeader title="Staff" subtitle="Everything is allowed by default; switch off what an employee shouldn't do." />
      <StaffManager
        rows={(staff ?? []).map((s) => {
          const mine = (sales ?? []).filter((r) => r.staff_id === s.id);
          return {
            id: s.id,
            name: s.name,
            phone: prettyPhone(s.phone),
            refCode: s.ref_code,
            isActive: s.is_active,
            isOwner: s.role === "owner",
            link: personalLink(s.ref_code),
            coupons: (coupons ?? []).filter((c) => c.staff_id === s.id).map((c) => c.code),
            monthOrders: mine.reduce((t, r) => t + Number(r.orders_count), 0),
            monthSales: money(mine.reduce((t, r) => t + Number(r.sales_cents), 0)),
            customers: customersOf.get(s.id) ?? 0,
            off: s.staff_permissions.filter((p) => !p.allowed && isPermission(p.permission)).map((p) => p.permission as Permission),
          };
        })}
      />
    </>
  );
}
