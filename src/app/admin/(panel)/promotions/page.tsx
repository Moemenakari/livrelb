import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { staffNames } from "@/lib/admin/data";
import { isLive, toLocalInput } from "@/lib/admin/format";
import { can } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { PromotionsManager } from "@/components/admin/promo-forms";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Promotions" };

export default async function PromotionsPage() {
  const staff = await requireStaff();
  if (!can(staff, "coupons.manage")) return <NoAccess />;
  const db = await createClient();
  const [{ data: coupons }, { data: promotions }, names] = await Promise.all([
    db.from("coupons").select("*").order("created_at", { ascending: false }),
    db.from("promotions").select("*").order("sort_order").order("created_at", { ascending: false }),
    staffNames(),
  ]);

  return (
    <>
      <PageHeader title="Promotions" subtitle="Changes show in the shop right away." />
      <PromotionsManager
        staff={names.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name }))}
        coupons={(coupons ?? []).map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.type === "fixed" ? String(c.value / 100) : String(c.value),
          minOrder: String(c.min_order_cents / 100),
          starts: toLocalInput(c.starts_at),
          ends: toLocalInput(c.ends_at),
          maxUses: c.max_uses ? String(c.max_uses) : "",
          staffId: c.staff_id ?? "",
          isPublic: c.is_public,
          isActive: c.is_active,
          uses: c.uses_count,
          staffName: names.find((s) => s.id === c.staff_id)?.name ?? null,
        }))}
        promotions={(promotions ?? [])
          .filter((p) => p.placement === "hero" || p.placement === "promo_bar")
          .map((p) => ({
            id: p.id,
            placement: p.placement as "hero" | "promo_bar",
            headlineEn: p.headline_en ?? "",
            headlineAr: p.headline_ar ?? "",
            code: p.code ?? "",
            percent: String(p.percent ?? ""),
            starts: toLocalInput(p.starts_at),
            ends: toLocalInput(p.ends_at),
            isActive: p.is_active,
            live: isLive(p.is_active, p.starts_at, p.ends_at),
          }))}
      />
    </>
  );
}
