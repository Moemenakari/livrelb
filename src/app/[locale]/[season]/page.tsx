import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { findProduct, getCatalog, toCard } from "@/lib/catalog";
import { getSeason } from "@/lib/catalog/seasons";
import { CategoryBrowser } from "@/components/category/category-browser";
import { Countdown } from "@/components/home/countdown";
import { CopyCode } from "@/components/layout/copy-code";
import { alternates } from "@/lib/seo";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TrustStrip } from "@/components/ui/trust-strip";

// Season / collection page (brief §8.3b): livrelb.com/en/mothers-day.
// Created and scheduled in the admin; outside its dates it is a 404.
// Refreshed when the admin saves (catalog tag).
export const revalidate = 600;

export async function generateMetadata({ params }: PageProps<"/[locale]/[season]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const season = await getSeason((await params).season);
  if (!season) return {};
  return { title: season.title[locale], description: season.description[locale] || undefined, alternates: alternates(locale, `/${season.slug}`) };
}

export default async function SeasonPage({ params }: PageProps<"/[locale]/[season]">) {
  const locale = await resolveLocale(params);
  const season = await getSeason((await params).season);
  if (!season) notFound();

  const [catalog, t, tPromo] = await Promise.all([getCatalog(), getTranslations("category"), getTranslations("promo")]);
  const products = season.productSlugs.flatMap((slug) => {
    const p = findProduct(catalog, slug);
    return p ? [toCard(p, locale, catalog.settings.points)] : [];
  });

  return (
    <>
      <TrustStrip />
      <div className="mx-auto max-w-7xl px-4 pt-5 pb-20 lg:px-8">
        <Breadcrumbs label={t("breadcrumb")} items={[{ label: t("home"), href: "/" }, { label: season.title[locale] }]} />
        <header className="mx-auto mt-8 mb-10 flex max-w-2xl flex-col items-center gap-4 text-center lg:mt-12">
          <h1 className="text-4xl lg:text-5xl">{season.title[locale]}</h1>
          {season.description[locale] && <p className="text-muted">{season.description[locale]}</p>}
          {season.couponCode && (
            <p className="flex items-center gap-2 text-sm">
              {tPromo("code")}
              <CopyCode code={season.couponCode} copyLabel={tPromo("copy", { code: season.couponCode })} copiedLabel={tPromo("copied")} className="text-cedar" />
            </p>
          )}
          {season.endsAt && <Countdown endsAt={season.endsAt} />}
        </header>
        <CategoryBrowser products={products} styles={[]} namePreview={products.some((p) => p.art.kind === "name")} />
      </div>
    </>
  );
}
