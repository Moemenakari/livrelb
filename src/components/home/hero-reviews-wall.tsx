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

function Row({ cards, reverse, seconds }: { cards: Card[]; reverse?: boolean; seconds: number }) {
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
    <div className="overflow-hidden">
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

// Behind the coin on the homepage: two rows of customer reviews and shop announcements (both set
// in the admin) drifting in opposite directions. Decorative only (the reviews have their own section).
// The wall sits under the coin layer (-z-[1]); the coin spins in front and is not affected.
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
    <div
      aria-hidden
      dir="ltr"
      className="pointer-events-none absolute inset-x-0 top-1 -z-[1] flex flex-col gap-2.5 opacity-80 select-none [mask-image:linear-gradient(to_bottom,black_70%,transparent)] lg:inset-y-0 lg:top-0 lg:justify-center lg:opacity-50 lg:[mask-image:none]"
    >
      {rows.map((cards, k) => (
        <Row key={k} cards={cards} reverse={k % 2 === 1} seconds={[75, 90, 65][k]} />
      ))}
    </div>
  );
}
