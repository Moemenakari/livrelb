"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { approveOrderPoints } from "@/lib/admin/order-actions";
import { writePointsMessage } from "@/lib/admin/points-message";
import { buttonClass, Card, inputClass, secondaryButtonClass } from "./ui";

type Props = {
  orderId: string;
  status: string;
  /** Points already given for this order (0 = none yet). */
  earned: number;
  /** Points this order earns once it is Delivered. */
  wouldEarn: number;
  canEdit: boolean;
  /** The customer's points balance now. */
  balance: number;
  /** The one-use thank-you coupon made with the points (null for orders from before points were automatic). */
  coupon: { code: string; percent: number; endsAt: string } | null;
  customer: { name: string; phone: string; orderNumber: number };
};

// LIVRE Points are given by the database the moment an order is marked
// Delivered. This card shows the result and writes the thank-you message the
// team can send on WhatsApp (AI wording when a key is set, else a fixed text).
export function PointsCard({ orderId, status, earned, wouldEarn, canEdit, balance, coupon, customer }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [text, setText] = useState("");
  const [ai, setAi] = useState(false);

  const write = (lang: "ar" | "en") => {
    if (!coupon) return;
    start(async () => {
      setError(null);
      const r = await writePointsMessage({
        customerName: customer.name,
        orderNumber: customer.orderNumber,
        points: earned,
        balance,
        couponCode: coupon.code,
        couponPercent: coupon.percent,
        couponEndsAt: coupon.endsAt,
        language: lang,
      });
      if (!r.ok) return setError(r.error);
      setText(r.data?.text ?? "");
      setAi(Boolean(r.data?.ai));
    });
  };

  const giveNow = () =>
    start(async () => {
      setError(null);
      const r = await approveOrderPoints(orderId);
      if (!r.ok) setError(r.error);
    });

  if (status === "cancelled") {
    return (
      <Card title="LIVRE Points" className="print:hidden">
        <p className="text-sm text-muted">No points: the order is cancelled.</p>
      </Card>
    );
  }

  if (earned === 0) {
    return (
      <Card title="LIVRE Points" className="print:hidden">
        {status !== "delivered" ? (
          <p className="text-sm text-muted">
            {wouldEarn > 0
              ? `This order earns ${wouldEarn} points. They are added automatically when you mark it Delivered, with a thank-you coupon.`
              : "This order is under the points step, it earns no points."}
          </p>
        ) : wouldEarn > 0 && canEdit ? (
          <>
            <p className="mb-3 text-sm text-muted">This order was delivered before points became automatic. Give its {wouldEarn} points now?</p>
            <button type="button" disabled={pending} onClick={giveNow} className={buttonClass}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
              Give {wouldEarn} points
            </button>
          </>
        ) : (
          <p className="text-sm text-muted">This order is under the points step, it earns no points.</p>
        )}
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
      </Card>
    );
  }

  const phoneDigits = customer.phone.replace(/\D/g, "");
  return (
    <Card title="LIVRE Points" className="print:hidden">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-cedar">
        <Check className="size-4" aria-hidden /> {earned} points added automatically
        <span className="font-normal text-muted">· balance {balance}</span>
      </p>
      {coupon ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Thank-you coupon <span className="font-mono font-semibold text-foreground">{coupon.code}</span> ({coupon.percent}% off, one use) ends{" "}
            {new Date(coupon.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.
          </p>
          {!text ? (
            <button type="button" disabled={pending} onClick={() => write(language)} className={secondaryButtonClass}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MessageCircle className="size-4" aria-hidden />}
              Write the WhatsApp message
            </button>
          ) : (
            <>
              <div className="flex gap-1.5">
                {(["ar", "en"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={language === l}
                    onClick={() => {
                      setLanguage(l);
                      write(l);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs ${language === l ? "border-ink bg-ink text-white" : "border-line"}`}
                  >
                    {l === "ar" ? "Arabic" : "English"}
                  </button>
                ))}
                <button type="button" disabled={pending} onClick={() => write(language)} className={`${secondaryButtonClass} ms-auto`}>
                  {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
                  Write again
                </button>
              </div>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} dir="auto" aria-label="Message to the customer" className={inputClass} />
              <p className="text-xs text-muted">{ai ? "Written by AI. Read it before sending." : "Standard wording (AI is off)."}</p>
              <a href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className={buttonClass}>
                <MessageCircle className="size-4" aria-hidden /> Send on WhatsApp
              </a>
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted">The thank-you message was shown when these points were approved.</p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}
