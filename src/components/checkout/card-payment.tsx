"use client";

import { useState, useTransition } from "react";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { startCardPayment } from "@/lib/payments/card-actions";
import { primaryButton } from "@/components/ui/styles";

type CheckoutGlobal = { configure: (o: { session: { id: string } }) => void; showPaymentPage: () => void };
declare global {
  interface Window {
    Checkout?: CheckoutGlobal;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script"));
    document.head.append(s);
  });
}

// Pay an order by Visa / Mastercard on the bank's own secure page: we only
// open the page; card details never reach our site. Shown only when card
// payment is on and the gateway keys are set.
export function CardPayment({ orderNumber, paid }: { orderNumber: number; paid: boolean | null }) {
  const t = useTranslations("cardPay");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(paid === false ? "declined" : null);
  const [pending, start] = useTransition();

  if (paid) return <p className="rounded-xl bg-cedar/10 px-4 py-3 text-sm font-medium text-cedar">{t("paid")}</p>;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line p-5">
      <header className="flex items-start gap-3">
        <CreditCard className="mt-1 size-5 shrink-0 text-gold-dark" strokeWidth={1.5} aria-hidden />
        <div>
          <h2 className="text-2xl">{t("title")}</h2>
          <p className="text-sm text-muted">{t("intro")}</p>
        </div>
      </header>
      {error && (
        <p className="rounded-lg bg-surface px-4 py-3 text-sm" role="alert">
          {t(`errors.${error}` as "errors.failed")}
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        className={`${primaryButton} w-full py-4`}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await startCardPayment({ orderNumber, locale });
            if (!r.ok) return setError(r.error);
            try {
              await loadScript(r.scriptUrl);
              window.Checkout?.configure({ session: { id: r.sessionId } });
              window.Checkout?.showPaymentPage();
            } catch {
              setError("failed");
            }
          })
        }
      >
        {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : <Lock className="size-4.5" strokeWidth={1.5} aria-hidden />}
        {t("pay")}
      </button>
      <p className="text-center text-xs text-muted">{t("secure")}</p>
    </section>
  );
}
