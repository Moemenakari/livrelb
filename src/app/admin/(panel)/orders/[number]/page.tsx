import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { nameOf, staffNames } from "@/lib/admin/data";
import { dateTime, money, prettyPhone, statusLabels, statusTones } from "@/lib/admin/format";
import { can } from "@/lib/admin/permissions";
import { allMaterials, isFontKey } from "@/lib/catalog/materials";
import { createClient } from "@/lib/supabase/server";
import { AdminPreview } from "@/components/admin/admin-preview";
import { OrderControls } from "@/components/admin/order-controls";
import { PointsCard } from "@/components/admin/points-approval";
import { TrackingCard } from "@/components/admin/tracking-card";
import { Badge, Card, NoAccess, PageHeader } from "@/components/admin/ui";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[number]">): Promise<Metadata> {
  return { title: `Order #${(await params).number}` };
}

const sources: Record<string, string> = {
  code: "Personal code",
  checkout: "“Who helped you?” at checkout",
  customer_history: "The customer's employee (kept forever)",
  link: "Personal link",
};

const deleteReasons: Record<string, string> = { test: "Test order", error: "Error / by mistake", other: "Other" };

export default async function OrderPage({ params }: PageProps<"/admin/orders/[number]">) {
  const staff = await requireStaff();
  if (!can(staff, "orders.view")) return <NoAccess />;
  const { number } = await params;
  if (!/^\d{1,12}$/.test(number)) notFound();

  const db = await createClient();
  const { data: order } = await db
    .from("orders")
    .select(
      `*, order_items (id, product_slug, product_name, material_name, font_name, custom_text, chain_connection,
         size_kind, size_value, unit_price_cents, qty, line_total_cents, materials (key), fonts (key)),
       order_adjustments (id, type, value, amount_cents, note, created_by, created_at)`,
    )
    .eq("number", Number(number))
    .maybeSingle();
  if (!order) notFound();

  const [names, { data: settings }, { data: points }, { data: customer }, { data: events }, { data: ledger }, { data: coupon }] = await Promise.all([
    staffNames(),
    db.from("site_settings").select("points_step_cents, points_per_step").eq("id", 1).maybeSingle(),
    db.from("points_ledger").select("delta, reason").eq("order_id", order.id),
    db.from("customers").select("id, referred_by_staff_id, phone_verified_at").eq("id", order.customer_id).maybeSingle(),
    db.from("order_events").select("id, status, title_en, created_at").eq("order_id", order.id).order("created_at"),
    db.from("points_ledger").select("delta").eq("customer_id", order.customer_id),
    order.reward_coupon_code
      ? db.from("coupons").select("code, value, ends_at").eq("code", order.reward_coupon_code).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const earned = (points ?? []).filter((p) => p.reason === "order").reduce((s, p) => s + p.delta, 0);
  const balance = (ledger ?? []).reduce((s, p) => s + p.delta, 0);

  const step = settings?.points_step_cents ?? 1500;
  const wouldEarn =
    Math.floor(Math.max(order.subtotal_cents - order.discount_cents - order.points_discount_cents, 0) / step) * (settings?.points_per_step ?? 10);

  // Before the admin redesign database update there is no deleted_at (undefined = not deleted).
  const deleted = Boolean(order.deleted_at);
  const live = !deleted && order.status !== "cancelled";

  const itemsText = order.order_items
    .map((i) => `${i.qty}× ${i.product_name}${i.custom_text ? ` "${i.custom_text}"` : ""} (${i.material_name}${i.font_name ? `, ${i.font_name}` : ""}${i.size_value ? `, ${i.size_value} cm` : ""})`)
    .join("\n");
  const whatsappText = `LIVRE order #${order.number}\n${itemsText}\nTotal: ${money(order.total_cents)}\n${order.customer_name} · ${prettyPhone(order.phone)}\n${order.area_name ?? ""} ${order.address ?? ""}`.trim();

  return (
    <>
      <PageHeader
        title={`Order #${order.number}`}
        subtitle={`${dateTime(order.created_at)} · Ordered on the website, confirmed on WhatsApp`}
        actions={
          deleted ? <Badge tone="red">Deleted</Badge> : <Badge tone={statusTones[order.status]}>{statusLabels[order.status]}</Badge>
        }
      />

      {deleted && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="status">
          <p className="font-semibold">This order was deleted: {deleteReasons[order.delete_reason ?? "other"] ?? "Other"}.</p>
          <p className="mt-0.5">
            By {nameOf(names, order.deleted_by)}
            {order.deleted_at && ` · ${dateTime(order.deleted_at)}`}
            {order.delete_note && ` · ${order.delete_note}`}
          </p>
          <p className="mt-0.5 text-red-800/80">It does not count in sales or points. Restore it from the side panel if it was a mistake.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card title={`Pieces (${order.order_items.reduce((s, i) => s + i.qty, 0)})`}>
            <ul className="divide-y divide-line">
              {order.order_items.map((i) => {
                // Past Rose Gold orders still draw in rose gold.
                const material = allMaterials.find((m) => m === i.materials?.key) ?? (i.materials?.key === "rose" ? "rose" : "gold");
                const font = isFontKey(i.fonts?.key) ? i.fonts!.key : undefined;
                return (
                  <li key={i.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="w-32 shrink-0 overflow-hidden rounded-lg border border-line bg-blush sm:w-40">
                      {i.custom_text ? (
                        <AdminPreview
                          text={i.custom_text}
                          material={material}
                          font={font}
                          connection={i.chain_connection ?? undefined}
                          variant={i.size_kind === "bracelet" ? "bracelet" : "necklace"}
                        />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center text-xs text-muted">No name</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">
                        {i.qty}× {i.product_name}
                      </p>
                      {i.custom_text && (
                        <p className="mt-1 text-lg font-semibold" dir="auto">
                          “{i.custom_text}”
                        </p>
                      )}
                      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-muted">
                        <dt>Material</dt>
                        <dd className="text-foreground">{i.material_name}</dd>
                        {i.font_name && (
                          <>
                            <dt>Font</dt>
                            <dd className="text-foreground">{i.font_name}</dd>
                          </>
                        )}
                        {i.size_value && (
                          <>
                            <dt>{i.size_kind === "ring" ? "Ring size" : i.size_kind === "bracelet" ? "Bracelet" : "Chain"}</dt>
                            <dd className="text-foreground">{i.size_kind === "ring" ? `US ${i.size_value}` : `${i.size_value} cm`}</dd>
                          </>
                        )}
                        {i.chain_connection && (
                          <>
                            <dt>Connection</dt>
                            <dd className="text-foreground">{i.chain_connection === "center" ? "Center" : "Both sides"}</dd>
                          </>
                        )}
                      </dl>
                      <p className="mt-1 tabular-nums">{money(i.line_total_cents)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Totals">
            <dl className="flex flex-col gap-1.5 text-sm">
              <Row label="Items" value={money(order.subtotal_cents)} />
              {order.discount_cents > 0 && <Row label={`Code ${order.coupon_code ?? ""}`} value={`−${money(order.discount_cents)}`} />}
              {order.points_discount_cents > 0 && <Row label={`Points (${order.points_used})`} value={`−${money(order.points_discount_cents)}`} />}
              <Row label="Delivery" value={order.delivery_fee_cents ? money(order.delivery_fee_cents) : "Free"} />
              {order.order_adjustments.map((a) => (
                <Row
                  key={a.id}
                  label={`${adjustmentLabel(a.type, a.value)}${a.note ? ` · ${a.note}` : ""} (${nameOf(names, a.created_by)})`}
                  value={a.amount_cents ? money(a.amount_cents) : "—"}
                />
              ))}
              <div className="mt-1 flex justify-between border-t border-line pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(order.total_cents)}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <OrderControls
            orderId={order.id}
            status={order.status}
            deleted={deleted}
            canEdit={can(staff, "orders.edit")}
            canCancel={can(staff, "orders.cancel")}
            isOwner={staff.isOwner}
            staffId={order.staff_id}
            staffOptions={names.filter((s) => s.isActive || s.id === order.staff_id).map((s) => ({ id: s.id, name: s.name }))}
            whatsapp={{ phone: order.phone, text: whatsappText }}
          />

          {live && can(staff, "orders.edit") && (
            <TrackingCard
              orderId={order.id}
              orderNumber={order.number}
              customerName={order.customer_name}
              customerPhone={order.phone}
              carrier={order.carrier}
              trackingNumber={order.tracking_number}
              events={(events ?? []).map((e) => ({ id: e.id, status: e.status, title: e.title_en, at: e.created_at }))}
            />
          )}

          {!deleted && (
            <PointsCard
              orderId={order.id}
              status={order.status}
              earned={earned}
              wouldEarn={wouldEarn}
              canEdit={can(staff, "orders.edit")}
              balance={balance}
              coupon={coupon ? { code: coupon.code, percent: coupon.value, endsAt: coupon.ends_at ?? new Date().toISOString() } : null}
              customer={{ name: order.customer_name, phone: order.phone, orderNumber: order.number }}
            />
          )}

          <Card title="Customer">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted">Name</dt>
              <dd>
                {customer && can(staff, "customers.view") ? (
                  <Link href={`/admin/customers/${customer.id}`} className="underline underline-offset-4">
                    {order.customer_name}
                  </Link>
                ) : (
                  order.customer_name
                )}
              </dd>
              <dt className="text-muted">Phone</dt>
              <dd dir="ltr" className="text-start">
                <a href={`tel:${order.phone}`} className="underline underline-offset-4">
                  {prettyPhone(order.phone)}
                </a>
              </dd>
              <dt className="text-muted">Verified</dt>
              <dd>{customer?.phone_verified_at ? <Badge tone="green">Verified</Badge> : <Badge tone="gold">Needs verification</Badge>}</dd>
              <dt className="text-muted">Area</dt>
              <dd>{order.area_name ?? "—"}</dd>
              <dt className="text-muted">Address</dt>
              <dd className="whitespace-pre-line">{order.address ?? "—"}</dd>
              {order.notes && (
                <>
                  <dt className="text-muted">Notes</dt>
                  <dd className="whitespace-pre-line">{order.notes}</dd>
                </>
              )}
              <dt className="text-muted">First order</dt>
              <dd>{order.is_first_order ? "Yes" : "No"}</dd>
            </dl>
          </Card>

          <Card title="Attribution">
            <p className="text-sm">
              <span className="font-medium">{nameOf(names, order.staff_id)}</span>
              {order.attribution_source && <span className="block text-muted">{sources[order.attribution_source]}</span>}
              {order.coupon_code && <span className="block text-muted">Code used: {order.coupon_code}</span>}
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="shrink-0 tabular-nums">{value}</dd>
    </div>
  );
}

function adjustmentLabel(type: string, value: number | null): string {
  switch (type) {
    case "gift":
      return "Gift";
    case "discount_percent":
      return `${value}% discount`;
    case "free_delivery":
      return "Free delivery";
    case "extra_delivery":
      return "Extra delivery fee";
    default:
      return "Note";
  }
}
