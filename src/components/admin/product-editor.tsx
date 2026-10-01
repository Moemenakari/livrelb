"use client";

import { siteConfig } from "@/config/site";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { deleteProduct, saveProduct } from "@/lib/admin/product-actions";
import { artKey, artPresets, type ProductForm } from "@/lib/admin/product-types";
import type { ChainConnection, FontKey, MaterialKey } from "@/lib/catalog/types";
import { AdminPreview } from "./admin-preview";
import { MediaManager } from "./media-manager";
import { RichTextarea } from "./rich-textarea";
import { Card, Field, buttonClass, dangerButtonClass, inputClass, secondaryButtonClass, smallButtonClass } from "./ui";

type Lookups = {
  materials: { key: MaterialKey; name: string; factor: number }[];
  fonts: { key: FontKey; name: string; script: "latin" | "arabic" }[];
  categories: { slug: string; name: string }[];
};

type Props = {
  initial: ProductForm;
  lookups: Lookups;
  canSave: boolean;
  canDelete: boolean;
  /** "Created by Amal on 3 Oct · Last edited by Nour on 5 Oct". */
  meta?: ReactNode;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const sizePresets = {
  chain: [35, 40, 45, 50, 55],
  bracelet: [15, 16, 17, 18, 19],
  ring: [5, 6, 7, 8, 9],
} as const;

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-sm">
      {label}
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[var(--cedar)]" />
    </label>
  );
}

// Product editor (brief §8.5): names, tagline, rich descriptions,
// categories, a price and an old price per material (Double Gold can be
// pre-filled at 3× gold), sizes, chain connections, fonts + default,
// badges, visibility, stock and 1–7 photos + a video.
const styleOptions = [
  { key: "cursive", label: "Cursive" },
  { key: "arabic", label: "Arabic" },
  { key: "bold", label: "Bold" },
  { key: "dainty", label: "Dainty" },
  { key: "initial", label: "Initial / letter" },
  { key: "twoFonts", label: "Two fonts" },
];

export function ProductEditor({ initial, lookups, canSave, canDelete, meta }: Props) {
  const router = useRouter();
  const [f, setF] = useState<ProductForm>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setF((prev) => ({ ...prev, [key]: value }));

  const material = (key: MaterialKey) => f.materials.find((m) => m.key === key);
  const setMaterial = (key: MaterialKey, patch: Partial<ProductForm["materials"][number]>) =>
    set(
      "materials",
      f.materials.map((m) => (m.key === key ? { ...m, ...patch } : patch.isDefault ? { ...m, isDefault: false } : m)),
    );
  const toggleMaterial = (key: MaterialKey, on: boolean) => {
    if (!on) return set("materials", f.materials.filter((m) => m.key !== key));
    // Double Gold: pre-filled at 3× the gold price (still editable).
    const gold = Number(material("gold")?.price);
    const factor = lookups.materials.find((m) => m.key === key)?.factor ?? 1;
    const prefill = gold > 0 && factor !== 1 ? String(Math.round(gold * factor * 100) / 100) : "";
    const goldOld = Number(material("gold")?.compareAt);
    set("materials", [
      ...f.materials,
      { key, price: prefill, compareAt: goldOld > 0 && factor !== 1 ? String(Math.round(goldOld * factor * 100) / 100) : "", isDefault: f.materials.length === 0 },
    ]);
  };

  // Typing the Gold price (or old price) fills the Silver / Rose rows that are
  // still empty or still equal to it: they usually cost the same.
  const setPrice = (key: MaterialKey, field: "price" | "compareAt", value: string) => {
    const before = material("gold")?.[field] ?? "";
    set(
      "materials",
      f.materials.map((m) => {
        if (m.key === key) return { ...m, [field]: value };
        const factor = lookups.materials.find((x) => x.key === m.key)?.factor ?? 1;
        if (key === "gold" && factor === 1 && (m[field] === "" || m[field] === before)) return { ...m, [field]: value };
        return m;
      }),
    );
  };

  const save = () =>
    start(async () => {
      setMessage(null);
      const result = await saveProduct(f);
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      setMessage({ ok: true, text: "Saved. The shop shows the change right away." });
      if (!f.id && result.data) router.replace(`/admin/products/${result.data.id}`);
    });

  const remove = () => {
    if (!f.id || !confirm(`Delete "${f.nameEn}" for good? (Hidden is usually better.)`)) return;
    start(async () => {
      const result = await deleteProduct(f.id!);
      if (!result.ok) setMessage({ ok: false, text: result.error });
      else router.replace("/admin/products");
    });
  };

  const latinFont = f.fonts.find((k) => lookups.fonts.find((x) => x.key === k)?.script === "latin");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-col gap-4 pb-20"
    >
      {meta && <p className="-mt-2 text-xs text-muted">{meta}</p>}

      <Card title="Basics">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name (English)" htmlFor="p-name-en">
            <input
              id="p-name-en"
              required
              maxLength={120}
              value={f.nameEn}
              onChange={(e) => {
                set("nameEn", e.target.value);
                if (!slugTouched) set("slug", slugify(e.target.value));
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Name (Arabic)" htmlFor="p-name-ar">
            <input id="p-name-ar" required dir="rtl" maxLength={120} value={f.nameAr} onChange={(e) => set("nameAr", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Short tagline (English)" hint="One line under the name on the product page." htmlFor="p-sum-en">
            <input id="p-sum-en" maxLength={300} value={f.summaryEn} onChange={(e) => set("summaryEn", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Short tagline (Arabic)" htmlFor="p-sum-ar">
            <input id="p-sum-ar" dir="rtl" maxLength={300} value={f.summaryAr} onChange={(e) => set("summaryAr", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Link" hint={`${siteConfig.host}/en/product/${f.slug || "…"}`} htmlFor="p-slug">
            <input
              id="p-slug"
              required
              maxLength={80}
              value={f.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
              className={inputClass}
              dir="ltr"
            />
          </Field>
          <Field label="Style" hint="Groups the piece under a round style picture on its category page." htmlFor="p-style">
            <select id="p-style" value={f.style} onChange={(e) => set("style", e.target.value)} className={inputClass}>
              <option value="">No style</option>
              {styleOptions.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Shown in the shop" htmlFor="p-status">
            <select id="p-status" value={f.status} onChange={(e) => set("status", e.target.value as ProductForm["status"])} className={inputClass}>
              <option value="active">Visible</option>
              <option value="draft">Hidden</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Toggle label="Best seller badge" checked={f.isBestSeller} onChange={(v) => set("isBestSeller", v)} />
          <Toggle label="New badge" checked={f.isNew} onChange={(v) => set("isNew", v)} />
          <Toggle label="Track stock" checked={f.stock !== null} onChange={(v) => set("stock", v ? 10 : null)} />
          <Toggle label="Free delivery with this piece" checked={f.freeDelivery} onChange={(v) => set("freeDelivery", v)} />
          <Toggle label="Free gift box" checked={f.freeGiftBox} onChange={(v) => set("freeGiftBox", v)} />
        </div>
        {f.stock !== null && (
          <Field label="In stock" hint={`"Only ${f.stock} left" shows on the product page when 10 or fewer.`} htmlFor="p-stock" className="mt-3 sm:max-w-48">
            <input id="p-stock" type="number" min={0} step={1} value={f.stock} onChange={(e) => set("stock", Math.max(0, Number(e.target.value) || 0))} className={inputClass} />
          </Field>
        )}
      </Card>

      <Card title="Photos & video">
        <MediaManager slug={f.slug} media={f.media} onChange={(m) => set("media", m)} />
        <Field label="Type of piece (drawing shown until there are photos)" htmlFor="p-art" className="mt-4 sm:max-w-xs">
          <select
            id="p-art"
            value={artKey(f.art)}
            onChange={(e) => set("art", artPresets.find((p) => artKey(p.art) === e.target.value)?.art ?? f.art)}
            className={inputClass}
          >
            {artPresets.map((p) => (
              <option key={p.label} value={artKey(p.art)}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
      </Card>

      <Card title="Prices per material" actions={<span className="text-xs text-muted">USD. Old price = crossed out (the piece shows as on sale), empty = no sale. Silver and Rose follow the Gold price until you change them.</span>}>
        <ul className="flex flex-col gap-2">
          {lookups.materials.map((m) => {
            const row = material(m.key);
            return (
              <li key={m.key} className={`rounded-lg border p-3 ${row ? "border-line" : "border-dashed border-line bg-surface"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={Boolean(row)} onChange={(e) => toggleMaterial(m.key, e.target.checked)} className="size-4 accent-[var(--cedar)]" />
                    {m.name}
                    {m.factor !== 1 && <span className="text-xs font-normal text-muted">(pre-filled at {m.factor}× gold)</span>}
                  </label>
                  {row && (
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      <input type="radio" name="default-material" checked={row.isDefault} onChange={() => setMaterial(m.key, { isDefault: true })} className="accent-[var(--gold)]" />
                      Shown first
                    </label>
                  )}
                </div>
                {row && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Field label="Price" htmlFor={`price-${m.key}`}>
                      <input id={`price-${m.key}`} type="number" min="0" step="0.01" inputMode="decimal" required value={row.price} onChange={(e) => setPrice(m.key, "price", e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Old price" htmlFor={`old-${m.key}`}>
                      <input id={`old-${m.key}`} type="number" min="0" step="0.01" inputMode="decimal" value={row.compareAt} onChange={(e) => setPrice(m.key, "compareAt", e.target.value)} className={inputClass} />
                    </Field>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Personalization">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Customer writes" htmlFor="p-pers">
            <select id="p-pers" value={f.personalization} onChange={(e) => set("personalization", e.target.value as ProductForm["personalization"])} className={inputClass}>
              <option value="name">A name / word</option>
              <option value="initial">A letter</option>
              <option value="">Nothing (not personalized)</option>
            </select>
          </Field>
          {f.personalization && (
            <>
              <Field label="Max letters" htmlFor="p-max">
                <input id="p-max" type="number" min={1} max={20} value={f.maxLength} onChange={(e) => set("maxLength", Number(e.target.value))} className={inputClass} />
              </Field>
              <Field label="Sample name on cards" htmlFor="p-sample">
                <input id="p-sample" maxLength={20} value={f.sampleText} onChange={(e) => set("sampleText", e.target.value)} className={inputClass} />
              </Field>
            </>
          )}
        </div>

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium">Chain connection options</legend>
          <div className="flex flex-wrap gap-2">
            {(["sides", "center"] as ChainConnection[]).map((c) => (
              <label key={c} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={f.connections.includes(c)}
                  onChange={(e) => set("connections", e.target.checked ? [...f.connections, c] : f.connections.filter((x) => x !== c))}
                  className="size-4 accent-[var(--cedar)]"
                />
                {c === "sides" ? "Both sides" : "Center (one ring)"}
              </label>
            ))}
          </div>
        </fieldset>

        {f.personalization && (
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium">Allowed fonts</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {lookups.fonts.map((font) => {
                const on = f.fonts.includes(font.key);
                const isDefault = f.fonts[0] === font.key;
                return (
                  <div key={font.key} className={`flex flex-col overflow-hidden rounded-lg border ${on ? "border-gold" : "border-line"}`}>
                    <label className="flex items-center gap-2 px-2 pt-2 text-xs">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => set("fonts", e.target.checked ? [...f.fonts, font.key] : f.fonts.filter((k) => k !== font.key))}
                        className="accent-[var(--cedar)]"
                      />
                      {font.name}
                      {font.script === "arabic" && <span className="text-muted">(Arabic)</span>}
                    </label>
                    <div className="px-2">
                      <AdminPreview text={font.script === "arabic" ? "ليلى" : f.sampleText || "Maya"} material="gold" font={font.key} connection="sides" />
                    </div>
                    {on && (
                      <button
                        type="button"
                        onClick={() => set("fonts", [font.key, ...f.fonts.filter((k) => k !== font.key)])}
                        className={`border-t border-line py-1 text-[11px] ${isDefault ? "bg-gold text-white" : "text-muted hover:bg-surface"}`}
                      >
                        {isDefault ? "Default font" : "Make default"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {latinFont && f.fonts[0] !== latinFont && lookups.fonts.find((x) => x.key === f.fonts[0])?.script === "arabic" && (
              <p className="mt-2 text-xs text-muted">Latin names will use {lookups.fonts.find((x) => x.key === latinFont)?.name} by default.</p>
            )}
          </fieldset>
        )}
      </Card>

      <Card
        title="Sizes"
        actions={
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(sizePresets) as (keyof typeof sizePresets)[]).map((kind) => (
              <button
                key={kind}
                type="button"
                className={smallButtonClass}
                onClick={() =>
                  set("options", [
                    ...f.options.filter((o) => o.kind !== kind),
                    ...sizePresets[kind].map((v, i) => ({ kind, value: String(v), modifier: "0", isDefault: !f.options.some((o) => o.isDefault) && i === 2 })),
                  ])
                }
              >
                <Plus className="size-3" aria-hidden />
                {kind === "chain" ? "Necklace 35–55 cm" : kind === "bracelet" ? "Bracelet 15–19 cm" : "Rings US 5–9"}
              </button>
            ))}
          </div>
        }
      >
        {f.options.length === 0 ? (
          <p className="text-sm text-muted">No sizes (one size).</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {f.options.map((o, i) => (
              <li key={i} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2 border-b border-line pb-2 last:border-0 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:border-0 sm:pb-0">
                <select
                  aria-label="Type"
                  value={o.kind}
                  onChange={(e) => set("options", f.options.map((x, j) => (j === i ? { ...x, kind: e.target.value as typeof o.kind } : x)))}
                  className={`${inputClass} col-span-4 sm:col-span-1`}
                >
                  <option value="chain">Necklace (cm)</option>
                  <option value="bracelet">Bracelet (cm)</option>
                  <option value="ring">Ring (US)</option>
                </select>
                <input aria-label="Size" inputMode="decimal" value={o.value} onChange={(e) => set("options", f.options.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className={inputClass} />
                <input
                  aria-label="Price change ($)"
                  placeholder="+$"
                  inputMode="decimal"
                  value={o.modifier}
                  onChange={(e) => set("options", f.options.map((x, j) => (j === i ? { ...x, modifier: e.target.value } : x)))}
                  className={inputClass}
                />
                <label className="flex items-center gap-1 text-xs text-muted" title="Selected by default">
                  <input type="radio" name="default-size" checked={o.isDefault} onChange={() => set("options", f.options.map((x, j) => ({ ...x, isDefault: j === i })))} className="accent-[var(--gold)]" />
                  Default
                </label>
                <button type="button" onClick={() => set("options", f.options.filter((_, j) => j !== i))} className="rounded p-2 text-muted hover:text-red-700" aria-label="Remove size">
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">Price change is added to the material price (e.g. 2 for a longer chain, 0 for the same price).</p>
      </Card>

      <Card title="Categories">
        <div className="flex flex-wrap gap-2">
          {lookups.categories.map((c) => {
            const on = f.categories.includes(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                aria-pressed={on}
                onClick={() => set("categories", on ? f.categories.filter((x) => x !== c.slug) : [...f.categories, c.slug])}
                className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">The first one picked is the main category (breadcrumbs, “#1 Best Seller in…”).</p>
      </Card>

      <Card title="Description">
        <div className="grid gap-3 lg:grid-cols-2">
          <Field label="Description (English)" htmlFor="p-desc-en">
            <RichTextarea id="p-desc-en" value={f.descriptionEn} onChange={(v) => set("descriptionEn", v)} />
          </Field>
          <Field label="Description (Arabic)" htmlFor="p-desc-ar">
            <RichTextarea id="p-desc-ar" dir="rtl" value={f.descriptionAr} onChange={(v) => set("descriptionAr", v)} />
          </Field>
          <Field label="Size & Materials tab (English)" htmlFor="p-det-en">
            <RichTextarea id="p-det-en" rows={4} maxLength={3000} value={f.detailsEn} onChange={(v) => set("detailsEn", v)} />
          </Field>
          <Field label="Size & Materials tab (Arabic)" htmlFor="p-det-ar">
            <RichTextarea id="p-det-ar" dir="rtl" rows={4} maxLength={3000} value={f.detailsAr} onChange={(v) => set("detailsAr", v)} />
          </Field>
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-background/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:start-60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
          {message && (
            <p role="status" className={`me-auto text-sm ${message.ok ? "text-emerald-700" : "text-red-700"}`}>
              {message.text}
            </p>
          )}
          <span className="ms-auto" />
          {f.id && f.status === "active" && (
            <a href={`/en/product/${initial.slug}`} target="_blank" rel="noopener noreferrer" className={secondaryButtonClass}>
              <ExternalLink className="size-4" aria-hidden />
              <span className="hidden sm:inline">View in shop</span>
            </a>
          )}
          {canDelete && f.id && (
            <button type="button" onClick={remove} disabled={pending} className={dangerButtonClass} aria-label="Delete product">
              <Trash2 className="size-4" aria-hidden />
            </button>
          )}
          <button type="submit" disabled={pending || !canSave} className={buttonClass}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
            Save
          </button>
        </div>
      </div>
    </form>
  );
}
