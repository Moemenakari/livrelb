import { findProduct, type Catalog, type Review } from "@/lib/catalog";
import type { Locale } from "@/i18n/routing";
import { WallCard, type WallCardData } from "@/components/home/hero-wall-card";

type Card = { id: string; data: WallCardData };

const ROWS = 3;
const MIN_CARDS = 6; // one copy of a row must be wider than the screen, or the loop shows a gap

function Row({ cards, reverse, seconds, className = "" }: { cards: Card[]; reverse?: boolean; seconds: number; className?: string }) {
  if (cards.length === 0) return null;
  // At least MIN_CARDS per copy, then two identical copies: the track slides by exactly one copy.
  const copy = Array.from({ length: Math.max(MIN_CARDS, cards.length) }, (_, i) => cards[i % cards.length]);
  const list = (hidden: boolean, tag: string) => (
    <ul className={`flex shrink-0 gap-3 pe-3 ${hidden ? "motion-reduce:hidden" : ""}`}>
      {copy.map((c, i) => (
        <WallCard key={`${tag}-${c.id}-${i}`} card={c.data} />
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

// Behind the coin on the homepage: rows of cards drifting in opposite directions (right, left, right).
// The owner makes them in Admin > Settings > "Cards behind the coin": notes (icon, text, stars, price)
// and real customer reviews. With no card made there, the wall shows the approved reviews. The
// announcement bar is separate and does not feed the wall. Decorative only (the reviews have their own section).
// The wall lives in an invisible copy of the hero grid, in the coin's own cell, so it can never reach
// the headline, the code, the countdown or the name preview. It sits under the coin layer (-z-[1]);
// the coin spins in front and is not affected. On phones the whole wall is drawn smaller (three rows
// still fit in the coin's zone).
export function HeroReviewsWall({ catalog, locale }: { catalog: Catalog; locale: Locale }) {
  const reviewCard = (r: Review): WallCardData => ({
    kind: "review",
    rating: r.rating,
    text: r.text[locale],
    author: r.author,
    city: r.city[locale],
    product: r.productSlug ? findProduct(catalog, r.productSlug)?.name[locale] : undefined,
  });

  // The owner's cards (Admin > Settings). With none, the approved reviews fill the wall.
  const made = catalog.settings.heroCards.filter((c) => c.visible);
  const all: Card[] = [];
  if (made.length > 0) {
    for (const c of made) {
      if (c.kind === "review") {
        const r = catalog.reviews.find((x) => x.id === c.reviewId);
        if (r) all.push({ id: c.id, data: reviewCard(r) });
      } else if (c.text || c.price || c.icon || c.stars > 0) {
        all.push({ id: c.id, data: { kind: "note", icon: c.icon, text: c.text, stars: c.stars, price: c.price } });
      }
    }
  }
  if (all.length === 0) {
    for (const r of catalog.reviews.slice(0, 10)) all.push({ id: r.id, data: reviewCard(r) });
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
            className="absolute top-1/2 left-1/2 -z-[1] flex w-[172vw] -translate-x-1/2 -translate-y-1/2 scale-[0.58] flex-col gap-2.5 opacity-80 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] lg:left-0 lg:w-screen lg:translate-x-0 lg:scale-100 lg:opacity-50 lg:[mask-image:linear-gradient(to_right,transparent,black_20%)]"
          >
            {rows.map((cards, k) => (
              <Row key={k} cards={cards} reverse={k % 2 === 1} seconds={[75, 90, 65][k]} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
