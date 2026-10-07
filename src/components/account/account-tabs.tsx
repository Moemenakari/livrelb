"use client";

import { useEffect, useRef, useState } from "react";
import { PackageSearch, Sparkles } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Account, AccountOrder } from "@/lib/checkout/account";
import { formatMoney, formatPrice } from "@/lib/format";
import { LivreCoin } from "@/components/icons/livre-coin";
import { TrackingPanel } from "@/components/checkout/tracking-panel";
import { primaryButton, secondaryButton } from "@/components/ui/styles";

export type AccountTab = "last" | "points" | "track";
const tabs: AccountTab[] = ["last", "points", "track"];

// Three segments she can swipe between (or tap): her last order, her LIVRE
// Points and the tracking of her orders. Each segment is a full-width panel in
// a scroll-snap row, so a phone swipes naturally.
export function AccountTabs({ account, initial, openOrder }: { account: Account; initial: AccountTab; openOrder: number | null }) {
  const t = useTranslations("account");
  const locale = useLocale();
  const rowRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(tabs.indexOf(initial));
  // Left in English, right in Arabic: the sign of the scroll offset flips.
  const sign = locale === "ar" ? -1 : 1;

  const go = (index: number, smooth = true) => {
    const row = rowRef.current;
    if (!row) return;
    row.scrollTo({ left: sign * index * row.clientWidth, behavior: smooth ? "smooth" : "instant" });
  };

  // Open on the tab the link asked for (the "Track my order" button after an order).
  useEffect(() => {
    go(tabs.indexOf(initial), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label={t("tabsLabel")} className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1">
        {tabs.map((k, i) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`account-tab-${k}`}
            aria-selected={active === i}
            aria-controls={`account-panel-${k}`}
            onClick={() => go(i)}
            className={`rounded-full px-2 py-2.5 text-[13px] transition-colors sm:text-sm ${active === i ? "bg-ink text-white" : "hover:bg-background"}`}
          >
            {t(`tabs.${k}`)}
          </button>
        ))}
      </div>

      <div
        ref={rowRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setActive(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
        }}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory items-start overflow-x-auto px-0"
      >
        <Panel id="last" active={active === 0}>
          <LastOrder order={account.orders[0]} />
        </Panel>
        <Panel id="points" active={active === 1}>
          <Points account={account} />
        </Panel>
        <Panel id="track" active={active === 2}>
          <Orders orders={account.orders} open={openOrder} />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ id, active, children }: { id: AccountTab; active: boolean; children: React.ReactNode }) {
  return (
    <section
      id={`account-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`account-tab-${id}`}
      aria-hidden={!active}
      className="w-full shrink-0 snap-center px-4"
    >
      {children}
    </section>
  );
}

function StatusBadge({ order }: { order: AccountOrder }) {
  const t = useTranslations("orderStatus");
  const tOrder = useTranslations("order");
  const awaiting = order.payment && !order.payment.confirmed && order.status === "pending";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${awaiting ? "bg-sale/10 text-sale" : "bg-surface"}`}>
      {awaiting ? tOrder("payAwaiting") : t(order.status)}
    </span>
  );
}

function Empty() {
  const t = useTranslations("account");
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-line py-12 text-center">
      <PackageSearch className="size-8 text-gold" strokeWidth={1} aria-hidden />
      <p className="text-muted">{t("noOrders")}</p>
      <Link href="/category/name-necklaces" className={`${primaryButton} px-7 py-3`}>
        {t("shop")}
      </Link>
    </div>
  );
}

function LastOrder({ order }: { order?: AccountOrder }) {
  const t = useTranslations("account");
  const tOrder = useTranslations("order");
  const tTrack = useTranslations("track");
  const format = useFormatter();
  if (!order) return <Empty />;
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl">{tOrder("number", { number: order.number })}</h2>
        <StatusBadge order={order} />
      </div>
      <p className="text-sm text-muted">{tTrack("placedOn", { date: format.dateTime(new Date(order.placedAt), { dateStyle: "medium" }) })}</p>
      <ul className="flex flex-col gap-1 border-y border-line py-3 text-sm">
        {order.items.map((item, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>
              {item.name}
              {item.text && (
                <span className="text-muted" dir="auto">
                  {" · "}
                  {item.text}
                </span>
              )}
            </span>
            <span className="text-muted">{tTrack("qty", { qty: item.qty })}</span>
          </li>
        ))}
      </ul>
      <p className="flex justify-between font-medium">
        <span>{tTrack("total")}</span>
        <span>{formatPrice(order.total)}</span>
      </p>
      {order.payment && !order.payment.confirmed && (
        <p className="rounded-lg bg-sale/5 px-4 py-3 text-sm font-medium text-sale">
          {order.payment.reported ? tOrder("payReported") : tOrder("payAmount", { amount: formatMoney(order.payment.due) })}
        </p>
      )}
      <Link href={`/order/${order.number}`} className={`${secondaryButton} w-full`}>
        {t("openOrder")}
      </Link>
    </div>
  );
}

function Points({ account }: { account: Account }) {
  const t = useTranslations("account");
  const tTrack = useTranslations("track");
  const { rules, points } = account;
  const toEarn = account.orders.reduce((sum, o) => sum + o.points.toEarn, 0);
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gold/40 bg-gold/5 p-5">
      <header className="flex items-center gap-3">
        <LivreCoin className="size-8 shrink-0" />
        <h2 className="text-2xl">{tTrack("pointsTitle")}</h2>
      </header>
      <p className="flex flex-col gap-0.5 rounded-lg bg-background px-4 py-3">
        <span className="text-xl font-medium text-gold-dark">{tTrack("pointsBalance", { points: points.balance })}</span>
        <span className="text-sm text-muted">{tTrack("pointsValue", { value: formatMoney(points.value) })}</span>
      </p>
      {toEarn > 0 && (
        <p className="flex items-center gap-2 text-sm text-gold-dark">
          <Sparkles className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          {t("pointsPending", { points: toEarn })}
        </p>
      )}
      {rules.enabled && (
        <ul className="flex flex-col gap-1 text-sm text-muted">
          <li>{t("ruleEarn", { points: rules.perStep, amount: formatMoney(rules.stepDollars) })}</li>
          <li>{t("ruleRedeem", { points: rules.redeemPoints, value: formatMoney(rules.redeemValue) })}</li>
        </ul>
      )}
    </div>
  );
}

function Orders({ orders, open }: { orders: AccountOrder[]; open: number | null }) {
  const t = useTranslations("account");
  const tOrder = useTranslations("order");
  const tTrack = useTranslations("track");
  const format = useFormatter();
  if (orders.length === 0) return <Empty />;
  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order, i) => (
        <li key={order.number} className="rounded-xl border border-line">
          <details open={open === null ? i === 0 : open === order.number} className="group">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4">
              <span className="flex flex-col">
                <span className="font-medium">{tOrder("number", { number: order.number })}</span>
                <span className="text-xs text-muted">{format.dateTime(new Date(order.placedAt), { dateStyle: "medium" })}</span>
              </span>
              <span className="flex items-center gap-3">
                <StatusBadge order={order} />
                <span className="text-sm font-medium">{formatPrice(order.total)}</span>
              </span>
            </summary>
            <div className="flex flex-col gap-4 border-t border-line p-4">
              <TrackingPanel status={order.status} tracking={order.tracking} />
              <ul className="flex flex-col gap-1 text-sm">
                {order.items.map((item, j) => (
                  <li key={j} className="flex justify-between gap-3">
                    <span>
                      {item.name}
                      {item.text && (
                        <span className="text-muted" dir="auto">
                          {" · "}
                          {item.text}
                        </span>
                      )}
                    </span>
                    <span className="text-muted">{tTrack("qty", { qty: item.qty })}</span>
                  </li>
                ))}
              </ul>
              <Link href={`/order/${order.number}`} className="text-sm text-muted underline underline-offset-4 hover:text-foreground">
                {t("openOrder")}
              </Link>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
