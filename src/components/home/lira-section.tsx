import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { categoryHref } from "@/config/navigation";
import { findProduct, homeSection, productsIn, toCard, type Catalog, type Product } from "@/lib/catalog";
import type { Locale } from "@/i18n/routing";
import { CoinAnchor } from "@/components/coin/coin-anchor";
import { ProductCard } from "@/components/product/product-card";
import { ScrollRow } from "@/components/ui/scroll-row";
import { eyebrow, secondaryButton, swipeRow } from "@/components/ui/styles";
import { homeInner } from "./layout";

const MAX_PRODUCTS = 8;

// Lira Collection: the 3D coin lands in the slot on the start side, then the
// products picked by hand in the admin (Home page), in that order. Nothing
// picked = every product of the lira-collection category.
export async function LiraSection({ catalog, locale }: { catalog: Catalog; locale: Locale }) {
  const t = await getTranslations("home.lira");
  const section = homeSection(catalog, "lira");
  if (!section.visible) return null;

  const picked = section.products.flatMap((slug) => findProduct(catalog, slug) ?? []);
  const products: Product[] = (picked.length > 0 ? picked : productsIn(catalog, "lira-collection")).slice(0, MAX_PRODUCTS);
  const cards = products.map((p) => toCard(p, locale));

  return (
    <section>
      <div className={`${homeInner} py-16 lg:py-24`}>
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <CoinAnchor id="lira" alt={t("coinAlt")} className="mx-auto w-[64%] max-w-80 lg:w-full lg:max-w-[24rem]" />
          <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-start">
            <p className={eyebrow}>{t("eyebrow")}</p>
            <h2 className="text-4xl lg:text-6xl">{section.title?.[locale] ?? t("title")}</h2>
            <p className="max-w-lg text-muted">{section.subtitle?.[locale] ?? t("text")}</p>
            <Link href={section.ctaHref ?? categoryHref("lira-collection")} className={secondaryButton}>
              {t("cta")}
            </Link>
          </div>
        </div>
        <ScrollRow as="ul" gridFromLg className={`mt-12 lg:grid-cols-4 ${swipeRow}`}>
          {cards.map((p) => (
            <li key={p.slug} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-auto">
              <ProductCard product={p} />
            </li>
          ))}
        </ScrollRow>
      </div>
    </section>
  );
}
