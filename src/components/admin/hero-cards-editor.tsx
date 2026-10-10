"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, MessageSquareQuote, Plus, StickyNote, X } from "lucide-react";
import type en from "../../../messages/en.json";
import { HERO_ICONS, HERO_PRICE_MAX, HERO_TEXT_MAX, MAX_HERO_CARDS, blankHeroCard, type HeroCard } from "@/lib/hero-cards";
import { HeroIcon, WallCard, type WallCardData } from "@/components/home/hero-wall-card";
import { Field, inputClass, secondaryButtonClass, smallButtonClass } from "./ui";

export type HeroLabels = typeof en.adminHeroCards;
export type ReviewOption = { id: string; rating: number; text: string; author: string; city: string };

function swap<T>(list: T[], i: number, by: number): T[] {
  const next = [...list];
  const [item] = next.splice(i, 1);
  next.splice(i + by, 0, item);
  return next;
}

// The list of cards behind the Lira coin (Admin > Settings). Each card is a note (icon, text, stars,
// price) or one of the shop's approved reviews, with a live preview of how it looks on the wall.
export function HeroCardsEditor({ cards, onChange, reviews, labels }: { cards: HeroCard[]; onChange: (cards: HeroCard[]) => void; reviews: ReviewOption[]; labels: HeroLabels }) {
  const patch = (i: number, p: Partial<HeroCard>) => onChange(cards.map((c, j) => (j === i ? { ...c, ...p } : c)));
  const full = cards.length >= MAX_HERO_CARDS;

  const preview = (c: HeroCard): WallCardData | null => {
    if (c.kind === "note") return { kind: "note", icon: c.icon, text: c.text, stars: c.stars, price: c.price };
    const r = reviews.find((x) => x.id === c.reviewId);
    return r ? { kind: "review", rating: r.rating, text: r.text, author: r.author, city: r.city } : null;
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">{labels.hint}</p>
      {cards.length === 0 && <p className="rounded-lg bg-surface px-3 py-2 text-sm text-muted">{labels.empty}</p>}
      <ol className="flex flex-col gap-3">
        {cards.map((c, i) => {
          const shown = preview(c);
          return (
            <li key={c.id} className={`rounded-lg border p-3 ${c.visible ? "border-line" : "border-dashed border-line bg-surface"}`}>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {c.kind === "note" ? <StickyNote className="size-4 text-cedar" aria-hidden /> : <MessageSquareQuote className="size-4 text-cedar" aria-hidden />}
                  {c.kind === "note" ? labels.kindNote : labels.kindReview}
                </span>
                {!c.visible && <span className="text-xs text-muted">{labels.hidden}</span>}
                <span className="ms-auto flex items-center gap-1">
                  <button type="button" aria-pressed={c.visible} aria-label={c.visible ? labels.hide : labels.show} onClick={() => patch(i, { visible: !c.visible })} className={smallButtonClass}>
                    {c.visible ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
                  </button>
                  <button type="button" disabled={i === 0} aria-label={labels.moveUp} onClick={() => onChange(swap(cards, i, -1))} className={smallButtonClass}>
                    <ArrowUp className="size-3.5" aria-hidden />
                  </button>
                  <button type="button" disabled={i === cards.length - 1} aria-label={labels.moveDown} onClick={() => onChange(swap(cards, i, 1))} className={smallButtonClass}>
                    <ArrowDown className="size-3.5" aria-hidden />
                  </button>
                  <button type="button" aria-label={labels.remove} onClick={() => onChange(cards.filter((_, j) => j !== i))} className={`${smallButtonClass} hover:text-red-700`}>
                    <X className="size-3.5" aria-hidden />
                  </button>
                </span>
              </div>

              <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem]">
                {c.kind === "note" ? (
                  <div className="flex min-w-0 flex-col gap-3">
                    <Field label={labels.text} htmlFor={`hc-text-${c.id}`}>
                      <input id={`hc-text-${c.id}`} maxLength={HERO_TEXT_MAX} placeholder={labels.textPlaceholder} value={c.text} onChange={(e) => patch(i, { text: e.target.value })} className={inputClass} />
                    </Field>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium">{labels.icon}</span>
                      <div role="group" aria-label={labels.icon} className="flex flex-wrap gap-1.5">
                        <button type="button" aria-pressed={c.icon === ""} onClick={() => patch(i, { icon: "" })} className={`${smallButtonClass} h-10 ${c.icon === "" ? "border-ink bg-surface" : ""}`}>
                          {labels.noIcon}
                        </button>
                        {HERO_ICONS.map((key) => (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={c.icon === key}
                            aria-label={labels.icons[key]}
                            title={labels.icons[key]}
                            onClick={() => patch(i, { icon: key })}
                            className={`${smallButtonClass} size-10 !px-0 ${c.icon === key ? "border-ink bg-surface" : ""}`}
                          >
                            <HeroIcon icon={key} className="size-5" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={labels.stars} htmlFor={`hc-stars-${c.id}`}>
                        <select id={`hc-stars-${c.id}`} value={c.stars} onChange={(e) => patch(i, { stars: Number(e.target.value) })} className={inputClass}>
                          <option value={0}>{labels.noStars}</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n} ★
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label={labels.price} htmlFor={`hc-price-${c.id}`}>
                        <input id={`hc-price-${c.id}`} maxLength={HERO_PRICE_MAX} placeholder={labels.pricePlaceholder} value={c.price} onChange={(e) => patch(i, { price: e.target.value })} className={inputClass} />
                      </Field>
                    </div>
                  </div>
                ) : (
                  <Field label={labels.review} htmlFor={`hc-review-${c.id}`}>
                    {reviews.length === 0 ? (
                      <p className="text-sm text-muted">{labels.noReviews}</p>
                    ) : (
                      <select id={`hc-review-${c.id}`} value={c.reviewId} onChange={(e) => patch(i, { reviewId: e.target.value })} className={inputClass}>
                        <option value="">{labels.pickReview}</option>
                        {reviews.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.author}: {r.text.length > 60 ? `${r.text.slice(0, 60)}…` : r.text}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                )}

                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted">{labels.preview}</span>
                  <ul className="overflow-hidden rounded-xl bg-surface p-2">{shown ? <WallCard card={shown} /> : <li className="h-28 w-60" />}</ul>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={full} onClick={() => onChange([...cards, blankHeroCard("note")])} className={secondaryButtonClass}>
          <Plus className="size-4" aria-hidden /> {labels.addNote}
        </button>
        <button type="button" disabled={full} onClick={() => onChange([...cards, blankHeroCard("review")])} className={secondaryButtonClass}>
          <Plus className="size-4" aria-hidden /> {labels.addReview}
        </button>
        {full && <span className="text-xs text-muted">{labels.limit}</span>}
      </div>
    </div>
  );
}
