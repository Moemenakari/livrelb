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
  productsIn,
  relatedProducts,
  reviewStats,
  reviewsFor,
  toCard,
} from "@/lib/catalog";
import { fonts } from "@/lib/catalog/materials";
import { formatPrice } from "@/lib/format";
import { ProductCard } from "@/components/product/product-card";
import type { Deal } from "@/components/product/product-offer";
import { ProductTabs } from "@/components/product/product-tabs";
import { ProductView, type ProductViewData } from "@/components/product/product-view";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { ReviewCard } from "@/components/product/review-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Stars } from "@/components/ui/stars";
import { absoluteUrl, alternates, defaultOgImage, pageUrl } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { ScrollRow } from "@/components/ui/scroll-row";
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
  const photo = product.media.find((m) => (m.type ?? "image") === "image");
  const image = photo ? { url: absoluteUrl(photo.src), alt: photo.alt[locale] || product.name[locale] } : defaultOgImage;
  return {
    title: product.name[locale],
    description: product.summary[locale],
    alternates: alternates(locale, `/product/${slug}`),
    openGraph: { type: "website", siteName: "LIVRE", title: product.name[locale], description: product.summary[locale], images: [image] },
    twitter: { card: "summary_large_image", title: product.name[locale], description: product.summary[locale], images: [image.url] },
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
  const tInfo = await getTranslations("productInfo");
  const trail = categoryTrail(catalog, product.categories[0]);
  const p = product.personalization;
  const { settings } = catalog;

  // "#1 Best Seller in <category>": only when real orders say so.
  const sold = catalog.sold[product.slug] ?? 0;
  const mainCategory = trail.at(-1);
  const topSeller =
    mainCategory &&
    sold >= 10 &&
    productsIn(catalog, mainCategory.slug).every((o) => o.slug === product.slug || (catalog.sold[o.slug] ?? 0) < sold);

  // Deals row: shop rules, the promo bar code and coupons marked public.
  const deals: Deal[] = [
    { kind: "freeOver", amount: settings.freeShippingOver },
    ...(settings.firstOrderFreeDelivery ? [{ kind: "firstOrder" } as const] : []),
    ...(catalog.promo ? [{ kind: "code", code: catalog.promo.code, type: "percent", value: catalog.promo.percent } as const] : []),
    ...catalog.publicCoupons
      .filter((c) => c.code !== catalog.promo?.code)
      .map((c): Deal => ({ kind: "code", code: c.code, type: c.type, value: c.value })),
  ];

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
    media: product.media.map((m) => ({ src: m.src, alt: m.alt[locale] || product.name[locale], type: m.type ?? "image" })),
    offer: {
      sold,
      badges: {
        topIn: topSeller ? mainCategory.name[locale] : undefined,
        bestSeller: Boolean(product.isBestSeller),
        isNew: Boolean(product.isNew),
        stockLeft: product.stock,
      },
      points: settings.points,
      deals,
    },
    info: {
      areas: catalog.areas.map((a) => ({ slug: a.slug, name: a.name[locale], fee: a.fee })),
      deliveryFee: settings.deliveryFee,
      freeShippingOver: settings.freeShippingOver,
      firstOrderFreeDelivery: settings.firstOrderFreeDelivery,
      deliveryTime:
        settings.deliveryTime[locale] ||
        tInfo("delivery.days", { min: settings.deliveryDays.min, max: settings.deliveryDays.max }),
      points: settings.points,
    },
  };

  const related = relatedProducts(catalog, product, 4).map((r) => toCard(r, locale));
  const candidates = catalog.products.filter((c) => c.slug !== product.slug).map((c) => toCard(c, locale));
  const reviews = reviewsFor(catalog, product.slug);

  // Search-engine data. Ratings come only from real, approved reviews of this
  // piece (never the development samples).
  const realReviews = catalog.reviews.filter((r) => !r.isSample && r.productSlug === product.slug);
  const prices = product.offers.map((o) => o.price);
  const photos = product.media.filter((m) => (m.type ?? "image") === "image").map((m) => absoluteUrl(m.src));
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name[locale],
    description: product.summary[locale],
    image: photos.length ? photos : [absoluteUrl(defaultOgImage.url)],
    sku: product.slug,
    brand: { "@type": "Brand", name: "LIVRE" },
    url: pageUrl(locale, `/product/${product.slug}`),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      offerCount: prices.length,
      availability: product.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: pageUrl(locale, `/product/${product.slug}`),
    },
    ...(realReviews.length > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (realReviews.reduce((s, r) => s + r.rating, 0) / realReviews.length).toFixed(1),
            reviewCount: realReviews.length,
          },
          review: realReviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.author },
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            reviewBody: r.text[locale] || r.text.en,
            datePublished: r.date,
          })),
        }
      : {}),
  };
  const crumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { label: tCategory("home"), path: "/" },
      ...trail.map((c) => ({ label: c.name[locale], path: categoryHref(c.slug) })),
      { label: product.name[locale], path: `/product/${product.slug}` },
    ].map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: pageUrl(locale, c.path) })),
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 pt-3 pb-20 lg:gap-20 lg:px-8">
      <JsonLd data={productLd} />
      <JsonLd data={crumbsLd} />
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
                text:
                  catalog.settings.shippingInfo?.[locale] ??
                  t("shippingText", { amount: formatPrice(catalog.settings.freeShippingOver) }),
              },
            ]}
          />
        </ProductView>
      </div>

      <section className="border-t border-line pt-14">
        <h2 className="mb-8 text-center text-3xl">{t("youMayAlsoLike")}</h2>
        <ScrollRow as="ul" gridFromLg className={`lg:grid-cols-4 ${swipeRow}`}>
          {related.map((r) => (
            <li key={r.slug} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-auto">
              <ProductCard product={r} />
            </li>
          ))}
        </ScrollRow>
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
