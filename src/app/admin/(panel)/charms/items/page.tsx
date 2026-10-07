import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { CharmItems } from "@/components/admin/charm-items";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Charm photos" };

// The charms with photos (Charms and Turkish charms) that customers can pick on the Charms page.
export default async function CharmItemsPage() {
  const staff = await requireStaff();
  if (!can(staff, "products.edit")) return <NoAccess />;
  const db = await createClient();
  const [{ data: items }, { data: settings }] = await Promise.all([
    db.from("charm_items").select("*").order("sort_order").order("created_at", { ascending: false }),
    db.from("site_settings").select("charm_price_cents").eq("id", 1).maybeSingle(),
  ]);

  return (
    <>
      <PageHeader title="Charm photos" subtitle="Charms and Turkish charms with photos. They appear on the website's Charms page." />
      <CharmItems
        defaultPrice={String((settings?.charm_price_cents ?? 950) / 100)}
        items={(items ?? []).map((i) => ({
          id: i.id,
          url: i.image_url,
          nameEn: i.name_en,
          nameAr: i.name_ar,
          price: i.price_cents === null ? "" : String(i.price_cents / 100),
          inStock: i.in_stock,
          isActive: i.is_active,
          order: String(i.sort_order),
          // Only after the Phase 1 database update.
          ...("family" in i ? { family: i.family === "charms" ? ("charms" as const) : ("turkish" as const), metal: i.metal === "gold" || i.metal === "silver" ? i.metal : ("" as const), code: i.code ?? "" } : {}),
        }))}
      />
    </>
  );
}
