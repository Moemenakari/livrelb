import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { categoryHref } from "@/config/navigation";
import { homeSection, newArrivals as newestProducts, toCard, type Catalog } from "@/lib/catalog";
import type { Locale } from "@/i18n/routing";
import { ProductCard } from "@/components/product/product-card";
import { ScrollRow } from "@/components/ui/scroll-row";
import { secondaryButton, swipeRow } from "@/components/ui/styles";
import { SectionTitle } from "./section-title";
import { homeCover } from "./layout";

// New arrivals: products with the New badge (product editor).
export async function NewArrivals({ catalog, locale }: { catalog: Catalog; locale: Locale }) {
  const t = await getTranslations("home.newArrivals");
  const section = homeSection(catalog, "new_arrivals");
  if (!section.visible) return null;
  const cards = newestProducts(catalog, 4).map((p) => toCard(p, locale));
  if (cards.length === 0) return null;

  return (
    <section data-coin-cover className={`${homeCover} bg-background`}>
      <div className="mx-auto max-w-7xl px-4 pb-16 lg:px-8 lg:pb-24">
        <SectionTitle title={section.title?.[locale] ?? t("title")} subtitle={section.subtitle?.[locale] ?? t("subtitle")} />
        <ScrollRow as="ul" gridFromLg className={`lg:grid-cols-4 ${swipeRow}`}>
          {cards.map((p) => (
            <li key={p.slug} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-auto">
              <ProductCard product={p} />
            </li>
          ))}
        </ScrollRow>
        <div className="mt-12 flex justify-center">
          <Link href={section.ctaHref ?? categoryHref("new")} className={secondaryButton}>
            {t("cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
