"use client";

import { useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { whatsappUrl } from "@/config/site";
import { addToCart } from "@/lib/cart";
import { track } from "@/lib/analytics/client";
import { defaultFontFor, fonts as fontInfo, textScript } from "@/lib/catalog/materials";
import type {
  ChainConnection,
  FontKey,
  MaterialKey,
  Localized,
  Piece,
  PointsRules,
  ProductArt as Art,
  ReviewStats,
  SizeOption,
} from "@/lib/catalog/types";
import { formatPrice } from "@/lib/format";
import { useTrackView } from "@/lib/recently-viewed";
import { Stars } from "@/components/ui/stars";
import { primaryButton } from "@/components/ui/styles";
import { FontPicker } from "./font-picker";
import { ProductArt } from "./product-art";
import { ProductGallery, type GalleryHandle } from "./product-gallery";
import { ProductInfoCards, type InfoCardsData } from "./product-info-cards";
import { OfferBadgesRow, PriceBlock, SoldCount, type Deal, type OfferBadges } from "./product-offer";
import { SizeGuide } from "./size-guide";
import { pieceOf } from "@/lib/catalog/types";

export type ProductViewData = {
  slug: string;
  name: string;
  /** Both languages, saved with the cart line. */
  names: Localized;
  summary: string;
  url: string;
  /** Shop rules from site_settings (USD) and the WhatsApp number (empty hides the button). */
  freeShippingOver: number;
  whatsappNumber: string;
  /** Visible reviews of this piece; null hides the stars. */
  reviews: ReviewStats | null;
  /** Metals offered, each with its own price (product_materials). */
  materials: {
    key: MaterialKey;
    name: string;
    swatch: string;
    price: number;
    compareAtPrice?: number;
  }[];
  defaultMaterial: MaterialKey;
  personalization?: {
    kind: "name" | "initial";
    maxLength: number;
    /** Allowed fonts (the product's default first), named in the page language. */
    fonts: { key: FontKey; name: string }[];
  };
  /** Where the chain may attach (one ring on top, or both sides). */
  connections: ChainConnection[];
  size?: SizeOption;
  /** The same design worn the other way (necklace or bracelet), with its price change. */
  altSize?: SizeOption;
  art: Art;
  media: { src: string; alt: string; type: "image" | "video" }[];
  /** Selling details (Phase 4 A1): real sales, badges, points, deals. */
  offer: { sold: number; badges: OfferBadges; points: PointsRules; deals: Deal[] };
  /** Cards under "Add to cart" (Phase 4 A2). */
  info: InfoCardsData;
};

const noSubscription = () => () => {};

const optionCard =
  "rounded-lg border transition-colors focus-visible:outline-offset-2";
const selected = "border-gold bg-gold/5 ring-1 ring-gold";
const unselected = "border-line hover:border-muted";

// Gallery + configurator for the product page (brief §8.3, restart brief):
// material cards, font picker, name input with live preview, chain length,
// ring option, the free gift box, add to cart.
export function ProductView({ product, children }: { product: ProductViewData; children?: ReactNode }) {
  const t = useTranslations("product");
  const tCommon = useTranslations("common");
  const tPreview = useTranslations("namePreview");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<GalleryHandle>(null);
  const p = product.personalization;

  // A design carried over in the URL (?name=Maya&material=rose&connection=center,
  // from the homepage mini preview). Read after hydration so the static page
  // HTML stays the same for everyone; the customer's own choices win.
  const search = useSyncExternalStore(noSubscription, () => window.location.search, () => "");
  const fromUrl = useMemo(() => {
    const q = new URLSearchParams(search);
    const material = q.get("material");
    const connection = q.get("connection");
    const font = q.get("font");
    return {
      font: p?.fonts.find((f) => f.key === font)?.key,
      text: p ? [...(q.get("name") ?? "")].slice(0, p.maxLength).join("") : "",
      material: product.materials.find((m) => m.key === material)?.key,
      connection: product.connections.find((c) => c === connection),
    };
  }, [search, p, product.materials, product.connections]);

  const [materialChoice, setMaterial] = useState<MaterialKey | null>(null);
  const [textChoice, setText] = useState<string | null>(null);
  // One font choice per script: an Arabic name keeps its Arabic font and a
  // Latin name its Latin font while the customer edits.
  const fontKeys = useMemo(() => p?.fonts.map((f) => f.key) ?? [], [p]);
  const [fontChoice, setFontChoice] = useState<{ latin?: FontKey; arabic?: FontKey }>({});
  const [connectionChoice, setConnection] = useState<ChainConnection | null>(null);
  const material = materialChoice ?? fromUrl.material ?? product.defaultMaterial;
  const text = textChoice ?? fromUrl.text;
  // What the preview writes: the name, or the placeholder name when empty.
  const previewText = text.trim() || tPreview("placeholder");
  const script = textScript(previewText);
  const urlFont = fromUrl.font && fontInfo[fromUrl.font].script === script ? fromUrl.font : undefined;
  const font = fontChoice[script] ?? urlFont ?? defaultFontFor(fontKeys, previewText);
  const connection =
    connectionChoice ??
    fromUrl.connection ??
    // The product's first connection is its default.
    product.connections[0];
  // Necklace or bracelet: the listed sizes or the other piece's sizes.
  const [pieceChoice, setPieceChoice] = useState<"main" | "alt">("main");
  const sizing = (pieceChoice === "alt" && product.altSize) || product.size;
  const pieces = product.altSize ? [product.size, product.altSize] : [];
  const piece = pieceOf(sizing?.kind);
  const [size, setSize] = useState<number | undefined>(product.size?.default);
  const [missingName, setMissingName] = useState(false);

  useTrackView(product.slug);

  const current = product.materials.find((m) => m.key === material) ?? product.materials[0];
  const priceChange = sizing?.priceModifier ?? 0;
  const unitPrice = current.price + priceChange;
  const compareAt = current.compareAtPrice && current.compareAtPrice + priceChange;

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
    track("AddToCart", { id: product.slug, name: product.name, value: unitPrice, quantity: 1 });
    // Opens the cart drawer.
    addToCart({
      slug: product.slug,
      name: product.names,
      art: product.art,
      sizeKind: sizing?.kind,
      material,
      text: p ? text.trim() : undefined,
      font: p ? font : undefined,
      size,
      connection,
      unitPrice,
    });
  };

  const sizeLabel = (v: number) =>
    sizing?.kind === "ring" ? t("usSize", { value: v }) : t("cm", { value: v });

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ProductGallery
          ref={galleryRef}
          name={product.name}
          art={product.art}
          media={product.media}
          personalizable={Boolean(p)}
          state={{ material, text, font, connection, piece }}
        />
      </div>

      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <OfferBadgesRow badges={product.offer.badges} />
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl lg:text-4xl">{product.name}</h1>
            {product.summary && <p className="text-muted">{product.summary}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {product.reviews && (
            <a href="#reviews" className="flex items-center gap-2 text-sm text-muted hover:text-foreground">
              <Stars
                rating={product.reviews.rating}
                label={tCommon("stars", { rating: product.reviews.rating.toFixed(1) })}
              />
              <span className="font-medium text-foreground">{product.reviews.rating.toFixed(1)}</span>
              <span className="underline underline-offset-4">
                {t("reviewsLink", { count: product.reviews.count })}
              </span>
            </a>
          )}
            <SoldCount sold={product.offer.sold} />
          </div>
          <PriceBlock
            price={unitPrice}
            compareAt={compareAt || undefined}
            points={product.offer.points}
            deals={product.offer.deals}
          />
        </div>

        <div className="border-t border-line pt-6">
        <fieldset className="min-w-0">
          <legend className="mb-3 flex items-center gap-2 text-sm">
            <span className="font-medium">{t("chooseMaterial")}</span>
            <span aria-hidden className="text-muted">·</span>
            <span className="text-muted">{current.name}</span>
          </legend>
          <div className="grid grid-cols-4 gap-2">
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
                <span className="mt-auto text-[12px] font-medium text-gold-dark">
                  {formatPrice(m.price + priceChange)}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        </div>

        {p && p.fonts.length > 1 && (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{t("chooseFont")}</span>
              <span aria-hidden className="text-muted">·</span>
              <span className="text-muted">{p.fonts.find((f) => f.key === font)?.name}</span>
            </div>
            <FontPicker
              fonts={p.fonts}
              value={font}
              text={previewText}
              label={t("chooseFont")}
              onChange={(key) => design(setFontChoice)({ ...fontChoice, [script]: key })}
            />
          </div>
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
                  connection={connection}
                  piece={piece}
                  aspect="wide"
                />
              </div>
            </div>
          </div>
        )}

        {pieces.length > 1 && (
          <fieldset className="flex min-w-0 flex-col">
            <legend className="mb-3 text-sm font-medium">{t("pieceLabel")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {pieces.map((option, i) => {
                const which = i === 0 ? "main" : "alt";
                const worn = pieceOf(option?.kind) ?? "necklace";
                return (
                  <button
                    key={which}
                    type="button"
                    aria-pressed={pieceChoice === which}
                    onClick={() => {
                      design(setPieceChoice)(which);
                      setSize(option?.default);
                    }}
                    className={`${optionCard} flex items-center gap-3 px-3 py-3 text-start text-[13px] leading-tight ${pieceChoice === which ? selected : unselected}`}
                  >
                    <PieceIcon piece={worn} />
                    <span className="flex flex-col gap-0.5">
                      {t(`piece.${worn}`)}
                      <span className="text-[12px] text-gold-dark">
                        {formatPrice(current.price + (option?.priceModifier ?? 0))}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {sizing && (
          <div role="group" aria-labelledby={`${inputId}-size`} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span id={`${inputId}-size`} className="text-sm font-medium">
                {t(`size.${sizing.kind}`)}
              </span>
              <SizeGuide size={sizing} />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {sizing.values.map((v) => (
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

        {product.connections.length > 1 && (
          <fieldset className="flex min-w-0 flex-col gap-3">
            <legend className="mb-3 flex flex-col gap-0.5">
              <span className="text-sm font-medium">{t("connectionLabel")}</span>
              <span className="text-xs text-muted">{t(p ? "connectionHint" : "connectionHintPendant")}</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {product.connections.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={connection === r}
                  onClick={() => design(setConnection)(r)}
                  className={`${optionCard} flex items-center gap-3 px-3 py-3 text-start text-[13px] leading-tight ${connection === r ? selected : unselected}`}
                >
                  <ConnectionIcon style={r} />
                  {t(`connection.${r}`)}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex flex-col gap-3">
          <button type="button" onClick={onAdd} className={`${primaryButton} w-full py-4 text-base`}>
            <ShoppingBag className="size-5" strokeWidth={1.5} aria-hidden />
            {t("addToCart")}
            <span aria-hidden>·</span>
            {formatPrice(unitPrice)}
          </button>
          {product.whatsappNumber && (
            <a
              href={whatsappUrl(
                product.whatsappNumber,
                t("whatsappMessage", { product: product.name, url: product.url }),
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-full border border-line py-3 text-sm transition-colors hover:border-cedar hover:text-cedar"
            >
              <MessageCircle className="size-4.5 text-cedar" strokeWidth={1.5} aria-hidden />
              {t("whatsapp")}
            </a>
          )}
        </div>

        <ProductInfoCards data={product.info} />

        {children}
      </div>

    </div>
  );
}

// Tiny drawing of the piece: a chain hanging down, or a loop for the wrist.
function PieceIcon({ piece }: { piece: Piece }) {
  return (
    <svg viewBox="0 0 40 24" className="h-6 w-10 shrink-0 text-gold-dark" fill="none" stroke="currentColor" aria-hidden>
      {piece === "necklace" ? (
        <>
          <path d="M5 1 Q8 17 20 17 Q32 17 35 1" strokeWidth="1" strokeDasharray="1.6 1" />
          <circle cx="20" cy="19.5" r="3" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          <ellipse cx="20" cy="12" rx="15" ry="6.5" strokeWidth="1" strokeDasharray="1.6 1" />
          <circle cx="20" cy="18.5" r="3" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

// Tiny drawing of where the chain attaches.
function ConnectionIcon({ style }: { style: ChainConnection }) {
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
