import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { nameOf, personalLink, staffNames } from "@/lib/admin/data";
import { beirutDay, dateTime, money, monthStart, statusLabels, statusTones, weekStart } from "@/lib/admin/format";
import { can } from "@/lib/admin/permissions";
import { isMissingColumn } from "@/lib/supabase/compat";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Empty, PageHeader, Stat } from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/copy-button";

export const metadata: Metadata = { title: "Dashboard" };

type Sales = { staff_id: string | null; orders_count: number; sales_cents: number }[];
const total = (rows: Sales) =>
  rows.reduce((t, r) => ({ orders: t.orders + Number(r.orders_count), cents: t.cents + Number(r.sales_cents) }), { orders: 0, cents: 0 });

// Dashboard: "Today" starts from 0 every day (Beirut time), this week / month,
// one table with every person (Admins sell too) and the latest orders.
// Sales only, never profit or loss.
export default async function DashboardPage() {
  const staff = await requireStaff();
  const db = await createClient();
  const today = beirutDay();
  const seeSales = can(staff, "sales.view");
  const seeOrders = can(staff, "orders.view");

  const latestOrders = (live: boolean) => {
    const q = db.from("orders").select("id, number, customer_name, total_cents, status, created_at, staff_id");
    return (live ? q.is("deleted_at", null) : q).order("created_at", { ascending: false }).limit(seeOrders ? 8 : 0);
  };
  const [todayRes, weekRes, monthRes, firstLatest, names, myCoupon] = await Promise.all([
    db.rpc("admin_sales", { p_from: today, p_to: today }),
    db.rpc("admin_sales", { p_from: weekStart(today), p_to: today }),
    db.rpc("admin_sales", { p_from: monthStart(today), p_to: today }),
    latestOrders(true),
    staffNames(),
    db.from("coupons").select("code, type, value").eq("staff_id", staff.id).eq("is_active", true).limit(1).maybeSingle(),
  ]);

  // Before the admin redesign database update there is no deleted_at.
  const latestRes = isMissingColumn(firstLatest.error) ? await latestOrders(false) : firstLatest;

  const rows = {
    day: (todayRes.data ?? []) as Sales,
    week: (weekRes.data ?? []) as Sales,
    month: (monthRes.data ?? []) as Sales,
  };
  const day = total(rows.day);
  const week = total(rows.week);
  const month = total(rows.month);
  const of = (list: Sales, id: string | null) => total(list.filter((r) => r.staff_id === id));

  // Customers each person brought (kept forever, brief §5).
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
  const personIds = [...people.map((s) => s.id), ...(staff.isOwner ? [null] : [])];
  const personName = (id: string | null) => {
    const person = id ? people.find((s) => s.id === id) : null;
    return id ? (
      <>
        {nameOf(names, id)}
        {person?.role === "owner" && (
          <span className="ms-2">
            <Badge tone="gold">Admin</Badge>
          </span>
        )}
      </>
    ) : (
      <span className="text-muted">No employee</span>
    );
  };
  const cell = (t: { orders: number; cents: number }) => (
    <td className="py-2 text-end tabular-nums">
      {t.orders}
      <span className="text-muted"> · {money(t.cents)}</span>
    </td>
  );

  return (
    <>
      <PageHeader
        title={`Hi ${staff.name.split(" ")[0]}`}
        subtitle={
          <>
            <Badge tone={staff.isOwner ? "gold" : "neutral"}>{staff.isOwner ? "Admin" : "Employee"}</Badge>{" "}
            <span>Today is {new Date(`${today}T12:00:00Z`).toDateString()}</span>
          </>
        }
      />

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
          <p className="mt-3 text-xs text-white/60">Starts from 0 every day. Cancelled and deleted orders are not counted.</p>
        </Card>
        <Card>
          <Stat label="This week" value={seeSales ? money(week.cents) : "—"} sub={seeSales ? `${week.orders} orders` : "No access"} />
        </Card>
        <Card>
          <Stat label="This month" value={seeSales ? money(month.cents) : "—"} sub={seeSales ? `${month.orders} orders` : "No access"} />
        </Card>
      </div>

      {seeSales && (
        <Card title={staff.isOwner ? "Sales per person" : "My sales"} className="mt-4">
          {/* Phones: one small card per person, so no column is ever cut off. */}
          <ul className="flex flex-col gap-3 sm:hidden">
            {personIds.map((id) => (
              <li key={id ?? "none"} className="rounded-lg border border-line p-3 text-sm">
                <p className="font-medium">{personName(id)}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                  {(
                    [
                      ["Today", rows.day],
                      ["This week", rows.week],
                      ["This month", rows.month],
                    ] as const
                  ).map(([label, list]) => {
                    const t = of(list, id);
                    return (
                      <div key={label}>
                        <dt className="text-xs text-muted">{label}</dt>
                        <dd className="tabular-nums">
                          {t.orders}
                          <span className="text-muted"> · {money(t.cents)}</span>
                        </dd>
                      </div>
                    );
                  })}
                  {id && (
                    <div>
                      <dt className="text-xs text-muted">Customers</dt>
                      <dd className="tabular-nums">{customersOf.get(id) ?? "—"}</dd>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-2 text-start font-medium">Person</th>
                  <th className="pb-2 text-end font-medium">Today</th>
                  <th className="pb-2 text-end font-medium">This week</th>
                  <th className="pb-2 text-end font-medium">This month</th>
                  <th className="pb-2 text-end font-medium">Customers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {personIds.map((id) => {
                  return (
                    <tr key={id ?? "none"}>
                      <td className="py-2">{personName(id)}</td>
                      {cell(of(rows.day, id))}
                      {cell(of(rows.week, id))}
                      {cell(of(rows.month, id))}
                      <td className="py-2 text-end tabular-nums">{id ? (customersOf.get(id) ?? "—") : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!staff.isOwner && (
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
          )}
        </Card>
      )}

      {seeOrders && (
        <Card
          title="Latest orders"
          className="mt-4"
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
    </>
  );
}
