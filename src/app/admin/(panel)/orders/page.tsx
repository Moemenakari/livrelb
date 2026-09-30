import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { nameOf, staffNames } from "@/lib/admin/data";
import { beirutDayStart, addDays, dateTime, money, orderStatuses, statusLabels, statusTones } from "@/lib/admin/format";
import { can } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { Badge, Empty, NoAccess, PageHeader, inputClass, secondaryButtonClass } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Orders" };

const PAGE = 50;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Orders list with filters (status, employee, date, area) and a search by
// order number, phone or name. Filters live in the URL, so a filtered list
// can be bookmarked or shared.
export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const staff = await requireStaff();
  if (!can(staff, "orders.view")) return <NoAccess />;
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const status = orderStatuses.find((s) => s === one("status"));
  const employee = one("staff");
  const area = one("area");
  const from = DAY.test(one("from")) ? one("from") : "";
  const to = DAY.test(one("to")) ? one("to") : "";
  const q = one("q").trim().slice(0, 40);
  const page = Math.max(1, Number(one("page")) || 1);

  const db = await createClient();
  let query = db
    .from("orders")
    .select("id, number, customer_name, phone, area_name, total_cents, status, payment_method, created_at, staff_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (status) query = query.eq("status", status);
  if (employee === "none") query = query.is("staff_id", null);
  else if (/^[0-9a-f-]{36}$/.test(employee)) query = query.eq("staff_id", employee);
  if (area) query = query.eq("area_name", area);
  if (from) query = query.gte("created_at", beirutDayStart(from));
  if (to) query = query.lt("created_at", beirutDayStart(addDays(to, 1)));
  if (q) {
    const digits = q.replace(/\D/g, "");
    if (/^#?\d{1,9}$/.test(q)) query = query.eq("number", Number(digits));
    else if (digits.length >= 6) query = query.like("phone", `%${digits.slice(-7)}`);
    else query = query.ilike("customer_name", `%${q.replace(/[%_,()]/g, "")}%`);
  }

  const [{ data: orders, count }, names, { data: areas }] = await Promise.all([
    query,
    staffNames(),
    db.from("areas").select("name_en").order("sort_order"),
  ]);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const params = (patch: Record<string, string | number>) => {
    const next = new URLSearchParams({ ...(status && { status }), ...(employee && { staff: employee }), ...(area && { area }), ...(from && { from }), ...(to && { to }), ...(q && { q }) });
    for (const [k, v] of Object.entries(patch)) next.set(k, String(v));
    return `?${next}`;
  };

  return (
    <>
      <PageHeader title="Orders" subtitle={`${count ?? 0} orders`} />

      <form className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7" method="get">
        <input name="q" defaultValue={q} placeholder="# / phone / name" className={`${inputClass} col-span-2 sm:col-span-3 lg:col-span-2`} />
        <select name="status" defaultValue={status ?? ""} className={inputClass} aria-label="Status">
          <option value="">All statuses</option>
          {orderStatuses.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
        <select name="staff" defaultValue={employee} className={inputClass} aria-label="Employee">
          <option value="">All employees</option>
          <option value="none">No employee</option>
          {names.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="area" defaultValue={area} className={inputClass} aria-label="Area">
          <option value="">All areas</option>
          {(areas ?? []).map((a) => (
            <option key={a.name_en} value={a.name_en}>
              {a.name_en}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={from} className={inputClass} aria-label="From" />
        <input type="date" name="to" defaultValue={to} className={inputClass} aria-label="To" />
        <div className="col-span-2 flex gap-2 sm:col-span-3 lg:col-span-7">
          <button className={secondaryButtonClass}>Filter</button>
          <Link href="/admin/orders" className={`${secondaryButtonClass} border-transparent`}>
            Clear
          </Link>
        </div>
      </form>

      {(orders ?? []).length === 0 ? (
        <Empty>No orders match these filters.</Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-background">
          <ul className="divide-y divide-line">
            {(orders ?? []).map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.number}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-surface sm:grid-cols-[5rem_1fr_9rem_7rem_6rem]"
                >
                  <span className="font-semibold">#{o.number}</span>
                  <span className="order-3 col-span-2 min-w-0 truncate text-muted sm:order-none sm:col-span-1 sm:text-foreground">
                    {o.customer_name} <span className="text-muted">· {o.area_name ?? "—"}</span>
                  </span>
                  <span className="order-4 col-span-2 text-xs text-muted sm:order-none sm:col-span-1 sm:text-sm">
                    {dateTime(o.created_at)} · {nameOf(names, o.staff_id)}
                  </span>
                  <span className="justify-self-end sm:justify-self-start">
                    <Badge tone={statusTones[o.status]}>{statusLabels[o.status]}</Badge>
                  </span>
                  <span className="hidden text-end tabular-nums sm:block">{money(o.total_cents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pages">
          {page > 1 ? <Link className={secondaryButtonClass} href={params({ page: page - 1 })}>Previous</Link> : <span />}
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link className={secondaryButtonClass} href={params({ page: page + 1 })}>Next</Link> : <span />}
        </nav>
      )}
    </>
  );
}
