"use client";

import { useRef, useState } from "react";
import { Check, Copy, ImagePlus, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createReceiptUpload, reportTransfer, type TransferError } from "@/lib/checkout/payment-actions";
import { formatMoney } from "@/lib/format";
import { primaryButton, secondaryButton } from "@/components/ui/styles";

type Props = {
  orderNumber: number;
  /** What she sends now (USD): the whole total, or the deposit. */
  due: number;
  /** What she pays in cash on delivery (0 when she pays it all by transfer). */
  rest: number;
  /** The number to send the money to, and the name on the account (Settings). */
  number: string;
  accountName: string;
  /** She already told us she sent it / staff already confirmed it. */
  reported: boolean;
  confirmed: boolean;
  /** Receipt pictures can be uploaded (R2 is set up). */
  uploadEnabled: boolean;
};

// After an order paid by transfer: send the amount to our number by Whish, OMT or
// Suyool, tap "I sent the transfer" (optionally with a screenshot of the receipt);
// staff then confirm the payment in the admin and the order is confirmed.
export function PaymentInstructions({ orderNumber, due, rest, number, accountName, reported, confirmed, uploadEnabled }: Props) {
  const t = useTranslations("order");
  const file = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [proof, setProof] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(reported);
  const [error, setError] = useState<TransferError | null>(null);

  if (confirmed) {
    return (
      <p className="flex items-center gap-3 rounded-xl bg-cedar/10 px-4 py-3 text-sm font-medium text-cedar" role="status">
        <Check className="size-5 shrink-0" strokeWidth={2} aria-hidden />
        {t("payConfirmed")}
      </p>
    );
  }

  const upload = async (f: File) => {
    setError(null);
    setBusy(true);
    try {
      const target = await createReceiptUpload({ orderNumber, contentType: f.type, size: f.size });
      if (!target.ok) throw target.error;
      const put = await fetch(target.uploadUrl, { method: "PUT", body: f, headers: { "Content-Type": f.type } });
      if (!put.ok) throw "failed";
      setProof(target.publicUrl);
    } catch (e) {
      setError(typeof e === "string" ? (e as TransferError) : "failed");
    } finally {
      setBusy(false);
    }
  };

  const report = async () => {
    setError(null);
    setBusy(true);
    const r = await reportTransfer({ orderNumber, proofUrl: proof ?? undefined });
    setBusy(false);
    if (r.ok) setSent(true);
    else setError(r.error);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the number is on screen to copy by hand.
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-sale/30 bg-sale/5 p-5" aria-labelledby="pay-title">
      <h2 id="pay-title" className="text-2xl">
        {t("payTitle")}
      </h2>
      <p className="text-3xl font-semibold text-sale lining-nums">{t("payAmount", { amount: formatMoney(due) })}</p>
      {rest > 0 && <p className="text-sm text-muted">{t("payRest", { amount: formatMoney(rest) })}</p>}

      {number ? (
        <div className="flex flex-col gap-2 rounded-lg bg-background px-4 py-3">
          <p className="text-sm text-muted">{t("payHow")}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xl font-medium tracking-wide lining-nums" dir="ltr">
              {number}
            </span>
            <button type="button" onClick={copy} className={`${secondaryButton} px-4 py-2`}>
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? t("payCopied") : t("payCopy")}
            </button>
          </div>
          {accountName && <p className="text-sm text-muted">{t("payAccount", { name: accountName })}</p>}
        </div>
      ) : (
        <p className="rounded-lg bg-background px-4 py-3 text-sm">{t("payNoNumber")}</p>
      )}

      {sent ? (
        <p className="rounded-lg bg-background px-4 py-3 text-sm font-medium text-cedar" role="status">
          {t("payReported")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {uploadEnabled && (
            <>
              <input
                ref={file}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                  e.target.value = "";
                }}
              />
              <button type="button" disabled={busy} onClick={() => file.current?.click()} className={`${secondaryButton} w-full`}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
                {proof ? t("payReceiptAdded") : t("payReceipt")}
              </button>
            </>
          )}
          <button type="button" disabled={busy} onClick={report} className={`${primaryButton} w-full py-4`}>
            {busy && <Loader2 className="size-4.5 animate-spin" aria-hidden />}
            {t("paySent")}
          </button>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-800" role="alert">
          {t(`payErrors.${error}`)}
        </p>
      )}
    </section>
  );
}
