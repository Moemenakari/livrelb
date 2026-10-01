import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { dateTime, prettyPhone } from "@/lib/admin/format";
import { can } from "@/lib/admin/permissions";
import { findShape } from "@/lib/charms";
import { createClient } from "@/lib/supabase/server";
import { CharmActions } from "@/components/admin/charm-row";
import { Badge, Card, Empty, NoAccess, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Charm designs" };

const tones = { new: "gold", contacted: "blue", done: "green" } as const;

// Charm designs customers sent from the Charms page: call or WhatsApp them
// with the price, then mark them done.
export default async function CharmsAdminPage() {
  const staff = await requireStaff();
  if (!can(staff, "orders.view")) return <NoAccess />;
  const db = await createClient();
  const { data } = await db
    .from("charm_requests")
    .select("id, name, phone, shapes, letters, metal, note, image_url, status, created_at")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = data ?? [];

  return (
    <>
      <PageHeader title="Charm designs" subtitle={`${rows.filter((r) => r.status === "new").length} new`} />
      {rows.length === 0 ? (
        <Empty>No charm designs yet. They appear here when a customer sends one from the Charms page.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const names = r.shapes.map((s) => findShape(s)?.name.en ?? s);
            const message = `Hi ${r.name}, this is LIVRE about your charm design${names.length ? ` (${names.join(", ")})` : ""}.`;
            return (
              <li key={r.id}>
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      {r.name} <Badge tone={tones[r.status as keyof typeof tones]}>{r.status}</Badge>
                    </span>
                  }
                  actions={<span className="text-xs text-muted">{dateTime(r.created_at)}</span>}
                >
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted">Phone</dt>
                    <dd dir="ltr" className="text-start">
                      {prettyPhone(r.phone)}
                    </dd>
                    <dt className="text-muted">Metal</dt>
                    <dd className="capitalize">{r.metal}</dd>
                    {names.length > 0 && (
                      <>
                        <dt className="text-muted">Shapes</dt>
                        <dd>{names.join(", ")}</dd>
                      </>
                    )}
                    {r.letters && (
                      <>
                        <dt className="text-muted">Letters</dt>
                        <dd dir="auto">{r.letters}</dd>
                      </>
                    )}
                    {r.note && (
                      <>
                        <dt className="text-muted">Note</dt>
                        <dd className="whitespace-pre-line">{r.note}</dd>
                      </>
                    )}
                  </dl>
                  {r.image_url && (
                    <a href={r.image_url} target="_blank" rel="noopener noreferrer" className="mt-3 block w-32">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.image_url} alt="Reference photo from the customer" className="w-32 rounded-lg border border-line" />
                    </a>
                  )}
                  <CharmActions id={r.id} status={r.status as "new" | "contacted" | "done"} phone={r.phone} message={message} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
