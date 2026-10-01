"use client";

import { useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, Play } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { FontKey, MaterialKey, Piece, ProductArt as Art, ChainConnection } from "@/lib/catalog/types";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { PhotoLightbox } from "./photo-lightbox";
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
  media: { src: string; alt: string; type?: "image" | "video" }[];
  personalizable: boolean;
  state: GalleryState;
};

// Product gallery (brief §8.3.1). Without photos the first slide is the
// live preview of the drawn piece; with photos, the photos come first
// (tap to zoom) and the live preview follows them. Swipe on phones,
// thumbnails and arrows on desktop.
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

  const photos = media.filter((m) => m.type !== "video");
  const video = media.find((m) => m.type === "video");
  const [zoomAt, setZoomAt] = useState<number | null>(null);

  // A photo: tap / click opens it full screen (pinch to zoom there); on
  // desktop the photo also zooms under the mouse.
  const photoSlide = (m: { src: string; alt: string }, i: number): ReactNode => (
    <button
      type="button"
      onClick={() => setZoomAt(i)}
      aria-label={t("zoom")}
      className="group/zoom relative block size-full cursor-zoom-in overflow-hidden"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--zx", `${((e.clientX - r.left) / r.width) * 100}%`);
        e.currentTarget.style.setProperty("--zy", `${((e.clientY - r.top) / r.height) * 100}%`);
      }}
    >
      <Image
        src={m.src}
        alt={m.alt}
        fill
        loading={i === 0 ? "eager" : "lazy"}
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover transition-transform duration-200 [transform-origin:var(--zx,50%)_var(--zy,50%)] lg:group-hover/zoom:scale-[1.8]"
      />
      <span className="absolute end-3 top-3 flex size-9 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm lg:hidden" aria-hidden>
        <Expand className="size-4" strokeWidth={1.5} />
      </span>
    </button>
  );

  // Real photos replace the drawings (brief §8.5): photos first (the main
  // one leads), then the video, then the live preview of her name.
  const previewSlide = {
    key: "preview",
    content: <div className="bg-surface">{drawn("", true)}</div>,
    thumb: <div className="bg-surface">{drawn()}</div>,
  };
  const slides: { key: string; content: ReactNode; thumb: ReactNode }[] =
    media.length > 0
      ? [
          ...photos.map((m, i) => ({
            key: m.src,
            content: photoSlide(m, i),
            thumb: <Image src={m.src} alt="" fill sizes="10vw" className="object-cover" />,
          })),
          ...(video
            ? [
                {
                  key: video.src,
                  content: <video src={video.src} controls playsInline preload="metadata" className="size-full bg-ink object-contain" />,
                  thumb: (
                    <div className="flex size-full items-center justify-center bg-ink text-white">
                      <Play className="size-5" aria-hidden />
                    </div>
                  ),
                },
              ]
            : []),
          ...(personalizable ? [previewSlide] : []),
        ]
      : [
          previewSlide,
          {
            key: "zoom",
            content: <div className="flex h-full items-center overflow-hidden bg-blush">{drawn("scale-[1.7] origin-[50%_62%]")}</div>,
            thumb: <div className="flex h-full items-center overflow-hidden bg-blush">{drawn("scale-[1.7] origin-[50%_62%]")}</div>,
          },
          { key: "model", content: <PhotoSlot label={tPlaceholders("model")} className="h-full" />, thumb: <PhotoSlot label="" className="h-full" /> },
          { key: "packaging", content: <PhotoSlot label={tPlaceholders("packaging")} tone="ivory" className="h-full" />, thumb: <PhotoSlot label="" tone="ivory" className="h-full" /> },
          { key: "detail", content: <PhotoSlot label={tPlaceholders("detail")} tone="blush" className="h-full" />, thumb: <PhotoSlot label="" tone="blush" className="h-full" /> },
        ];
  const previewIndex = slides.findIndex((s) => s.key === "preview");

  const goTo = (i: number, smooth = true) => {
    const track = trackRef.current;
    if (!track) return;
    const sign = locale === "ar" ? -1 : 1;
    track.scrollTo({ left: sign * i * track.clientWidth, behavior: smooth ? "smooth" : "instant" });
  };

  // The configurator calls this when the design changes, so the live
  // preview slide comes back into view.
  useImperativeHandle(ref, () => ({ showPreview: () => previewIndex >= 0 && goTo(previewIndex) }));

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

        <div className="absolute inset-x-0 bottom-1 flex justify-center lg:hidden">
          {slides.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              aria-label={t("thumbnail", { index: i + 1 })}
              aria-current={index === i || undefined}
              onClick={() => goTo(i)}
              className="flex size-6 items-center justify-center"
            >
              <span className={`size-2 rounded-full transition-colors ${index === i ? "bg-ink" : "bg-ink/25"}`} />
            </button>
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

      {zoomAt !== null && <PhotoLightbox photos={photos} start={zoomAt} onClose={() => setZoomAt(null)} />}

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
