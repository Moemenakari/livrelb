"use client";

import { useState, useTransition } from "react";
import { Loader2, MessageCircle, Printer, Trash2, Undo2 } from "lucide-react";
import { whatsappUrl } from "@/config/site";
import { addOrderNote, deleteOrder, reassignOrder, restoreOrder, setOrderStatus, type DeleteReason } from "@/lib/admin/order-actions";
import { orderStatuses, statusLabels, type AdminOrderStatus } from "@/lib/admin/format";
import { buttonClass, Card, dangerButtonClass, Field, inputClass, secondaryButtonClass } from "./ui";

type Props = {
  orderId: string;
  status: AdminOrderStatus;
  /** A deleted order can only be restored. */
  deleted: boolean;
  canEdit: boolean;
  canCancel: boolean;
  isOwner: boolean;
  staffId: string | null;
  staffOptions: { id: string; name: string }[];
  /** The order summary for the customer's WhatsApp chat. */
  whatsapp: { phone: string; text: string } | null;
};

const flow: AdminOrderStatus[] = ["pending", "confirmed", "in_production", "shipped", "delivered"];

const reasons: { value: DeleteReason; label: string }[] = [
  { value: "test", label: "Test order" },
  { value: "error", label: "Error / by mistake" },
  { value: "other", label: "Other (write why)" },
];

// Status, internal note, reassignment, delete / restore and print / WhatsApp for one order.
// Gifts, discounts and free delivery are decided by the system, not typed here.
export function OrderControls({ orderId, status, deleted, canEdit, canCancel, isOwner, staffId, staffOptions, whatsapp }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState<DeleteReason>("test");
  const [reasonNote, setReasonNote] = useState("");

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      else after?.();
    });

  const next = flow[flow.indexOf(status) + 1];
  const live = !deleted && status !== "cancelled";

  return (
    <>
      {!deleted && (
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
                  if (value === "cancelled" && !confirm("Cancel this order? Its LIVRE Points will be removed.")) return;
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
        </Card>
      )}

      {canEdit && live && (
        <Card title="Internal note" className="print:hidden">
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => addOrderNote(orderId, note), () => setNote(""));
            }}
          >
            <Field label="Only the team sees it" htmlFor="order-note">
              <input id="order-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className={inputClass} />
            </Field>
            <button type="submit" disabled={pending || !note.trim()} className={secondaryButtonClass}>
              Add note
            </button>
          </form>
        </Card>
      )}

      {isOwner && !deleted && (
        <Card title="Employee (admin only)" className="print:hidden">
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

      {canCancel && (
        <Card title={deleted ? "Deleted order" : "Delete this order"} className="print:hidden">
          {deleted ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => restoreOrder(orderId))}
              className={secondaryButtonClass}
            >
              <Undo2 className="size-4" aria-hidden /> Restore the order
            </button>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!confirm("Delete this order? It stays in the Orders list as a red line and stops counting in sales and points.")) return;
                act(() => deleteOrder(orderId, reason, reasonNote));
              }}
            >
              <p className="text-xs text-muted">It is not erased: it stays in the Orders list as a red line with the reason.</p>
              <Field label="Why?" htmlFor="del-reason">
                <select id="del-reason" value={reason} onChange={(e) => setReason(e.target.value as DeleteReason)} className={inputClass}>
                  {reasons.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
              {reason === "other" && (
                <input aria-label="Reason" placeholder="Write why" maxLength={500} value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} className={inputClass} />
              )}
              <button type="submit" disabled={pending} className={dangerButtonClass}>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
                Delete order
              </button>
            </form>
          )}
        </Card>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 print:hidden" role="alert">
          {error}
        </p>
      )}

      {whatsapp && !deleted && (
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
