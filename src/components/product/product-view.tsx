"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, Gift, MessageCircle, ShoppingBag, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { shipping } from "@/config/promo";
import { whatsappMessageUrl } from "@/config/site";
import { addToCart } from "@/lib/cart";
import type { FontKey, MaterialKey, ProductArt as Art, RingStyle, SizeOption } from "@/lib/catalog/types";
import { formatPrice } from "@/lib/format";
import { useTrackView } from "@/lib/recently-viewed";
import { scriptFamily } from "@/components/preview/script-fonts";
import { Stars } from "@/components/ui/stars";
import { primaryButton } from "@/components/ui/styles";
import { ProductArt } from "./product-art";
import { ProductGallery, type GalleryHandle } from "./product-gallery";
import { SizeGuide } from "./size-guide";

export type ProductViewData = {
  slug: string;
  name: string;
  summary: string;
  url: string;
  price: number;
  compareAtPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  materials: { key: MaterialKey; name: string; swatch: string; priceModifier: number }[];
  defaultMaterial: MaterialKey;
  personalization?: {
    kind: "name" | "initial";
    maxLength: number;
    fonts: { key: FontKey; name: string }[];
    rings: RingStyle[];
  };
  size?: SizeOption;
  art: Art;
  media: { src: string; alt: string }[];
};

const optionCard =
  "rounded-lg border transition-colors focus-visible:outline-offset-2";
const selected = "border-gold bg-gold/5 ring-1 ring-gold";
const unselected = "border-line hover:border-muted";

// Gallery + configurator for the product page (brief §8.3, restart brief):
// material cards, name input with live preview, chain length, ring option,
// gift box, add to cart.
export function ProductView({ product, children }: { product: ProductViewData; children?: ReactNode }) {
  const t = useTranslations("product");
  const tCommon = useTranslations("common");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<GalleryHandle>(null);
  const p = product.personalization;

  const [material, setMaterial] = useState<MaterialKey>(product.defaultMaterial);
  const [text, setText] = useState("");
  const [font, setFont] = useState<FontKey | undefined>(p?.fonts[0]?.key);
  const [rings, setRings] = useState<RingStyle | undefined>(
    p ? (p.rings.includes("sides") ? "sides" : p.rings[0]) : undefined,
  );
  const [size, setSize] = useState<number | undefined>(product.size?.default);
  const [giftBox, setGiftBox] = useState(false);
  const [missingName, setMissingName] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useTrackView(product.slug);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const current = product.materials.find((m) => m.key === material)!;
  const unitPrice = product.price + current.priceModifier;
  const compareAt = product.compareAtPrice ? product.compareAtPrice + current.priceModifier : undefined;
  const total = unitPrice + (giftBox ? shipping.giftBoxPrice : 0);

  // Every design change brings the live preview slide back into view.
  const design = <T,>(set: (v: T) => void) => (value: T) => {
    set(value);
    galleryRef.current?.showPreview();
  };

  const onAdd = () => {
    if (p && !text.trim()) {
      setMissingName(true);
      inputRef.current?.focus();
      return;
    }
    addToCart({
      slug: product.slug,
      material,
      text: p ? text.trim() : undefined,
      font,
      size,
      rings,
      giftBox,
      unitPrice: total,
    });
    setToast(
      t("addedDetail", {
        name: p ? `${product.name} — ${text.trim()}` : product.name,
        material: current.name,
      }),
    );
  };

  const sizeLabel = (v: number) =>
    product.size?.kind === "ring" ? t("usSize", { value: v }) : t("cm", { value: v });

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ProductGallery
          ref={galleryRef}
          name={product.name}
          art={product.art}
          media={product.media}
          personalizable={Boolean(p)}
          state={{ material, text, font, rings }}
        />
      </div>

      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl lg:text-4xl">{product.name}</h1>
          <a href="#reviews" className="flex items-center gap-2 text-sm text-muted hover:text-foreground">
            <Stars rating={product.rating} label={tCommon("stars", { rating: product.rating })} />
            <span className="font-medium text-foreground">{product.rating.toFixed(1)}</span>
            <span className="underline underline-offset-4">
              {t("reviewsLink", { count: product.reviewCount })}
            </span>
          </a>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-medium text-gold-dark">{formatPrice(unitPrice)}</span>
            {compareAt && <s className="text-lg text-muted">{formatPrice(compareAt)}</s>}
            {product.discount && (
              <span className="rounded-full bg-cedar px-2.5 py-1 text-xs font-medium tracking-wide text-white rtl:tracking-normal">
                {t("off", { percent: product.discount })}
              </span>
            )}
          </div>
          <p className="text-muted">{product.summary}</p>
        </div>

        <div className="border-t border-line pt-6">
        <fieldset className="min-w-0">
          <legend className="mb-3 flex items-center gap-2 text-sm">
            <span className="font-medium">{t("chooseMaterial")}</span>
            <span aria-hidden className="text-muted">·</span>
            <span className="text-muted">{current.name}</span>
          </legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {product.materials.map((m) => (
              <button
                key={m.key}
                type="button"
                aria-pressed={material === m.key}
                onClick={() => design(setMaterial)(m.key)}
                className={`${optionCard} flex flex-col items-center gap-2 px-2 py-3 text-center ${material === m.key ? selected : unselected}`}
              >
                <span
                  aria-hidden
                  className="size-7 rounded-full border border-black/10 shadow-inner"
                  style={{
                    backgroundColor: m.swatch,
                    backgroundImage:
                      "radial-gradient(circle at 30% 28%, rgba(255,255,255,.9), rgba(255,255,255,0) 58%)",
                  }}
                />
                <span className="text-[12px] leading-tight">{m.name}</span>
                <span className="text-[12px] font-medium text-gold-dark">
                  {formatPrice(product.price + m.priceModifier)}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        </div>

        {p && p.fonts.length > 1 && (
          <fieldset className="flex min-w-0 flex-col gap-3">
            <legend className="mb-3 text-sm font-medium">{t("chooseFont")}</legend>
            <div className="flex flex-wrap gap-2">
              {p.fonts.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={font === f.key}
                  onClick={() => design(setFont)(f.key)}
                  className={`${optionCard} px-4 py-1.5 text-2xl ${font === f.key ? selected : unselected}`}
                  style={{ fontFamily: scriptFamily(f.key, false) }}
                >
                  <span lang="en">{f.name}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {p && (
          <div className="flex flex-col gap-2">
            <label htmlFor={inputId} className="text-sm font-medium">
              {p.kind === "initial" ? t("initialLabel") : t("nameLabel")}
            </label>
            <div className="flex items-stretch gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <div
                  className={`flex items-center rounded-lg border bg-background px-4 focus-within:border-gold ${
                    missingName ? "border-red-700" : "border-line"
                  }`}
                >
                  <input
                    ref={inputRef}
                    id={inputId}
                    value={text}
                    maxLength={p.maxLength}
                    autoComplete="off"
                    aria-invalid={missingName || undefined}
                    aria-describedby={`${inputId}-hint`}
                    onChange={(e) => {
                      design(setText)(e.target.value);
                      if (e.target.value.trim()) setMissingName(false);
                    }}
                    className="h-12 w-full min-w-0 bg-transparent text-lg outline-none"
                  />
                  <span className="shrink-0 text-xs text-muted tabular-nums" aria-hidden>
                    {t("nameCount", { count: [...text].length, max: p.maxLength })}
                  </span>
                </div>
                <p id={`${inputId}-hint`} className={`text-xs ${missingName ? "text-red-700" : "text-muted"}`}>
                  {missingName ? t("nameRequired") : t("nameHint", { max: p.maxLength })}
                </p>
              </div>
              <div
                aria-hidden
                className="flex w-28 shrink-0 items-center self-start overflow-hidden rounded-lg border border-line bg-surface sm:w-36"
              >
                <ProductArt
                  art={product.art}
                  material={material}
                  text={text}
                  font={font}
                  rings={rings}
                  aspect="wide"
                />
              </div>
            </div>
          </div>
        )}

        {product.size && (
          <div role="group" aria-labelledby={`${inputId}-size`} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span id={`${inputId}-size`} className="text-sm font-medium">
                {t(`size.${product.size.kind}`)}
              </span>
              <SizeGuide size={product.size} />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {product.size.values.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={size === v}
                  onClick={() => setSize(v)}
                  className={`${optionCard} py-3 text-center text-sm ${size === v ? selected : unselected}`}
                >
                  {sizeLabel(v)}
                </button>
              ))}
            </div>
          </div>
        )}

        {p && p.rings.length > 1 && (
          <fieldset className="flex min-w-0 flex-col gap-3">
            <legend className="mb-3 text-sm font-medium">{t("ringsLabel")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {p.rings.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={rings === r}
                  onClick={() => design(setRings)(r)}
                  className={`${optionCard} flex items-center gap-3 px-3 py-3 text-start text-[13px] leading-tight ${rings === r ? selected : unselected}`}
                >
                  <RingIcon style={r} />
                  {t(`rings.${r}`)}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <label
          className={`${optionCard} flex cursor-pointer items-center gap-3 px-4 py-3.5 ${giftBox ? selected : unselected}`}
        >
          <input
            type="checkbox"
            checked={giftBox}
            onChange={(e) => setGiftBox(e.target.checked)}
            className="size-4 accent-[var(--gold)]"
          />
          <Gift className="size-5 text-gold-dark" strokeWidth={1.5} aria-hidden />
          <span className="flex-1 text-sm">{t("giftBox")}</span>
          <span className="text-sm font-medium text-gold-dark">
            {t("giftBoxPrice", { price: formatPrice(shipping.giftBoxPrice) })}
          </span>
        </label>

        <div className="flex flex-col gap-3">
          <button type="button" onClick={onAdd} className={`${primaryButton} w-full py-4 text-base`}>
            <ShoppingBag className="size-5" strokeWidth={1.5} aria-hidden />
            {t("addToCart")}
            <span aria-hidden>·</span>
            {formatPrice(total)}
          </button>
          <ul className="flex flex-col gap-1.5 text-[13px] text-muted">
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-cedar" strokeWidth={1.5} aria-hidden />
              {t("deliveryNote")}
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-cedar" strokeWidth={1.5} aria-hidden />
              {t("freeShippingNote", { amount: formatPrice(shipping.freeOver) })}
            </li>
          </ul>
          <a
            href={whatsappMessageUrl(t("whatsappMessage", { product: product.name, url: product.url }))}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-full border border-line py-3 text-sm transition-colors hover:border-cedar hover:text-cedar"
          >
            <MessageCircle className="size-4.5 text-cedar" strokeWidth={1.5} aria-hidden />
            {t("whatsapp")}
          </a>
        </div>

        {children}
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
        {toast && (
          <div className="pointer-events-auto flex animate-rise-in items-center gap-3 rounded-xl bg-ink px-5 py-3.5 text-sm text-white shadow-lg motion-reduce:animate-none">
            <Check className="size-5 text-gold" strokeWidth={2} aria-hidden />
            <span className="flex flex-col">
              <span className="font-medium">{t("added")}</span>
              <span className="text-white/70">{toast}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Tiny drawing of where the chain attaches.
function RingIcon({ style }: { style: RingStyle }) {
  return (
    <svg viewBox="0 0 40 24" className="h-6 w-10 shrink-0 text-gold-dark" fill="none" stroke="currentColor" aria-hidden>
      {style === "center" ? (
        <>
          <path d="M2 1 Q12 12 18 12 M38 1 Q28 12 22 12" strokeWidth="1" strokeDasharray="1.6 1" />
          <circle cx="20" cy="12" r="2.2" strokeWidth="1.2" />
          <rect x="10" y="15.5" width="20" height="5" rx="2.5" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          <path d="M2 1 L7 14 M38 1 L33 14" strokeWidth="1" strokeDasharray="1.6 1" />
          <circle cx="8" cy="16" r="2.2" strokeWidth="1.2" />
          <circle cx="32" cy="16" r="2.2" strokeWidth="1.2" />
          <rect x="10.5" y="13.5" width="19" height="5" rx="2.5" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
