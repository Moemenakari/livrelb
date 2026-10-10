// The cards that drift behind the Lira coin on the homepage. The owner makes them in
// Admin > Settings > "Cards behind the coin": a note (icon, text, stars, price)
// or one of the shop's real customer reviews. Stored in site_settings.hero_cards (jsonb).
// No React here, so the shop, the admin and the server action can all import it.

// The names shown in the admin are in messages/en.json (adminHeroCards.icons).
export const HERO_ICONS = ["speaker", "truck", "percent", "sparkles", "gift", "heart", "tag", "clock", "crown", "flame", "gem", "party"] as const;

export type HeroIconKey = (typeof HERO_ICONS)[number];

export type HeroCard = {
  id: string;
  /** "note": the owner's own words; "review": a real customer review (reviewId). */
  kind: "note" | "review";
  /** Notes only. Empty = no icon. */
  icon: HeroIconKey | "";
  /** Notes only. */
  text: string;
  /** Notes only: 0 = no stars, 1 to 5 = a row of stars above the text. */
  stars: number;
  /** Notes only: free text such as "$44" or "Free". Empty = none. */
  price: string;
  /** Reviews only. */
  reviewId: string;
  visible: boolean;
};

export const MAX_HERO_CARDS = 24;
export const HERO_TEXT_MAX = 90;
export const HERO_PRICE_MAX = 16;

const iconKeys = new Set<string>(HERO_ICONS);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isHeroIcon = (v: unknown): v is HeroIconKey => typeof v === "string" && iconKeys.has(v);
export const isReviewId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export function newCardId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function blankHeroCard(kind: HeroCard["kind"]): HeroCard {
  return { id: newCardId(), kind, icon: kind === "note" ? "speaker" : "", text: "", stars: 0, price: "", reviewId: "", visible: true };
}

/** Reads the stored json leniently: a missing column, an old value or a bad row never breaks the shop. */
export function parseHeroCards(value: unknown): HeroCard[] {
  if (!Array.isArray(value)) return [];
  const cards: HeroCard[] = [];
  value.forEach((raw, i) => {
    if (!raw || typeof raw !== "object") return;
    const r = raw as Record<string, unknown>;
    const kind = r.kind === "review" ? "review" : "note";
    const stars = Math.round(Number(r.stars));
    cards.push({
      id: typeof r.id === "string" && r.id ? r.id.slice(0, 40) : `c${i}`,
      kind,
      icon: isHeroIcon(r.icon) ? r.icon : "",
      text: typeof r.text === "string" ? r.text.slice(0, HERO_TEXT_MAX) : "",
      stars: Number.isFinite(stars) ? Math.min(5, Math.max(0, stars)) : 0,
      price: typeof r.price === "string" ? r.price.slice(0, HERO_PRICE_MAX) : "",
      reviewId: isReviewId(r.reviewId) ? r.reviewId : "",
      visible: r.visible !== false,
    });
  });
  return cards.slice(0, MAX_HERO_CARDS);
}
