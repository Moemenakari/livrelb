"use client";

import { Check, ExternalLink, Loader2 } from "lucide-react";
import { confirmPayment } from "@/lib/admin/order-actions";
import { FormError, useSave } from "./promo-forms";
import { Badge, Card, buttonClass } from "./ui";

type Props = {
  orderId: string;
  /** Cash-on-delivery order with a deposit, or all of it by transfer. */
  method: "cod" | "whish" | "card";
  due: string;
  rest: string;
  reportedAt: string | null;
  proofUrl: string | null;
  confirmedAt: string | null;
  canEdit: boolean;
  cancelled: boolean;
};

// The transfer or deposit of an order: what she owes now, whether she says she
// sent it (with her receipt), and the button that confirms it (the order then
// becomes "Confirmed" and the team starts making the piece).
export function PaymentCard({ orderId, method, due, rest, reportedAt, proofUrl, confirmedAt, canEdit, cancelled }: Props) {
  const { pending, error, save } = useSave();
  return (
    <Card title={method === "whish" ? "Payment: transfer" : "Payment: deposit"}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted">To receive now</dt>
        <dd className="font-medium">{due}</dd>
        {method === "cod" && (
          <>
            <dt className="text-muted">Rest on delivery</dt>
            <dd>{rest}</dd>
          </>
        )}
        <dt className="text-muted">Status</dt>
        <dd>
          {confirmedAt ? (
            <Badge tone="green">Payment confirmed</Badge>
          ) : reportedAt ? (
            <Badge tone="gold">Customer says she sent it: check it</Badge>
          ) : (
            <Badge>Waiting for the transfer</Badge>
          )}
        </dd>
        {proofUrl && (
          <>
            <dt className="text-muted">Receipt</dt>
            <dd>
              <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline underline-offset-4">
                Open the picture
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </dd>
          </>
        )}
      </dl>
      {!confirmedAt && canEdit && !cancelled && (
        <div className="mt-4 flex flex-col gap-2">
          <FormError error={error} />
          <button type="button" disabled={pending} onClick={() => save(() => confirmPayment(orderId))} className={buttonClass}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
            Confirm the payment
          </button>
          <p className="text-xs text-muted">Only after you see the money in Whish, OMT or Suyool. The order becomes “Confirmed”.</p>
        </div>
      )}
    </Card>
  );
}
