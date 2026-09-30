"use client";

import { ArrowRight, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toInput, useCart, useCoupon } from "@/lib/cart";
import { primaryButton } from "@/components/ui/styles";
import { CartLine } from "./cart-line";
import { CartSummary } from "./cart-summary";
import { useQuote } from "./use-quote";

type Props = {
  freeShippingOver: number;
  /** Drawer: lines scroll, summary sticks to the bottom. */
  variant: "drawer" | "page";
  /** Closes the drawer when a link is followed. */
  onNavigate?: () => void;
};

// The bag's lines and totals, shared by the cart drawer and the /cart page.
export function CartContents({ freeShippingOver, variant, onNavigate }: Props) {
  const t = useTranslations("cart");
  const items = useCart();
  const coupon = useCoupon();
  const { quote, fresh, failed } = useQuote({ items: items.map(toInput), coupon });
  const estimate = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const hasErrors = fresh && quote?.lines.some((l) => l.error);

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <ShoppingBag className="size-10 text-gold" strokeWidth={1} aria-hidden />
        <p className="text-muted">{t("empty")}</p>
        <Link href="/category/name-necklaces" onClick={onNavigate} className={`${primaryButton} px-7 py-3`}>
          {t("emptyCta")}
        </Link>
      </div>
    );
  }

  const lines = (
    <ul className="divide-y divide-line">
      {items.map((item, i) => (
        <CartLine
          key={item.id}
          item={item}
          quoted={fresh ? quote?.lines[i] : undefined}
          onNavigate={onNavigate}
        />
      ))}
    </ul>
  );

  const summary = (
    <div className="flex flex-col gap-4">
      <CartSummary
        quote={quote}
        fresh={fresh}
        failed={failed}
        estimate={estimate}
        freeShippingOver={freeShippingOver}
        coupon={coupon}
      />
      <Link
        href="/checkout"
        onClick={(e) => {
          if (hasErrors) e.preventDefault();
          else onNavigate?.();
        }}
        aria-disabled={hasErrors || undefined}
        className={`${primaryButton} w-full py-4 text-base ${hasErrors ? "pointer-events-none opacity-50" : ""}`}
      >
        {t("checkout")}
        <ArrowRight className="size-4.5 rtl:-scale-x-100" strokeWidth={1.5} aria-hidden />
      </Link>
    </div>
  );

  if (variant === "drawer") {
    return (
      <>
        <div className="flex-1 overflow-y-auto px-5">{lines}</div>
        <div className="border-t border-line bg-background px-5 pt-4 pb-5">
          {summary}
          <Link
            href="/cart"
            onClick={onNavigate}
            className="mt-3 block text-center text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("viewCart")}
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14">
      <div>{lines}</div>
      <div className="lg:sticky lg:top-28 lg:self-start">{summary}</div>
    </div>
  );
}
