"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { createTileUpload, saveHomePage } from "@/lib/admin/home-actions";
import type { HomeSectionInput, HomeSectionKey, HomeStepInput } from "@/lib/admin/home-types";
import { toWebp } from "./media-manager";
import { FormError, useSave } from "./promo-forms";
import { Card, Field, buttonClass, inputClass, secondaryButtonClass, smallButtonClass, textareaClass } from "./ui";

type Tile = { slug: string; name: string; show: boolean; imageUrl: string };
type ProductOption = { slug: string; name: string };

export type HomeFormData = {
  sections: HomeSectionInput[];
  liraSlugs: string[];
  tiles: Tile[];
  bestSellers: string[];
  steps: HomeStepInput[];
  /** The texts the shop shows when a step field is empty. */
  stepDefaults: HomeStepInput[];
  /** false until the "home section items" database update is applied. */
  stepsReady: boolean;
  products: ProductOption[];
};

const MAX_LIRA = 8;

// What each section lets the owner change. Empty text = the default one.
const sectionInfo: Record<HomeSectionKey, { label: string; subtitle?: string; cta?: string }> = {
  lira: { label: "Lira Collection (after the first screen)", subtitle: "Text", cta: "Button opens (default: the Lira Collection page)" },
  shop_by_style: { label: "Shop by style", subtitle: "Line under the title" },
  best_sellers: { label: "Best sellers", subtitle: "Line under the title", cta: "Button opens (default: Bestsellers page)" },
  steps: { label: "How it works (title and the 3 steps)" },
  new_arrivals: { label: "New arrivals", subtitle: "Line under the title", cta: "Button opens (default: New Arrivals page)" },
  try_picture: { label: "Try your picture", subtitle: "Line under the title", cta: "Order button opens: the photo pendant product, e.g. /product/photo-pendant (default: Gifts page)" },
  create: { label: "Create something personal", subtitle: "Text", cta: "Button opens (default: the name necklace)" },
};

function swap<T>(list: T[], i: number, by: number): T[] {
  const next = [...list];
  const [item] = next.splice(i, 1);
  next.splice(i + by, 0, item);
  return next;
}

function Arrows({ i, length, onMove }: { i: number; length: number; onMove: (by: number) => void }) {
  return (
    <span className="ms-auto flex gap-1">
      <button type="button" disabled={i === 0} onClick={() => onMove(-1)} aria-label="Move up" className={smallButtonClass}>
        <ArrowUp className="size-3.5" aria-hidden />
      </button>
      <button type="button" disabled={i === length - 1} onClick={() => onMove(1)} aria-label="Move down" className={smallButtonClass}>
        <ArrowDown className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

// The owner's Home page: what each homepage section says, which products the
// Lira Collection shows, the "Shop by style" tiles (photo, order, shown) and
// the order of the Best sellers.
export function HomeForm({ initial }: { initial: HomeFormData }) {
  const [d, setD] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const { pending, error, save } = useSave();
  const change = (patch: Partial<HomeFormData>) => {
    setSaved(false);
    setD((p) => ({ ...p, ...patch }));
  };

  const nameOf = (slug: string) => d.products.find((p) => p.slug === slug)?.name ?? slug;
  const setSection = (key: HomeSectionKey, patch: Partial<HomeSectionInput>) =>
    change({ sections: d.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)) });
  const setTile = (slug: string, patch: Partial<Tile>) => change({ tiles: d.tiles.map((t) => (t.slug === slug ? { ...t, ...patch } : t)) });

  const uploadTile = async (slug: string, file: File) => {
    setUploadError(null);
    setUploading(slug);
    try {
      const body = await toWebp(file);
      const target = await createTileUpload({ contentType: "image/webp", size: body.size });
      if (!target.ok || !target.data) throw new Error(target.ok ? "Upload failed." : target.error);
      const put = await fetch(target.data.uploadUrl, { method: "PUT", body, headers: { "Content-Type": "image/webp" } });
      if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
      setTile(slug, { imageUrl: target.data.publicUrl });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  };

  const addable = d.products.filter((p) => !d.liraSlugs.includes(p.slug));

  return (
    <form
      className="flex flex-col gap-4 pb-24"
      onSubmit={(e) => {
        e.preventDefault();
        save(
          () => saveHomePage({ sections: d.sections, liraSlugs: d.liraSlugs, tiles: d.tiles.map(({ slug, show, imageUrl }) => ({ slug, show, imageUrl })), bestSellers: d.bestSellers, steps: d.steps }),
          () => setSaved(true),
        );
      }}
    >
      <Card title="Lira Collection products" actions={<span className="text-xs text-muted">Up to {MAX_LIRA}, in this order. None picked = every product of the Lira Collection category.</span>}>
        <ul className="flex flex-col gap-2">
          {d.liraSlugs.map((slug, i) => (
            <li key={slug} className="flex items-center gap-2 rounded-lg border border-line p-2 text-sm">
              <span className="w-6 text-center text-muted">{i + 1}</span>
              <span className="min-w-0 truncate">{nameOf(slug)}</span>
              <Arrows i={i} length={d.liraSlugs.length} onMove={(by) => change({ liraSlugs: swap(d.liraSlugs, i, by) })} />
              <button type="button" aria-label={`Remove ${nameOf(slug)}`} onClick={() => change({ liraSlugs: d.liraSlugs.filter((s) => s !== slug) })} className={smallButtonClass}>
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        {d.liraSlugs.length < MAX_LIRA && addable.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <select
              aria-label="Add a product"
              value=""
              onChange={(e) => e.target.value && change({ liraSlugs: [...d.liraSlugs, e.target.value] })}
              className={inputClass}
            >
              <option value="">Add a product…</option>
              {addable.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
            <Plus className="size-4 shrink-0 text-muted" aria-hidden />
          </div>
        )}
      </Card>

      <Card title="Shop by style tiles" actions={<span className="text-xs text-muted">Tick the ones to show; the first one is the big tile. A photo replaces the drawing.</span>}>
        <FormError error={uploadError} />
        <ul className="flex flex-col gap-2">
          {d.tiles.map((t, i) => (
            <li key={t.slug} className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${t.show ? "border-line" : "border-dashed border-line bg-surface"}`}>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={t.show} onChange={(e) => setTile(t.slug, { show: e.target.checked })} className="size-5 accent-[var(--cedar)]" />
                {t.name}
              </label>
              <TilePhoto tile={t} busy={uploading === t.slug} onFile={(f) => uploadTile(t.slug, f)} onRemove={() => setTile(t.slug, { imageUrl: "" })} />
              <Arrows i={i} length={d.tiles.length} onMove={(by) => change({ tiles: swap(d.tiles, i, by) })} />
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Best sellers order" actions={<span className="text-xs text-muted">Pieces with the Best seller badge (turn it on in the product). The first 8 show on the homepage.</span>}>
        {d.bestSellers.length === 0 ? (
          <p className="text-sm text-muted">No best sellers yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {d.bestSellers.map((slug, i) => (
              <li key={slug} className="flex items-center gap-2 rounded-lg border border-line p-2 text-sm">
                <span className="w-6 text-center text-muted">{i + 1}</span>
                <span className="min-w-0 truncate">{nameOf(slug)}</span>
                <Arrows i={i} length={d.bestSellers.length} onMove={(by) => change({ bestSellers: swap(d.bestSellers, i, by) })} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Section texts" actions={<span className="text-xs text-muted">Empty = the default text. Untick to hide a whole section.</span>}>
        <ul className="flex flex-col gap-2">
          {d.sections.map((s) => {
            const info = sectionInfo[s.key];
            return (
              <li key={s.key} className="rounded-lg border border-line p-3">
                <details>
                  <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
                    <span>{info.label}</span>
                    {!s.visible && <span className="text-xs font-normal text-muted">Hidden</span>}
                  </summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <input type="checkbox" checked={s.visible} onChange={(e) => setSection(s.key, { visible: e.target.checked })} className="size-5 accent-[var(--cedar)]" />
                      Show this section
                    </label>
                    <Field label="Title (English)" htmlFor={`hs-te-${s.key}`}>
                      <input id={`hs-te-${s.key}`} maxLength={120} value={s.titleEn} onChange={(e) => setSection(s.key, { titleEn: e.target.value })} className={inputClass} />
                    </Field>
                    <Field label="Title (Arabic)" htmlFor={`hs-ta-${s.key}`}>
                      <input id={`hs-ta-${s.key}`} dir="rtl" maxLength={120} value={s.titleAr} onChange={(e) => setSection(s.key, { titleAr: e.target.value })} className={inputClass} />
                    </Field>
                    {info.subtitle && (
                      <>
                        <Field label={`${info.subtitle} (English)`} htmlFor={`hs-se-${s.key}`}>
                          <input id={`hs-se-${s.key}`} maxLength={300} value={s.subtitleEn} onChange={(e) => setSection(s.key, { subtitleEn: e.target.value })} className={inputClass} />
                        </Field>
                        <Field label={`${info.subtitle} (Arabic)`} htmlFor={`hs-sa-${s.key}`}>
                          <input id={`hs-sa-${s.key}`} dir="rtl" maxLength={300} value={s.subtitleAr} onChange={(e) => setSection(s.key, { subtitleAr: e.target.value })} className={inputClass} />
                        </Field>
                      </>
                    )}
                    {s.key === "steps" && (
                      <div className="grid gap-3 sm:col-span-2">
                        {!d.stepsReady && (
                          <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted">
                            The step texts need the database update <b>20261007110000_home_section_items.sql</b> (Supabase → SQL Editor).
                          </p>
                        )}
                        {d.steps.map((step, i) => (
                          <StepFields
                            key={i}
                            n={i + 1}
                            step={step}
                            defaults={d.stepDefaults[i]}
                            disabled={!d.stepsReady}
                            onChange={(patch) => change({ steps: d.steps.map((x, j) => (j === i ? { ...x, ...patch } : x)) })}
                          />
                        ))}
                      </div>
                    )}
                    {info.cta && (
                      <Field label={info.cta} className="sm:col-span-2" htmlFor={`hs-cta-${s.key}`}>
                        <input id={`hs-cta-${s.key}`} dir="ltr" maxLength={200} placeholder="/category/bracelets" value={s.ctaHref} onChange={(e) => setSection(s.key, { ctaHref: e.target.value })} className={inputClass} />
                      </Field>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-background/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:start-60">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3">
          {saved && <p className="me-auto text-sm text-emerald-700">Saved. The shop shows it right away.</p>}
          <FormError error={error} />
          <button disabled={pending} className={buttonClass}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Save home page
          </button>
        </div>
      </div>
    </form>
  );
}

function StepFields({ n, step, defaults, disabled, onChange }: { n: number; step: HomeStepInput; defaults: HomeStepInput; disabled: boolean; onChange: (patch: Partial<HomeStepInput>) => void }) {
  return (
    <fieldset disabled={disabled} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-2">
      <legend className="px-1 text-sm font-medium">Step 0{n}</legend>
      <Field label="Title (English)" htmlFor={`hs-st-te-${n}`}>
        <input id={`hs-st-te-${n}`} maxLength={80} placeholder={defaults.titleEn} value={step.titleEn} onChange={(e) => onChange({ titleEn: e.target.value })} className={inputClass} />
      </Field>
      <Field label="Title (Arabic)" htmlFor={`hs-st-ta-${n}`}>
        <input id={`hs-st-ta-${n}`} dir="rtl" maxLength={80} placeholder={defaults.titleAr} value={step.titleAr} onChange={(e) => onChange({ titleAr: e.target.value })} className={inputClass} />
      </Field>
      <Field label="Text (English)" htmlFor={`hs-st-xe-${n}`}>
        <textarea id={`hs-st-xe-${n}`} rows={3} maxLength={300} placeholder={defaults.textEn} value={step.textEn} onChange={(e) => onChange({ textEn: e.target.value })} className={textareaClass} />
      </Field>
      <Field label="Text (Arabic)" htmlFor={`hs-st-xa-${n}`}>
        <textarea id={`hs-st-xa-${n}`} dir="rtl" rows={3} maxLength={300} placeholder={defaults.textAr} value={step.textAr} onChange={(e) => onChange({ textAr: e.target.value })} className={textareaClass} />
      </Field>
    </fieldset>
  );
}

function TilePhoto({ tile, busy, onFile, onRemove }: { tile: Tile; busy: boolean; onFile: (f: File) => void; onRemove: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <span className="ms-auto flex items-center gap-2">
      {tile.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tile.imageUrl} alt="" className="size-10 rounded-md object-cover" />
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className={secondaryButtonClass}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
        {tile.imageUrl ? "Change photo" : "Add photo"}
      </button>
      {tile.imageUrl && (
        <button type="button" onClick={onRemove} aria-label={`Remove the photo of ${tile.name}`} className={smallButtonClass}>
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </span>
  );
}
