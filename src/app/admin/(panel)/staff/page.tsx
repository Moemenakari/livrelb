import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { personalLink } from "@/lib/admin/data";
import { addDays, beirutDay, beirutDayStart, dateTime, money, monthStart, prettyPhone, weekStart } from "@/lib/admin/format";
import { isPermission, type Permission } from "@/lib/admin/permissions";
import { isMissingColumn } from "@/lib/supabase/compat";
import { createClient } from "@/lib/supabase/server";
import { StaffManager, type StaffRow } from "@/components/admin/staff-forms";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Staff" };

type Sales = { staff_id: string | null; orders_count: number; sales_cents: number }[];
const totals = (rows: Sales, id: string) => {
  const mine = rows.filter((r) => r.staff_id === id);
  return {
    orders: mine.reduce((t, r) => t + Number(r.orders_count), 0),
    sales: money(mine.reduce((t, r) => t + Number(r.sales_cents), 0)),
  };
};

// Admins only: the team, who is an Admin, their permissions, links, codes, what each
// one sold (today, this week, this month) and what they did on the products this week.
export default async function StaffPage() {
  const me = await requireStaff();
  if (!me.isOwner) return <NoAccess />;
  const db = await createClient();
  const today = beirutDay();
  const since = beirutDayStart(weekStart(today));
  const [firstStaff, { data: coupons }, dayRes, weekRes, monthRes, { data: log }] = await Promise.all([
    db
      .from("staff")
      .select("id, name, phone, ref_code, role, is_active, deleted_at, staff_permissions!staff_permissions_staff_id_fkey (permission, allowed)")
      .order("created_at"),
    db.from("coupons").select("code, staff_id").not("staff_id", "is", null).eq("is_active", true),
    db.rpc("admin_sales", { p_from: today, p_to: today }),
    db.rpc("admin_sales", { p_from: weekStart(today), p_to: today }),
    db.rpc("admin_sales", { p_from: monthStart(today), p_to: today }),
    db
      .from("audit_log")
      .select("actor_staff_id, table_name, action, created_at")
      .not("actor_staff_id", "is", null)
      .gte("created_at", beirutDayStart(addDays(today, -30)))
      .order("created_at", { ascending: false })
      .limit(3000),
  ]);
  // Before the admin redesign database update there is no deleted_at.
  const staffRes = isMissingColumn(firstStaff.error)
    ? await db
        .from("staff")
        .select("id, name, phone, ref_code, role, is_active, staff_permissions!staff_permissions_staff_id_fkey (permission, allowed)")
        .order("created_at")
    : firstStaff;
  const staff = (staffRes.data ?? []) as ((typeof staffRes.data extends (infer R)[] | null ? R : never) & { deleted_at?: string | null })[];
  const customers = await Promise.all(
    staff.map(async (s) => {
      const { count } = await db.from("customers").select("id", { count: "exact", head: true }).eq("referred_by_staff_id", s.id);
      return [s.id, count ?? 0] as const;
    }),
  );
  const customersOf = new Map(customers);

  const lastSeen = new Map<string, string>();
  const added = new Map<string, number>();
  const removed = new Map<string, number>();
  for (const r of log ?? []) {
    if (!r.actor_staff_id) continue;
    if (!lastSeen.has(r.actor_staff_id)) lastSeen.set(r.actor_staff_id, r.created_at);
    if (r.table_name === "products" && r.created_at >= since) {
      if (r.action === "insert") added.set(r.actor_staff_id, (added.get(r.actor_staff_id) ?? 0) + 1);
      if (r.action === "delete") removed.set(r.actor_staff_id, (removed.get(r.actor_staff_id) ?? 0) + 1);
    }
  }

  const rows: StaffRow[] = staff.map((s) => {
    const seen = lastSeen.get(s.id);
    return {
      id: s.id,
      name: s.name,
      phone: prettyPhone(s.phone),
      refCode: s.ref_code,
      isActive: s.is_active,
      isOwner: s.role === "owner",
      isSelf: s.id === me.id,
      deleted: Boolean(s.deleted_at),
      link: personalLink(s.ref_code),
      coupons: (coupons ?? []).filter((c) => c.staff_id === s.id).map((c) => c.code),
      today: totals((dayRes.data ?? []) as Sales, s.id),
      week: totals((weekRes.data ?? []) as Sales, s.id),
      month: totals((monthRes.data ?? []) as Sales, s.id),
      customers: customersOf.get(s.id) ?? 0,
      added: added.get(s.id) ?? 0,
      removed: removed.get(s.id) ?? 0,
      lastActivity: seen ? dateTime(seen) : null,
      off: s.staff_permissions.filter((p) => !p.allowed && isPermission(p.permission)).map((p) => p.permission as Permission),
    };
  });

  return (
    <>
      <PageHeader title="Staff" subtitle="Admins and employees: what each one sold, what they did this week, and what they are allowed to do. Everything is allowed by default." />
      <StaffManager rows={rows} />
    </>
  );
}
