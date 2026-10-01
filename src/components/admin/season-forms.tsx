"use client";

import { siteConfig } from "@/config/site";
import { useState } from "react";
import { ExternalLink, Loader2, Plus } from "lucide-react";
import { saveSeason, type SeasonInput } from "@/lib/admin/promo-actions";
import { EditableRow, FormError, useSave } from "./promo-forms";
import { Badge, Field, buttonClass, inputClass, smallButtonClass, textareaClass } from "./ui";

type Product = { id: string; name: string };

const ideas = [
  { slug: "valentines", en: "Valentine's Day", ar: "عيد الحب" },
  { slug: "mothers-day", en: "Mother's Day", ar: "عيد الأم" },
  { slug: "fathers-day", en: "Father's Day", ar: "عيد الأب" },
  { slug: "ramadan", en: "Ramadan", ar: "رمضان" },
  { slug: "eid", en: "Eid", ar: "العيد" },
  { slug: "christmas", en: "Christmas", ar: "الميلاد" },
  { slug: "halloween", en: "Halloween", ar: "الهالوين" },
  { slug: "eid-al-fitr", en: "Eid al-Fitr", ar: "عيد الفطر" },
  { slug: "eid-al-adha", en: "Eid al-Adha", ar: "عيد الأضحى" },
  { slug: "easter", en: "Easter", ar: "الفصح" },
  { slug: "womens-day", en: "Women's Day", ar: "يوم المرأة" },
  { slug: "graduation", en: "Graduation", ar: "التخرّج" },
  { slug: "back-to-school", en: "Back to school", ar: "العودة إلى المدرسة" },
  { slug: "black-friday", en: "Black Friday", ar: "الجمعة السوداء" },
  { slug: "new-year", en: "New Year", ar: "رأس السنة" },
  { slug: "anniversary", en: "Anniversary", ar: "ذكرى سنوية" },
  { slug: "gifts", en: "Gifts", ar: "هدايا" },
];

function SeasonForm({ initial, products, onDone }: { initial: SeasonInput; products: Product[]; onDone: () => void }) {
  const [s, setS] = useState(initial);
  const [filter, setFilter] = useState("");
  const { pending, error, save } = useSave();
  const set = <K extends keyof SeasonInput>(k: K, v: SeasonInput[K]) => setS((p) => ({ ...p, [k]: v }));
  const idp = initial.id ?? "new";
  const shown = products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save(() => saveSeason(s), onDone);
      }}
    >
      {!initial.id && (
        <div className="flex flex-wrap gap-1.5">
          {ideas.map((i) => (
            <button key={i.slug} type="button" className={smallButtonClass} onClick={() => setS((p) => ({ ...p, slug: i.slug, titleEn: i.en, titleAr: i.ar }))}>
              {i.en}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Title (English)" htmlFor={`s-en-${idp}`}>
          <input id={`s-en-${idp}`} required maxLength={120} value={s.titleEn} onChange={(e) => set("titleEn", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Title (Arabic)" htmlFor={`s-ar-${idp}`}>
          <input id={`s-ar-${idp}`} required dir="rtl" maxLength={120} value={s.titleAr} onChange={(e) => set("titleAr", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Link" hint={`${siteConfig.host}/en/${s.slug || "…"}`} htmlFor={`s-slug-${idp}`}>
          <input id={`s-slug-${idp}`} required maxLength={60} value={s.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className={inputClass} dir="ltr" />
        </Field>
        <Field label="Text (English)" htmlFor={`s-den-${idp}`}>
          <textarea id={`s-den-${idp}`} rows={2} maxLength={2000} value={s.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} className={textareaClass} />
        </Field>
        <Field label="Text (Arabic)" htmlFor={`s-dar-${idp}`}>
          <textarea id={`s-dar-${idp}`} rows={2} dir="rtl" maxLength={2000} value={s.descriptionAr} onChange={(e) => set("descriptionAr", e.target.value)} className={textareaClass} />
        </Field>
        <Field label="Code shown (optional)" htmlFor={`s-code-${idp}`}>
          <input id={`s-code-${idp}`} maxLength={30} value={s.couponCode} onChange={(e) => set("couponCode", e.target.value.toUpperCase())} className={`${inputClass} uppercase`} />
        </Field>
        <Field label="Starts" htmlFor={`s-st-${idp}`}>
          <input id={`s-st-${idp}`} type="datetime-local" value={s.starts} onChange={(e) => set("starts", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Ends (countdown)" htmlFor={`s-end-${idp}`}>
          <input id={`s-end-${idp}`} type="datetime-local" value={s.ends} onChange={(e) => set("ends", e.target.value)} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input type="checkbox" checked={s.isActive} onChange={(e) => set("isActive", e.target.checked)} className="size-4 accent-[var(--cedar)]" />
          Active
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Products ({s.products.length})</legend>
        <input type="search" placeholder="Filter products" value={filter} onChange={(e) => setFilter(e.target.value)} className={`${inputClass} mb-2`} />
        <div className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-line bg-background p-2 sm:grid-cols-2">
          {shown.map((p) => (
            <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface">
              <input
                type="checkbox"
                checked={s.products.includes(p.id)}
                onChange={(e) => set("products", e.target.checked ? [...s.products, p.id] : s.products.filter((x) => x !== p.id))}
                className="accent-[var(--cedar)]"
              />
              {p.name}
            </label>
          ))}
        </div>
      </fieldset>
      <FormError error={error} />
      <button disabled={pending} className={`${buttonClass} self-start`}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Save season
      </button>
    </form>
  );
}

export function SeasonsManager({ seasons, products }: { seasons: (SeasonInput & { live: boolean })[]; products: Product[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));
  const empty: SeasonInput = { id: null, slug: "", titleEn: "", titleAr: "", descriptionEn: "", descriptionAr: "", couponCode: "", starts: "", ends: "", isActive: true, products: [] };

  return (
    <section className="rounded-xl border border-line bg-background p-4 sm:p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="font-sans text-base font-semibold">Seasons & collections</h2>
        <button type="button" onClick={() => toggle("new")} className={smallButtonClass}>
          <Plus className="size-3.5" aria-hidden /> New season
        </button>
      </div>
      <p className="text-xs text-muted">Each season gets its own page, shown only between its start and end (Beirut time).</p>
      {open === "new" && (
        <div className="mt-3 rounded-lg bg-surface p-3">
          <SeasonForm initial={empty} products={products} onDone={() => setOpen(null)} />
        </div>
      )}
      <ul className="divide-y divide-line">
        {seasons.map((s) => (
          <EditableRow
            key={s.id}
            open={open === s.id}
            onToggle={() => toggle(s.id!)}
            summary={
              <>
                <span className="font-medium">{s.titleEn}</span>{" "}
                <a href={`/en/${s.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted underline">
                  /{s.slug} <ExternalLink className="size-3" aria-hidden />
                </a>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {s.live ? <Badge tone="green">Live now</Badge> : s.isActive ? <Badge tone="gold">Scheduled / ended</Badge> : <Badge>Off</Badge>}
                  <Badge>{s.products.length} products</Badge>
                  {s.ends && <Badge>Ends {s.ends.replace("T", " ")}</Badge>}
                </span>
              </>
            }
          >
            <SeasonForm initial={s} products={products} onDone={() => setOpen(null)} />
          </EditableRow>
        ))}
      </ul>
      {seasons.length === 0 && <p className="mt-3 text-sm text-muted">No seasons yet.</p>}
    </section>
  );
}
