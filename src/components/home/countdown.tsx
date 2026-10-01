"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

// Time left until a promotion ends (brief §8.1.2: end time set in admin,
// the promotions table). Shows dashes on the server so hydration matches,
// then ticks every second.

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}
const nowSeconds = () => Math.floor(Date.now() / 1000);

export function Countdown({ endsAt, className = "", onDark = false }: { endsAt: string; className?: string; onDark?: boolean }) {
  const t = useTranslations("countdown");
  const now = useSyncExternalStore(subscribe, nowSeconds, () => null);
  const end = Math.floor(new Date(endsAt).getTime() / 1000);
  const left = now === null ? null : Math.max(0, end - now);

  const parts = [
    { key: "days", value: left === null ? null : Math.floor(left / 86400) },
    { key: "hours", value: left === null ? null : Math.floor((left % 86400) / 3600) },
    { key: "minutes", value: left === null ? null : Math.floor((left % 3600) / 60) },
    { key: "seconds", value: left === null ? null : left % 60 },
  ] as const;

  if (left === 0) return null;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <p className={`tracking-caps text-[11px] font-medium uppercase ${onDark ? "text-white/85" : "text-muted"}`}>{t("label")}</p>
      <ol className="flex gap-2" role="timer" aria-live="off">
        {parts.map(({ key, value }) => (
          <li
            key={key}
            className="flex w-16 flex-col items-center rounded-lg border border-line bg-background py-2 text-foreground"
          >
            <span className="font-display text-3xl leading-none lining-nums tabular-nums" lang="en">
              {value === null ? "--" : String(value).padStart(2, "0")}
            </span>
            <span className="mt-1 text-[11px] text-muted">{t(key)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
