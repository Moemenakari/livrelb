"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { saveSettings, type SettingsInput } from "@/lib/admin/settings-actions";
import { FormError, useSave } from "./promo-forms";
import { Card, Field, buttonClass, inputClass, smallButtonClass, textareaClass } from "./ui";

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-sm">
      <span>
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--cedar)]" />
    </label>
  );
}

export function SettingsForm({ initial, whishReady }: { initial: SettingsInput; whishReady: boolean }) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(false);
  const { pending, error, save } = useSave();
  const set = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) => {
    setSaved(false);
    setS((p) => ({ ...p, [k]: v }));
  };
  const pointValue = Number(s.redeemDollars) / Math.max(1, Number(s.redeemPoints));

  return (
    <form
      className="flex flex-col gap-4 pb-20"
      onSubmit={(e) => {
        e.preventDefault();
        save(() => saveSettings(s), () => setSaved(true));
      }}
    >
      <Card title="Delivery">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Delivery fee ($)" htmlFor="st-fee">
            <input id="st-fee" type="number" min="0" step="0.01" value={s.deliveryFee} onChange={(e) => set("deliveryFee", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Free delivery over ($)" htmlFor="st-free">
            <input id="st-free" type="number" min="0" step="0.01" value={s.freeShippingOver} onChange={(e) => set("freeShippingOver", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Delivery days from" htmlFor="st-dmin">
            <input id="st-dmin" type="number" min="0" value={s.daysMin} onChange={(e) => set("daysMin", e.target.value)} className={inputClass} />
          </Field>
          <Field label="to" htmlFor="st-dmax">
            <input id="st-dmax" type="number" min="0" value={s.daysMax} onChange={(e) => set("daysMax", e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="mt-3">
          <Toggle label="First order: free delivery" checked={s.firstOrderFree} onChange={(v) => set("firstOrderFree", v)} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Delivery time text (English)" hint={`Empty = "${s.daysMin}–${s.daysMax} days"`} htmlFor="st-dten">
            <input id="st-dten" maxLength={120} value={s.deliveryTimeEn} onChange={(e) => set("deliveryTimeEn", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Delivery time text (Arabic)" htmlFor="st-dtar">
            <input id="st-dtar" dir="rtl" maxLength={120} value={s.deliveryTimeAr} onChange={(e) => set("deliveryTimeAr", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Shipping information (English)" hint="Shown in the product page's Shipping tab." htmlFor="st-shen">
            <textarea id="st-shen" rows={4} maxLength={3000} value={s.shippingInfoEn} onChange={(e) => set("shippingInfoEn", e.target.value)} className={textareaClass} />
          </Field>
          <Field label="Shipping information (Arabic)" htmlFor="st-shar">
            <textarea id="st-shar" rows={4} dir="rtl" maxLength={3000} value={s.shippingInfoAr} onChange={(e) => set("shippingInfoAr", e.target.value)} className={textareaClass} />
          </Field>
        </div>
      </Card>

      <Card title="Contacts">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="WhatsApp number" hint="With the country code, e.g. 96170123456. Empty hides every WhatsApp button." htmlFor="st-wa">
            <input id="st-wa" inputMode="tel" value={s.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className={inputClass} dir="ltr" />
          </Field>
          <Field label="Instagram link" hint="Empty hides the Instagram link." htmlFor="st-ig">
            <input id="st-ig" type="url" placeholder="https://instagram.com/…" value={s.instagram} onChange={(e) => set("instagram", e.target.value)} className={inputClass} dir="ltr" />
          </Field>
        </div>
      </Card>

      <Card title="LIVRE Points">
        <Toggle label="Points are on" checked={s.pointsEnabled} onChange={(v) => set("pointsEnabled", v)} />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Points per $1 paid" htmlFor="st-ppd">
            <input id="st-ppd" type="number" min="0" value={s.pointsPerDollar} onChange={(e) => set("pointsPerDollar", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Points per approved review" htmlFor="st-ppr">
            <input id="st-ppr" type="number" min="0" value={s.pointsPerReview} onChange={(e) => set("pointsPerReview", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Points to redeem" htmlFor="st-rp">
            <input id="st-rp" type="number" min="1" value={s.redeemPoints} onChange={(e) => set("redeemPoints", e.target.value)} className={inputClass} />
          </Field>
          <Field label="are worth ($)" htmlFor="st-rd">
            <input id="st-rd" type="number" min="0" step="0.01" value={s.redeemDollars} onChange={(e) => set("redeemDollars", e.target.value)} className={inputClass} />
          </Field>
        </div>
        <p className="mt-2 text-xs text-muted">
          Example: a ${10} order gives {Number(s.pointsPerDollar) * 10} points = ${(Number(s.pointsPerDollar) * 10 * pointValue).toFixed(2)} off next time. Points are given when an order is
          Confirmed and removed if it&apos;s Cancelled.
        </p>
      </Card>

      <Card
        title="Announcement bar"
        actions={
          <button type="button" className={smallButtonClass} onClick={() => set("announcements", [...s.announcements, { en: "", ar: "" }])}>
            <Plus className="size-3.5" aria-hidden /> Add
          </button>
        }
      >
        <ul className="flex flex-col gap-2">
          {s.announcements.map((a, i) => (
            <li key={i} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input aria-label="English" placeholder="English" value={a.en} maxLength={160} onChange={(e) => set("announcements", s.announcements.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)))} className={inputClass} />
              <button type="button" onClick={() => set("announcements", s.announcements.filter((_, j) => j !== i))} className="row-span-2 self-center rounded p-2 text-muted hover:text-red-700 sm:order-last sm:row-span-1" aria-label="Remove">
                <X className="size-4" />
              </button>
              <input aria-label="Arabic" placeholder="العربية" dir="rtl" value={a.ar} maxLength={160} onChange={(e) => set("announcements", s.announcements.map((x, j) => (j === i ? { ...x, ar: e.target.value } : x)))} className={inputClass} />
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Online payment (Whish with OTP)">
        <Toggle
          label="Let customers pay online with Whish"
          hint={whishReady ? "The Whish merchant keys are set." : "Hidden until the Whish merchant account and API keys are added. Whish stays manual meanwhile."}
          checked={s.whishOnline}
          onChange={(v) => set("whishOnline", v)}
        />
      </Card>

      <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-background/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:start-60">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3">
          {saved && <p className="me-auto text-sm text-emerald-700">Saved. The shop shows it right away.</p>}
          <FormError error={error} />
          <button disabled={pending} className={buttonClass}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Save settings
          </button>
        </div>
      </div>
    </form>
  );
}
