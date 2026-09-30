"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { approveOrderPoints, type PointsApproval } from "@/lib/admin/order-actions";
import { writePointsMessage } from "@/lib/admin/points-message";
import { buttonClass, Card, inputClass, secondaryButtonClass } from "./ui";

type Props = {
  orderId: string;
  status: string;
  /** Points staff already approved for this order (0 = not yet). */
  approvedPoints: number;
  /** Points this order would earn when approved. */
  wouldEarn: number;
  canEdit: boolean;
  /** Used when the approval result was not kept in this browser. */
  customer: { name: string; phone: string; orderNumber: number };
};

const storageKey = (orderId: string) => `livre-points-${orderId}`;

function load(orderId: string): PointsApproval | null {
  try {
    const raw = localStorage.getItem(storageKey(orderId));
    return raw ? (JSON.parse(raw) as PointsApproval) : null;
  } catch {
    return null;
  }
}

// Delivered orders: the staff member approves the points (once), then gets a
// ready "you won points + a coupon" message to send on WhatsApp.
export function PointsApprovalCard({ orderId, status, approvedPoints, wouldEarn, canEdit, customer }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PointsApproval | null>(null);
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [text, setText] = useState("");
  const [ai, setAi] = useState(false);

  useEffect(() => {
    // Read once after mount (localStorage is browser-only).
    const kept = load(orderId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (kept) setResult(kept);
  }, [orderId]);

  const write = (data: PointsApproval, lang: "ar" | "en") =>
    start(async () => {
      setError(null);
      const r = await writePointsMessage({ ...data, language: lang });
      if (!r.ok) return setError(r.error);
      setText(r.data?.text ?? "");
      setAi(Boolean(r.data?.ai));
    });

  const approve = () =>
    start(async () => {
      setError(null);
      const r = await approveOrderPoints(orderId);
      if (!r.ok || !r.data) return setError(r.ok ? "Something went wrong." : r.error);
      try {
        localStorage.setItem(storageKey(orderId), JSON.stringify(r.data));
      } catch {}
      setResult(r.data);
      const m = await writePointsMessage({ ...r.data, language });
      if (m.ok) {
        setText(m.data?.text ?? "");
        setAi(Boolean(m.data?.ai));
      }
    });

  if (status !== "delivered" && approvedPoints === 0) {
    return (
      <Card title="LIVRE Points" className="print:hidden">
        <p className="text-sm text-muted">
          {wouldEarn > 0
            ? `This order will earn ${wouldEarn} points. Mark it Delivered, then approve them here.`
            : "This order is under the points step, it earns no points."}
        </p>
      </Card>
    );
  }

  const phoneDigits = (result?.customerPhone ?? customer.phone).replace(/\D/g, "");

  return (
    <Card title="LIVRE Points" className="print:hidden">
      {approvedPoints === 0 && !result && (
        <>
          <p className="mb-3 text-sm">
            The customer received this order. Approve <strong>{wouldEarn} points</strong> for their account? They also
            get a one-use reward coupon.
          </p>
          {canEdit && wouldEarn > 0 ? (
            <button type="button" disabled={pending} onClick={approve} className={buttonClass}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
              Approve {wouldEarn} points
            </button>
          ) : (
            <p className="text-sm text-muted">Nothing to approve.</p>
          )}
        </>
      )}

      {(approvedPoints > 0 || result) && (
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-cedar">
          <Check className="size-4" aria-hidden /> {result?.points ?? approvedPoints} points approved
          {result && <span className="font-normal text-muted">· balance {result.balance}</span>}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Coupon <span className="font-mono font-semibold text-foreground">{result.couponCode}</span> (
            {result.couponPercent}% off, one use) ends{" "}
            {new Date(result.couponEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.
          </p>
          <div className="flex gap-1.5">
            {(["ar", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={language === l}
                onClick={() => {
                  setLanguage(l);
                  write(result, l);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs ${language === l ? "border-ink bg-ink text-white" : "border-line"}`}
              >
                {l === "ar" ? "Arabic" : "English"}
              </button>
            ))}
            <button type="button" disabled={pending} onClick={() => write(result, language)} className={`${secondaryButtonClass} ms-auto`}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
              Write again
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            dir="auto"
            aria-label="Message to the customer"
            className={inputClass}
          />
          <p className="text-xs text-muted">{ai ? "Written by AI. Read it before sending." : "Standard wording (AI is off)."}</p>
          <a
            href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass}
          >
            <MessageCircle className="size-4" aria-hidden /> Send on WhatsApp
          </a>
        </div>
      )}

      {approvedPoints > 0 && !result && (
        <p className="text-xs text-muted">
          The message and coupon were shown when the points were approved (in another browser or device).
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}
