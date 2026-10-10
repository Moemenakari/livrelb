import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { nameOf, staffNames } from "@/lib/admin/data";
import { dateOnly, dateTime, money, prettyPhone, statusLabels, statusTones } from "@/lib/admin/format";
import { can } from "@/lib/admin/permissions";
import { isMissingColumn } from "@/lib/supabase/compat";
import { createClient } from "@/lib/supabase/server";
import { CustomerControls } from "@/components/admin/customer-controls";
import { VerifyControls } from "@/components/admin/verify-controls";
import { Badge, Card, Empty, NoAccess, PageHeader, Stat } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customer" };

const reasons: Record<string, string> = { order: "Order", review: "Review", redeem: "Used on an order", adjust: "By hand" };

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  const staff = await requireStaff();
  if (!can(staff, "customers.view")) return <NoAccess />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const db = await createClient();
  const customerOrders = (live: boolean) => {
    const q = db.from("orders").select("id, number, total_cents, status, created_at, staff_id").eq("customer_id", id);
    return (live ? q.is("deleted_at", null) : q).order("created_at", { ascending: false }).limit(100);
  };
  const [{ data: c }, names, firstOrders, { data: ledger }] = await Promise.all([
    db.from("customers").select("*, areas (name_en)").eq("id", id).maybeSingle(),
    staffNames(),
    customerOrders(true),
    db.from("points_ledger").select("id, delta, reason, note, created_at, created_by, orders (number)").eq("customer_id", id).order("created_at", { ascending: false }).limit(200),
  ]);
  if (!c) notFound();
  // Before the admin redesign database update there is no deleted_at.
  const { data: orders } = isMissingColumn(firstOrders.error) ? await customerOrders(false) : firstOrders;

  const balance = (ledger ?? []).reduce((s, p) => s + p.delta, 0);
  // Same rule as the customers list and the dashboard: cancelled and deleted orders do not count.
  // The order history below still lists them, with their status.
  const counted = (orders ?? []).filter((o) => o.status !== "cancelled");
  const spent = counted.reduce((s, o) => s + o.total_cents, 0);

  return (
    <>
      <PageHeader title={c.name} subtitle={<span dir="ltr">{prettyPhone(c.phone)}</span>} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Orders" value={counted.length} />
              <Stat label="Spent" value={money(spent)} />
              <Stat label="Points" value={balance} sub={`= ${money(balance)} off`} />
            </div>
          </Card>

          <Card title="Order history">
            {(orders ?? []).length === 0 ? (
              <Empty>No orders.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {(orders ?? []).map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.number}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-surface">
                      <span>
                        <span className="font-medium">#{o.number}</span>
                        <span className="block text-xs text-muted">
                          {dateTime(o.created_at)} · {nameOf(names, o.staff_id)}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        {money(o.total_cents)}
                        <Badge tone={statusTones[o.status]}>{statusLabels[o.status]}</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Points history">
            {(ledger ?? []).length === 0 ? (
              <Empty>No points yet.</Empty>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {(ledger ?? []).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      {reasons[p.reason]}
                      {p.orders?.number && ` #${p.orders.number}`}
                      {p.note && <span className="text-muted"> · {p.note}</span>}
                      <span className="block text-xs text-muted">
                        {dateTime(p.created_at)}
                        {p.created_by && ` · ${nameOf(names, p.created_by)}`}
                      </span>
                    </span>
                    <span className={`font-medium tabular-nums ${p.delta > 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {p.delta > 0 ? "+" : ""}
                      {p.delta}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Details">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted">Area</dt>
              <dd>{c.areas?.name_en ?? "—"}</dd>
              <dt className="text-muted">Address</dt>
              <dd className="whitespace-pre-line">{c.address ?? "—"}</dd>
              <dt className="text-muted">Customer since</dt>
              <dd>{dateOnly(c.created_at)}</dd>
              <dt className="text-muted">Phone</dt>
              <dd dir="ltr" className="text-start">
                {prettyPhone(c.phone)}
              </dd>
              <dt className="text-muted">Email (Google)</dt>
              <dd className="break-all">{c.email ?? (c.auth_user_id ? "Google login" : "—")}</dd>
              <dt className="text-muted">Last visit</dt>
              <dd>{c.last_seen_at ? dateTime(c.last_seen_at) : "—"}</dd>
              <dt className="text-muted">Verified</dt>
              <dd className="flex flex-col gap-1.5">
                <VerifyControls customerId={c.id} name={c.name} phone={c.phone} verified={Boolean(c.phone_verified_at)} canEdit={can(staff, "orders.edit")} />
                {c.phone_verified_at && (
                  <span className="text-xs text-muted">
                    {dateTime(c.phone_verified_at)}
                    {c.phone_verified_by && ` · by ${nameOf(names, c.phone_verified_by)}`}
                  </span>
                )}
              </dd>
              <dt className="text-muted">Marketing</dt>
              <dd>{c.marketing_opt_in ? "Opted in" : "No"}</dd>
            </dl>
          </Card>
          <CustomerControls
            customerId={c.id}
            staffId={c.referred_by_staff_id}
            staffName={nameOf(names, c.referred_by_staff_id)}
            since={c.referred_at ? dateOnly(c.referred_at) : null}
            isOwner={staff.isOwner}
            canAdjustPoints={can(staff, "orders.edit")}
            staffOptions={names.filter((s) => s.isActive || s.id === c.referred_by_staff_id).map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
      </div>
    </>
  );
}
