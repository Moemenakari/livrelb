import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";
import { homeSectionKeys } from "@/lib/admin/home-types";
import { createClient } from "@/lib/supabase/server";
import { HomeForm, type HomeFormData } from "@/components/admin/home-form";
import { Card, NoAccess, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Home page" };

export default async function HomeAdminPage() {
  const staff = await requireStaff();
  if (!can(staff, "collections.manage") || !can(staff, "products.edit")) return <NoAccess />;
  const db = await createClient();

  const [sectionsRes, picksRes, categoriesRes, productsRes] = await Promise.all([
    db.from("home_sections").select("key, title_en, title_ar, subtitle_en, subtitle_ar, cta_href, is_visible"),
    db.from("home_section_products").select("section_key, sort_order, products (slug)").eq("section_key", "lira").order("sort_order"),
    db.from("categories").select("slug, name_en, rule, is_active, show_on_home, home_sort, image_url").order("home_sort").order("sort_order"),
    db.from("products").select("slug, name_en, status, is_best_seller, best_seller_sort").order("sort_order"),
  ]);

  // The columns and tables come from the "home page controls" database update.
  if (sectionsRes.error || picksRes.error || categoriesRes.error || productsRes.error) {
    return (
      <>
        <PageHeader title="Home page" />
        <Card>
          <p className="text-sm">
            The database needs one update before this page works: run the file <b>20261007100000_home_page_controls.sql</b> in the Supabase SQL Editor
            (see docs/database.md), then reload.
          </p>
        </Card>
      </>
    );
  }

  const rows = new Map((sectionsRes.data ?? []).map((s) => [s.key, s]));
  const data: HomeFormData = {
    sections: homeSectionKeys.map((key) => {
      const s = rows.get(key);
      return {
        key,
        visible: s?.is_visible ?? true,
        titleEn: s?.title_en ?? "",
        titleAr: s?.title_ar ?? "",
        subtitleEn: s?.subtitle_en ?? "",
        subtitleAr: s?.subtitle_ar ?? "",
        ctaHref: s?.cta_href ?? "",
      };
    }),
    liraSlugs: (picksRes.data ?? []).flatMap((p) => (p.products ? [p.products.slug] : [])),
    tiles: (categoriesRes.data ?? [])
      .filter((c) => !c.rule && c.is_active)
      .map((c) => ({ slug: c.slug, name: c.name_en, show: c.show_on_home, imageUrl: c.image_url ?? "" })),
    bestSellers: (productsRes.data ?? [])
      .filter((p) => p.is_best_seller)
      .sort((a, b) => (a.best_seller_sort || 1e9) - (b.best_seller_sort || 1e9))
      .map((p) => p.slug),
    products: (productsRes.data ?? []).filter((p) => p.status === "active").map((p) => ({ slug: p.slug, name: p.name_en })),
  };
  // Shown tiles first, in their order, then the hidden ones.
  data.tiles.sort((a, b) => Number(b.show) - Number(a.show));

  return (
    <>
      <PageHeader title="Home page" subtitle="Texts, the Lira Collection products, the Shop by style tiles and the Best sellers order. Saved changes show in the shop right away." />
      <HomeForm initial={data} />
    </>
  );
}
