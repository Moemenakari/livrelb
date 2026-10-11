// The small cards that drift behind the Lira coin on the homepage, in three rows (row 1 and 3 move right,
// row 2 moves left). The owner chooses what goes in each row in Admin > Settings > "Cards behind the coin":
// a note (icon or a small photo, text, stars, price) or one of the shop's real customer reviews.
// Stored in site_settings.hero_cards (jsonb). No React here, so the shop, the admin and the server action
// can all import it.

// The names shown in the admin are in messages/en.json (adminHeroCards.icons).
export const HERO_ICONS = ["speaker", "truck", "percent", "sparkles", "gift", "heart", "tag", "clock", "crown", "flame", "gem", "party"] as const;

export type HeroIconKey = (typeof HERO_ICONS)[number];

export type HeroRow = 1 | 2 | 3;
export const HERO_ROWS: readonly HeroRow[] = [1, 2, 3];

export type HeroCard = {
  id: string;
  /** Which row of the wall the card is in (1 to 3), in the order of the list. */
  row: HeroRow;
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
  /** Notes only: a very small photo shown instead of the icon. Empty = none. */
  imageUrl: string;
  /** Reviews only. */
  reviewId: string;
  visible: boolean;
};

/** About ten cards per row look best; this is the most a row can hold. */
export const MAX_PER_ROW = 12;
export const HERO_TEXT_MAX = 60;
export const HERO_PRICE_MAX = 16;

const iconKeys = new Set<string>(HERO_ICONS);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isHeroIcon = (v: unknown): v is HeroIconKey => typeof v === "string" && iconKeys.has(v);
export const isReviewId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const asRow = (v: unknown): HeroRow => (v === 2 || v === 3 ? v : 1);

export function newCardId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function blankHeroCard(kind: HeroCard["kind"], row: HeroRow): HeroCard {
  return { id: newCardId(), row, kind, icon: kind === "note" ? "speaker" : "", text: "", stars: 0, price: "", imageUrl: "", reviewId: "", visible: true };
}

/** The cards of one row, in order. */
export const cardsOfRow = (cards: HeroCard[], row: HeroRow) => cards.filter((c) => c.row === row);

/** Reads the stored json leniently: a missing column, an old value or a bad row never breaks the shop. */
export function parseHeroCards(value: unknown): HeroCard[] {
  if (!Array.isArray(value)) return [];
  const cards: HeroCard[] = [];
  const perRow: Record<HeroRow, number> = { 1: 0, 2: 0, 3: 0 };
  value.forEach((raw, i) => {
    if (!raw || typeof raw !== "object") return;
    const r = raw as Record<string, unknown>;
    const row = asRow(r.row);
    if (perRow[row] >= MAX_PER_ROW) return;
    perRow[row] += 1;
    const stars = Math.round(Number(r.stars));
    cards.push({
      id: typeof r.id === "string" && r.id ? r.id.slice(0, 40) : `c${i}`,
      row,
      kind: r.kind === "review" ? "review" : "note",
      icon: isHeroIcon(r.icon) ? r.icon : "",
      text: typeof r.text === "string" ? r.text.slice(0, HERO_TEXT_MAX) : "",
      stars: Number.isFinite(stars) ? Math.min(5, Math.max(0, stars)) : 0,
      price: typeof r.price === "string" ? r.price.slice(0, HERO_PRICE_MAX) : "",
      imageUrl: typeof r.imageUrl === "string" && r.imageUrl.startsWith("https://") ? r.imageUrl : "",
      reviewId: isReviewId(r.reviewId) ? r.reviewId : "",
      visible: r.visible !== false,
    });
  });
  return cards;
}

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Checks what the admin sends before it is saved: whole values only, no more than MAX_PER_ROW per row, a photo
 * only from our own photo storage (r2Base), empty notes dropped. Returns the clean list or the message to show.
 */
export function cleanHeroCards(input: unknown, r2Base: string | undefined): { ok: true; cards: HeroCard[] } | { ok: false; error: string } {
  const list = Array.isArray(input) ? (input as Partial<HeroCard>[]) : [];
  const perRow: Record<HeroRow, number> = { 1: 0, 2: 0, 3: 0 };
  const cards: HeroCard[] = [];
  for (const c of list) {
    const row = asRow(c?.row);
    const id = clip(c?.id, 40) || newCardId();
    const visible = c?.visible !== false;
    let card: HeroCard;
    if (c?.kind === "review") {
      if (!isReviewId(c.reviewId)) continue;
      card = { id, row, kind: "review", icon: "", text: "", stars: 0, price: "", imageUrl: "", reviewId: c.reviewId, visible };
    } else {
      const icon = isHeroIcon(c?.icon) ? c.icon : "";
      const text = clip(c?.text, HERO_TEXT_MAX + 1);
      if (text.length > HERO_TEXT_MAX) return { ok: false, error: `A card's text can have up to ${HERO_TEXT_MAX} characters.` };
      const price = clip(c?.price, HERO_PRICE_MAX + 1);
      if (price.length > HERO_PRICE_MAX) return { ok: false, error: `A card's price can have up to ${HERO_PRICE_MAX} characters.` };
      const stars = Math.round(Number(c?.stars ?? 0));
      if (!Number.isFinite(stars) || stars < 0 || stars > 5) return { ok: false, error: "Stars: 0 to 5." };
      const imageUrl = clip(c?.imageUrl, 500);
      if (imageUrl && (!r2Base || !imageUrl.startsWith(`${r2Base}/`))) return { ok: false, error: "Upload the card photo again." };
      if (!text && !price && !icon && !imageUrl && stars === 0) continue;
      card = { id, row, kind: "note", icon, text, stars, price, imageUrl, reviewId: "", visible };
    }
    perRow[row] += 1;
    if (perRow[row] > MAX_PER_ROW) return { ok: false, error: `Row ${row} can have up to ${MAX_PER_ROW} cards.` };
    cards.push(card);
  }
  return { ok: true, cards };
}
