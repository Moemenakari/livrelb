import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";
import { CHARMS_NAV_KEY } from "@/config/navigation";
import { STEP_COUNT, homeSectionKeys, movableSectionKeys } from "@/lib/admin/home-types";
import { isMissingColumn } from "@/lib/supabase/compat";
import { createClient } from "@/lib/supabase/server";
import { HeroSlides } from "@/components/admin/hero-slides";
import { HomeForm, type HomeFormData } from "@/components/admin/home-form";
import { Card, NoAccess, PageHeader } from "@/components/admin/ui";
import en from "../../../../../messages/en.json";

export const metadata: Metadata = { title: "Home page" };

export default async function HomeAdminPage() {
  const staff = await requireStaff();
  if (!can(staff, "collections.manage") || !can(staff, "products.edit")) return <NoAccess />;
  const db = await createClient();

  const [firstSections, picksRes, categoriesRes, productsRes, itemsRes, navRes, charmsRes, slidesRes] = await Promise.all([
    db.from("home_sections").select("key, title_en, title_ar, subtitle_en, subtitle_ar, cta_href, is_visible, sort_order"),
    db.from("home_section_products").select("section_key, sort_order, products (slug)").eq("section_key", "lira").order("sort_order"),
    db.from("categories").select("slug, name_en, rule, is_active, show_on_home, home_sort, image_url").order("home_sort").order("sort_order"),
    db.from("products").select("slug, name_en, status, is_best_seller, best_seller_sort").order("sort_order"),
    db.from("home_section_items").select("position, title_en, title_ar, text_en, text_ar").eq("section_key", "steps"),
    db.from("categories").select("slug, name_en, nav_sort").eq("is_active", true),
    db.from("site_settings").select("charms_nav_sort").eq("id", 1).maybeSingle(),
    db.from("promotions").select("*").eq("placement", "hero_slide").order("sort_order").order("created_at", { ascending: false }),
  ]);

  // Before the admin redesign database update there is no sort_order: the page still works, only the order can't be saved.
  const orderReady = !isMissingColumn(firstSections.error);
  const sectionsRes = orderReady
    ? firstSections
    : await db.from("home_sections").select("key, title_en, title_ar, subtitle_en, subtitle_ar, cta_href, is_visible");
  if (sectionsRes.error || picksRes.error || categoriesRes.error || productsRes.error) {
    return (
      <>
        <PageHeader title="Home page" />
        <Card>
          <p className="text-sm">
            The database needs one update before this page works: run the file <b>20261009120000_admin_redesign.sql</b> in the Supabase SQL Editor
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
  const rows = new Map((sectionsRes.data ?? []).map((s) => [s.key, s as typeof s & { sort_order?: number }]));
  // The movable sections, in the order the shop shows them (ties keep the original order).
  const order = [...movableSectionKeys].sort(
    (a, b) => (rows.get(a)?.sort_order ?? (movableSectionKeys.indexOf(a) + 1) * 10) - (rows.get(b)?.sort_order ?? (movableSectionKeys.indexOf(b) + 1) * 10),
  );
  const data: HomeFormData = {
    order,
    orderReady,
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
      <PageHeader
        title="Home page"
        subtitle="The order of the sections, the first screen's photos, the Lira Collection products, the Shop by style tiles and the Best sellers. Saved changes show in the shop right away."
      />
      {can(staff, "coupons.manage") && (
        <div className="mb-4">
          <HeroSlides
            slides={(slidesRes.data ?? [])
              .filter((p) => p.media_url && p.media_type)
              .map((p) => ({
                id: p.id,
                url: p.media_url!,
                type: p.media_type!,
                headlineEn: p.headline_en ?? "",
                headlineAr: p.headline_ar ?? "",
                link: p.link_url ?? "",
                order: String(p.sort_order),
                isActive: p.is_active,
              }))}
          />
        </div>
      )}
      <HomeForm initial={data} />
    </>
  );
}
