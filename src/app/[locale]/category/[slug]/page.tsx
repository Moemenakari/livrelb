import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { categoryHref } from "@/config/navigation";
import {
  categoryTrail,
  findCategory,
  getCatalog,
  productsIn,
  styleNames,
  toCard,
} from "@/lib/catalog";
import { CategoryBrowser } from "@/components/category/category-browser";
import { alternates, pageUrl } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TrustStrip } from "@/components/ui/trust-strip";

// Built at deploy time, refreshed hourly and whenever the admin saves
// (revalidateTag("catalog")). New categories render on first visit.
export const revalidate = 3600;

export async function generateStaticParams() {
  const { categories } = await getCatalog();
  return categories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/category/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = findCategory(await getCatalog(), slug);
  if (!category || (locale !== "en" && locale !== "ar")) return {};
  return {
    title: category.name[locale],
    description: category.description[locale],
    alternates: alternates(locale, `/category/${slug}`),
  };
}

// Category page: a small title at the very top, the filters in one sticky bar and
// the products straight away. The description and the trust strip come after the
// grid, so on a phone nothing sits between the title and the pieces.
export default async function CategoryPage({ params }: PageProps<"/[locale]/category/[slug]">) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const catalog = await getCatalog();
  const category = findCategory(catalog, slug);
  if (!category) notFound();

  const t = await getTranslations("category");
  const products = productsIn(catalog, category.slug).map((p) => toCard(p, locale, catalog.settings.points));
  const trail = categoryTrail(catalog, category.slug);
  const styles = (category.styles ?? []).map((key) => ({ key, label: styleNames[key][locale] }));

  const crumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { label: t("home"), path: "/" },
      ...trail.map((c) => ({ label: c.name[locale], path: categoryHref(c.slug) })),
    ].map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: pageUrl(locale, c.path) })),
  };

  return (
    <>
      <JsonLd data={crumbsLd} />
      <div className="mx-auto max-w-7xl px-4 pt-3 pb-14 lg:px-8">
        <Breadcrumbs
          label={t("breadcrumb")}
          items={[
            { label: t("home"), href: "/" },
            ...trail.map((c, i) => ({
              label: c.name[locale],
              href: i < trail.length - 1 ? categoryHref(c.slug) : undefined,
            })),
          ]}
        />

        <h1 className="mt-3 mb-3 text-2xl lg:mt-5 lg:text-4xl">{category.name[locale]}</h1>

        <CategoryBrowser
          products={products}
          styles={styles}
          namePreview={products.some((p) => p.art.kind === "name")}
          perFont={styles.length > 0}
        />

        <section className="mx-auto mt-14 max-w-2xl text-center" aria-label={category.name[locale]}>
          <p className="text-muted">{category.description[locale]}</p>
        </section>
      </div>
      <TrustStrip />
    </>
  );
}
