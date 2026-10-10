"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus } from "lucide-react";
import { saveDelivery, type AreaInput, type DeliveryInput } from "@/lib/admin/delivery-actions";
import { FormError, useSave } from "./promo-forms";
import { Card, Field, buttonClass, inputClass, smallButtonClass, textareaClass } from "./ui";

const range = (min: number, max: number) => (min === max ? `${min} day${min === 1 ? "" : "s"}` : `${min}–${max} days`);

// Delivery & times (owner): the shop's delivery defaults, how long we take to
// make a piece, and for each area its delivery fee and days. The shop, the order
// page and order tracking all show "made in X days, then delivered in Y days"
// from these numbers.
export function DeliveryForm({ initial }: { initial: DeliveryInput }) {
  const [d, setD] = useState(initial);
  const defaults = { fee: d.fee, daysMin: Number(d.daysMin) || 0, daysMax: Math.max(Number(d.daysMin) || 0, Number(d.daysMax) || 0) };
  const [saved, setSaved] = useState(false);
  const { pending, error, save } = useSave();
  const change = (patch: Partial<DeliveryInput>) => {
    setSaved(false);
    setD((p) => ({ ...p, ...patch }));
  };
  const setArea = (i: number, patch: Partial<AreaInput>) => change({ areas: d.areas.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  const move = (i: number, by: number) => {
    const list = [...d.areas];
    const [a] = list.splice(i, 1);
    list.splice(i + by, 0, a);
    change({ areas: list });
  };

  const pMin = Number(d.processingMin) || 0;
  const pMax = Math.max(pMin, Number(d.processingMax) || 0);

  return (
    <form
      className="flex flex-col gap-4 pb-20"
      onSubmit={(e) => {
        e.preventDefault();
        save(() => saveDelivery(d), () => setSaved(true));
      }}
    >
      <Card title="Delivery defaults" actions={<span className="text-xs text-muted">Used by every area below that leaves its own fee or days empty.</span>}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Delivery fee ($)" htmlFor="dl-fee">
            <input id="dl-fee" type="number" min="0" step="0.01" required value={d.fee} onChange={(e) => change({ fee: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Free delivery over ($)" htmlFor="dl-free">
            <input id="dl-free" type="number" min="0" step="0.01" required value={d.freeOver} onChange={(e) => change({ freeOver: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Delivery days from" htmlFor="dl-dmin">
            <input id="dl-dmin" type="number" min="0" max="60" required value={d.daysMin} onChange={(e) => change({ daysMin: e.target.value })} className={inputClass} />
          </Field>
          <Field label="to" htmlFor="dl-dmax">
            <input id="dl-dmax" type="number" min="0" max="90" required value={d.daysMax} onChange={(e) => change({ daysMax: e.target.value })} className={inputClass} />
          </Field>
        </div>
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-sm">
          First order: free delivery
          <input type="checkbox" role="switch" checked={d.firstOrderFree} onChange={(e) => change({ firstOrderFree: e.target.checked })} className="size-5 shrink-0 accent-[var(--cedar)]" />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Delivery time text" hint={`Empty = "${d.daysMin}–${d.daysMax} days"`} htmlFor="dl-ten">
            <input id="dl-ten" maxLength={120} value={d.timeEn} onChange={(e) => change({ timeEn: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Shipping information" hint="Shown in the product page's Shipping tab." htmlFor="dl-shen">
            <textarea id="dl-shen" rows={4} maxLength={3000} value={d.shippingEn} onChange={(e) => change({ shippingEn: e.target.value })} className={textareaClass} />
          </Field>
        </div>
      </Card>

      <Card title="Making time" actions={<span className="text-xs text-muted">Days to design and handmake a piece, before it ships.</span>}>
        <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
          <Field label="From (days)" htmlFor="dl-pmin">
            <input id="dl-pmin" type="number" min="0" max="60" required value={d.processingMin} onChange={(e) => change({ processingMin: e.target.value })} className={inputClass} />
          </Field>
          <Field label="To (days)" htmlFor="dl-pmax">
            <input id="dl-pmax" type="number" min="0" max="60" required value={d.processingMax} onChange={(e) => change({ processingMax: e.target.value })} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card
        title="Delivery areas"
        actions={
          <span className="text-xs text-muted">
            Empty fee = ${defaults.fee}, empty days = {range(defaults.daysMin, defaults.daysMax)} (the defaults above).
          </span>
        }
      >
        <ul className="flex flex-col gap-2">
          {d.areas.map((a, i) => {
            const days = a.daysMin.trim() ? { min: Number(a.daysMin), max: Number(a.daysMax || a.daysMin) } : { min: defaults.daysMin, max: defaults.daysMax };
            return (
              <li key={a.id ?? `new-${i}`} className={`rounded-lg border p-3 ${a.active ? "border-line" : "border-dashed border-line bg-surface"}`}>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_6rem_5rem_5rem]">
                  <Field label="Name (English)" htmlFor={`dl-en-${i}`}>
                    <input id={`dl-en-${i}`} required maxLength={60} value={a.nameEn} onChange={(e) => setArea(i, { nameEn: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Fee ($)" htmlFor={`dl-fee-${i}`}>
                    <input id={`dl-fee-${i}`} type="number" min="0" step="0.01" placeholder={defaults.fee} value={a.fee} onChange={(e) => setArea(i, { fee: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Days from" htmlFor={`dl-min-${i}`}>
                    <input id={`dl-min-${i}`} type="number" min="0" max="60" placeholder={String(defaults.daysMin)} value={a.daysMin} onChange={(e) => setArea(i, { daysMin: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="to" htmlFor={`dl-max-${i}`}>
                    <input id={`dl-max-${i}`} type="number" min="0" max="90" placeholder={String(defaults.daysMax)} value={a.daysMax} onChange={(e) => setArea(i, { daysMax: e.target.value })} className={inputClass} />
                  </Field>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={a.active} onChange={(e) => setArea(i, { active: e.target.checked })} className="size-4 accent-[var(--cedar)]" />
                    Shown at checkout
                  </label>
                  <span className="text-muted">
                    Customers see: made in {range(pMin, pMax)}, delivered in {range(days.min, Math.max(days.min, days.max))}.
                  </span>
                  <span className="ms-auto flex gap-1">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" className={smallButtonClass}>
                      <ArrowUp className="size-3.5" aria-hidden />
                    </button>
                    <button type="button" disabled={i === d.areas.length - 1} onClick={() => move(i, 1)} aria-label="Move down" className={smallButtonClass}>
                      <ArrowDown className="size-3.5" aria-hidden />
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => change({ areas: [...d.areas, { id: null, nameEn: "", nameAr: "", fee: "", daysMin: "", daysMax: "", active: true }] })}
          className={`${smallButtonClass} mt-3`}
        >
          <Plus className="size-3.5" aria-hidden />
          Add an area
        </button>
      </Card>

      <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-background/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:start-60">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3">
          {saved && <p className="me-auto text-sm text-emerald-700">Saved. The shop shows it right away.</p>}
          <FormError error={error} />
          <button disabled={pending} className={buttonClass}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Save delivery
          </button>
        </div>
      </div>
    </form>
  );
}
