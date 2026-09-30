"use client";

import { useState, useTransition } from "react";
import { Loader2, MessageCircle, Printer } from "lucide-react";
import { whatsappUrl } from "@/config/site";
import { addAdjustment, addTrackingNote, reassignOrder, saveShipping, setOrderStatus, type AdjustmentType } from "@/lib/admin/order-actions";
import { orderStatuses, statusLabels, type AdminOrderStatus } from "@/lib/admin/format";
import { buttonClass, Card, Field, inputClass, secondaryButtonClass } from "./ui";

type Props = {
  orderId: string;
  status: AdminOrderStatus;
  canEdit: boolean;
  canCancel: boolean;
  isOwner: boolean;
  staffId: string | null;
  staffOptions: { id: string; name: string }[];
  /** null until the shop's WhatsApp number is set in Settings. */
  whatsapp: { phone: string; text: string } | null;
  carrier: string | null;
  trackingNumber: string | null;
};

const flow: AdminOrderStatus[] = ["pending", "confirmed", "in_production", "shipped", "delivered"];

const adjustments: { type: AdjustmentType; label: string; value?: string; hint?: string }[] = [
  { type: "gift", label: "Gift", value: "Price to take off ($, 0 = free extra)" },
  { type: "discount_percent", label: "% discount", value: "Percent" },
  { type: "free_delivery", label: "Free delivery" },
  { type: "extra_delivery", label: "Extra delivery fee", value: "Amount ($)" },
  { type: "other", label: "Note / other", value: "Amount ($, − to take off)", hint: "Leave 0 for a note only." },
];

// Status buttons, adjustments, reassignment and print / WhatsApp for one order.
export function OrderControls({ orderId, status, canEdit, canCancel, isOwner, staffId, staffOptions, whatsapp, carrier: carrierNow, trackingNumber: numberNow }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adjType, setAdjType] = useState<AdjustmentType>("gift");
  const [adjValue, setAdjValue] = useState("0");
  const [adjNote, setAdjNote] = useState("");
  const current = adjustments.find((a) => a.type === adjType)!;
  const [carrier, setCarrier] = useState(carrierNow ?? "");
  const [trackingNumber, setTrackingNumber] = useState(numberNow ?? "");
  const [noteEn, setNoteEn] = useState("");
  const [noteAr, setNoteAr] = useState("");

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      else after?.();
    });

  const next = flow[flow.indexOf(status) + 1];

  return (
    <>
      <Card title="Status" className="print:hidden">
        <ol className="mb-4 flex flex-wrap gap-1.5 text-xs">
          {flow.map((s, i) => {
            const done = status !== "cancelled" && flow.indexOf(status) >= i;
            return (
              <li key={s} className={`rounded-full px-2.5 py-1 ${done ? "bg-cedar text-white" : "bg-surface text-muted"}`}>
                {statusLabels[s]}
              </li>
            );
          })}
        </ol>
        {canEdit && status !== "cancelled" && (
          <div className="flex flex-col gap-2">
            {next && (
              <button type="button" disabled={pending} onClick={() => act(() => setOrderStatus(orderId, next))} className={buttonClass}>
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Mark as {statusLabels[next]}
              </button>
            )}
            <select
              aria-label="Set status"
              value={status}
              disabled={pending}
              onChange={(e) => {
                const value = e.target.value as AdminOrderStatus;
                if (value === "cancelled" && !confirm("Cancel this order? Approved LIVRE Points will be removed.")) return;
                act(() => setOrderStatus(orderId, value));
              }}
              className={inputClass}
            >
              {orderStatuses
                .filter((s) => s !== "cancelled" || canCancel)
                .map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
            </select>
          </div>
        )}
        {status === "cancelled" && canEdit && canCancel && (
          <button type="button" disabled={pending} onClick={() => act(() => setOrderStatus(orderId, "pending"))} className={secondaryButtonClass}>
            Reopen as New
          </button>
        )}
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
      </Card>

      {canEdit && status !== "cancelled" && (
        <Card title="Add an adjustment" className="print:hidden">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              act(
                () => addAdjustment(orderId, { type: adjType, value: Number(adjValue) || 0, note: adjNote }),
                () => {
                  setAdjValue("0");
                  setAdjNote("");
                },
              );
            }}
          >
            <div className="flex flex-wrap gap-1.5">
              {adjustments.map((a) => (
                <button
                  key={a.type}
                  type="button"
                  onClick={() => setAdjType(a.type)}
                  aria-pressed={adjType === a.type}
                  className={`rounded-full border px-3 py-1.5 text-xs ${adjType === a.type ? "border-ink bg-ink text-white" : "border-line"}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            {current.value && (
              <Field label={current.value} hint={current.hint} htmlFor="adj-value">
                <input id="adj-value" type="number" step="0.01" inputMode="decimal" value={adjValue} onChange={(e) => setAdjValue(e.target.value)} className={inputClass} />
              </Field>
            )}
            <Field label="Note (optional)" htmlFor="adj-note">
              <input id="adj-note" value={adjNote} maxLength={500} onChange={(e) => setAdjNote(e.target.value)} className={inputClass} />
            </Field>
            <button type="submit" disabled={pending} className={secondaryButtonClass}>
              Add
            </button>
          </form>
        </Card>
      )}

      {canEdit && status !== "cancelled" && (
        <Card title="Tracking for the customer" className="print:hidden">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Courier" htmlFor="ship-carrier">
                <input id="ship-carrier" value={carrier} maxLength={60} onChange={(e) => setCarrier(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Tracking number" htmlFor="ship-number">
                <input id="ship-number" value={trackingNumber} maxLength={60} dir="ltr" onChange={(e) => setTrackingNumber(e.target.value)} className={inputClass} />
              </Field>
            </div>
            <button type="button" disabled={pending} onClick={() => act(() => saveShipping(orderId, carrier, trackingNumber))} className={secondaryButtonClass}>
              Save courier
            </button>
            <form
              className="flex flex-col gap-2 border-t border-line pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                act(() => addTrackingNote(orderId, noteEn, noteAr), () => {
                  setNoteEn("");
                  setNoteAr("");
                });
              }}
            >
              <Field label="New update (English)" hint="Shown on the customer's tracking page, e.g. Driver is on the way." htmlFor="note-en">
                <input id="note-en" value={noteEn} maxLength={140} onChange={(e) => setNoteEn(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Same update (Arabic)" hint="Empty = the English text is shown." htmlFor="note-ar">
                <input id="note-ar" dir="rtl" value={noteAr} maxLength={140} onChange={(e) => setNoteAr(e.target.value)} className={inputClass} />
              </Field>
              <button type="submit" disabled={pending || !noteEn.trim()} className={secondaryButtonClass}>
                Add update
              </button>
            </form>
          </div>
        </Card>
      )}

      {isOwner && (
        <Card title="Employee (owner only)" className="print:hidden">
          <select
            aria-label="Credit this order to"
            defaultValue={staffId ?? ""}
            disabled={pending}
            onChange={(e) => {
              if (!confirm("Credit this order to another employee? This is logged.")) {
                e.target.value = staffId ?? "";
                return;
              }
              act(() => reassignOrder(orderId, e.target.value || null));
            }}
            className={inputClass}
          >
            <option value="">No employee</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Card>
      )}

      {whatsapp && (
        <div className="grid grid-cols-2 gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className={secondaryButtonClass}>
            <Printer className="size-4" aria-hidden />
            Print
          </button>
          <a href={whatsappUrl(whatsapp.phone, whatsapp.text)} target="_blank" rel="noopener noreferrer" className={secondaryButtonClass}>
            <MessageCircle className="size-4" aria-hidden />
            WhatsApp
          </a>
        </div>
      )}
    </>
  );
}
