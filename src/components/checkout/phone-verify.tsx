"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Loader2, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { sendPhoneCode, verifyPhoneCode, type OtpError } from "@/lib/otp/actions";
import { formatMoney } from "@/lib/format";

type Props = {
  /** The phone typed in the form, E.164. */
  phone: string;
  locale: string;
  verified: boolean;
  /** The reward: points, and what one point is worth (USD). */
  points: number;
  pointValue: number;
  onVerified: (phone: string) => void;
};

// "Verify your phone on WhatsApp": we send a 6-digit code to her WhatsApp, she types it
// here, and the phone is remembered as hers (she never verifies it again). She gets LIVRE
// Points once. It never blocks the order: her Google account is already a proof.
export function PhoneVerify({ phone, locale, verified, points, pointValue, onVerified }: Props) {
  const t = useTranslations("checkout.verify");
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState<OtpError | null>(null);
  const [pending, start] = useTransition();
  const reward = points > 0 ? t("reward", { points, value: formatMoney(points * pointValue) }) : "";

  if (verified) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-cedar" role="status">
        <BadgeCheck className="size-4.5 shrink-0" strokeWidth={1.75} aria-hidden />
        {t("done")}
      </p>
    );
  }

  const send = () =>
    start(async () => {
      setError(null);
      const r = await sendPhoneCode({ phone, locale });
      if (r.ok) setStep("code");
      else setError(r.error);
    });

  const check = () =>
    start(async () => {
      setError(null);
      const r = await verifyPhoneCode({ phone, code });
      if (r.ok) onVerified(phone);
      else setError(r.error);
    });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-4 py-3">
      <p className="flex items-start gap-2 text-sm">
        <MessageCircle className="mt-0.5 size-4.5 shrink-0 text-cedar" strokeWidth={1.5} aria-hidden />
        <span>
          {t("title")} {reward && <strong className="font-semibold text-sale">{reward}</strong>}
        </span>
      </p>
      {step === "idle" ? (
        <button
          type="button"
          disabled={pending}
          onClick={send}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-ink text-sm font-medium transition-colors hover:bg-ink hover:text-white disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t("send")}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor="co-otp" className="text-sm font-medium">
            {t("codeLabel")}
          </label>
          <div className="flex gap-2">
            <input
              id="co-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="h-11 w-full min-w-0 rounded-lg border border-line bg-background px-3 text-center text-lg tracking-[0.4em] outline-none focus:border-gold"
            />
            <button
              type="button"
              disabled={pending || code.length !== 6}
              onClick={check}
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {t("check")}
            </button>
          </div>
          <button type="button" disabled={pending} onClick={send} className="self-start text-xs text-muted underline underline-offset-4 hover:text-foreground">
            {t("resend")}
          </button>
        </div>
      )}
      {error && (
        <p className="text-xs text-red-700" role="alert">
          {t(`errors.${error}`)}
        </p>
      )}
    </div>
  );
}
