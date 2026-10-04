"use client";

import { useMemo, useState, type ReactNode } from "react";
import { LayoutGrid, PenLine, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CardProduct } from "@/lib/catalog/card";
import { materials } from "@/lib/catalog/materials";
import type { FontKey, MetalTone, StyleKey } from "@/lib/catalog/types";
import { NAME_MAX_LENGTH } from "@/components/preview/name-preview";
import { ProductArt } from "@/components/product/product-art";
import { ProductCard } from "@/components/product/product-card";

type Style = { key: StyleKey; label: string; sample: string; font: FontKey };
type Sort = "featured" | "priceLow" | "priceHigh" | "newest";
type Metal = "all" | MetalTone;

type Props = {
  products: CardProduct[];
  styles: Style[];
  /** Show "see your name on every necklace" (categories with name pieces). */
  namePreview: boolean;
};

const sorts: Sort[] = ["featured", "priceLow", "priceHigh", "newest"];
const metals: Metal[] = ["all", "gold", "silver"];
const metalSwatch: Record<MetalTone, string> = {
  gold: materials.gold.swatch,
  silver: materials.silver.swatch,
  rose: "#e2a98f",
};

// Style thumbnails, filters, sort and the page-wide name preview for a
// category grid (brief §8.2). Filtering happens here on the static sample
// data; with the database it moves to the query.
export function CategoryBrowser({ products, styles, namePreview }: Props) {
  const t = useTranslations("category");
  const [style, setStyle] = useState<StyleKey | "all">("all");
  const [metal, setMetal] = useState<Metal>("all");
  const [sort, setSort] = useState<Sort>("featured");
  const [name, setName] = useState("");

  const shown = useMemo(() => {
    const list = products.filter(
      (p) =>
        (style === "all" || p.style === style) &&
        (metal === "all" || p.offers.some((o) => o.tone === metal)),
    );
    if (sort === "priceLow") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "priceHigh") return [...list].sort((a, b) => b.price - a.price);
    if (sort === "newest") return [...list].sort((a, b) => Number(b.isNew) - Number(a.isNew));
    return list;
  }, [products, style, metal, sort]);

  const clear = () => {
    setStyle("all");
    setMetal("all");
  };

  return (
    <div className="flex flex-col gap-8">
      {styles.length > 0 && (
        <nav aria-label={t("stylesLabel")}>
          <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 py-1 sm:justify-center lg:gap-7">
            <li className="shrink-0">
              <StyleButton
                label={t("allStyles")}
                active={style === "all"}
                onClick={() => setStyle("all")}
              >
                <LayoutGrid className="size-7 text-gold-dark" strokeWidth={1.25} aria-hidden />
              </StyleButton>
            </li>
            {styles.map((s) => (
              <li key={s.key} className="shrink-0">
                <StyleButton label={s.label} active={style === s.key} onClick={() => setStyle(s.key)}>
                  <ProductArt
                    art={{ kind: "name", variant: "necklace" }}
                    material="gold"
                    text={s.sample}
                    font={s.font}
                    connection="center"
                    aspect="square"
                    className="translate-y-[-8%] scale-[1.45]"
                  />
                </StyleButton>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="flex flex-col gap-4 border-y border-line py-4 lg:flex-row lg:items-center lg:justify-between">
        {namePreview ? (
          <label className="flex flex-1 items-center gap-3 rounded-full border border-line bg-surface px-4 py-2.5 focus-within:border-gold lg:max-w-sm">
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
        ) : (
          <p className="text-sm text-muted" aria-live="polite">
            {t("count", { count: shown.length })}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 lg:justify-end lg:gap-5">
          <fieldset className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <legend className="sr-only">{t("metalLabel")}</legend>
            {metals.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={metal === m}
                aria-label={t(`metal.${m}`)}
                title={t(`metal.${m}`)}
                onClick={() => setMetal(m)}
                className={`flex h-8 items-center justify-center rounded-full border text-xs whitespace-nowrap transition-colors ${
                  metal === m ? "border-ink" : "border-line hover:border-muted"
                } ${m === "all" ? "px-3" : "w-8"}`}
              >
                {m === "all" ? (
                  t("metal.all")
                ) : (
                  <span
                    className="size-4.5 rounded-full border border-black/10"
                    style={{ backgroundColor: metalSwatch[m] }}
                  />
                )}
              </button>
            ))}
          </fieldset>

          <label className="flex min-w-0 flex-1 items-center justify-end gap-2 text-sm lg:flex-none">
            <span className="sr-only text-muted sm:not-sr-only">{t("sortLabel")}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="w-full max-w-48 min-w-0 rounded-full border border-line bg-background py-1.5 ps-3 pe-8 text-sm"
            >
              {sorts.map((s) => (
                <option key={s} value={s}>
                  {t(`sort.${s}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {namePreview && (
        <p className="-mt-4 text-sm text-muted" aria-live="polite">
          {t("count", { count: shown.length })}
        </p>
      )}

      {shown.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {shown.map((p) => (
            <li key={`${p.slug}-${metal}`}>
              <ProductCard
                product={p}
                previewText={name}
                preferredTone={metal === "all" ? undefined : metal}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted">{t("empty")}</p>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-2 rounded-full border border-ink px-5 py-2 text-sm"
          >
            <X className="size-4" strokeWidth={1.5} aria-hidden />
            {t("clear")}
          </button>
        </div>
      )}
    </div>
  );
}

function StyleButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="group flex w-20 flex-col items-center gap-2 lg:w-28"
    >
      <span
        className={`flex size-20 items-center justify-center overflow-hidden rounded-full bg-blush transition-shadow lg:size-28 ${
          active ? "ring-2 ring-gold ring-offset-2" : "group-hover:ring-1 group-hover:ring-line"
        }`}
      >
        {children}
      </span>
      <span className={`text-[13px] ${active ? "font-medium text-foreground" : "text-muted"}`}>
        {label}
      </span>
    </button>
  );
}
