import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { categoryHref, productHref } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import {
  categoryTrail,
  findProduct,
  getCatalog,
  materials,
  relatedProducts,
  reviewStats,
  reviewsFor,
  toCard,
} from "@/lib/catalog";
import { fonts } from "@/lib/catalog/materials";
import { formatPrice } from "@/lib/format";
import { ProductCard } from "@/components/product/product-card";
import { ProductTabs } from "@/components/product/product-tabs";
import { ProductView, type ProductViewData } from "@/components/product/product-view";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { ReviewCard } from "@/components/product/review-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Stars } from "@/components/ui/stars";
import { swipeRow } from "@/components/ui/styles";

// Built at deploy time, refreshed hourly and whenever the admin saves
// (revalidateTag("catalog")). New products render on first visit.
export const revalidate = 3600;

export async function generateStaticParams() {
  const { products } = await getCatalog();
  return products.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/product/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = findProduct(await getCatalog(), slug);
  if (!product || (locale !== "en" && locale !== "ar")) return {};
  return {
    title: product.name[locale],
    description: product.summary[locale],
  };
}

// Product page (brief §8.3, restart brief).
export default async function ProductPage({ params }: PageProps<"/[locale]/product/[slug]">) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const catalog = await getCatalog();
  const product = findProduct(catalog, slug);
  if (!product) notFound();

  const t = await getTranslations("product");
  const tCategory = await getTranslations("category");
  const tCommon = await getTranslations("common");
  const trail = categoryTrail(catalog, product.categories[0]);
  const p = product.personalization;

  const view: ProductViewData = {
    slug: product.slug,
    name: product.name[locale],
    names: product.name,
    summary: product.summary[locale],
    url: `${siteConfig.url}/${locale}${productHref(product.slug)}`,
    freeShippingOver: catalog.settings.freeShippingOver,
    whatsappNumber: catalog.settings.whatsappNumber,
    reviews: reviewStats(catalog, product.slug),
    materials: product.offers.map((o) => ({
      key: o.material,
      name: materials[o.material].name[locale],
      swatch: materials[o.material].swatch,
      price: o.price,
      compareAtPrice: o.compareAtPrice,
    })),
    defaultMaterial: product.defaultMaterial,
    personalization: p && {
      kind: p.kind,
      maxLength: p.maxLength,
      fonts: p.fonts.map((key) => ({ key, name: fonts[key].name[locale] })),
    },
    connections: p?.connections ?? product.connections ?? [],
    size: product.size,
    altSize: product.altSize,
    art: product.art,
    media: product.media.map((m) => ({ src: m.src, alt: m.alt[locale] })),
  };

  const related = relatedProducts(catalog, product, 4).map((r) => toCard(r, locale));
  const candidates = catalog.products.filter((c) => c.slug !== product.slug).map((c) => toCard(c, locale));
  const reviews = reviewsFor(catalog, product.slug);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 pt-5 pb-20 lg:gap-20 lg:px-8">
      <div className="flex flex-col gap-5">
        <Breadcrumbs
          label={t("breadcrumbLabel")}
          items={[
            { label: tCategory("home"), href: "/" },
            ...trail.map((c) => ({ label: c.name[locale], href: categoryHref(c.slug) })),
            { label: product.name[locale] },
          ]}
        />
        <ProductView product={view}>
          <ProductTabs
            label={t("tabsLabel")}
            tabs={[
              { key: "description", label: t("tabs.description"), text: product.description[locale] },
              { key: "details", label: t("tabs.details"), text: product.details[locale] },
              {
                key: "shipping",
                label: t("tabs.shipping"),
                text: t("shippingText", { amount: formatPrice(catalog.settings.freeShippingOver) }),
              },
            ]}
          />
        </ProductView>
      </div>

      <section className="border-t border-line pt-14">
        <h2 className="mb-8 text-center text-3xl">{t("youMayAlsoLike")}</h2>
        <ul className={`lg:grid-cols-4 ${swipeRow}`}>
          {related.map((r) => (
            <li key={r.slug} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-auto">
              <ProductCard product={r} />
            </li>
          ))}
        </ul>
      </section>

      <RecentlyViewed title={t("recentlyViewed")} current={product.slug} candidates={candidates} />

      {reviews.length > 0 && (
        <section id="reviews" className="scroll-mt-24 border-t border-line pt-14">
          <div className="mb-10 flex flex-col items-center gap-2 text-center">
            <h2 className="text-3xl">{t("reviewsTitle")}</h2>
            {view.reviews && (
              <>
                <p className="font-display text-5xl text-gold-dark lining-nums">
                  {view.reviews.rating.toFixed(1)}
                </p>
                <Stars
                  rating={view.reviews.rating}
                  label={tCommon("stars", { rating: view.reviews.rating.toFixed(1) })}
                  className="size-5"
                />
                <p className="text-sm text-muted">
                  {t("reviewsSummary", { count: view.reviews.count })}
                </p>
              </>
            )}
          </div>
          <ul className="grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="flex">
                <ReviewCard
                  review={r}
                  locale={locale}
                  starsLabel={tCommon("stars", { rating: r.rating })}
                  productName={
                    r.productSlug && r.productSlug !== product.slug
                      ? findProduct(catalog, r.productSlug)?.name[locale]
                      : undefined
                  }
                  className="flex-1"
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
