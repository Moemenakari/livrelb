import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";
import { CHARMS_NAV_KEY } from "@/config/navigation";
import { STEP_COUNT, homeSectionKeys } from "@/lib/admin/home-types";
import { createClient } from "@/lib/supabase/server";
import { HomeForm, type HomeFormData } from "@/components/admin/home-form";
import { Card, NoAccess, PageHeader } from "@/components/admin/ui";
import en from "../../../../../messages/en.json";

export const metadata: Metadata = { title: "Home page" };

export default async function HomeAdminPage() {
  const staff = await requireStaff();
  if (!can(staff, "collections.manage") || !can(staff, "products.edit")) return <NoAccess />;
  const db = await createClient();

  const [sectionsRes, picksRes, categoriesRes, productsRes, itemsRes, navRes, charmsRes] = await Promise.all([
    db.from("home_sections").select("key, title_en, title_ar, subtitle_en, subtitle_ar, cta_href, is_visible"),
    db.from("home_section_products").select("section_key, sort_order, products (slug)").eq("section_key", "lira").order("sort_order"),
    db.from("categories").select("slug, name_en, rule, is_active, show_on_home, home_sort, image_url").order("home_sort").order("sort_order"),
    db.from("products").select("slug, name_en, status, is_best_seller, best_seller_sort").order("sort_order"),
    db.from("home_section_items").select("position, title_en, title_ar, text_en, text_ar").eq("section_key", "steps"),
    db.from("categories").select("slug, name_en, nav_sort").eq("is_active", true),
    db.from("site_settings").select("charms_nav_sort").eq("id", 1).maybeSingle(),
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

  // The step texts come from the second database update; the rest of the page works without it.
  const stepRows = new Map((itemsRes.error ? [] : (itemsRes.data ?? [])).map((r) => [r.position, r]));
  const stepKeys = ["personalize", "craft", "deliver"] as const;
  // The menu order comes from the Phase 1 database update; the rest of the page works without it.
  const menuReady = !navRes.error && !charmsRes.error && charmsRes.data !== null;
  const menu = menuReady
    ? [
        ...(navRes.data ?? []).map((c) => ({ key: c.slug, name: c.name_en, sort: c.nav_sort })),
        { key: CHARMS_NAV_KEY, name: "Charms (page)", sort: charmsRes.data?.charms_nav_sort ?? 20 },
      ].sort((a, b) => a.sort - b.sort)
    : [];
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
    steps: stepKeys.slice(0, STEP_COUNT).map((_, i) => {
      const r = stepRows.get(i + 1);
      return { titleEn: r?.title_en ?? "", titleAr: r?.title_ar ?? "", textEn: r?.text_en ?? "", textAr: r?.text_ar ?? "" };
    }),
    stepDefaults: stepKeys.map((k) => ({
      titleEn: en.home.steps[k].title,
      titleAr: "",
      textEn: en.home.steps[k].text,
      textAr: "",
    })),
    stepsReady: !itemsRes.error,
    menu: menu.map(({ key, name }) => ({ key, name })),
    menuReady,
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
