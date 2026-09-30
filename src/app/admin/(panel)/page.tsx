import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { nameOf, personalLink, staffNames } from "@/lib/admin/data";
import { beirutDay, dateTime, money, monthStart, statusLabels, statusTones, weekStart } from "@/lib/admin/format";
import { can } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Empty, PageHeader, Stat } from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/copy-button";

export const metadata: Metadata = { title: "Dashboard" };

type Sales = { staff_id: string | null; orders_count: number; sales_cents: number }[];
const total = (rows: Sales) =>
  rows.reduce((t, r) => ({ orders: t.orders + Number(r.orders_count), cents: t.cents + Number(r.sales_cents) }), { orders: 0, cents: 0 });

// Dashboard (brief §8.5): "Today" starts from 0 every day (Beirut time),
// this week / month, orders and customers per employee, latest orders.
// Sales only, never profit or loss.
export default async function DashboardPage() {
  const staff = await requireStaff();
  const db = await createClient();
  const today = beirutDay();
  const seeSales = can(staff, "sales.view");
  const seeOrders = can(staff, "orders.view");

  const [todayRes, weekRes, monthRes, latestRes, names, myCoupon] = await Promise.all([
    db.rpc("admin_sales", { p_from: today, p_to: today }),
    db.rpc("admin_sales", { p_from: weekStart(today), p_to: today }),
    db.rpc("admin_sales", { p_from: monthStart(today), p_to: today }),
    db
      .from("orders")
      .select("id, number, customer_name, total_cents, status, created_at, staff_id")
      .order("created_at", { ascending: false })
      .limit(seeOrders ? 8 : 0),
    staffNames(),
    db.from("coupons").select("code, type, value").eq("staff_id", staff.id).eq("is_active", true).limit(1).maybeSingle(),
  ]);

  const day = total((todayRes.data ?? []) as Sales);
  const week = total((weekRes.data ?? []) as Sales);
  const month = total((monthRes.data ?? []) as Sales);
  const monthRows = (monthRes.data ?? []) as Sales;
  const mine = monthRows.filter((r) => r.staff_id === staff.id);

  // Customers each employee brought (kept forever, brief §5).
  const people = staff.isOwner ? names.filter((s) => s.isActive) : names.filter((s) => s.id === staff.id);
  const customerCounts = can(staff, "customers.view")
    ? await Promise.all(
        people.map(async (s) => {
          const { count } = await db.from("customers").select("id", { count: "exact", head: true }).eq("referred_by_staff_id", s.id);
          return [s.id, count ?? 0] as const;
        }),
      )
    : [];
  const customersOf = new Map(customerCounts);

  const link = personalLink(staff.refCode);

  return (
    <>
      <PageHeader title={`Hi ${staff.name.split(" ")[0]}`} subtitle={`Today is ${new Date(`${today}T12:00:00Z`).toDateString()}`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card className="col-span-2 border-cedar/30 bg-cedar text-white lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-white/70">Today</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-semibold tabular-nums">{seeSales ? day.orders : "—"}</p>
              <p className="text-sm text-white/80">orders</p>
            </div>
            <div>
              <p className="text-3xl font-semibold tabular-nums">{seeSales ? money(day.cents) : "—"}</p>
              <p className="text-sm text-white/80">sales</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/60">Starts from 0 every day. Website orders + manual entries, cancelled excluded.</p>
        </Card>
        <Card>
          <Stat label="This week" value={seeSales ? money(week.cents) : "—"} sub={seeSales ? `${week.orders} orders` : "No access"} />
        </Card>
        <Card>
          <Stat label="This month" value={seeSales ? money(month.cents) : "—"} sub={seeSales ? `${month.orders} orders` : "No access"} />
        </Card>
      </div>

      {!staff.isOwner && (
        <Card title="My sales" className="mt-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Orders this month" value={total(mine).orders} />
            <Stat label="Sales this month" value={money(total(mine).cents)} />
            <Stat label="My customers" value={customersOf.get(staff.id) ?? "—"} sub="Brought by you, forever" />
          </div>
          <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                My link: <span className="font-medium" dir="ltr">{link}</span>
              </span>
              <CopyButton text={link} share />
            </div>
            {myCoupon.data && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  My code: <span className="font-semibold tracking-wider">{myCoupon.data.code}</span>
                </span>
                <CopyButton text={myCoupon.data.code} />
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {seeSales && staff.isOwner && (
          <Card title="Per employee · this month">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-start text-xs text-muted">
                  <tr>
                    <th className="pb-2 text-start font-medium">Employee</th>
                    <th className="pb-2 text-end font-medium">Orders</th>
                    <th className="pb-2 text-end font-medium">Sales</th>
                    <th className="pb-2 text-end font-medium">Customers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[...people.map((s) => s.id), null].map((id) => {
                    const rows = monthRows.filter((r) => r.staff_id === id);
                    const t = total(rows);
                    return (
                      <tr key={id ?? "none"}>
                        <td className="py-2">{id ? nameOf(names, id) : <span className="text-muted">No employee</span>}</td>
                        <td className="py-2 text-end tabular-nums">{t.orders}</td>
                        <td className="py-2 text-end tabular-nums">{money(t.cents)}</td>
                        <td className="py-2 text-end tabular-nums">{id ? (customersOf.get(id) ?? "—") : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {seeOrders && (
          <Card
            title="Latest orders"
            actions={
              <Link href="/admin/orders" className="text-sm text-gold-dark underline-offset-4 hover:underline">
                All orders
              </Link>
            }
          >
            {(latestRes.data ?? []).length === 0 ? (
              <Empty>No orders yet.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {(latestRes.data ?? []).map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.number}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-surface">
                      <span className="min-w-0">
                        <span className="font-medium">#{o.number}</span> <span className="text-muted">· {o.customer_name}</span>
                        <span className="block text-xs text-muted">
                          {dateTime(o.created_at)} · {nameOf(names, o.staff_id)}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="tabular-nums">{money(o.total_cents)}</span>
                        <Badge tone={statusTones[o.status]}>{statusLabels[o.status]}</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
