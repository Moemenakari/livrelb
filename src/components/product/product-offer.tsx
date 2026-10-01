"use client";

import { Flame } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PointsRules } from "@/lib/catalog/types";
import { formatMoney, formatPrice } from "@/lib/format";
import { CopyCode } from "@/components/layout/copy-code";
import { LivreCoin } from "@/components/icons/livre-coin";

/** A deal chip on the product page, from settings, promotions and public coupons. */
export type Deal =
  | { kind: "freeOver"; amount: number }
  | { kind: "firstOrder" }
  | { kind: "code"; code: string; type: "percent" | "fixed" | "free_delivery"; value: number };

/** Badges shown only when true (real sales, flags, tracked stock). */
export type OfferBadges = {
  /** Category name when this piece sells the most in it (from real orders). */
  topIn?: string;
  bestSeller: boolean;
  isNew: boolean;
  freeDelivery?: boolean;
  freeGiftBox?: boolean;
  /** Pieces left, only when stock is tracked. */
  stockLeft?: number;
};

/** Pieces sold before "🔥 X sold" shows. */
export const SOLD_THRESHOLD = 10;
/** Stock at or under which "Only X left" shows. */
const LOW_STOCK = 10;

/** Points a price earns and what they are worth (same rule as the database). */
export function pointsFor(price: number, rules: PointsRules): { points: number; value: number } {
  if (!rules.enabled) return { points: 0, value: 0 };
  const step = rules.stepDollars;
  const points = Math.floor(price / step) * rules.perStep;
  return { points, value: (points / rules.redeemPoints) * rules.redeemValue };
}

const chip =
  "inline-flex items-center gap-1.5 rounded-md border border-sale/25 bg-sale/5 px-2.5 py-1 text-[12px] text-sale";

export function OfferBadgesRow({ badges }: { badges: OfferBadges }) {
  const t = useTranslations("offer");
  const items = [
    badges.topIn ? { key: "top", label: t("topIn", { category: badges.topIn }), cls: "bg-ink text-white" } : null,
    !badges.topIn && badges.bestSeller ? { key: "best", label: t("bestSeller"), cls: "bg-ink text-white" } : null,
    badges.isNew ? { key: "new", label: t("new"), cls: "bg-cedar text-white" } : null,
    badges.freeDelivery ? { key: "freeDelivery", label: t("freeDeliveryPiece"), cls: "bg-gold/15 text-gold-dark" } : null,
    badges.stockLeft !== undefined && badges.stockLeft > 0 && badges.stockLeft <= LOW_STOCK
      ? { key: "stock", label: t("onlyLeft", { count: badges.stockLeft }), cls: "bg-sale/10 text-sale" }
      : null,
  ].filter((b) => b !== null);
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((b) => (
        <li
          key={b.key}
          className={`rounded-sm px-2 py-1 text-[11px] font-medium tracking-wide uppercase rtl:tracking-normal ${b.cls}`}
        >
          {b.label}
        </li>
      ))}
    </ul>
  );
}

export function SoldCount({ sold }: { sold: number }) {
  const t = useTranslations("offer");
  if (sold < SOLD_THRESHOLD) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted">
      <Flame className="size-4 text-sale" strokeWidth={1.75} aria-hidden />
      {t("sold", { count: sold })}
    </span>
  );
}

// Price, savings, points and deals under the product title (Phase 4 A1).
export function PriceBlock({
  price,
  compareAt,
  points: rules,
  deals,
}: {
  price: number;
  compareAt?: number;
  points: PointsRules;
  deals: Deal[];
}) {
  const t = useTranslations("offer");
  const tPromo = useTranslations("promo");
  const onSale = compareAt !== undefined && compareAt > price;
  const percent = onSale ? Math.round((1 - price / compareAt) * 100) : 0;
  const { points, value } = pointsFor(price, rules);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-3xl font-semibold text-sale lining-nums">{formatPrice(price)}</span>
        {onSale && (
          <>
            <s className="text-lg text-muted lining-nums">{formatPrice(compareAt)}</s>
            <span className="rounded-full bg-sale px-2.5 py-0.5 text-sm font-medium text-white lining-nums">
              {t("percentOff", { percent })}
            </span>
          </>
        )}
      </div>
      {onSale && (
        <p className="text-sm font-medium text-sale">{t("youSave", { amount: formatMoney(compareAt - price) })}</p>
      )}
      {points > 0 && (
        <p className="flex items-center gap-2 text-sm">
          <LivreCoin className="size-5 shrink-0" />
          <span>
            {t.rich("pointsEarn", {
              points,
              value: formatMoney(value),
              strong: (chunks) => <strong className="font-semibold text-gold-dark">{chunks}</strong>,
            })}
          </span>
        </p>
      )}
      {deals.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t("dealsLabel")}>
          {deals.map((d) => (
            <li key={d.kind === "code" ? d.code : d.kind} className={chip}>
              {d.kind === "freeOver" && <>{"🚚"} {t("freeOver", { amount: formatPrice(d.amount) })}</>}
              {d.kind === "firstOrder" && <>{"🎁"} {t("firstOrder")}</>}
              {d.kind === "code" && (
                <>
                  <span>
                    {d.type === "percent"
                      ? t("codePercent", { code: d.code, percent: d.value })
                      : d.type === "fixed"
                        ? t("codeFixed", { code: d.code, amount: formatPrice(d.value) })
                        : t("codeFreeDelivery", { code: d.code })}
                  </span>
                  <CopyCode
                    code={t("copy")}
                    copyLabel={tPromo("copy", { code: d.code })}
                    copiedLabel={tPromo("copied")}
                    value={d.code}
                    className="text-[11px]"
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
