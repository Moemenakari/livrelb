import { CalendarClock, Check, Gem, PackageCheck, PackageOpen, Truck, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { Tracking } from "@/lib/checkout/tracking";
import type { OrderStatus } from "@/lib/checkout/types";

// Parcel-app style tracking (like Shein): four stages on top, the delivery
// window, the courier's number, then a timeline with the newest update first.
const stages = [
  { key: "placed", icon: PackageOpen, statuses: ["pending"] },
  { key: "crafting", icon: Gem, statuses: ["confirmed", "in_production"] },
  { key: "onTheWay", icon: Truck, statuses: ["shipped"] },
  { key: "delivered", icon: PackageCheck, statuses: ["delivered"] },
] as const;

export function TrackingPanel({ status, tracking }: { status: OrderStatus; tracking: Tracking }) {
  const t = useTranslations("tracking");
  const format = useFormatter();

  if (status === "cancelled") {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 rounded-lg bg-surface px-4 py-3 text-sm">
          <X className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          {t("cancelled")}
        </p>
        <Timeline tracking={tracking} status={status} />
      </div>
    );
  }

  const current = stages.findIndex((s) => (s.statuses as readonly string[]).includes(status));
  const short = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short" });

  return (
    <div className="flex flex-col gap-5">
      <ol className="grid grid-cols-4" aria-label={t("progress")}>
        {stages.map(({ key, icon: Icon }, i) => {
          const done = i <= current;
          return (
            <li key={key} className="relative flex flex-col items-center gap-2 text-center" aria-current={i === current ? "step" : undefined}>
              {i > 0 && (
                <span
                  aria-hidden
                  className={`absolute top-[1.1rem] h-0.5 ${i <= current ? "bg-cedar" : "bg-line"}`}
                  style={{ insetInlineStart: "-50%", width: "100%" }}
                />
              )}
              <span
                className={`relative z-[1] flex size-9 items-center justify-center rounded-full border ${
                  done ? "border-cedar bg-cedar text-white" : "border-line bg-background text-muted"
                }`}
              >
                {i < current ? <Check className="size-4.5" strokeWidth={2} aria-hidden /> : <Icon className="size-4.5" strokeWidth={1.5} aria-hidden />}
              </span>
              <span className={`text-[11px] leading-tight sm:text-xs ${i === current ? "font-semibold" : done ? "" : "text-muted"}`}>
                {t(`stage.${key}`)}
              </span>
            </li>
          );
        })}
      </ol>

      {tracking.eta && (
        <p className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 text-sm">
          <CalendarClock className="size-5 shrink-0 text-gold-dark" strokeWidth={1.5} aria-hidden />
          <span>
            {t("eta")} <strong className="font-semibold">{short(tracking.eta.from)} {"–"} {short(tracking.eta.to)}</strong>
          </span>
        </p>
      )}

      {(tracking.carrier || tracking.trackingNumber) && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl border border-line px-4 py-3 text-sm">
          {tracking.carrier && (
            <>
              <dt className="text-muted">{t("carrier")}</dt>
              <dd>{tracking.carrier}</dd>
            </>
          )}
          {tracking.trackingNumber && (
            <>
              <dt className="text-muted">{t("trackingNumber")}</dt>
              <dd dir="ltr" className="text-start font-mono">
                {tracking.trackingNumber}
              </dd>
            </>
          )}
        </dl>
      )}

      <Timeline tracking={tracking} status={status} />
    </div>
  );
}

function Timeline({ tracking, status }: { tracking: Tracking; status: OrderStatus }) {
  const t = useTranslations("tracking");
  const format = useFormatter();
  if (tracking.events.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xl">{t("updates")}</h3>
      <ol className="flex flex-col">
        {tracking.events.map((e, i) => {
          const latest = i === 0;
          return (
            <li key={e.id} className="flex gap-3" aria-current={latest ? "step" : undefined}>
              <span className="flex flex-col items-center">
                <span className={`mt-1.5 size-3 shrink-0 rounded-full ${latest && status !== "cancelled" ? "bg-cedar ring-4 ring-cedar/15" : "bg-line"}`} />
                {i < tracking.events.length - 1 && <span className="w-px flex-1 bg-line" aria-hidden />}
              </span>
              <div className="pb-5">
                <p className={`text-sm ${latest ? "font-semibold" : ""}`}>{e.title}</p>
                {e.note && <p className="text-sm text-muted">{e.note}</p>}
                <p className="text-xs text-muted">{format.dateTime(new Date(e.at), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Beirut" })}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
