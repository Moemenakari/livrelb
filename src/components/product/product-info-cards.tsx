"use client";

import { useId, useState, type ReactNode } from "react";
import { Banknote, ChevronRight, Gift, ShieldCheck, Smartphone, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DayRange, PointsRules } from "@/lib/catalog/types";
import { formatMoney, formatPrice } from "@/lib/format";
import { LivreCoin } from "@/components/icons/livre-coin";

export type InfoCardsData = {
  areas: { slug: string; name: string; fee: number | null; days: DayRange | null }[];
  deliveryFee: number;
  freeShippingOver: number;
  firstOrderFreeDelivery: boolean;
  /** The owner's own delivery text from site_settings; empty = built from the days. */
  deliveryTime: string;
  processingDays: DayRange;
  /** Delivery days of an area without its own. */
  deliveryDays: DayRange;
  points: PointsRules;
  /** The gift box comes free with this piece (admin switch). */
  giftBox: boolean;
};

// Compact cards under "Add to cart" (Phase 4 A2): delivery, payment,
// shopping security, LIVRE Points, gift box. Each opens for more detail.
export function ProductInfoCards({ data }: { data: InfoCardsData }) {
  const t = useTranslations("productInfo");
  const tTime = useTranslations("time");
  const tGift = useTranslations("giftBox");
  const id = useId();
  const [area, setArea] = useState(data.areas.find((a) => a.slug === "beirut")?.slug ?? data.areas[0]?.slug ?? "");
  const selected = data.areas.find((a) => a.slug === area);
  const fee = selected?.fee ?? data.deliveryFee;
  const span = (r: DayRange) => (r.min === r.max ? tTime("exact", { n: r.min }) : tTime("days", { min: r.min, max: r.max }));
  // The owner's own text (Settings) keeps its label; otherwise the making and delivery days.
  const timeline = data.deliveryTime
    ? t("delivery.estimate", { time: data.deliveryTime })
    : tTime("timeline", { made: span(data.processingDays), ship: span(selected?.days ?? data.deliveryDays) });
  const p = data.points;

  return (
    <div className="flex flex-col divide-y divide-line rounded-xl border border-line">
      <Card
        icon={<Truck className="size-5 text-cedar" strokeWidth={1.5} aria-hidden />}
        detail={
          <>
            <p>{t("delivery.detail", { amount: formatPrice(data.freeShippingOver), fee: formatPrice(fee) })}</p>
            {data.firstOrderFreeDelivery && <p>{t("delivery.firstOrder")}</p>}
          </>
        }
      >
        <p className="flex flex-wrap items-center gap-1.5">
          <label htmlFor={`${id}-area`}>{t("delivery.to")}</label>
          {data.areas.length > 0 && (
            <select
              id={`${id}-area`}
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="rounded-md border border-line bg-background px-2 py-0.5 text-sm font-medium outline-none focus:border-gold"
            >
              {data.areas.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </p>
        <p className="text-muted">
          {t("delivery.fee", { amount: formatPrice(data.freeShippingOver), fee: formatPrice(fee) })}
        </p>
        <p className="text-muted">{timeline}</p>
      </Card>

      <Card
        icon={<Banknote className="size-5 text-cedar" strokeWidth={1.5} aria-hidden />}
        detail={
          <>
            <p>{t("payment.codDetail")}</p>
            <p>{t("payment.whishDetail")}</p>
          </>
        }
      >
        <p className="font-medium">{t("payment.title")}</p>
        <p className="flex flex-wrap items-center gap-2 text-muted">
          <span className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[12px]">
            <Banknote className="size-3.5" strokeWidth={1.5} aria-hidden />
            {t("payment.cod")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[12px]">
            <Smartphone className="size-3.5" strokeWidth={1.5} aria-hidden />
            {t("payment.whish")}
          </span>
        </p>
      </Card>

      <Card
        icon={<ShieldCheck className="size-5 text-cedar" strokeWidth={1.5} aria-hidden />}
        detail={<p>{t("security.detail")}</p>}
      >
        <p className="font-medium">{t("security.title")}</p>
        <p className="text-muted">{"🔒"} {t("security.line")}</p>
      </Card>

      {p.enabled && (
        <Card
          icon={<LivreCoin className="size-5" />}
          detail={
            <p>
              {t("points.detail", {
                redeem: p.redeemPoints,
                value: formatMoney(p.redeemValue),
              })}
            </p>
          }
        >
          <p className="font-medium">{t("points.title")}</p>
          <p className="text-muted">
            {t("points.line", {
              step: formatPrice(p.stepDollars),
              perStep: p.perStep,
              redeem: p.redeemPoints,
              value: formatPrice(p.redeemValue),
              review: p.perReview,
            })}
          </p>
        </Card>
      )}

      {data.giftBox && (
        <Card
          icon={<Gift className="size-5 text-cedar" strokeWidth={1.5} aria-hidden />}
          detail={<p>{t("gift.detail")}</p>}
        >
          <p>
            {"🎁 "}
            {tGift.rich("free", {
              strong: (chunks) => <strong className="font-medium text-gold-dark">{chunks}</strong>,
            })}
          </p>
        </Card>
      )}
    </div>
  );
}

function Card({ icon, children, detail }: { icon: ReactNode; children: ReactNode; detail: ReactNode }) {
  const t = useTranslations("productInfo");
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">{children}</div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          aria-label={t("more")}
          className="-me-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground"
        >
          <ChevronRight
            className={`size-4.5 transition-transform rtl:-scale-x-100 ${open ? "rotate-90 rtl:-rotate-90" : ""}`}
            strokeWidth={1.5}
          />
        </button>
      </div>
      <div id={id} hidden={!open} className="ms-8 mt-2 flex flex-col gap-1.5 text-[13px] leading-relaxed text-muted">
        {detail}
      </div>
    </div>
  );
}
