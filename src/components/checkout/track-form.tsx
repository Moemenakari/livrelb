"use client";

import { useActionState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { lookupPoints, trackOrder, type PointsState, type TrackState } from "@/lib/checkout/actions";
import { formatMoney, formatPrice } from "@/lib/format";
import { LivreCoin } from "@/components/icons/livre-coin";
import { primaryButton } from "@/components/ui/styles";
import { OrderStatusSteps } from "./order-status";

const input =
  "h-12 w-full rounded-lg border border-line bg-background px-4 text-base outline-none placeholder:text-muted focus:border-gold";

export function TrackForm({ locale, number }: { locale: string; number: string }) {
  const t = useTranslations("track");
  const tOrder = useTranslations("order");
  const format = useFormatter();
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrder, { status: "idle" });

  return (
    <div className="flex flex-col gap-8">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="track-number" className="text-sm font-medium">
            {t("number")}
          </label>
          <input
            id="track-number"
            name="number"
            inputMode="numeric"
            defaultValue={"number" in state ? state.number : number}
            placeholder="1001"
            required
            maxLength={12}
            className={input}
            dir="ltr"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="track-phone" className="text-sm font-medium">
            {t("phone")}
          </label>
          <input
            id="track-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={"phone" in state ? state.phone : ""}
            placeholder="03 123 456"
            required
            maxLength={25}
            className={input}
            dir="ltr"
          />
        </div>
        {state.status === "not_found" && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {t("notFound")}
          </p>
        )}
        {state.status === "rate_limited" && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {t("tooMany")}
          </p>
        )}
        <button type="submit" disabled={pending} className={`${primaryButton} w-full py-4`}>
          {pending && <Loader2 className="size-4.5 animate-spin" aria-hidden />}
          {t("submit")}
        </button>
      </form>

      {state.status === "found" && (
        <section className="flex flex-col gap-5 rounded-xl border border-line p-5" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl">{tOrder("number", { number: state.number })}</h2>
            <p className="text-sm text-muted">
              {t("placedOn", { date: format.dateTime(new Date(state.placedAt), { dateStyle: "medium" }) })}
            </p>
          </div>
          <OrderStatusSteps status={state.orderStatus} />
          {(state.points.earned > 0 || state.points.toEarn > 0) && (
            <p className="flex items-center gap-2 text-sm text-gold-dark">
              <Sparkles className="size-4" strokeWidth={1.5} aria-hidden />
              {state.points.earned > 0
                ? tOrder("pointsEarned", { points: state.points.earned })
                : tOrder("pointsToEarn", { points: state.points.toEarn })}
            </p>
          )}
          <ul className="flex flex-col gap-1 border-t border-line pt-4 text-sm">
            {state.items.map((item, i) => (
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
                <span className="text-muted">{t("qty", { qty: item.qty })}</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t border-line pt-3 font-medium">
            <span>{t("total")}</span>
            <span>{formatPrice(state.total)}</span>
          </p>
        </section>
      )}
    </div>
  );
}

// "My points": phone + any order number shows the LIVRE Points balance.
export function PointsLookup() {
  const t = useTranslations("track");
  const [state, action, pending] = useActionState<PointsState, FormData>(lookupPoints, { status: "idle" });

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-gold/40 bg-gold/5 p-5">
      <header className="flex items-center gap-3">
        <LivreCoin className="size-7 shrink-0" />
        <div>
          <h2 className="text-2xl">{t("pointsTitle")}</h2>
          <p className="text-sm text-muted">{t("pointsIntro")}</p>
        </div>
      </header>
      {state.status === "found" ? (
        <p className="flex flex-col gap-0.5 rounded-lg bg-background px-4 py-3" aria-live="polite">
          <span className="text-xl font-medium text-gold-dark">{t("pointsBalance", { points: state.points })}</span>
          <span className="text-sm text-muted">{t("pointsValue", { value: formatMoney(state.value) })}</span>
        </p>
      ) : (
        <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="sr-only" htmlFor="points-phone">
            {t("phone")}
          </label>
          <input
            id="points-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={"phone" in state ? state.phone : ""}
            placeholder={t("phone")}
            required
            maxLength={25}
            className={input}
            dir="ltr"
          />
          <label className="sr-only" htmlFor="points-number">
            {t("number")}
          </label>
          <input
            id="points-number"
            name="number"
            inputMode="numeric"
            defaultValue={"number" in state ? state.number : ""}
            placeholder={t("number")}
            required
            maxLength={12}
            className={input}
            dir="ltr"
          />
          <button type="submit" disabled={pending} className={`${primaryButton} h-12 py-0`}>
            {pending && <Loader2 className="size-4.5 animate-spin" aria-hidden />}
            {t("pointsSubmit")}
          </button>
          {(state.status === "not_found" || state.status === "rate_limited") && (
            <p className="text-sm text-red-800 sm:col-span-3" role="alert">
              {state.status === "not_found" ? t("pointsNotFound") : t("tooMany")}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
