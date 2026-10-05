import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { DeliveryForm } from "@/components/admin/delivery-form";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Delivery & times" };

const blank = (n: number | null) => (n === null ? "" : String(n));

export default async function DeliveryPage() {
  const staff = await requireStaff();
  if (!staff.isOwner) return <NoAccess />;
  const db = await createClient();
  const [{ data: s }, { data: areas }] = await Promise.all([
    db.from("site_settings").select("delivery_fee_cents, delivery_days_min, delivery_days_max, processing_days_min, processing_days_max").eq("id", 1).single(),
    db
      .from("areas")
      .select("id, name_en, name_ar, delivery_fee_cents, delivery_days_min, delivery_days_max, is_active")
      .order("sort_order"),
  ]);
  if (!s) return <p className="text-sm text-muted">Delivery settings couldn&apos;t be loaded.</p>;

  return (
    <>
      <PageHeader title="Delivery & times" subtitle="How long we take to make a piece, and delivery per area. Owner only." />
      <DeliveryForm
        // New areas get an id when saved: remount so they are not added twice.
        key={(areas ?? []).map((a) => a.id).join(",")}
        defaults={{ fee: String(s.delivery_fee_cents / 100), daysMin: s.delivery_days_min, daysMax: s.delivery_days_max }}
        initial={{
          processingMin: String(s.processing_days_min),
          processingMax: String(s.processing_days_max),
          areas: (areas ?? []).map((a) => ({
            id: a.id,
            nameEn: a.name_en,
            nameAr: a.name_ar,
            fee: a.delivery_fee_cents === null ? "" : String(a.delivery_fee_cents / 100),
            daysMin: blank(a.delivery_days_min),
            daysMax: blank(a.delivery_days_max),
            active: a.is_active,
          })),
        }}
      />
    </>
  );
}
