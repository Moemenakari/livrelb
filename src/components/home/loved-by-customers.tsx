import { getTranslations } from "next-intl/server";
import { findProduct, type Catalog } from "@/lib/catalog";
import type { Locale } from "@/i18n/routing";
import { ReviewCard } from "@/components/product/review-card";
import { ScrollRow } from "@/components/ui/scroll-row";
import { swipeRow } from "@/components/ui/styles";
import { SectionTitle } from "./section-title";
import { homeInner } from "./layout";

// Loved by customers: approved reviews only (samples in development).
export async function LovedByCustomers({ catalog, locale }: { catalog: Catalog; locale: Locale }) {
  const t = await getTranslations("home.reviews");
  const tCommon = await getTranslations("common");
  const loved = catalog.reviews.slice(0, 3);
  if (loved.length === 0) return null;

  return (
    <section className="bg-blush/60">
      <div className={`${homeInner} py-16 lg:py-24`}>
        <SectionTitle title={t("title")} subtitle={t("subtitle")} />
        <ScrollRow as="ul" gridFromLg className={`lg:grid-cols-3 ${swipeRow}`}>
          {loved.map((r) => (
            <li key={r.id} className="flex w-[82%] shrink-0 snap-start sm:w-[46%] lg:w-auto">
              <ReviewCard
                review={r}
                locale={locale}
                starsLabel={tCommon("stars", { rating: r.rating })}
                productName={r.productSlug ? findProduct(catalog, r.productSlug)?.name[locale] : undefined}
                className="flex-1"
              />
            </li>
          ))}
        </ScrollRow>
      </div>
    </section>
  );
}
