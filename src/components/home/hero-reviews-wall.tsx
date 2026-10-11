import { findProduct, type Catalog, type Review } from "@/lib/catalog";
import type { Locale } from "@/i18n/routing";
import { HERO_ROWS, type HeroRow } from "@/lib/hero-cards";
import { WallCard, type WallCardData } from "@/components/home/hero-wall-card";

type Card = { id: string; data: WallCardData };

const MIN_CARDS = 8; // one copy of a row must be wider than the screen, or the loop shows a gap
const CARD_PX = 220; // a card (208) and the gap after it (12)
const PX_PER_SECOND = 28; // every row drifts at about the same speed, whatever its length
const SPEED = [1, 1.18, 0.92]; // a little different from row to row so they do not move in lockstep
const SHIFT = [0, 110, 55]; // px: each row starts a little further along, so the cards do not stand in straight columns

function Row({ cards, right, speed, shift }: { cards: Card[]; right: boolean; speed: number; shift: number }) {
  // At least MIN_CARDS per copy, then two identical copies: the track slides by exactly one copy.
  const copy = Array.from({ length: Math.max(MIN_CARDS, cards.length) }, (_, i) => cards[i % cards.length]);
  const perSecond = PX_PER_SECOND * speed;
  const seconds = Math.round((copy.length * CARD_PX) / perSecond);
  const list = (hidden: boolean, tag: string) => (
    <ul className={`flex shrink-0 gap-3 pe-3 ${hidden ? "motion-reduce:hidden" : ""}`}>
      {copy.map((c, i) => (
        <WallCard key={`${tag}-${c.id}-${i}`} card={c.data} />
      ))}
    </ul>
  );
  return (
    <div className="overflow-hidden">
      <div
        style={{ animationDuration: `${seconds}s`, animationDelay: `-${(shift / perSecond).toFixed(1)}s` }}
        className={`flex w-max motion-reduce:animate-none ${right ? "animate-marquee-right" : "animate-marquee"}`}
      >
        {list(false, "a")}
        {list(true, "b")}
      </div>
    </div>
  );
}

// Behind the coin on the homepage: three rows of small cards drifting in opposite directions
// (row 1 right, row 2 left, row 3 right). The owner chooses the cards of each row in
// Admin > Settings > "Cards behind the coin": notes (icon or a small photo, text, stars, price)
// and real customer reviews. With no card made there, the approved reviews fill the three rows.
// The announcement bar is separate and does not feed the wall. Decorative only.
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

  const rowCards = (row: HeroRow): Card[] =>
    catalog.settings.heroCards
      .filter((c) => c.row === row && c.visible)
      .flatMap((c): Card[] => {
        if (c.kind === "review") {
          const r = catalog.reviews.find((x) => x.id === c.reviewId);
          return r ? [{ id: c.id, data: reviewCard(r) }] : [];
        }
        if (!c.text && !c.price && !c.icon && !c.imageUrl && c.stars === 0) return [];
        return [{ id: c.id, data: { kind: "note", icon: c.icon, text: c.text, stars: c.stars, price: c.price, imageUrl: c.imageUrl } }];
      });

  // The owner's rows. With nothing made there, the approved reviews fill the three rows.
  let rows = HERO_ROWS.map(rowCards);
  if (rows.every((r) => r.length === 0)) {
    const reviews = catalog.reviews.slice(0, 15).map((r): Card => ({ id: r.id, data: reviewCard(r) }));
    rows = HERO_ROWS.map((_, k) => reviews.filter((_, i) => i % 3 === k));
  }
  if (rows.every((r) => r.length === 0)) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
      {/* Same grid, padding and gaps as the hero content (hero.tsx), so the box below is exactly where the coin is. */}
      <div className="mx-auto grid h-full max-w-7xl items-start gap-6 px-4 pt-6 pb-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:px-8 lg:pt-14 lg:pb-20">
        <div className="relative mx-auto aspect-square w-[58%] max-w-72 lg:col-start-2 lg:w-full lg:max-w-[26rem]">
          <div
            dir="ltr"
            className="absolute top-1/2 left-1/2 -z-[1] flex w-[135vw] -translate-x-1/2 -translate-y-1/2 scale-[0.74] flex-col gap-2.5 opacity-80 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] lg:left-0 lg:w-screen lg:translate-x-0 lg:scale-100 lg:opacity-60 lg:[mask-image:linear-gradient(to_right,transparent,black_20%)]"
          >
            {rows.map((cards, k) =>
              cards.length > 0 ? <Row key={k} cards={cards} right={k % 2 === 0} speed={SPEED[k]} shift={SHIFT[k]} /> : null,
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
