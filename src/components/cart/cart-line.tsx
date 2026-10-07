"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CHARM_DESIGN_SLUG, productHref } from "@/config/navigation";
import { MAX_QTY, removeFromCart, setQty, type CartItem } from "@/lib/cart";
import { fonts, materials } from "@/lib/catalog/materials";
import { pieceOf } from "@/lib/catalog/types";
import type { QuoteLine } from "@/lib/checkout/types";
import { formatPrice } from "@/lib/format";
import { ProductArt } from "@/components/product/product-art";

type Props = {
  item: CartItem;
  /** The server's price for this line; undefined while loading. */
  quoted?: QuoteLine;
  /** Checkout summary: no quantity buttons. */
  readOnly?: boolean;
  onNavigate?: () => void;
};

const stepButton =
  "flex size-8 items-center justify-center rounded-full transition-colors hover:bg-surface disabled:opacity-30";

// One piece in the bag: its live preview in the chosen metal and font, the
// choices, quantity and the line price.
export function CartLine({ item, quoted, readOnly = false, onNavigate }: Props) {
  const t = useTranslations("cart");
  const tProduct = useTranslations("product");
  const locale = useLocale() as "en" | "ar";
  const name = item.name[locale];
  // A charm design has no product page of its own: it opens the Charms page.
  const href = item.slug === CHARM_DESIGN_SLUG ? "/charms" : productHref(item.slug);
  const lineTotal = quoted && !quoted.error ? quoted.lineTotal : item.unitPrice * item.qty;

  const size =
    item.size === undefined
      ? null
      : item.sizeKind === "ring"
        ? tProduct("usSize", { value: item.size })
        : tProduct("cm", { value: item.size });

  const details = [
    materials[item.material]?.name[locale],
    item.font && item.text && t("font", { font: fonts[item.font]?.name[locale] ?? item.font }),
    size && t(item.sizeKind ?? "chain", { size }),
    item.connection && t("connection", { connection: tProduct(`connection.${item.connection}`) }),
  ].filter(Boolean);

  return (
    <li className="flex gap-3 py-4">
      <Link
        href={href}
        onClick={onNavigate}
        className="flex size-20 shrink-0 items-center overflow-hidden rounded-lg bg-surface"
        aria-hidden
        tabIndex={-1}
      >
        <ProductArt
          art={item.art}
          material={item.material}
          text={item.text}
          font={item.font}
          connection={item.connection}
          piece={pieceOf(item.sizeKind)}
          aspect="square"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={href}
              onClick={onNavigate}
              className="text-[15px] leading-snug hover:text-gold-dark"
            >
              {name}
            </Link>
            {item.charmNames && item.charmNames.length > 0 ? (
              <p className="text-sm font-medium" dir="auto">
                {item.charmNames.map((n) => n[locale]).join(", ")}
              </p>
            ) : (
              item.text && (
                <p className="truncate text-sm font-medium" dir="auto">
                  {item.text}
                </p>
              )
            )}
          </div>
          <span className="shrink-0 text-sm font-medium text-gold-dark">{formatPrice(lineTotal)}</span>
        </div>

        <ul className="flex flex-wrap gap-x-2 text-xs text-muted">
          {details.map((d, i) => (
            <li key={i} className="flex gap-2">
              {i > 0 && <span aria-hidden>·</span>}
              {d}
            </li>
          ))}
        </ul>

        {quoted?.error && <p className="text-xs text-red-700">{t("lineError")}</p>}

        {readOnly ? (
          <p className="text-xs text-muted">{t("qtyValue", { qty: item.qty })}</p>
        ) : (
          <div className="mt-1 flex items-center justify-between">
            <div
              role="group"
              aria-label={t("qty")}
              className="flex items-center rounded-full border border-line"
            >
              <button
                type="button"
                onClick={() => setQty(item.id, item.qty - 1)}
                disabled={item.qty <= 1}
                aria-label={t("decrease")}
                className={stepButton}
              >
                <Minus className="size-3.5" strokeWidth={1.75} />
              </button>
              <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">
                {item.qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(item.id, item.qty + 1)}
                disabled={item.qty >= MAX_QTY}
                aria-label={t("increase")}
                className={stepButton}
              >
                <Plus className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => removeFromCart(item.id)}
              aria-label={t("removeLabel", { name })}
              className="flex items-center gap-1.5 text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
            >
              <Trash2 className="size-3.5" strokeWidth={1.5} aria-hidden />
              {t("remove")}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
