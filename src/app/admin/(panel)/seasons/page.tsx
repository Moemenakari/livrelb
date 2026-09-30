import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { isLive, toLocalInput } from "@/lib/admin/format";
import { can } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { SeasonsManager } from "@/components/admin/season-forms";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Seasons" };

export default async function SeasonsPage() {
  const staff = await requireStaff();
  if (!can(staff, "collections.manage")) return <NoAccess />;
  const db = await createClient();
  const [{ data: seasons }, { data: products }] = await Promise.all([
    db.from("collections").select("*, collection_products (product_id, sort_order)").order("starts_at", { ascending: false, nullsFirst: false }),
    db.from("products").select("id, name_en").neq("status", "archived").order("sort_order"),
  ]);
  return (
    <>
      <PageHeader title="Seasons" subtitle="Valentine's, Mother's Day, Christmas, Ramadan, Eid…" />
      <SeasonsManager
        products={(products ?? []).map((p) => ({ id: p.id, name: p.name_en }))}
        seasons={(seasons ?? []).map((s) => ({
          id: s.id,
          slug: s.slug,
          titleEn: s.title_en,
          titleAr: s.title_ar,
          descriptionEn: s.description_en,
          descriptionAr: s.description_ar,
          couponCode: s.coupon_code ?? "",
          starts: toLocalInput(s.starts_at),
          ends: toLocalInput(s.ends_at),
          isActive: s.is_active,
          products: [...s.collection_products].sort((a, b) => a.sort_order - b.sort_order).map((cp) => cp.product_id),
          live: isLive(s.is_active, s.starts_at, s.ends_at),
        }))}
      />
    </>
  );
}
