"use client";

import { useState } from "react";
import { Truck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { setCoupon } from "@/lib/cart";
import type { Quote } from "@/lib/checkout/types";
import { formatMoney, formatPrice } from "@/lib/format";
import { LivreCoin } from "@/components/icons/livre-coin";
import { GiftBoxNote } from "@/components/product/gift-box-note";

type Props = {
  quote: Quote | null;
  /** False while a newer quote is loading: numbers are dimmed. */
  fresh: boolean;
  failed: boolean;
  /** Browser estimate of the subtotal until the first quote arrives. */
  estimate: number;
  freeShippingOver: number;
  coupon: string;
  /** Checkout owns the coupon field itself. */
  couponField?: boolean;
  /** Checkout only: the "Use my points" switch (verified customers with points). */
  points?: { on: boolean; onChange: (on: boolean) => void };
};

const row = "flex items-center justify-between gap-4";

/** "You're $X away from free delivery" (brief: free over $50 and on the first order). */
export function FreeDeliveryBar({ amount, over, firstOrder }: { amount: number; over: number; firstOrder: boolean | null }) {
  const t = useTranslations("cart");
  const left = Math.max(0, over - amount);
  const done = left === 0 || firstOrder === true;
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface px-4 py-3 text-sm">
      <p className="flex items-center gap-2">
        <Truck className="size-4 shrink-0 text-cedar" strokeWidth={1.5} aria-hidden />
        {done
          ? firstOrder && left > 0
            ? t("firstOrderUnlocked")
            : t("freeDeliveryDone")
          : t("freeDeliveryAway", { amount: formatPrice(Math.round(left * 100) / 100) })}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <div
          className="h-full rounded-full bg-cedar transition-[width] duration-500"
          style={{ width: `${done ? 100 : Math.min(100, (amount / over) * 100)}%` }}
        />
      </div>
      {!done && firstOrder === null && <p className="text-xs text-muted">{t("firstOrderFree")}</p>}
    </div>
  );
}

export function CouponField({ coupon, quote }: { coupon: string; quote: Quote | null }) {
  const t = useTranslations("cart");
  const [draft, setDraft] = useState("");
  const status = quote?.coupon && quote.coupon.code === coupon ? quote.coupon : null;

  if (coupon) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between rounded-lg border border-dashed border-gold px-3 py-2 text-sm">
          <span>
            {status?.error ? <s className="text-muted">{coupon}</s> : t("couponApplied", { code: coupon })}
          </span>
          <button
            type="button"
            onClick={() => setCoupon("")}
            aria-label={t("couponRemove")}
            className="flex size-7 items-center justify-center rounded-full hover:bg-surface"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
        {status?.error === "coupon_invalid" && <p className="text-xs text-red-700">{t("couponInvalid")}</p>}
        {status?.error === "coupon_min_order" && (
          <p className="text-xs text-red-700">
            {t("couponMinOrder", { amount: formatPrice(status.minOrder ?? 0) })}
          </p>
        )}
      </div>
    );
  }

  // Not a <form>: the checkout already is one, and forms can't nest.
  const apply = () => {
    if (draft.trim()) setCoupon(draft);
    setDraft("");
  };

  return (
    <div className="flex gap-2">
      <label className="sr-only" htmlFor="cart-coupon">
        {t("coupon")}
      </label>
      <input
        id="cart-coupon"
        value={draft}
        onChange={(e) => setDraft(e.target.value.toUpperCase())}
        maxLength={30}
        placeholder={t("couponPlaceholder")}
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }}
        className="h-10 min-w-0 flex-1 rounded-full border border-line bg-background px-4 text-sm uppercase outline-none placeholder:normal-case placeholder:text-muted focus:border-gold"
      />
      <button
        type="button"
        onClick={apply}
        className="h-10 shrink-0 rounded-full border border-ink px-5 text-sm transition-colors hover:bg-ink hover:text-white"
      >
        {t("apply")}
      </button>
    </div>
  );
}

// Totals under the bag: free delivery progress, the free gift box, coupon,
// and the order summary box (Phase 4 A3), all from the server quote.
export function CartSummary({ quote, fresh, failed, estimate, freeShippingOver, coupon, couponField = true, points }: Props) {
  const t = useTranslations("cart");
  const tCheckout = useTranslations("checkout");
  const subtotal = quote?.subtotal ?? estimate;
  const discount = quote?.discount ?? 0;
  const sale = quote?.saleSavings ?? 0;
  const over = quote?.freeShippingOver ?? freeShippingOver;
  const pointsOff = quote?.points.discount ?? 0;
  const saved = sale + discount + pointsOff;
  const canUsePoints = Boolean(points && quote && quote.points.balance > 0 && quote.points.value > 0);

  return (
    <div className="flex flex-col gap-4">
      <FreeDeliveryBar amount={subtotal - discount} over={over} firstOrder={quote?.isFirstOrder ?? null} />
      <GiftBoxNote />
      {couponField && <CouponField coupon={coupon} quote={quote} />}

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface/60 p-4">
        <dl
          className={`flex flex-col gap-2 text-sm transition-opacity ${fresh ? "" : "opacity-60"}`}
          aria-busy={!fresh}
          aria-label={tCheckout("summary")}
        >
          <div className={row}>
            <dt className="text-muted">{t("items")}</dt>
            <dd className="lining-nums">{formatMoney(subtotal + sale)}</dd>
          </div>
          {sale + discount > 0 && (
            <div className={row}>
              <dt className="text-muted">{t("discounts")}</dt>
              <dd className="text-sale lining-nums">
                {"−"}
                {formatMoney(sale + discount)}
              </dd>
            </div>
          )}
          <div className={row}>
            <dt className="text-muted">{t("delivery")}</dt>
            <dd className="text-end lining-nums">
              {quote && quote.delivery === 0 ? (
                <span className="font-medium text-cedar">{t("deliveryFree")}</span>
              ) : (
                <>
                  {quote ? formatMoney(quote.delivery) : "—"}
                  {quote?.isFirstOrder === null && quote.firstOrderFreeDelivery && (
                    <span className="block text-xs text-muted">{t("deliveryFirstOrder")}</span>
                  )}
                </>
              )}
            </dd>
          </div>
          {canUsePoints && points && quote && (
            <div className={row}>
              <dt>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={points.on}
                    onChange={(e) => points.onChange(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className="relative h-5 w-9 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-gold peer-focus-visible:outline-2 peer-focus-visible:outline-gold after:absolute after:top-0.5 after:start-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4 rtl:peer-checked:after:-translate-x-4"
                  />
                  <span className="flex flex-col leading-tight">
                    <span>{tCheckout("pointsUse")}</span>
                    <span className="text-xs text-muted">
                      {tCheckout("pointsHave", { points: quote.points.balance, value: formatMoney(quote.points.value) })}
                    </span>
                  </span>
                </label>
              </dt>
              <dd className="text-sale lining-nums">{pointsOff > 0 ? `−${formatMoney(pointsOff)}` : ""}</dd>
            </div>
          )}
          {!canUsePoints && pointsOff > 0 && (
            <div className={row}>
              <dt className="text-muted">{t("pointsDiscount", { points: quote?.points.used ?? 0 })}</dt>
              <dd className="text-sale lining-nums">{`−${formatMoney(pointsOff)}`}</dd>
            </div>
          )}
          <div className={`${row} border-t border-line pt-3`}>
            <dt className="text-base font-medium">{t("total")}</dt>
            <dd className="text-2xl font-semibold text-sale lining-nums">{formatMoney(quote?.total ?? subtotal)}</dd>
          </div>
        </dl>
        {quote && saved > 0 && (
          <p className="rounded-lg bg-sale/5 px-3 py-2 text-sm font-medium text-sale">
            {"🎉"} {t("saved", { amount: formatMoney(saved) })}
          </p>
        )}
        {quote && quote.points.toEarn > 0 && (
          <p className="flex items-center gap-2 text-sm text-gold-dark">
            <LivreCoin className="size-4.5 shrink-0" />
            {t("pointsEarnConfirmed", { points: quote.points.toEarn })}
          </p>
        )}
      </div>
      {failed && <p className="text-xs text-red-700">{t("unavailable")}</p>}
    </div>
  );
}
