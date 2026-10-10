"use client";

import { useState } from "react";
import { Check, MessageCircle, Pencil, Trash2, X } from "lucide-react";
import { whatsappUrl } from "@/config/site";
import { addTrackingNote, deleteTrackingNote, saveShipping, updateTrackingNote } from "@/lib/admin/order-actions";
import { Card, Field, inputClass, secondaryButtonClass, smallButtonClass } from "./ui";

export type TrackingEvent = {
  id: string;
  /** Set for the lines the system writes (order placed, confirmed...): they can't be changed. */
  status: string | null;
  title: string;
  at: string;
};

type Props = {
  orderId: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  carrier: string | null;
  trackingNumber: string | null;
  events: TrackingEvent[];
};

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

// Tracking for the customer. Every change shows at once and is saved in the
// background; if the save fails the change is undone and the error is shown.
export function TrackingCard({ orderId, orderNumber, customerName, customerPhone, carrier: carrierNow, trackingNumber: numberNow, events: initial }: Props) {
  const [events, setEvents] = useState(initial);
  const [carrier, setCarrier] = useState(carrierNow ?? "");
  const [trackingNumber, setTrackingNumber] = useState(numberNow ?? "");
  const [savedShipping, setSavedShipping] = useState({ carrier: carrierNow ?? "", number: numberNow ?? "" });
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** What the customer could be told on WhatsApp after the last change. */
  const [tell, setTell] = useState<string | null>(null);

  const first = customerName.split(/\s+/)[0];
  const hello = `Hi ${first}, an update on your LIVRE order #${orderNumber}:`;
  const dirty = carrier.trim() !== savedShipping.carrier || trackingNumber.trim() !== savedShipping.number;

  const fail = (message: string) => setError(message);

  const saveCourier = (nextCarrier: string, nextNumber: string) => {
    const c = nextCarrier.trim();
    const n = nextNumber.trim();
    const before = savedShipping;
    setError(null);
    setSavedShipping({ carrier: c, number: n });
    setCarrier(c);
    setTrackingNumber(n);
    setTell(c || n ? `${hello} your order is with ${c || "the courier"}${n ? `, tracking number ${n}` : ""}.` : null);
    void saveShipping(orderId, c, n).then((r) => {
      if (!r.ok) {
        setSavedShipping(before);
        setCarrier(before.carrier);
        setTrackingNumber(before.number);
        setTell(null);
        fail(r.error);
      }
    });
  };

  const add = () => {
    const title = text.trim();
    if (!title) return;
    const temp = `temp-${Date.now()}`;
    setError(null);
    setEvents((list) => [...list, { id: temp, status: null, title, at: new Date().toISOString() }]);
    setText("");
    setTell(`${hello} ${title}`);
    void addTrackingNote(orderId, title).then((r) => {
      if (r.ok && r.data) setEvents((list) => list.map((e) => (e.id === temp ? { ...e, id: r.data!.id, at: r.data!.createdAt } : e)));
      else {
        setEvents((list) => list.filter((e) => e.id !== temp));
        setTell(null);
        fail(r.ok ? "Something went wrong." : r.error);
      }
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    const title = editing.text.trim();
    const target = events.find((e) => e.id === editing.id);
    setEditing(null);
    if (!title || !target || title === target.title) return;
    setError(null);
    setEvents((list) => list.map((e) => (e.id === target.id ? { ...e, title } : e)));
    setTell(`${hello} ${title}`);
    void updateTrackingNote(target.id, title).then((r) => {
      if (!r.ok) {
        setEvents((list) => list.map((e) => (e.id === target.id ? target : e)));
        setTell(null);
        fail(r.error);
      }
    });
  };

  const remove = (event: TrackingEvent) => {
    if (!confirm("Remove this update? The customer will no longer see it.")) return;
    setError(null);
    setEvents((list) => list.filter((e) => e.id !== event.id));
    void deleteTrackingNote(event.id).then((r) => {
      if (!r.ok) {
        setEvents((list) => [...list, event].sort((a, b) => a.at.localeCompare(b.at)));
        fail(r.error);
      }
    });
  };

  return (
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
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!dirty} onClick={() => saveCourier(carrier, trackingNumber)} className={secondaryButtonClass}>
            {dirty ? "Save courier" : "Saved"}
          </button>
          {(savedShipping.carrier || savedShipping.number) && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Remove the courier and the tracking number?")) saveCourier("", "");
              }}
              className={secondaryButtonClass}
            >
              <Trash2 className="size-4" aria-hidden /> Remove
            </button>
          )}
        </div>

        <ol className="flex flex-col gap-2 border-t border-line pt-3 text-sm">
          {events.length === 0 && <li className="text-muted">No updates yet.</li>}
          {events.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-2">
              {editing?.id === e.id ? (
                <span className="flex min-w-0 flex-1 gap-1.5">
                  <input
                    autoFocus
                    aria-label="Update text"
                    value={editing.text}
                    maxLength={140}
                    onChange={(ev) => setEditing({ id: e.id, text: ev.target.value })}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") saveEdit();
                      if (ev.key === "Escape") setEditing(null);
                    }}
                    className={`${inputClass} h-9`}
                  />
                  <button type="button" onClick={saveEdit} aria-label="Save" className={smallButtonClass}>
                    <Check className="size-3.5" aria-hidden />
                  </button>
                  <button type="button" onClick={() => setEditing(null)} aria-label="Cancel" className={smallButtonClass}>
                    <X className="size-3.5" aria-hidden />
                  </button>
                </span>
              ) : (
                <>
                  <span className="min-w-0">
                    <span className={e.status ? "text-muted" : "font-medium"}>{e.title}</span>
                    <span className="block text-xs text-muted">{when(e.at)}</span>
                  </span>
                  {!e.status && !e.id.startsWith("temp-") && (
                    <span className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => setEditing({ id: e.id, text: e.title })} aria-label="Edit update" className={smallButtonClass}>
                        <Pencil className="size-3.5" aria-hidden />
                      </button>
                      <button type="button" onClick={() => remove(e)} aria-label="Remove update" className={smallButtonClass}>
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input
            aria-label="New update for the customer"
            placeholder="New update, e.g. Driver is on the way"
            value={text}
            maxLength={140}
            onChange={(e) => setText(e.target.value)}
            className={inputClass}
          />
          <button type="submit" disabled={!text.trim()} className={secondaryButtonClass}>
            Add
          </button>
        </form>

        {tell && (
          <a href={whatsappUrl(customerPhone, tell)} target="_blank" rel="noopener noreferrer" className={secondaryButtonClass}>
            <MessageCircle className="size-4" aria-hidden /> Tell {first} on WhatsApp
          </a>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}
