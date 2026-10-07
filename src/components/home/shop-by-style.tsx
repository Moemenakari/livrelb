import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { categoryHref } from "@/config/navigation";
import { homeCategories, homeSection, type Catalog } from "@/lib/catalog";
import type { Locale } from "@/i18n/routing";
import { ProductArt } from "@/components/product/product-art";
import { SectionTitle } from "./section-title";
import { homeCover } from "./layout";

const tones = ["bg-blush", "bg-surface", "bg-beige", "bg-surface", "bg-blush", "bg-beige"];

/**
 * The first tile is the big one (2x2). On the 4-column desktop grid the next
 * four fill the space beside it, so what is left on the last row is made wide
 * to leave no gap; on the 2-column phone grid an odd last tile is wide.
 */
function tileClass(i: number, count: number) {
  if (i === 0) return "col-span-2 row-span-2 aspect-[4/3] lg:aspect-auto";
  const rest = count - 5;
  const wide = i >= 5 && (rest === 2 || (rest % 2 === 1 && i === count - 1));
  const phoneWide = i === count - 1 && (count - 1) % 2 === 1;
  if (wide || phoneWide) return "col-span-2 aspect-[2/1] lg:aspect-auto";
  return "aspect-square lg:aspect-auto";
}

// "Shop by style": the tiles, their order and their photos come from the
// categories in the admin (Home page). The drawn art is the fallback.
export async function ShopByStyle({ catalog, locale }: { catalog: Catalog; locale: Locale }) {
  const t = await getTranslations("home.shopByStyle");
  const tCommon = await getTranslations("common");
  const section = homeSection(catalog, "shop_by_style");
  if (!section.visible) return null;
  const tiles = homeCategories(catalog);
  if (tiles.length === 0) return null;

  return (
    <section data-coin-cover className={`${homeCover} bg-background`}>
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
        <SectionTitle title={section.title?.[locale] ?? t("title")} subtitle={section.subtitle?.[locale] ?? t("subtitle")} />
        <ul className="grid grid-cols-2 gap-3 lg:auto-rows-[15rem] lg:grid-cols-4 lg:gap-4">
          {tiles.map((category, i) => (
            <li key={category.slug} className={tileClass(i, tiles.length)}>
              <Link
                href={categoryHref(category.slug)}
                className={`group relative flex h-full flex-col overflow-hidden rounded-xl ${tones[i % tones.length]}`}
              >
                {category.image ? (
                  <Image
                    src={category.image}
                    alt=""
                    fill
                    sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center overflow-hidden px-[8%] transition-transform duration-500 group-hover:scale-105">
                    <ProductArt
                      art={category.art}
                      material={category.slug === "mens-jewelry" ? "silver" : "gold"}
                      text={category.artSample ?? "L"}
                      connection="sides"
                      aspect="wide"
                      className="max-h-full max-w-md"
                    />
                  </div>
                )}
                <div
                  className={`flex items-end justify-between gap-2 p-4 lg:p-5 ${
                    category.image ? "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent pt-10 text-white" : ""
                  }`}
                >
                  <span className="font-display text-xl leading-tight lg:text-2xl">{category.name[locale]}</span>
                  <span className={`flex shrink-0 items-center gap-1 text-xs ${category.image ? "text-white/90" : "text-gold-dark"}`}>
                    {tCommon("shopNow")}
                    <ArrowRight className="size-3.5 rtl:-scale-x-100" strokeWidth={1.5} aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
