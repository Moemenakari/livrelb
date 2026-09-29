import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { categoryHref } from "@/config/navigation";
import {
  categories,
  categoryTrail,
  getCategory,
  productsIn,
  styleNames,
  styleSamples,
  toCard,
  type FontKey,
  type StyleKey,
} from "@/lib/catalog";
import { CategoryBrowser } from "@/components/category/category-browser";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TrustStrip } from "@/components/ui/trust-strip";

export function generateStaticParams() {
  return categories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/category/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = getCategory(slug);
  if (!category || (locale !== "en" && locale !== "ar")) return {};
  return {
    title: category.name[locale],
    description: category.description[locale],
  };
}

const styleFont: Partial<Record<StyleKey, FontKey>> = { bold: "batroun", dainty: "byblos", twoFonts: "byblos" };

// Category page (brief §8.2, restart brief): trust strip, breadcrumbs,
// centered title, round style thumbnails, product grid.
export default async function CategoryPage({ params }: PageProps<"/[locale]/category/[slug]">) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const t = await getTranslations("category");
  const products = productsIn(category.slug).map((p) => toCard(p, locale));
  const trail = categoryTrail(category.slug);
  const styles = (category.styles ?? []).map((key) => ({
    key,
    label: styleNames[key][locale],
    sample: styleSamples[key],
    font: styleFont[key] ?? "beirut",
  }));

  return (
    <>
      <TrustStrip />
      <div className="mx-auto max-w-7xl px-4 pt-5 pb-20 lg:px-8">
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

        <header className="mx-auto mt-8 mb-10 flex max-w-2xl flex-col items-center gap-4 text-center lg:mt-12">
          <h1 className="text-4xl lg:text-5xl">{category.name[locale]}</h1>
          <p className="text-muted">{category.description[locale]}</p>
        </header>

        <CategoryBrowser
          products={products}
          styles={styles}
          namePreview={products.some((p) => p.art.kind === "name")}
        />
      </div>
    </>
  );
}
