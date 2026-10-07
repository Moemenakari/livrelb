import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { categoryHref } from "@/config/navigation";
import { bestSellers, homeSection, toCard, type Catalog } from "@/lib/catalog";
import type { Locale } from "@/i18n/routing";
import { ProductCard } from "@/components/product/product-card";
import { secondaryButton } from "@/components/ui/styles";
import { SectionTitle } from "./section-title";
import { homeCover } from "./layout";

// Best sellers: products with the Best seller badge (product editor), in the
// order set on the admin's Home page.
export async function BestSellers({ catalog, locale }: { catalog: Catalog; locale: Locale }) {
  const t = await getTranslations("home.bestSellers");
  const section = homeSection(catalog, "best_sellers");
  if (!section.visible) return null;
  const cards = bestSellers(catalog, 8).map((p) => toCard(p, locale));
  if (cards.length === 0) return null;

  return (
    <section data-coin-cover className={`${homeCover} bg-background`}>
      <div className="mx-auto max-w-7xl px-4 pb-16 lg:px-8 lg:pb-24">
        <SectionTitle title={section.title?.[locale] ?? t("title")} subtitle={section.subtitle?.[locale] ?? t("subtitle")} />
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
          {cards.map((p) => (
            <li key={p.slug}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
        <div className="mt-12 flex justify-center">
          <Link href={section.ctaHref ?? categoryHref("bestsellers")} className={secondaryButton}>
            {t("cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
