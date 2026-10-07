"use client";

import { useMemo, useState } from "react";
import { PenLine, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { CardProduct } from "@/lib/catalog/card";
import { fonts as fontInfo, materials, textScript } from "@/lib/catalog/materials";
import type { FontKey, MetalTone, StyleKey } from "@/lib/catalog/types";
import { formatPrice } from "@/lib/format";
import { NAME_MAX_LENGTH } from "@/components/preview/name-preview";
import { ProductCard } from "@/components/product/product-card";

type Style = { key: StyleKey; label: string };
type Sort = "featured" | "priceLow" | "priceHigh" | "newest";
type Metal = "all" | MetalTone;

type Props = {
  products: CardProduct[];
  styles: Style[];
  /** Show "see your name on every necklace" (categories with name pieces). */
  namePreview: boolean;
  /** Name categories: a personalized piece is shown once for each font it allows. */
  perFont?: boolean;
};

const sorts: Sort[] = ["featured", "priceLow", "priceHigh", "newest"];
const metals: Metal[] = ["all", "gold", "silver"];
const metalSwatch: Record<MetalTone, string> = {
  gold: materials.gold.swatch,
  silver: materials.silver.swatch,
  rose: "#e2a98f",
};
/** "Up to $N" choices of the price filter; only the ones that make sense for this list are offered. */
const PRICE_STEPS = [25, 50, 75, 100, 150, 250];

/** One card of the grid: a piece, or a piece in one of its fonts. */
type Entry = { key: string; product: CardProduct; font?: FontKey };

const chip = "flex h-9 shrink-0 items-center justify-center rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors";
const chipOn = "border-ink bg-ink text-white";
const chipOff = "border-line hover:border-muted";

// Compact filters (styles, metal, price, sale / new, sort) in one sticky bar,
// then the grid straight away. Name categories list a piece once per font it
// allows, each card previewing the name in that font and opening the product
// with the font chosen.
export function CategoryBrowser({ products, styles, namePreview, perFont = false }: Props) {
  const t = useTranslations("category");
  const locale = useLocale() as "en" | "ar";
  const [style, setStyle] = useState<StyleKey | "all">("all");
  const [metal, setMetal] = useState<Metal>("all");
  const [maxPrice, setMaxPrice] = useState(0);
  const [sale, setSale] = useState(false);
  const [fresh, setFresh] = useState(false);
  const [sort, setSort] = useState<Sort>("featured");
  const [name, setName] = useState("");

  const top = Math.max(0, ...products.map((p) => p.price));
  const priceSteps = PRICE_STEPS.filter((n) => n < top && products.some((p) => p.price <= n));

  const shown = useMemo(() => {
    const list = products.filter(
      (p) =>
        (style === "all" || p.style === style) &&
        (metal === "all" || p.offers.some((o) => o.tone === metal)) &&
        (maxPrice === 0 || p.price <= maxPrice) &&
        (!sale || p.offers.some((o) => o.compareAtPrice)) &&
        (!fresh || p.isNew),
    );
    const sorted =
      sort === "priceLow"
        ? [...list].sort((a, b) => a.price - b.price)
        : sort === "priceHigh"
          ? [...list].sort((a, b) => b.price - a.price)
          : sort === "newest"
            ? [...list].sort((a, b) => Number(b.isNew) - Number(a.isNew))
            : list;
    return sorted.flatMap((product): Entry[] => {
      if (!perFont || product.art.kind !== "name" || !product.fonts || product.fonts.length < 2) return [{ key: product.slug, product }];
      // Fonts that can write the sample name (Arabic fonts for Arabic names).
      const script = textScript(product.sample ?? "A");
      const usable = product.fonts.filter((f) => fontInfo[f].script === script);
      return (usable.length > 0 ? usable : product.fonts).map((font) => ({ key: `${product.slug}:${font}`, product, font }));
    });
  }, [products, style, metal, maxPrice, sale, fresh, sort, perFont]);

  const filtered = style !== "all" || metal !== "all" || maxPrice !== 0 || sale || fresh;
  const clear = () => {
    setStyle("all");
    setMetal("all");
    setMaxPrice(0);
    setSale(false);
    setFresh(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {namePreview && (
        <label className="flex items-center gap-3 rounded-full border border-line bg-surface px-4 py-2.5 focus-within:border-gold lg:max-w-sm">
          <PenLine className="size-4 shrink-0 text-gold-dark" strokeWidth={1.5} aria-hidden />
          <span className="sr-only">{t("previewLabel")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX_LENGTH}
            placeholder={t("previewLabel")}
            className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>
      )}

      {/* Sticky under the header: one swipeable row on a phone. */}
      <div
        role="group"
        aria-label={t("filtersLabel")}
        className="no-scrollbar sticky top-12 z-30 -mx-4 flex items-center gap-2 overflow-x-auto border-b border-line bg-background/95 px-4 py-2 backdrop-blur lg:top-28 lg:mx-0 lg:px-0 min-[90rem]:top-16"
      >
        {styles.length > 0 && (
          <>
            <button type="button" aria-pressed={style === "all"} onClick={() => setStyle("all")} className={`${chip} ${style === "all" ? chipOn : chipOff}`}>
              {t("allStyles")}
            </button>
            {styles.map((s) => (
              <button key={s.key} type="button" aria-pressed={style === s.key} onClick={() => setStyle(s.key)} className={`${chip} ${style === s.key ? chipOn : chipOff}`}>
                {s.label}
              </button>
            ))}
            <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line" />
          </>
        )}

        <fieldset className="flex shrink-0 items-center gap-1.5">
          <legend className="sr-only">{t("metalLabel")}</legend>
          {metals.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={metal === m}
              aria-label={t(`metal.${m}`)}
              title={t(`metal.${m}`)}
              onClick={() => setMetal(m)}
              className={`flex h-9 items-center justify-center rounded-full border text-[13px] whitespace-nowrap transition-colors ${
                metal === m ? "border-ink" : "border-line hover:border-muted"
              } ${m === "all" ? "px-3.5" : "w-9"}`}
            >
              {m === "all" ? (
                t("metal.all")
              ) : (
                <span className="size-4.5 rounded-full border border-black/10" style={{ backgroundColor: metalSwatch[m] }} />
              )}
            </button>
          ))}
        </fieldset>

        {priceSteps.length > 0 && (
          <select
            aria-label={t("priceLabel")}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="h-9 shrink-0 rounded-full border border-line bg-background ps-3 pe-7 text-[13px]"
          >
            <option value={0}>{t("priceAny")}</option>
            {priceSteps.map((n) => (
              <option key={n} value={n}>
                {t("priceUpTo", { price: formatPrice(n) })}
              </option>
            ))}
          </select>
        )}

        <button type="button" aria-pressed={sale} onClick={() => setSale((v) => !v)} className={`${chip} ${sale ? chipOn : chipOff}`}>
          {t("saleOnly")}
        </button>
        <button type="button" aria-pressed={fresh} onClick={() => setFresh((v) => !v)} className={`${chip} ${fresh ? chipOn : chipOff}`}>
          {t("newOnly")}
        </button>

        <select
          aria-label={t("sortLabel")}
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="ms-auto h-9 shrink-0 rounded-full border border-line bg-background ps-3 pe-7 text-[13px]"
        >
          {sorts.map((s) => (
            <option key={s} value={s}>
              {t(`sort.${s}`)}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {t("count", { count: shown.length })}
      </p>

      {shown.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {shown.map(({ key, product, font }) => (
            <li key={`${key}-${metal}`}>
              <ProductCard
                product={product}
                previewText={name}
                preferredTone={metal === "all" ? undefined : metal}
                font={font}
                title={font ? t("inFont", { name: product.name, font: fontInfo[font].name[locale] }) : undefined}
                subtitle={font ? fontInfo[font].style[locale] : undefined}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted">{t("empty")}</p>
          {filtered && (
            <button type="button" onClick={clear} className="inline-flex items-center gap-2 rounded-full border border-ink px-5 py-2 text-sm">
              <X className="size-4" strokeWidth={1.5} aria-hidden />
              {t("clear")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
