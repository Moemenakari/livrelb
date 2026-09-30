"use client";

import { useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { FontKey, MaterialKey, Piece, ProductArt as Art, ChainConnection } from "@/lib/catalog/types";
import { NamePreview } from "@/components/preview/name-preview";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { ProductArt } from "./product-art";

export type GalleryState = {
  material: MaterialKey;
  text: string;
  font?: FontKey;
  connection?: ChainConnection;
  piece?: Piece;
};

export type GalleryHandle = { showPreview: () => void };

type Props = {
  ref?: Ref<GalleryHandle>;
  name: string;
  art: Art;
  media: { src: string; alt: string }[];
  personalizable: boolean;
  state: GalleryState;
};

// Product gallery (brief §8.3.1). The first slide always shows the live
// preview: the drawn piece, or, once real photos exist, the name drawn over
// the first photo. Swipe on phones, thumbnails and arrows on desktop.
export function ProductGallery({ ref, name, art, media, personalizable, state }: Props) {
  const t = useTranslations("product");
  const tCommon = useTranslations("common");
  const tPlaceholders = useTranslations("placeholders");
  const locale = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const drawn = (className = "", shine = false) => (
    <ProductArt
      art={art}
      material={state.material}
      text={state.text}
      font={state.font}
      connection={state.connection}
      piece={state.piece}
      aspect="square"
      shine={shine}
      className={className}
    />
  );

  const slides: { key: string; content: ReactNode; thumb: ReactNode }[] =
    media.length > 0
      ? media.map((m, i) => {
          const photo = (
            <Image
              src={m.src}
              alt={m.alt}
              fill
              loading={i === 0 ? "eager" : "lazy"}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          );
          return {
            key: m.src,
            content:
              i === 0 && personalizable && art.kind === "name" ? (
                <>
                  {photo}
                  <div className="absolute inset-x-[14%] bottom-[16%]">
                    <NamePreview
                      text={state.text}
                      material={state.material}
                      font={state.font}
                      connection={state.connection}
                      variant={state.piece ?? art.variant}
                      shine
                    />
                  </div>
                </>
              ) : (
                photo
              ),
            thumb: photo,
          };
        })
      : [
          { key: "preview", content: <div className="bg-surface">{drawn("", true)}</div>, thumb: <div className="bg-surface">{drawn()}</div> },
          {
            key: "zoom",
            content: <div className="flex h-full items-center overflow-hidden bg-blush">{drawn("scale-[1.7] origin-[50%_62%]")}</div>,
            thumb: <div className="flex h-full items-center overflow-hidden bg-blush">{drawn("scale-[1.7] origin-[50%_62%]")}</div>,
          },
          { key: "model", content: <PhotoSlot label={tPlaceholders("model")} className="h-full" />, thumb: <PhotoSlot label="" className="h-full" /> },
          { key: "packaging", content: <PhotoSlot label={tPlaceholders("packaging")} tone="ivory" className="h-full" />, thumb: <PhotoSlot label="" tone="ivory" className="h-full" /> },
          { key: "detail", content: <PhotoSlot label={tPlaceholders("detail")} tone="blush" className="h-full" />, thumb: <PhotoSlot label="" tone="blush" className="h-full" /> },
        ];

  const goTo = (i: number, smooth = true) => {
    const track = trackRef.current;
    if (!track) return;
    const sign = locale === "ar" ? -1 : 1;
    track.scrollTo({ left: sign * i * track.clientWidth, behavior: smooth ? "smooth" : "instant" });
  };

  // The configurator calls this when the design changes, so the live
  // preview slide comes back into view.
  useImperativeHandle(ref, () => ({ showPreview: () => goTo(0) }));

  return (
    <div className="flex flex-col gap-3" aria-label={t("gallery")} role="region">
      <div className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-xl">
        <div
          ref={trackRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
          }}
          className="no-scrollbar flex aspect-square snap-x snap-mandatory overflow-x-auto"
        >
          {slides.map((slide, i) => (
            <div
              key={slide.key}
              aria-hidden={i !== index || undefined}
              className="relative w-full shrink-0 snap-center [&>div]:h-full"
            >
              {slide.content}
            </div>
          ))}
        </div>

        <span className="sr-only" aria-live="polite">
          {name}
        </span>

        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden">
          {slides.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              aria-label={t("thumbnail", { index: i + 1 })}
              aria-current={index === i || undefined}
              onClick={() => goTo(i)}
              className={`size-2 rounded-full transition-colors ${index === i ? "bg-ink" : "bg-ink/25"}`}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label={tCommon("previous")}
          onClick={() => goTo(Math.max(0, index - 1))}
          disabled={index === 0}
          className="absolute start-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-sm transition-opacity disabled:opacity-0 lg:flex"
        >
          <ChevronLeft className="size-5 rtl:-scale-x-100" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label={tCommon("next")}
          onClick={() => goTo(Math.min(slides.length - 1, index + 1))}
          disabled={index === slides.length - 1}
          className="absolute end-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-sm transition-opacity disabled:opacity-0 lg:flex"
        >
          <ChevronRight className="size-5 rtl:-scale-x-100" strokeWidth={1.5} />
        </button>
      </div>

      <div className="hidden grid-cols-5 gap-3 lg:grid">
        {slides.map((slide, i) => (
          <button
            key={slide.key}
            type="button"
            aria-label={t("thumbnail", { index: i + 1 })}
            aria-current={index === i || undefined}
            onClick={() => goTo(i)}
            className={`relative aspect-square overflow-hidden rounded-lg transition-shadow [&>div]:h-full ${
              index === i ? "ring-2 ring-gold ring-offset-2" : "opacity-80 hover:opacity-100"
            }`}
          >
            {slide.thumb}
          </button>
        ))}
      </div>
    </div>
  );
}
