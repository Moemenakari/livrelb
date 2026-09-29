"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { productHref } from "@/config/navigation";
import type { CardProduct } from "@/lib/catalog/card";
import { materials } from "@/lib/catalog/materials";
import type { MaterialKey, MetalTone } from "@/lib/catalog/types";
import { formatPrice } from "@/lib/format";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { ProductArt } from "./product-art";

type Props = {
  product: CardProduct;
  /** Name typed once on a category page, drawn on every name piece. */
  previewText?: string;
  /** Open in this metal when the piece comes in it (category metal filter). */
  preferredTone?: MetalTone;
  className?: string;
};

export const badgeClass =
  "tracking-caps rounded-sm px-2 py-1 text-[10px] leading-none font-medium text-white uppercase";

// Product card (restart brief): badges, image carousel with dots, material
// dots, name, old and new price, free shipping.
export function ProductCard({ product, previewText, preferredTone, className = "" }: Props) {
  const t = useTranslations("productCard");
  const tCommon = useTranslations("common");
  const tPlaceholders = useTranslations("placeholders");
  const locale = useLocale();
  const [material, setMaterial] = useState<MaterialKey>(
    () =>
      (preferredTone && product.materials.find((m) => materials[m].tone === preferredTone)) ||
      product.defaultMaterial,
  );
  const [slide, setSlide] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const href = productHref(product.slug);

  const extra = product.priceModifiers[material] ?? 0;
  const price = product.price + extra;
  const compareAt = product.compareAtPrice ? product.compareAtPrice + extra : undefined;
  const text = previewText?.trim() || product.sample || "";

  const art = (className: string) => (
    <ProductArt
      art={product.art}
      material={material}
      text={text}
      font={product.font}
      rings={product.rings}
      aspect="portrait"
      className={className}
    />
  );

  const slides =
    product.media.length > 0
      ? product.media.map((m) => (
          <Image
            key={m.src}
            src={m.src}
            alt={m.alt}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover"
          />
        ))
      : [
          <div key="art" className="flex h-full items-start bg-surface">
            {art("")}
          </div>,
          <div key="zoom" className="flex h-full items-center overflow-hidden bg-blush">
            {art("scale-[1.6] origin-[50%_60%]")}
          </div>,
          <PhotoSlot key="photo" label={tPlaceholders("model")} tone="beige" className="h-full" />,
        ];

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const sign = locale === "ar" ? -1 : 1;
    track.scrollTo({ left: sign * index * track.clientWidth, behavior: "smooth" });
  };

  const badges = [
    compareAt && { label: tCommon("sale"), className: "bg-ink" },
    product.isBestSeller && { label: tCommon("bestSeller"), className: "bg-ink" },
    product.isNew && { label: tCommon("new"), className: "bg-cedar" },
  ].filter(Boolean) as { label: string; className: string }[];

  return (
    <article className={`group flex flex-col gap-3 ${className}`}>
      <div className="relative overflow-hidden rounded-lg">
        <div
          ref={trackRef}
          aria-label={t("slides", { name: product.name })}
          onScroll={(e) => {
            const el = e.currentTarget;
            setSlide(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
          }}
          className="no-scrollbar flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto"
        >
          {slides.map((content, i) => (
            <Link
              key={i}
              href={href}
              tabIndex={i === 0 ? undefined : -1}
              aria-hidden={i === 0 ? undefined : true}
              aria-label={i === 0 ? product.name : undefined}
              className="relative block w-full shrink-0 snap-center"
            >
              {content}
            </Link>
          ))}
        </div>

        {badges.length > 0 && (
          <div className="pointer-events-none absolute start-2 top-2 flex flex-col items-start gap-1">
            {badges.slice(0, 2).map((b) => (
              <span key={b.label} className={`${badgeClass} ${b.className}`}>
                {b.label}
              </span>
            ))}
          </div>
        )}

        {slides.length > 1 && (
          <>
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={t("showSlide", { index: i + 1 })}
                  aria-current={slide === i || undefined}
                  onClick={() => goTo(i)}
                  className={`size-1.5 rounded-full transition-colors ${slide === i ? "bg-ink" : "bg-ink/25"}`}
                />
              ))}
            </div>
            {/* Arrows for mouse users; touch users swipe. */}
            <button
              type="button"
              aria-label={tCommon("previous")}
              onClick={() => goTo(Math.max(0, slide - 1))}
              className="absolute start-2 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 lg:flex"
            >
              <ChevronLeft className="size-4 rtl:-scale-x-100" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label={tCommon("next")}
              onClick={() => goTo(Math.min(slides.length - 1, slide + 1))}
              className="absolute end-2 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 lg:flex"
            >
              <ChevronRight className="size-4 rtl:-scale-x-100" strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>

      {product.materials.length > 1 && (
        <div className="flex gap-2 px-0.5">
          {product.materials.map((key) => (
            <button
              key={key}
              type="button"
              aria-label={t("showMaterial", { material: materials[key].name[locale] })}
              aria-pressed={material === key}
              onClick={() => setMaterial(key)}
              style={{ backgroundColor: materials[key].swatch }}
              className={`size-4 rounded-full border border-black/10 transition-shadow ${material === key ? "ring-1 ring-gold-dark ring-offset-2" : ""}`}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 px-0.5">
        <h3 className="text-[15px] leading-snug font-normal font-sans">
          <Link href={href} className="transition-colors hover:text-gold-dark">
            {product.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium text-gold-dark">
            <span className="sr-only">{t("priceNow", { price: formatPrice(price) })}</span>
            <span aria-hidden>{formatPrice(price)}</span>
          </span>
          {compareAt && (
            <s className="text-sm text-muted">
              <span className="sr-only">{t("priceWas", { price: formatPrice(compareAt) })}</span>
              <span aria-hidden>{formatPrice(compareAt)}</span>
            </s>
          )}
        </p>
        <p className="flex items-center gap-1 text-xs text-cedar">
          <Check className="size-3.5" strokeWidth={2} aria-hidden />
          {tCommon("freeShipping")}
        </p>
      </div>
    </article>
  );
}
