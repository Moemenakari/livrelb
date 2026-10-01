"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HeroSlide } from "@/lib/catalog/types";

const IMAGE_MS = 5500;
const VIDEO_MAX_MS = 12000;

// Photos and short videos behind the homepage headline (set in the admin,
// Promotions). They fade into each other; a video plays until it ends. It
// holds still for visitors who prefer reduced motion or while the tab is
// hidden. Covered by a dark veil so the white headline stays readable.
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const t = useTranslations("home.hero");
  const locale = useLocale() as "en" | "ar";
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const many = slides.length > 1;

  const next = () => setActive((i) => (i + 1) % slides.length);

  // Images advance on a timer; videos advance when they end (or after a cap).
  useEffect(() => {
    // Holds still for visitors who prefer reduced motion.
    if (!many || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const slide = slides[active];
    timer.current = setTimeout(next, slide.type === "video" ? VIDEO_MAX_MS : IMAGE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, many, slides]);

  return (
    <div className="absolute inset-0 -z-0 overflow-hidden bg-ink" aria-roledescription="carousel" aria-label={t("slidesLabel")}>
      {slides.map((s, i) => {
        const on = i === active;
        return (
          <div
            key={s.id}
            aria-hidden={!on}
            className={`absolute inset-0 transition-opacity duration-1000 motion-reduce:transition-none ${on ? "opacity-100" : "opacity-0"}`}
          >
            {s.type === "video" ? (
              on || i === (active + 1) % slides.length ? (
                <video
                  src={s.url}
                  muted
                  playsInline
                  autoPlay={on}
                  loop={!many}
                  preload={on ? "auto" : "metadata"}
                  onEnded={on && many ? next : undefined}
                  className="size-full object-cover"
                />
              ) : null
            ) : (
              <Image
                src={s.url}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
            )}
            {s.link && on && (
              <Link href={s.link} aria-label={s.headline?.[locale] ?? t("slideLink")} className="absolute inset-0" />
            )}
          </div>
        );
      })}
      {/* Veil: keeps the headline readable on any photo. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/35 to-ink/65" />
      {many && (
        <div className="absolute inset-x-0 bottom-3 z-[2] flex justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={t("goToSlide", { n: i + 1 })}
              aria-current={i === active}
              onClick={() => setActive(i)}
              className="flex size-6 items-center justify-center"
            >
              <span className={`h-1.5 rounded-full bg-white transition-all ${i === active ? "w-6 opacity-100" : "w-1.5 opacity-50"}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
