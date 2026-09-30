"use client";

import { useState } from "react";
import { Sparkles, Truck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { setCoupon } from "@/lib/cart";
import type { Quote } from "@/lib/checkout/types";
import { formatPrice } from "@/lib/format";
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

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.trim()) setCoupon(draft);
        setDraft("");
      }}
    >
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
        className="h-10 min-w-0 flex-1 rounded-full border border-line bg-background px-4 text-sm uppercase outline-none placeholder:normal-case placeholder:text-muted focus:border-gold"
      />
      <button
        type="submit"
        className="h-10 shrink-0 rounded-full border border-ink px-5 text-sm transition-colors hover:bg-ink hover:text-white"
      >
        {t("apply")}
      </button>
    </form>
  );
}

// Totals under the bag: free delivery progress, the free gift box, coupon,
// subtotal / discount / delivery / total, all from the server quote.
export function CartSummary({ quote, fresh, failed, estimate, freeShippingOver, coupon, couponField = true }: Props) {
  const t = useTranslations("cart");
  const subtotal = quote?.subtotal ?? estimate;
  const discount = quote?.discount ?? 0;
  const over = quote?.freeShippingOver ?? freeShippingOver;

  return (
    <div className="flex flex-col gap-4">
      <FreeDeliveryBar amount={subtotal - discount} over={over} firstOrder={quote?.isFirstOrder ?? null} />
      <GiftBoxNote />
      {couponField && <CouponField coupon={coupon} quote={quote} />}

      <dl
        className={`flex flex-col gap-2 text-sm transition-opacity ${fresh ? "" : "opacity-60"}`}
        aria-busy={!fresh}
      >
        <div className={row}>
          <dt className="text-muted">{t("subtotal")}</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className={row}>
            <dt className="text-muted">{t("discount")}</dt>
            <dd className="text-cedar">{"-"}{formatPrice(discount)}</dd>
          </div>
        )}
        {quote && quote.points.discount > 0 && (
          <div className={row}>
            <dt className="text-muted">{t("pointsDiscount", { points: quote.points.used })}</dt>
            <dd className="text-cedar">
              {"-"}
              {formatPrice(quote.points.discount)}
            </dd>
          </div>
        )}
        <div className={row}>
          <dt className="text-muted">{t("delivery")}</dt>
          <dd className="text-end">
            {quote && quote.delivery === 0 ? (
              <span className="font-medium text-cedar">{t("deliveryFree")}</span>
            ) : (
              <>
                {quote ? formatPrice(quote.delivery) : "—"}
                {quote?.isFirstOrder === null && quote.firstOrderFreeDelivery && (
                  <span className="block text-xs text-muted">{t("deliveryFirstOrder")}</span>
                )}
              </>
            )}
          </dd>
        </div>
        <div className={`${row} border-t border-line pt-3 text-base font-medium`}>
          <dt>{t("total")}</dt>
          <dd>{formatPrice(quote?.total ?? subtotal)}</dd>
        </div>
      </dl>
      {quote && quote.points.toEarn > 0 && (
        <p className="flex items-center gap-2 text-xs text-gold-dark">
          <Sparkles className="size-3.5" strokeWidth={1.5} aria-hidden />
          {t("pointsEarn", { points: quote.points.toEarn })}
        </p>
      )}
      {failed && <p className="text-xs text-red-700">{t("unavailable")}</p>}
    </div>
  );
}
