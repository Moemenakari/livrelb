import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/resolve-locale";
import { mainCategories } from "@/config/navigation";
import { primaryButton } from "@/components/ui/styles";
import {
  CategoryGridPlaceholder,
  LiraCoin,
  PhotoPlaceholder,
  ProductGridPlaceholder,
  ReviewCardsPlaceholder,
  Section,
  SectionHeading,
} from "@/components/home/placeholders";
import type messages from "../../../messages/en.json";

type SectionKey = keyof typeof messages.home.sections;

// Homepage in the order of brief §8.1. The announcement bar (1) and footer
// (11) live in the layout; the numbers below match the brief.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  await resolveLocale(params);
  const t = await getTranslations("home");
  const tNav = await getTranslations("nav");

  const heading = (key: SectionKey, number: string) => ({
    number,
    badge: t("placeholder"),
    title: t(`sections.${key}.title`),
    description: t(`sections.${key}.description`),
  });

  const categories = mainCategories.map(({ key, href }) => ({
    href,
    label: tNav(`categories.${key}`),
  }));

  return (
    <>
      <h1 className="sr-only">{t("title")}</h1>

      {/* 2. Hero: the jewelry photos are the hero */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 pt-4 pb-14 lg:px-8 lg:pt-8 lg:pb-20">
          <PhotoPlaceholder
            tone="beige"
            className="aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]"
          />
          <div className="mt-8">
            <SectionHeading {...heading("hero", "2")}>
              <Link href="/category/name-necklaces" className={`mt-3 ${primaryButton}`}>
                {t("sections.hero.cta")}
              </Link>
            </SectionHeading>
          </div>
        </div>
      </section>

      {/* 3. Lira collection */}
      <Section tone="ivory">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <SectionHeading {...heading("lira", "3")} />
          <div className="lg:order-first">
            <LiraCoin alt={t("sections.lira.coinAlt")} />
          </div>
        </div>
      </Section>

      {/* 4. Shop by style */}
      <Section>
        <SectionHeading {...heading("shopByStyle", "4")} />
        <CategoryGridPlaceholder categories={categories} />
      </Section>

      {/* 5. Best sellers */}
      <Section>
        <SectionHeading {...heading("bestSellers", "5")} />
        <ProductGridPlaceholder />
      </Section>

      {/* 6. How it works */}
      <Section tone="beige">
        <SectionHeading {...heading("howItWorks", "6")} />
      </Section>

      {/* 6b. Current season, only while one is active */}
      <Section>
        <div className="rounded-xl bg-blush px-6 py-12">
          <SectionHeading {...heading("season", "6b")} />
        </div>
      </Section>

      {/* 7. Loved by customers */}
      <Section tone="ivory">
        <SectionHeading {...heading("reviews", "7")} />
        <ReviewCardsPlaceholder />
      </Section>

      {/* 8. New arrivals */}
      <Section>
        <SectionHeading {...heading("newArrivals", "8")} />
        <ProductGridPlaceholder />
      </Section>

      {/* 9. Why us */}
      <Section tone="beige">
        <SectionHeading {...heading("whyUs", "9")} />
      </Section>

      {/* 10. Trust bar */}
      <Section>
        <SectionHeading {...heading("trustBar", "10")} />
      </Section>
    </>
  );
}
