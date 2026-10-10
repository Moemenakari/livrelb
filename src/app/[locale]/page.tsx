import type { Metadata } from "next";
import { Fragment } from "react";
import { alternates } from "@/lib/seo";
import { resolveLocale } from "@/i18n/resolve-locale";
import { getCatalog, homeSectionsInOrder, type HomeSectionKey } from "@/lib/catalog";
import { CoinStage } from "@/components/coin/coin-stage";
import { BestSellers } from "@/components/home/best-sellers";
import { CreatePersonal } from "@/components/home/create-personal";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { LiraSection } from "@/components/home/lira-section";
import { LovedByCustomers } from "@/components/home/loved-by-customers";
import { NewArrivals } from "@/components/home/new-arrivals";
import { ShopByStyle } from "@/components/home/shop-by-style";
import { TrustBar } from "@/components/home/trust-bar";
import { TryYourPicture } from "@/components/home/try-your-picture";
import { WhyUs } from "@/components/home/why-us";
import { getTranslations } from "next-intl/server";

// Homepage (brief §8.1, restart brief). The 3D Lira coin lives in a fixed
// layer behind the page (<CoinStage>); every section is its own component in
// components/home, and what the owner can change (texts, hand-picked products,
// tiles, order of best sellers) comes from the admin's Home page.

// Rebuilt hourly and whenever the admin saves (revalidateTag("catalog")).
export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { alternates: alternates(locale, "/") };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("home");
  const catalog = await getCatalog();

  // The Hero and the Lira Collection carry the coin and stay first; the rest follow the order set in the admin's Home page.
  const sections: Record<HomeSectionKey, React.ReactNode> = {
    shop_by_style: <ShopByStyle catalog={catalog} locale={locale} />,
    best_sellers: <BestSellers catalog={catalog} locale={locale} />,
    steps: <HowItWorks catalog={catalog} locale={locale} />,
    try_picture: <TryYourPicture catalog={catalog} locale={locale} />,
    reviews: <LovedByCustomers catalog={catalog} locale={locale} />,
    new_arrivals: <NewArrivals catalog={catalog} locale={locale} />,
    why_us: <WhyUs />,
    create: <CreatePersonal catalog={catalog} locale={locale} />,
    trust: <TrustBar />,
  };

  return (
    <>
      <CoinStage />
      <h1 className="sr-only">{t("title")}</h1>
      <Hero catalog={catalog} locale={locale} />
      <LiraSection catalog={catalog} locale={locale} />
      {homeSectionsInOrder(catalog).map((key) => (
        <Fragment key={key}>{sections[key]}</Fragment>
      ))}
    </>
  );
}
