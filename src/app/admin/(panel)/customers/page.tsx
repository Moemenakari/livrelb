import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { nameOf, staffNames } from "@/lib/admin/data";
import { dateOnly, dateTime, prettyPhone } from "@/lib/admin/format";
import { can } from "@/lib/admin/permissions";
import { isMissingColumn } from "@/lib/supabase/compat";
import { createClient } from "@/lib/supabase/server";
import { VerifyControls } from "@/components/admin/verify-controls";
import { Badge, Empty, NoAccess, PageHeader, inputClass, secondaryButtonClass } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customers" };

const PAGE = 50;

// Every customer who signed up or ordered: who she is, when she was last on the
// site, how many orders and points she has, and whether her number is verified
// (staff chat with her on WhatsApp first; only verified customers pay cash on delivery).
export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const staff = await requireStaff();
  if (!can(staff, "customers.view")) return <NoAccess />;
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 40);
  const filter = sp.verified === "yes" || sp.verified === "no" ? sp.verified : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const db = await createClient();

  type Row = {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    created_at: string;
    last_seen_at?: string | null;
    phone_verified_at: string | null;
    referred_by_staff_id: string | null;
    areas: { name_en: string } | null;
  };
  type Chain = {
    like(column: string, pattern: string): Chain;
    or(filters: string): Chain;
    not(column: string, operator: string, value: null): Chain;
    is(column: string, value: null): Chain;
  };
  type Result = { data: Row[] | null; count: number | null; error: { code?: string } | null };

  const digits = q.replace(/\D/g, "");
  const text = q.replace(/[%_,()]/g, "");
  const columns = "id, name, phone, email, address, created_at, phone_verified_at, referred_by_staff_id, areas (name_en)";
  const list = (withSeen: boolean) => {
    let query = db
      .from("customers")
      .select(withSeen ? `${columns}, last_seen_at` : columns, { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE, page * PAGE - 1) as unknown as Chain;
    if (digits.length >= 4) query = query.like("phone", `%${digits.replace(/^0/, "").slice(-8)}%`);
    else if (text) query = query.or(`name.ilike.%${text}%,email.ilike.%${text}%`);
    if (filter === "yes") query = query.not("phone_verified_at", "is", null);
    if (filter === "no") query = query.is("phone_verified_at", null);
    return query as unknown as PromiseLike<Result>;
  };

  const [first, names] = await Promise.all([list(true), staffNames()]);
  // Before the admin redesign database update there is no last_seen_at.
  const result = isMissingColumn(first.error) ? await list(false) : first;
  const customers = result.data;
  const count = result.count;
  const ids = (customers ?? []).map((c) => c.id);
  const [{ data: orders }, { data: ledger }] = ids.length
    ? await Promise.all([
        db.from("orders").select("customer_id").in("customer_id", ids).is("deleted_at", null).neq("status", "cancelled"),
        db.from("points_ledger").select("customer_id, delta").in("customer_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const orderCount = new Map<string, number>();
  for (const o of orders ?? []) orderCount.set(o.customer_id, (orderCount.get(o.customer_id) ?? 0) + 1);
  const points = new Map<string, number>();
  for (const p of ledger ?? []) points.set(p.customer_id, (points.get(p.customer_id) ?? 0) + p.delta);

  const params = (patch: Record<string, string | number>) => {
    const next = new URLSearchParams({ ...(q && { q }), ...(filter && { verified: filter }) });
    for (const [k, v] of Object.entries(patch)) next.set(k, String(v));
    return `?${next}`;
  };
  const canVerify = can(staff, "orders.edit");

  return (
    <>
      <PageHeader title="Customers" subtitle={`${count ?? 0} customers`} />
      <form method="get" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_11rem_auto]">
        <input name="q" defaultValue={q} type="search" placeholder="Search by name, phone (03 123 456) or email" className={`${inputClass} col-span-2 sm:col-span-1`} />
        <select name="verified" defaultValue={filter} className={inputClass} aria-label="Verified">
          <option value="">All customers</option>
          <option value="yes">Verified</option>
          <option value="no">Not verified</option>
        </select>
        <button className={secondaryButtonClass}>Search</button>
      </form>

      {(customers ?? []).length === 0 ? (
        <Empty>{q || filter ? "No customer matches." : "No customers yet."}</Empty>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-background">
          {(customers ?? []).map((c) => (
            <li key={c.id} className="grid gap-x-4 gap-y-2 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,0.6fr))]">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/customers/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                    {c.name}
                  </Link>
                  {c.phone_verified_at ? <Badge tone="green">Verified</Badge> : <Badge tone="gold">Not verified</Badge>}
                </p>
                <p className="text-xs text-muted" dir="ltr">
                  {prettyPhone(c.phone)}
                </p>
                {c.email && <p className="truncate text-xs text-muted">{c.email}</p>}
                <p className="truncate text-xs text-muted">{[c.areas?.name_en, c.address?.split("\n")[0]].filter(Boolean).join(" · ") || "No address yet"}</p>
                <p className="text-xs text-muted">Brought by {nameOf(names, c.referred_by_staff_id)}</p>
                <div className="mt-2">
                  <VerifyControls customerId={c.id} name={c.name} phone={c.phone} verified={Boolean(c.phone_verified_at)} canEdit={canVerify} />
                </div>
              </div>
              <Cell label="Signed up">{dateOnly(c.created_at)}</Cell>
              <Cell label="Last visit">{c.last_seen_at ? dateTime(c.last_seen_at) : "—"}</Cell>
              <Cell label="Orders">{orderCount.get(c.id) ?? 0}</Cell>
              <Cell label="Points">{points.get(c.id) ?? 0}</Cell>
            </li>
          ))}
        </ul>
      )}
      {(count ?? 0) > page * PAGE && (
        <div className="mt-4 text-center">
          <Link className={secondaryButtonClass} href={params({ page: page + 1 })}>
            More
          </Link>
        </div>
      )}
    </>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 sm:block">
      <span className="text-xs text-muted sm:mb-0.5 sm:block">{label}</span>
      <span className="tabular-nums">{children}</span>
    </div>
  );
}
