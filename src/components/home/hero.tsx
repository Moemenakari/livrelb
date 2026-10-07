import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { categoryHref, productHref } from "@/config/navigation";
import { findProduct, type Catalog } from "@/lib/catalog";
import type { Locale } from "@/i18n/routing";
import { CoinAnchor } from "@/components/coin/coin-anchor";
import { Countdown } from "@/components/home/countdown";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { HeroMiniPreview } from "@/components/home/hero-mini-preview";
import { CopyCode } from "@/components/layout/copy-code";
import { eyebrow, primaryButton, secondaryButton } from "@/components/ui/styles";
import { homeInner } from "./layout";

// Hero: promo, countdown, mini name preview; the 3D coin starts here.
// Photos / videos from the admin replace the coin.
export async function Hero({ catalog, locale }: { catalog: Catalog; locale: Locale }) {
  const t = await getTranslations("home");
  const tPromo = await getTranslations("promo");
  const { promo, heroOffer } = catalog;
  const endsAt = heroOffer?.endsAt ?? promo?.endsAt ?? null;
  const slides = catalog.heroSlides;
  const media = slides.length > 0;

  return (
    <section className={media ? "relative isolate overflow-hidden text-white" : "bg-gradient-to-b from-surface to-background"}>
      {media && <HeroCarousel slides={slides} />}
      <div
        className={`${homeInner} grid items-center gap-6 pt-6 pb-14 lg:gap-10 lg:pt-14 lg:pb-20 ${
          media ? "min-h-[34rem] lg:min-h-[40rem]" : "lg:grid-cols-[1.05fr_1fr]"
        }`}
      >
        {!media && (
          <CoinAnchor
            id="hero"
            eager
            alt={t("lira.coinAlt")}
            className="mx-auto w-[58%] max-w-72 lg:order-last lg:w-full lg:max-w-[26rem]"
          />
        )}
        <div className={`flex flex-col items-center gap-5 text-center ${media ? "lg:max-w-2xl" : "lg:items-start lg:text-start"}`}>
          <p className={media ? `${eyebrow} !text-white/85` : eyebrow}>{t("hero.eyebrow")}</p>
          <p className="font-display text-5xl leading-[1.05] font-medium lining-nums sm:text-6xl lg:text-7xl">
            {heroOffer
              ? (heroOffer.headline?.[locale] ?? t("hero.title", { percent: heroOffer.percent }))
              : t("hero.titleDefault")}
          </p>
          {promo && (
            <p className={`flex flex-wrap items-center justify-center gap-2 text-lg ${media ? "text-white/90" : "text-foreground/80 lg:justify-start"}`}>
              {t("hero.subtitle", { percent: promo.percent })}
              <CopyCode
                code={promo.code}
                copyLabel={tPromo("copy", { code: promo.code })}
                copiedLabel={tPromo("copied")}
                className={media ? "border-white text-white hover:bg-white/10" : "border-ink text-ink hover:bg-ink/5"}
              />
            </p>
          )}
          {endsAt && <Countdown endsAt={endsAt} onDark={media} className={media ? "items-center" : "items-center lg:items-start"} />}
          <div className={`flex flex-wrap justify-center gap-3 ${media ? "" : "lg:justify-start"}`}>
            <Link
              href={productHref("cursive-name-necklace")}
              className={media ? `${primaryButton} !bg-white !text-ink hover:!bg-white/90` : primaryButton}
            >
              {t("hero.cta")}
            </Link>
            <Link
              href={categoryHref("bestsellers")}
              className={media ? `${secondaryButton} !border-white !text-white hover:!bg-white hover:!text-ink` : secondaryButton}
            >
              {t("hero.ctaSecondary")}
            </Link>
          </div>
          <div className="w-full max-w-xl text-start text-foreground">
            <HeroMiniPreview
              fonts={findProduct(catalog, "cursive-name-necklace")?.personalization?.fonts ?? ["beirut"]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
