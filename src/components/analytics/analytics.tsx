"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CONSENT_EVENT, getConsent, loadAnalytics, setConsent, track, type Consent, type TrackData, type TrackEvent } from "@/lib/analytics/client";

// Cookie banner + loader. With no Meta Pixel or GA4 ID in the admin Settings
// nothing renders and nothing loads. The tracking scripts load only after
// the visitor presses Accept.
export function Analytics({ pixelId, ga4Id }: { pixelId: string; ga4Id: string }) {
  const t = useTranslations("consent");
  const [consent, setState] = useState<Consent | null | undefined>(undefined);
  const enabled = Boolean(pixelId || ga4Id);

  useEffect(() => {
    if (!enabled) return;
    const sync = () => setState(getConsent());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, [enabled]);

  useEffect(() => {
    if (enabled && consent === "granted") loadAnalytics({ pixelId, ga4Id });
  }, [enabled, consent, pixelId, ga4Id]);

  if (!enabled || consent !== null) return null;

  return (
    <aside
      role="dialog"
      aria-live="polite"
      aria-label={t("title")}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-line bg-background p-4 shadow-[0_12px_40px_-12px_rgba(43,38,34,0.45)] sm:inset-x-auto sm:start-4 sm:bottom-4"
    >
      <p className="text-sm">
        <strong className="font-semibold">{t("title")}</strong> {t("text")}{" "}
        <Link href="/policies/privacy" className="underline underline-offset-4">
          {t("more")}
        </Link>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConsent("granted")}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink/85"
        >
          {t("accept")}
        </button>
        <button
          type="button"
          onClick={() => setConsent("denied")}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-ink px-5 text-sm font-medium hover:bg-ink hover:text-white"
        >
          {t("decline")}
        </button>
      </div>
    </aside>
  );
}

/** Fires one event when the page shows (once per `once` key, if given). */
export function TrackOnMount({ event, data, once }: { event: TrackEvent; data: TrackData; once?: string }) {
  const { value, id, name, quantity, eventId, phone } = data;
  const fired = useRef(false);
  useEffect(() => {
    const fire = () => {
      // No consent (yet): nothing is recorded, so a later visit can still count.
      if (fired.current || getConsent() !== "granted") return;
      fired.current = true;
      if (once) {
        try {
          if (localStorage.getItem(`livre-tracked-${once}`)) return;
          localStorage.setItem(`livre-tracked-${once}`, "1");
        } catch {}
      }
      track(event, { value, id, name, quantity, eventId, phone });
    };
    // The pixel may still be loading right after "Accept": give it a moment.
    const timer = setTimeout(fire, 600);
    return () => clearTimeout(timer);
  }, [event, once, value, id, name, quantity, eventId, phone]);
  return null;
}
