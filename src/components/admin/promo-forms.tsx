"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { saveCoupon, savePromotion, type CouponInput, type PromotionInput } from "@/lib/admin/promo-actions";
import { Badge, Field, buttonClass, inputClass, smallButtonClass } from "./ui";

export function useSave() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const save = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
      else done?.();
    });
  return { pending, error, save };
}

export function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
      {error}
    </p>
  );
}

/** A row that opens its edit form in place. */
export function EditableRow({ summary, children, open, onToggle }: { summary: ReactNode; children: ReactNode; open: boolean; onToggle: () => void }) {
  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm">{summary}</div>
        <button type="button" onClick={onToggle} className={smallButtonClass}>
          <Pencil className="size-3.5" aria-hidden />
          {open ? "Close" : "Edit"}
        </button>
      </div>
      {open && <div className="mt-3 rounded-lg bg-surface p-3">{children}</div>}
    </li>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--cedar)]" />
      {label}
    </label>
  );
}

export function CouponForm({ initial, staff, onDone }: { initial: CouponInput; staff: { id: string; name: string }[]; onDone: () => void }) {
  const [c, setC] = useState(initial);
  const { pending, error, save } = useSave();
  const set = <K extends keyof CouponInput>(k: K, v: CouponInput[K]) => setC((p) => ({ ...p, [k]: v }));
  const idp = initial.id ?? "new";
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save(() => saveCoupon(c), onDone);
      }}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Code" htmlFor={`c-code-${idp}`}>
          <input id={`c-code-${idp}`} required value={c.code} maxLength={30} onChange={(e) => set("code", e.target.value.toUpperCase())} className={`${inputClass} uppercase`} />
        </Field>
        <Field label="Type" htmlFor={`c-type-${idp}`}>
          <select id={`c-type-${idp}`} value={c.type} onChange={(e) => set("type", e.target.value as CouponInput["type"])} className={inputClass}>
            <option value="percent">% off</option>
            <option value="fixed">$ off</option>
            <option value="free_delivery">Free delivery</option>
          </select>
        </Field>
        {c.type !== "free_delivery" && (
          <Field label={c.type === "percent" ? "Percent" : "Amount ($)"} htmlFor={`c-val-${idp}`}>
            <input id={`c-val-${idp}`} type="number" step="0.01" min="0" value={c.value} onChange={(e) => set("value", e.target.value)} className={inputClass} />
          </Field>
        )}
        <Field label="Min. order ($)" htmlFor={`c-min-${idp}`}>
          <input id={`c-min-${idp}`} type="number" step="0.01" min="0" value={c.minOrder} onChange={(e) => set("minOrder", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Starts" htmlFor={`c-st-${idp}`}>
          <input id={`c-st-${idp}`} type="datetime-local" value={c.starts} onChange={(e) => set("starts", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Ends" htmlFor={`c-en-${idp}`}>
          <input id={`c-en-${idp}`} type="datetime-local" value={c.ends} onChange={(e) => set("ends", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Max uses" hint="Empty = no limit" htmlFor={`c-max-${idp}`}>
          <input id={`c-max-${idp}`} type="number" min="1" value={c.maxUses} onChange={(e) => set("maxUses", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Employee's code" hint="Orders with it count for her" htmlFor={`c-staff-${idp}`}>
          <select id={`c-staff-${idp}`} value={c.staffId} onChange={(e) => set("staffId", e.target.value)} className={inputClass}>
            <option value="">— Shop code —</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-4">
        <Toggle label="Active" checked={c.isActive} onChange={(v) => set("isActive", v)} />
        {!c.staffId && <Toggle label="Show on product pages (deals row)" checked={c.isPublic} onChange={(v) => set("isPublic", v)} />}
      </div>
      <FormError error={error} />
      <button disabled={pending} className={`${buttonClass} self-start`}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Save coupon
      </button>
    </form>
  );
}

export function PromotionForm({ initial, onDone }: { initial: PromotionInput; onDone: () => void }) {
  const [p, setP] = useState(initial);
  const { pending, error, save } = useSave();
  const set = <K extends keyof PromotionInput>(k: K, v: PromotionInput[K]) => setP((prev) => ({ ...prev, [k]: v }));
  const idp = initial.id ?? `new-${initial.placement}`;
  const hero = p.placement === "hero";
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save(() => savePromotion(p), onDone);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={hero ? "Headline (English)" : "Bar text (English)"} hint={hero ? `Empty = "${p.percent || 25}% OFF your first order"` : 'Empty = "Your Story, Your Jewelry ✨"'} htmlFor={`p-en-${idp}`}>
          <input id={`p-en-${idp}`} value={p.headlineEn} maxLength={160} onChange={(e) => set("headlineEn", e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Percent" htmlFor={`p-pc-${idp}`}>
          <input id={`p-pc-${idp}`} type="number" min={1} max={100} required value={p.percent} onChange={(e) => set("percent", e.target.value)} className={inputClass} />
        </Field>
        <Field label={hero ? "Code (optional)" : "Code"} htmlFor={`p-code-${idp}`}>
          <input id={`p-code-${idp}`} value={p.code} maxLength={30} onChange={(e) => set("code", e.target.value.toUpperCase())} className={`${inputClass} uppercase`} />
        </Field>
        <Field label="Starts" htmlFor={`p-st-${idp}`}>
          <input id={`p-st-${idp}`} type="datetime-local" value={p.starts} onChange={(e) => set("starts", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Ends (countdown)" htmlFor={`p-en2-${idp}`}>
          <input id={`p-en2-${idp}`} type="datetime-local" value={p.ends} onChange={(e) => set("ends", e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Toggle label="Active" checked={p.isActive} onChange={(v) => set("isActive", v)} />
      <FormError error={error} />
      <button disabled={pending} className={`${buttonClass} self-start`}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Save
      </button>
    </form>
  );
}

type CouponRow = CouponInput & { uses: number; staffName: string | null };
type PromoRow = PromotionInput & { live: boolean };

export function PromotionsManager({
  coupons,
  promotions,
  staff,
}: {
  coupons: CouponRow[];
  promotions: PromoRow[];
  staff: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));
  const emptyCoupon: CouponInput = { id: null, code: "", type: "percent", value: "10", minOrder: "0", starts: "", ends: "", maxUses: "", staffId: "", isPublic: false, isActive: true };
  const emptyPromo = (placement: PromotionInput["placement"]): PromotionInput => ({
    id: null,
    placement,
    headlineEn: "",
    headlineAr: "",
    code: "",
    percent: placement === "hero" ? "25" : "15",
    starts: "",
    ends: "",
    isActive: true,
  });

  const promoSection = (placement: PromotionInput["placement"], title: string, help: string) => {
    const rows = promotions.filter((p) => p.placement === placement);
    return (
      <section className="rounded-xl border border-line bg-background p-4 sm:p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="font-sans text-base font-semibold">{title}</h2>
          <button type="button" onClick={() => toggle(`new-${placement}`)} className={smallButtonClass}>
            <Plus className="size-3.5" aria-hidden /> New
          </button>
        </div>
        <p className="text-xs text-muted">{help}</p>
        {open === `new-${placement}` && (
          <div className="mt-3 rounded-lg bg-surface p-3">
            <PromotionForm initial={emptyPromo(placement)} onDone={() => setOpen(null)} />
          </div>
        )}
        <ul className="divide-y divide-line">
          {rows.map((p) => (
            <EditableRow
              key={p.id}
              open={open === p.id}
              onToggle={() => toggle(p.id!)}
              summary={
                <>
                  <span className="font-medium">{p.headlineEn || (placement === "hero" ? `${p.percent}% OFF your first order` : `${p.percent}% OFF · ${p.code}`)}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {p.live ? <Badge tone="green">Live now</Badge> : p.isActive ? <Badge tone="gold">Scheduled / ended</Badge> : <Badge>Off</Badge>}
                    {p.ends && <Badge>Ends {p.ends.replace("T", " ")}</Badge>}
                  </span>
                </>
              }
            >
              <PromotionForm initial={p} onDone={() => setOpen(null)} />
            </EditableRow>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {promoSection("hero", "Homepage headline & countdown", "The big offer at the top of the homepage. The countdown runs to the end time (Beirut time).")}
      {promoSection("promo_bar", "Promo bar", "The green bar under the menu with a code customers can copy.")}

      <section className="rounded-xl border border-line bg-background p-4 sm:p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="font-sans text-base font-semibold">Coupons & staff codes</h2>
          <button type="button" onClick={() => toggle("new-coupon")} className={smallButtonClass}>
            <Plus className="size-3.5" aria-hidden /> New
          </button>
        </div>
        <p className="text-xs text-muted">Shop codes (STORY15) and each employee&apos;s personal code (AMAL10).</p>
        {open === "new-coupon" && (
          <div className="mt-3 rounded-lg bg-surface p-3">
            <CouponForm initial={emptyCoupon} staff={staff} onDone={() => setOpen(null)} />
          </div>
        )}
        <ul className="divide-y divide-line">
          {coupons.map((c) => (
            <EditableRow
              key={c.id}
              open={open === c.id}
              onToggle={() => toggle(c.id!)}
              summary={
                <>
                  <span className="font-semibold tracking-wider">{c.code}</span>{" "}
                  <span className="text-muted">
                    · {c.type === "percent" ? `${c.value}% off` : c.type === "fixed" ? `$${c.value} off` : "Free delivery"}
                    {Number(c.minOrder) > 0 && ` over $${c.minOrder}`}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone={c.isActive ? "green" : "neutral"}>{c.isActive ? "Active" : "Off"}</Badge>
                    {c.staffName && <Badge tone="violet">{c.staffName}</Badge>}
                    {c.isPublic && <Badge tone="blue">On product pages</Badge>}
                    <Badge>
                      Used {c.uses}
                      {c.maxUses ? `/${c.maxUses}` : ""}
                    </Badge>
                  </span>
                </>
              }
            >
              <CouponForm initial={c} staff={staff} onDone={() => setOpen(null)} />
            </EditableRow>
          ))}
        </ul>
        {coupons.length === 0 && <p className="mt-3 text-sm text-muted">No coupons yet.</p>}
      </section>
    </div>
  );
}
