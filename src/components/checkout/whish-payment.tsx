"use client";

import { useState, useTransition } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { confirmWhishPayment, startWhishPayment, type WhishError } from "@/lib/payments/actions";
import { formatMoney } from "@/lib/format";
import { primaryButton } from "@/components/ui/styles";

const input =
  "h-12 w-full rounded-lg border border-line bg-background px-4 text-base outline-none placeholder:text-muted focus:border-gold";

// Pay a Whish order online: Whish phone -> OTP from Whish -> confirm.
// Only rendered when online Whish payment is switched on (feature flag).
export function WhishPayment({ orderNumber, total }: { orderNumber: number; total: number }) {
  const t = useTranslations("whishPay");
  const [wallet, setWallet] = useState("");
  const [otp, setOtp] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<WhishError | null>(null);
  const [pending, start] = useTransition();

  if (paid) {
    return <p className="rounded-xl bg-cedar/10 px-4 py-3 text-sm font-medium text-cedar">{t("paid")}</p>;
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line p-5">
      <header className="flex items-start gap-3">
        <Smartphone className="mt-1 size-5 shrink-0 text-gold-dark" strokeWidth={1.5} aria-hidden />
        <div>
          <h2 className="text-2xl">{t("title")}</h2>
          <p className="text-sm text-muted">{t("intro")}</p>
        </div>
      </header>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            if (!paymentId) {
              const r = await startWhishPayment({ orderNumber, wallet });
              if (r.ok) setPaymentId(r.paymentId);
              else setError(r.error);
            } else {
              const r = await confirmWhishPayment({ paymentId, otp });
              if (r.ok) setPaid(true);
              else {
                setError(r.error);
                if (r.error === "otp_expired") setPaymentId(null);
              }
            }
          });
        }}
      >
        {!paymentId ? (
          <>
            <label htmlFor="whish-wallet" className="text-sm font-medium">
              {t("wallet")}
            </label>
            <input
              id="whish-wallet"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="03 123 456"
              maxLength={25}
              required
              className={input}
              dir="ltr"
            />
          </>
        ) : (
          <>
            <label htmlFor="whish-otp" className="text-sm font-medium">
              {t("otp")}
            </label>
            <input
              id="whish-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={8}
              required
              className={`${input} tracking-[0.4em]`}
              dir="ltr"
            />
          </>
        )}
        {error && (
          <p className="text-sm text-red-800" role="alert">
            {t(`errors.${error}`)}
          </p>
        )}
        <button type="submit" disabled={pending} className={`${primaryButton} w-full py-4`}>
          {pending && <Loader2 className="size-4.5 animate-spin" aria-hidden />}
          {paymentId ? t("confirm", { total: formatMoney(total) }) : t("send")}
        </button>
      </form>
    </section>
  );
}
