import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { nameOf, staffNames } from "@/lib/admin/data";
import { dateOnly, prettyPhone } from "@/lib/admin/format";
import { can } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { Empty, NoAccess, PageHeader, inputClass, secondaryButtonClass } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customers" };

const PAGE = 50;

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const staff = await requireStaff();
  if (!can(staff, "customers.view")) return <NoAccess />;
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 40);
  const page = Math.max(1, Number(sp.page) || 1);

  const db = await createClient();
  let query = db
    .from("customers")
    .select("id, name, phone, created_at, referred_by_staff_id, areas (name_en)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 4) query = query.like("phone", `%${digits.replace(/^0/, "").slice(-8)}%`);
  else if (q) query = query.ilike("name", `%${q.replace(/[%_,()]/g, "")}%`);

  const [{ data: customers, count }, names] = await Promise.all([query, staffNames()]);

  return (
    <>
      <PageHeader title="Customers" subtitle={`${count ?? 0} customers`} />
      <form method="get" className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} type="search" placeholder="Search by phone (03 123 456) or name" className={inputClass} />
        <button className={secondaryButtonClass}>Search</button>
      </form>
      {(customers ?? []).length === 0 ? (
        <Empty>{q ? "No customer with this phone or name." : "No customers yet."}</Empty>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-background">
          {(customers ?? []).map((c) => (
            <li key={c.id}>
              <Link href={`/admin/customers/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-surface">
                <span className="min-w-0">
                  <span className="font-medium">{c.name}</span>
                  <span className="block text-xs text-muted" dir="ltr">
                    {prettyPhone(c.phone)} · {c.areas?.name_en ?? "—"}
                  </span>
                </span>
                <span className="shrink-0 text-end text-xs text-muted">
                  {nameOf(names, c.referred_by_staff_id)}
                  <span className="block">{dateOnly(c.created_at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {(count ?? 0) > page * PAGE && (
        <div className="mt-4 text-center">
          <Link className={secondaryButtonClass} href={`?${new URLSearchParams({ ...(q && { q }), page: String(page + 1) })}`}>
            More
          </Link>
        </div>
      )}
    </>
  );
}
