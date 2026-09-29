import {
  ArrowRight,
  Banknote,
  BadgePercent,
  Gem,
  Hand,
  HeartHandshake,
  PenLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  Truck,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/resolve-locale";
import { categoryHref, productHref } from "@/config/navigation";
import { promo } from "@/config/promo";
import {
  bestSellers,
  getCategory,
  getProduct,
  newArrivals,
  productsIn,
  reviews,
  toCard,
  type CategorySlug,
} from "@/lib/catalog";
import { CoinAnchor } from "@/components/coin/coin-anchor";
import { CoinStage } from "@/components/coin/coin-stage";
import { Countdown } from "@/components/home/countdown";
import { HeroMiniPreview } from "@/components/home/hero-mini-preview";
import { SectionTitle } from "@/components/home/section-title";
import { CopyCode } from "@/components/layout/copy-code";
import { ProductArt } from "@/components/product/product-art";
import { ProductCard } from "@/components/product/product-card";
import { ReviewCard } from "@/components/product/review-card";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { eyebrow, primaryButton, secondaryButton, swipeRow } from "@/components/ui/styles";

// Homepage (brief §8.1, restart brief). The 3D Lira coin lives in a fixed
// layer behind the page (<CoinStage>): section content is `relative z-[1]`
// so text stays above it; sections marked data-coin-cover hide it.
const inner = "relative z-[1] mx-auto max-w-7xl px-4 lg:px-8";
const cover = "relative z-[1]";

const mosaic: { slug: CategorySlug; tile: string; tone: string; sample?: string }[] = [
  { slug: "name-necklaces", tile: "col-span-2 row-span-2 aspect-[4/3] lg:aspect-auto", tone: "bg-blush", sample: "Maya" },
  { slug: "lira-collection", tile: "aspect-square lg:aspect-auto", tone: "bg-surface" },
  { slug: "bracelets", tile: "aspect-square lg:aspect-auto", tone: "bg-beige", sample: "Rami" },
  { slug: "rings", tile: "aspect-square lg:aspect-auto", tone: "bg-surface" },
  { slug: "earrings", tile: "aspect-square lg:aspect-auto", tone: "bg-blush" },
  { slug: "mens-jewelry", tile: "col-span-2 aspect-[2/1] lg:aspect-auto", tone: "bg-beige" },
  { slug: "gifts", tile: "col-span-2 aspect-[2/1] lg:aspect-auto", tone: "bg-surface", sample: "Love" },
];

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const tPromo = await getTranslations("promo");
  const tPay = await getTranslations("payment");
  const tPlaceholders = await getTranslations("placeholders");

  const lira = productsIn("lira-collection").map((p) => toCard(p, locale));
  const best = bestSellers(8).map((p) => toCard(p, locale));
  const fresh = newArrivals(4).map((p) => toCard(p, locale));

  const steps = [
    { n: "01", key: "personalize", icon: PenLine },
    { n: "02", key: "craft", icon: Hand },
    { n: "03", key: "deliver", icon: Truck },
  ] as const;

  const why = [
    { key: "handcrafted", icon: Hand },
    { key: "personalized", icon: Sparkles },
    { key: "quality", icon: Gem },
    { key: "trusted", icon: HeartHandshake },
  ] as const;

  const trust = [
    { key: "freeShipping", icon: Truck },
    { key: "securePayment", icon: ShieldCheck },
    { key: "bestPrice", icon: Tag },
    { key: "sales", icon: BadgePercent },
  ] as const;

  return (
    <>
      <CoinStage />
      <h1 className="sr-only">{t("title")}</h1>

      {/* Hero: promo, countdown, mini name preview; the coin starts here. */}
      <section className="bg-gradient-to-b from-surface to-background">
        <div className={`${inner} grid items-center gap-6 pt-6 pb-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-14 lg:pb-20`}>
          <CoinAnchor
            id="hero"
            eager
            alt={t("lira.coinAlt")}
            className="mx-auto w-[58%] max-w-72 lg:order-last lg:w-full lg:max-w-[26rem]"
          />
          <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-start">
            <p className={eyebrow}>{t("hero.eyebrow")}</p>
            <p className="font-display text-5xl leading-[1.05] font-medium lining-nums sm:text-6xl lg:text-7xl">
              {t("hero.title", { percent: promo.firstOrderPercent })}
            </p>
            <p className="flex flex-wrap items-center justify-center gap-2 text-lg text-foreground/80 lg:justify-start">
              {t("hero.subtitle", { percent: promo.percent })}
              <CopyCode
                code={promo.code}
                copyLabel={tPromo("copy", { code: promo.code })}
                copiedLabel={tPromo("copied")}
                className="border-ink text-ink hover:bg-ink/5"
              />
            </p>
            <Countdown endsAt={promo.endsAt} className="items-center lg:items-start" />
            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link href={productHref("cursive-name-necklace")} className={primaryButton}>
                {t("hero.cta")}
              </Link>
              <Link href={categoryHref("bestsellers")} className={secondaryButton}>
                {t("hero.ctaSecondary")}
              </Link>
            </div>
            <div className="w-full max-w-xl text-start">
              <HeroMiniPreview />
            </div>
          </div>
        </div>
      </section>

      {/* 3D Lira coin section: the coin lands in the slot on the start side. */}
      <section>
        <div className={`${inner} py-16 lg:py-24`}>
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <CoinAnchor
              id="lira"
              alt={t("lira.coinAlt")}
              className="mx-auto w-[64%] max-w-80 lg:w-full lg:max-w-[24rem]"
            />
            <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-start">
              <p className={eyebrow}>{t("lira.eyebrow")}</p>
              <h2 className="text-4xl lg:text-6xl">{t("lira.title")}</h2>
              <p className="max-w-lg text-muted">{t("lira.text")}</p>
              <Link href={categoryHref("lira-collection")} className={secondaryButton}>
                {t("lira.cta")}
              </Link>
            </div>
          </div>
          <ul className={`mt-12 lg:grid-cols-4 ${swipeRow}`}>
            {lira.map((p) => (
              <li key={p.slug} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-auto">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Shop by style mosaic. */}
      <section data-coin-cover className={`${cover} bg-background`}>
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
          <SectionTitle title={t("shopByStyle.title")} subtitle={t("shopByStyle.subtitle")} />
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:grid-rows-[repeat(3,15rem)] lg:gap-4">
            {mosaic.map(({ slug, tile, tone, sample }) => {
              const category = getCategory(slug)!;
              return (
                <li key={slug} className={tile}>
                  <Link
                    href={categoryHref(slug)}
                    className={`group relative flex h-full flex-col overflow-hidden rounded-xl ${tone}`}
                  >
                    <div className="flex flex-1 items-center justify-center overflow-hidden px-[8%] transition-transform duration-500 group-hover:scale-105">
                      <ProductArt
                        art={category.art}
                        material={slug === "mens-jewelry" ? "silver" : "gold18"}
                        text={sample ?? category.artSample ?? "L"}
                        rings="sides"
                        aspect="wide"
                        className="max-h-full max-w-md"
                      />
                    </div>
                    <div className="flex items-end justify-between gap-2 p-4 lg:p-5">
                      <span className="font-display text-xl leading-tight lg:text-2xl">{category.name[locale]}</span>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-gold-dark">
                        {tCommon("shopNow")}
                        <ArrowRight className="size-3.5 rtl:-scale-x-100" strokeWidth={1.5} aria-hidden />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Best sellers grid. */}
      <section data-coin-cover className={`${cover} bg-background`}>
        <div className="mx-auto max-w-7xl px-4 pb-16 lg:px-8 lg:pb-24">
          <SectionTitle title={t("bestSellers.title")} subtitle={t("bestSellers.subtitle")} />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {best.map((p) => (
              <li key={p.slug}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
          <div className="mt-12 flex justify-center">
            <Link href={categoryHref("bestsellers")} className={secondaryButton}>
              {t("bestSellers.cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* 01 / 02 / 03: the coin drifts behind this one. */}
      <section className="bg-surface">
        <div className={`${inner} py-16 lg:py-24`}>
          <SectionTitle title={t("steps.title")} />
          <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map(({ n, key, icon: Icon }) => (
              <li key={key} className="flex flex-col items-center gap-3 text-center">
                <span className="font-display text-6xl leading-none text-gold" lang="en">
                  {n}
                </span>
                <Icon className="size-5 text-cedar" strokeWidth={1.5} aria-hidden />
                <h3 className="text-2xl">{t(`steps.${key}.title`)}</h3>
                <p className="max-w-xs text-muted">{t(`steps.${key}.text`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Loved by customers. */}
      <section className="bg-blush/60">
        <div className={`${inner} py-16 lg:py-24`}>
          <SectionTitle title={t("reviews.title")} subtitle={t("reviews.subtitle")} />
          <ul className={`lg:grid-cols-3 ${swipeRow}`}>
            {reviews.slice(0, 3).map((r) => (
              <li key={r.id} className="flex w-[82%] shrink-0 snap-start sm:w-[46%] lg:w-auto">
                <ReviewCard
                  review={r}
                  locale={locale}
                  starsLabel={tCommon("stars", { rating: r.rating })}
                  productName={getProduct(r.productSlug)?.name[locale]}
                  className="flex-1"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Founder quote. */}
      <section>
        <figure className={`${inner} flex max-w-3xl flex-col items-center gap-6 py-16 text-center lg:py-24`}>
          <PhotoSlot label={tPlaceholders("founder")} tone="blush" className="size-24 rounded-full" />
          <blockquote className="font-display text-2xl leading-snug italic lg:text-4xl">
            {t("founder.quote")}
          </blockquote>
          <figcaption className="flex flex-col gap-1">
            <span className="font-display text-xl">{t("founder.name")}</span>
            <span className="text-sm text-muted">{t("founder.role")}</span>
          </figcaption>
        </figure>
      </section>

      {/* New arrivals. */}
      <section data-coin-cover className={`${cover} bg-background`}>
        <div className="mx-auto max-w-7xl px-4 pb-16 lg:px-8 lg:pb-24">
          <SectionTitle title={t("newArrivals.title")} subtitle={t("newArrivals.subtitle")} />
          <ul className={`lg:grid-cols-4 ${swipeRow}`}>
            {fresh.map((p) => (
              <li key={p.slug} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-auto">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
          <div className="mt-12 flex justify-center">
            <Link href={categoryHref("new")} className={secondaryButton}>
              {t("newArrivals.cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* Why LIVRE. */}
      <section className="bg-surface">
        <div className={`${inner} py-16 lg:py-24`}>
          <SectionTitle eyebrow={t("whyUs.subtitle")} title={t("whyUs.title")} />
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
            {why.map(({ key, icon: Icon }) => (
              <li
                key={key}
                className="flex flex-col items-center gap-3 rounded-xl border border-line bg-background/85 p-5 text-center backdrop-blur-sm lg:p-7"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-blush text-gold-dark">
                  <Icon className="size-5" strokeWidth={1.5} aria-hidden />
                </span>
                <h3 className="text-xl leading-tight lg:text-2xl">{t(`whyUs.${key}.title`)}</h3>
                <p className="text-sm text-muted">{t(`whyUs.${key}.text`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Create something personal + payment methods. */}
      <section data-coin-cover className={`${cover} bg-background`}>
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
          <div className="grid items-center gap-8 overflow-hidden rounded-2xl bg-blush lg:grid-cols-2">
            <div className="flex flex-col items-center gap-5 p-8 text-center lg:items-start lg:p-14 lg:text-start">
              <h2 className="text-4xl lg:text-5xl">{t("create.title")}</h2>
              <p className="max-w-md text-foreground/75">{t("create.text")}</p>
              <Link href={productHref("cursive-name-necklace")} className={primaryButton}>
                {t("create.cta")}
              </Link>
              <div className="mt-2 flex flex-col items-center gap-2 lg:items-start">
                <p className="text-sm text-muted">{t("create.payTitle")}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-background px-4 py-2 text-sm">
                    <Banknote className="size-4 text-cedar" strokeWidth={1.5} aria-hidden />
                    {tPay("cod")}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-background px-4 py-2 text-sm">
                    <Smartphone className="size-4 text-cedar" strokeWidth={1.5} aria-hidden />
                    {tPay("whish")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center self-stretch bg-surface/70 px-8 py-6">
              <ProductArt
                art={{ kind: "name", variant: "necklace" }}
                material="rose"
                text="Forever"
                rings="sides"
                aspect="square"
                className="max-w-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar. */}
      <section data-coin-cover aria-label={t("trustBar.label")} className={`${cover} border-t border-line bg-background`}>
        <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 lg:grid-cols-4 lg:px-8">
          {trust.map(({ key, icon: Icon }) => (
            <li key={key} className="flex flex-col items-center gap-2 text-center lg:flex-row lg:gap-4 lg:text-start">
              <Icon className="size-7 shrink-0 text-gold-dark" strokeWidth={1.25} aria-hidden />
              <span className="flex flex-col">
                <span className="font-medium">{t(`trustBar.${key}`)}</span>
                <span className="text-sm text-muted">{t(`trustBar.${key}Text`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
