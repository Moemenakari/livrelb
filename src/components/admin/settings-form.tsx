"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { saveSettings, type SettingsInput } from "@/lib/admin/settings-actions";
import { FormError, useSave } from "./promo-forms";
import { Card, Field, buttonClass, inputClass, smallButtonClass } from "./ui";

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

export function SettingsForm({ initial }: { initial: SettingsInput }) {
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
          <Field label="Points for each step" hint="Each full step paid (the amount below) gives this many points." htmlFor="st-ppd">
            <input id="st-ppd" type="number" min="0" value={s.pointsPerStep} onChange={(e) => set("pointsPerStep", e.target.value)} className={inputClass} />
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
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Field label="Points count per full ($)" hint="Every full step of this amount earns points." htmlFor="st-step">
            <input id="st-step" type="number" min="1" step="1" value={s.pointsStepDollars} onChange={(e) => set("pointsStepDollars", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Reward coupon (%)" htmlFor="st-rcp">
            <input id="st-rcp" type="number" min="1" max="100" value={s.rewardPercent} onChange={(e) => set("rewardPercent", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Coupon lasts (days)" htmlFor="st-rcd">
            <input id="st-rcd" type="number" min="1" max="365" value={s.rewardDays} onChange={(e) => set("rewardDays", e.target.value)} className={inputClass} />
          </Field>
        </div>
        <p className="mt-2 text-xs text-muted">
          Example: every ${s.pointsStepDollars} paid gives {Number(s.pointsPerStep)} points = $
          {(Number(s.pointsPerStep) * pointValue).toFixed(2)} off next time. The points are added automatically when the order is
          marked Delivered, together with a {s.rewardPercent}% thank-you coupon for {s.rewardDays} days. Cancelling or deleting an order
          takes its points back.
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
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Checkout">
        <Toggle
          label="Checkout needs an account"
          hint="Before she orders (or adds a piece to the bag) she signs in with Google or her email. Every order is sent to your WhatsApp number (Contacts above), or to the employee's own when she came by that employee's link."
          checked={s.requireLogin}
          onChange={(v) => set("requireLogin", v)}
        />
      </Card>

      <Card title="Ad tracking" actions={<span className="text-xs text-muted">Meta Pixel and Google Analytics. Leave empty if you don&apos;t run ads: nothing is loaded.</span>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Meta Pixel ID" hint="Digits only. Loads only after the visitor accepts cookies." htmlFor="st-pixel">
            <input id="st-pixel" inputMode="numeric" value={s.metaPixelId} onChange={(e) => set("metaPixelId", e.target.value)} className={inputClass} dir="ltr" />
          </Field>
          <Field label="Google Analytics 4 ID" hint="Looks like G-XXXXXXXXXX." htmlFor="st-ga">
            <input id="st-ga" value={s.ga4Id} onChange={(e) => set("ga4Id", e.target.value)} className={inputClass} dir="ltr" />
          </Field>
        </div>
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
