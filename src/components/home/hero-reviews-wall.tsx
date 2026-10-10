import { findProduct, type Catalog } from "@/lib/catalog";
import type { Locale } from "@/i18n/routing";
import { Stars } from "@/components/ui/stars";

type Card =
  | { kind: "review"; id: string; rating: number; text: string; author: string; city: string; product?: string }
  | { kind: "ad"; id: string; text: string };

const ROWS = 3;
const MIN_CARDS = 6; // one copy of a row must be wider than the screen, or the loop shows a gap

// A hand-drawn loudspeaker (not an emoji) with a little 3D shading.
function Speaker() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-11 shrink-0 drop-shadow-[0_3px_3px_rgba(31,26,23,0.25)]">
      <defs>
        <linearGradient id="wall-spk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8c876" />
          <stop offset="1" stopColor="#a67c2d" />
        </linearGradient>
      </defs>
      <path d="M8 19h8l14-9v28l-14-9H8a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" fill="url(#wall-spk)" />
      <path d="M16 19v10l14 9V10Z" fill="#fff" fillOpacity="0.22" />
      <path d="M35 17a10 10 0 0 1 0 14M40 12a17 17 0 0 1 0 24" fill="none" stroke="#a67c2d" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function WallCard({ card }: { card: Card }) {
  const box = "flex h-28 w-60 shrink-0 flex-col justify-between rounded-2xl border border-line bg-white/90 p-4 shadow-sm";
  if (card.kind === "ad") {
    return (
      <li className={`${box} !flex-row items-center gap-3`}>
        <Speaker />
        <p className="line-clamp-4 text-sm leading-snug font-medium">{card.text}</p>
      </li>
    );
  }
  return (
    <li className={box}>
      <Stars rating={card.rating} className="size-3.5" />
      <p className="line-clamp-2 text-sm leading-snug">{card.text}</p>
      <p className="truncate text-xs text-muted">
        <span className="font-medium text-foreground">{card.author}</span>
        {card.city && ` · ${card.city}`}
        {card.product && ` · ${card.product}`}
      </p>
    </li>
  );
}

function Row({ cards, reverse, seconds, className = "" }: { cards: Card[]; reverse?: boolean; seconds: number; className?: string }) {
  if (cards.length === 0) return null;
  // At least MIN_CARDS per copy, then two identical copies: the track slides by exactly one copy.
  const copy = Array.from({ length: Math.max(MIN_CARDS, cards.length) }, (_, i) => cards[i % cards.length]);
  const list = (hidden: boolean, tag: string) => (
    <ul className={`flex shrink-0 gap-3 pe-3 ${hidden ? "motion-reduce:hidden" : ""}`}>
      {copy.map((c, i) => (
        <WallCard key={`${tag}-${c.id}-${i}`} card={c} />
      ))}
    </ul>
  );
  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        style={{ animationDuration: `${seconds}s` }}
        className={`flex w-max motion-reduce:animate-none ${reverse ? "animate-marquee-rtl" : "animate-marquee"}`}
      >
        {list(false, "a")}
        {list(true, "b")}
      </div>
    </div>
  );
}

// Behind the coin on the homepage: rows of customer reviews and shop announcements (both set
// in the admin) drifting in opposite directions. Decorative only (the reviews have their own section).
// The wall lives in an invisible copy of the hero grid, in the coin's own cell, so it can never reach
// the headline, the code, the countdown or the name preview. It sits under the coin layer (-z-[1]);
// the coin spins in front and is not affected. Phones show two rows (the coin is small there).
export function HeroReviewsWall({ catalog, locale }: { catalog: Catalog; locale: Locale }) {
  const reviews: Card[] = catalog.reviews.slice(0, 10).map((r) => ({
    kind: "review",
    id: r.id,
    rating: r.rating,
    text: r.text[locale],
    author: r.author,
    city: r.city[locale],
    product: r.productSlug ? findProduct(catalog, r.productSlug)?.name[locale] : undefined,
  }));
  const ads: Card[] = catalog.settings.announcements
    .map((a, i) => ({ kind: "ad" as const, id: `ad${i}`, text: a[locale] }))
    .filter((a) => a.text);

  // Reviews with an announcement after every two of them.
  const all: Card[] = [];
  for (let i = 0, a = 0; i < reviews.length || a < ads.length; i++) {
    if (i < reviews.length) all.push(reviews[i]);
    if ((i % 2 === 1 || i >= reviews.length) && a < ads.length) all.push(ads[a++]);
  }
  if (all.length === 0) return null;

  // Three rows, each starting at a different card so they do not look alike.
  const step = Math.ceil(all.length / ROWS);
  const rows = Array.from({ length: ROWS }, (_, k) => [...all.slice(k * step), ...all.slice(0, k * step)]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
      {/* Same grid, padding and gaps as the hero content (hero.tsx), so the box below is exactly where the coin is. */}
      <div className="mx-auto grid h-full max-w-7xl items-start gap-6 px-4 pt-6 pb-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:px-8 lg:pt-14 lg:pb-20">
        <div className="relative mx-auto aspect-square w-[58%] max-w-72 lg:col-start-2 lg:w-full lg:max-w-[26rem]">
          <div
            dir="ltr"
            className="absolute top-1/2 left-1/2 -z-[1] flex w-screen -translate-x-1/2 -translate-y-1/2 flex-col gap-2.5 opacity-80 [mask-image:linear-gradient(to_bottom,transparent,black_22%,black_78%,transparent)] lg:left-0 lg:translate-x-0 lg:opacity-50 lg:[mask-image:linear-gradient(to_right,transparent,black_20%)]"
          >
            {rows.map((cards, k) => (
              <Row key={k} cards={cards} reverse={k % 2 === 1} seconds={[75, 90, 65][k]} className={k === 2 ? "max-lg:hidden" : ""} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
