"use client";

import { siteConfig } from "@/config/site";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { createColor, deleteProduct, saveProduct } from "@/lib/admin/product-actions";
import { suggestCategories } from "@/lib/admin/suggest-actions";
import { artKey, artPresets, STANDARD_KEY, type ProductForm } from "@/lib/admin/product-types";
import type { ChainConnection, FontKey, MaterialKey } from "@/lib/catalog/types";
import { AdminPreview } from "./admin-preview";
import { MediaManager } from "./media-manager";
import { RichTextarea } from "./rich-textarea";
import { Card, Field, buttonClass, dangerButtonClass, inputClass, secondaryButtonClass, smallButtonClass } from "./ui";

type Lookups = {
  materials: { key: MaterialKey; name: string; factor: number | null; swatch: string; custom: boolean }[];
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

/** Makes a new color (red, blue...) for products that are not metal jewelry. */
function ColorMaker({ onCreated }: { onCreated: (color: Lookups["materials"][number]) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [swatch, setSwatch] = useState("#c0392b");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const add = () =>
    start(async () => {
      setError(null);
      const r = await createColor({ nameEn: name, nameAr, swatch });
      if (!r.ok || !r.data) {
        setError(r.ok ? "Something went wrong." : r.error);
        return;
      }
      onCreated({ key: r.data.key, name: r.data.name, factor: null, swatch: r.data.swatch, custom: true });
      setName("");
      setNameAr("");
      setOpen(false);
    });
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${smallButtonClass} mt-3`}>
        <Plus className="size-3" aria-hidden />
        New color (red, blue...)
      </button>
    );
  }
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (name.trim() && !pending) add();
  };
  return (
    <div className="mt-3 rounded-lg border border-dashed border-line p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="Color name (English)" htmlFor="color-en">
          <input id="color-en" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onEnter} className={inputClass} placeholder="Red" />
        </Field>
        <Field label="Color name (Arabic)" htmlFor="color-ar">
          <input id="color-ar" maxLength={40} value={nameAr} onChange={(e) => setNameAr(e.target.value)} onKeyDown={onEnter} className={inputClass} placeholder="أحمر" dir="rtl" />
        </Field>
        <Field label="Color" htmlFor="color-swatch">
          <input id="color-swatch" type="color" value={swatch} onChange={(e) => setSwatch(e.target.value)} className="h-10 w-16 cursor-pointer rounded border border-line bg-background p-1" />
        </Field>
      </div>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={pending || !name.trim()} onClick={add} className={smallButtonClass}>
          {pending ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Plus className="size-3" aria-hidden />}
          Add color
        </button>
        <button type="button" onClick={() => setOpen(false)} className={smallButtonClass}>
          Cancel
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">It is added to this piece. You can tick it on other pieces later; the price is set per piece.</p>
    </div>
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
  const [suggestion, setSuggestion] = useState<{ reason: string; ai: boolean } | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [autoTried, setAutoTried] = useState(false);
  // Colors made on this page (the lookups from the server only know the ones that existed when it loaded).
  const [newColors, setNewColors] = useState<Lookups["materials"]>([]);
  const allMats = [...lookups.materials, ...newColors];

  // Suggests the shop pages for this piece (AI when it is set up, else keyword rules).
  const suggest = async (auto: boolean) => {
    if (!f.nameEn.trim()) return;
    setSuggesting(true);
    const r = await suggestCategories({ nameEn: f.nameEn, summaryEn: f.summaryEn, descriptionEn: f.descriptionEn, personalization: f.personalization });
    setSuggesting(false);
    if (!r.ok || !r.data) {
      if (!auto) setSuggestion({ reason: r.ok ? "Something went wrong." : r.error, ai: false });
      return;
    }
    const slugs = r.data.slugs.filter((slug) => lookups.categories.some((c) => c.slug === slug));
    if (slugs.length > 0) set("categories", slugs);
    if (slugs.length > 0 || !auto) setSuggestion({ reason: r.data.reason, ai: r.data.ai });
  };

  const material = (key: MaterialKey) => f.materials.find((m) => m.key === key);
  const setMaterial = (key: MaterialKey, patch: Partial<ProductForm["materials"][number]>) =>
    set(
      "materials",
      f.materials.map((m) => (m.key === key ? { ...m, ...patch } : patch.isDefault ? { ...m, isDefault: false } : m)),
    );
  const toggleMaterial = (key: MaterialKey, on: boolean) => {
    if (!on) return set("materials", f.materials.filter((m) => m.key !== key));
    // Double Gold: pre-filled at 3× the gold price (still editable).
    // Materials with no factor (Double Silver, Steel) start empty.
    const gold = Number(material("gold")?.price);
    const factor = allMats.find((m) => m.key === key)?.factor ?? null;
    const scaled = (n: number) => (n > 0 && factor && factor !== 1 ? String(Math.round(n * factor * 100) / 100) : "");
    const goldOld = Number(material("gold")?.compareAt);
    set("materials", [...f.materials, { key, price: scaled(gold), compareAt: scaled(goldOld), isDefault: f.materials.length === 0 }]);
  };

  // Typing the Gold price (or old price) fills the Silver row while it is
  // still empty or still equal to it: they usually cost the same.
  const setPrice = (key: MaterialKey, field: "price" | "compareAt", value: string) => {
    const before = material("gold")?.[field] ?? "";
    set(
      "materials",
      f.materials.map((m) => {
        if (m.key === key) return { ...m, [field]: value };
        const factor = allMats.find((x) => x.key === m.key)?.factor ?? null;
        if (key === "gold" && factor === 1 && (m[field] === "" || m[field] === before)) return { ...m, [field]: value };
        return m;
      }),
    );
  };

  // What the customer is asked for. All on = jewelry; all off = a simple product (a gift box): one price, nothing to pick.
  const setChoices = (patch: Partial<Pick<ProductForm, "askMaterial" | "askSize" | "askConnection" | "askPersonalization">>) =>
    setF((prev) => {
      const next = { ...prev, ...patch };
      const std = prev.materials.find((m) => m.key === STANDARD_KEY);
      if (patch.askMaterial && std) {
        // Back to metals: the neutral "standard" price becomes the price of Gold and Silver.
        next.materials = [
          { key: "gold", price: std.price, compareAt: std.compareAt, isDefault: true },
          { key: "silver", price: std.price, compareAt: std.compareAt, isDefault: false },
        ];
      } else if (patch.askMaterial === false && !prev.id && !std) {
        // A new simple product: one neutral price (what was typed for the first metal is kept).
        const first = prev.materials.find((m) => m.isDefault) ?? prev.materials[0];
        next.materials = [{ key: STANDARD_KEY, price: first?.price ?? "", compareAt: first?.compareAt ?? "", isDefault: true }];
      }
      return next;
    });
  const simpleProduct = () => {
    setChoices({ askMaterial: false, askSize: false, askConnection: false, askPersonalization: false });
    // A new piece has nothing to keep: no sizes, no engraving.
    if (!f.id) setF((prev) => ({ ...prev, options: [], personalization: "", connections: [] }));
  };
  const jewelryProduct = () => setChoices({ askMaterial: true, askSize: true, askConnection: true, askPersonalization: true });

  // The price of a product that does not ask for a metal or color: its main row.
  const main = f.materials.find((m) => m.isDefault) ?? f.materials[0];
  const setMain = (patch: { price?: string; compareAt?: string }) =>
    set(
      "materials",
      main ? f.materials.map((m) => (m === main ? { ...m, ...patch } : m)) : [{ key: STANDARD_KEY, price: "", compareAt: "", isDefault: true, ...patch }],
    );

  const save = () =>
    start(async () => {
      setMessage(null);
      // The link is made from the name; a name with no latin letters gets a short code.
      const slug = f.slug || slugify(f.nameEn) || `piece-${Date.now().toString(36)}`;
      const result = await saveProduct({ ...f, slug });
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      setMessage({ ok: true, text: "Saved. Customers see the change tonight at 12:00 AM." });
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
              onBlur={() => {
                // A new piece with no pages yet: suggest them once, when the name is written.
                if (!f.id && f.categories.length === 0 && !autoTried) {
                  setAutoTried(true);
                  void suggest(true);
                }
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Short tagline (English)" hint="One line under the name on the product page." htmlFor="p-sum-en">
            <input id="p-sum-en" maxLength={300} value={f.summaryEn} onChange={(e) => set("summaryEn", e.target.value)} className={inputClass} />
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

      <Card
        title="Where does it show?"
        actions={
          <button type="button" disabled={suggesting || !f.nameEn.trim()} onClick={() => suggest(false)} className={smallButtonClass}>
            {suggesting ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
            Suggest for me
          </button>
        }
      >
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
        {suggestion && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-gold-dark" aria-hidden />
            <span>
              {suggestion.ai ? "AI suggestion" : "Suggestion"}: {suggestion.reason} Change it if you like.
            </span>
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          Each one is a page of the shop (Men&apos;s Jewelry, Gifts, Rings...). The first one picked is the main page (breadcrumbs, “#1 Best Seller in…”). Best sellers and New
          arrivals follow the badges above.
        </p>
      </Card>

      <Card
        title="What the customer chooses"
        actions={
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={smallButtonClass} onClick={jewelryProduct}>
              Jewelry (all choices)
            </button>
            <button type="button" className={smallButtonClass} onClick={simpleProduct}>
              Simple product (gift box...)
            </button>
          </div>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle label="Metal or color" checked={f.askMaterial} onChange={(v) => setChoices({ askMaterial: v })} />
          <Toggle label="Size / chain length" checked={f.askSize} onChange={(v) => setChoices({ askSize: v })} />
          <Toggle label="Design (one ring or both sides)" checked={f.askConnection} onChange={(v) => setChoices({ askConnection: v })} />
          <Toggle label="Name or letters to engrave" checked={f.askPersonalization} onChange={(v) => setChoices({ askPersonalization: v })} />
        </div>
        <p className="mt-2 text-xs text-muted">
          Switched off = the product page does not show it, the customer does not have to pick it, and the cart, checkout and order work without it. A gift box: tap
          “Simple product”, then add the photos, one price and the description. Pieces that already exist keep all their choices.
        </p>
      </Card>

      <Card title="Photos & video">
        <MediaManager slug={f.slug} media={f.media} onChange={(m) => set("media", m)} />
      </Card>

      {f.askMaterial ? (
        <Card title="Prices per material" actions={<span className="text-xs text-muted">USD. Old price = crossed out (the piece shows as on sale), empty = no sale. Silver follows the Gold price until you change it; type the others by hand.</span>}>
          <ul className="flex flex-col gap-2">
            {allMats.map((m) => {
              const row = material(m.key);
              return (
                <li key={m.key} className={`rounded-lg border p-3 ${row ? "border-line" : "border-dashed border-line bg-surface"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" checked={Boolean(row)} onChange={(e) => toggleMaterial(m.key, e.target.checked)} className="size-4 accent-[var(--cedar)]" />
                      {m.custom && <span aria-hidden className="inline-block size-3.5 rounded-full border border-line" style={{ background: m.swatch }} />}
                      {m.name}
                      {m.factor !== null && m.factor !== 1 && <span className="text-xs font-normal text-muted">(pre-filled at {m.factor}× gold)</span>}
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
          <ColorMaker
            onCreated={(c) => {
              setNewColors((prev) => [...prev, c]);
              set("materials", [...f.materials, { key: c.key, price: "", compareAt: "", isDefault: f.materials.length === 0 }]);
            }}
          />
        </Card>
      ) : (
        <Card title="Price" actions={<span className="text-xs text-muted">USD. Old price = crossed out (the piece shows as on sale), empty = no sale.</span>}>
          <div className="grid max-w-md grid-cols-2 gap-2">
            <Field label="Price" htmlFor="price-main">
              <input id="price-main" type="number" min="0" step="0.01" inputMode="decimal" required value={main?.price ?? ""} onChange={(e) => setMain({ price: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Old price" htmlFor="old-main">
              <input id="old-main" type="number" min="0" step="0.01" inputMode="decimal" value={main?.compareAt ?? ""} onChange={(e) => setMain({ compareAt: e.target.value })} className={inputClass} />
            </Field>
          </div>
        </Card>
      )}

      {(f.askPersonalization || f.askConnection) && (
      <Card title="Personalization">
        {f.askPersonalization && (
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
        )}

        {f.askConnection && (
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
        )}

        {f.askPersonalization && f.personalization && (
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
      )}

      {f.askSize && (
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
      )}

      <Card title="Description">
        <div className="grid gap-3 lg:grid-cols-2">
          <Field label="Description (English)" htmlFor="p-desc-en">
            <RichTextarea id="p-desc-en" value={f.descriptionEn} onChange={(v) => set("descriptionEn", v)} />
          </Field>
          <Field label="Size & Materials tab (English)" htmlFor="p-det-en">
            <RichTextarea id="p-det-en" rows={4} maxLength={3000} value={f.detailsEn} onChange={(v) => set("detailsEn", v)} />
          </Field>
        </div>
      </Card>

      <details className="rounded-xl border border-line bg-background p-4 sm:p-5">
        <summary className="cursor-pointer text-base font-semibold">Advanced (you rarely need this)</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Link" hint={`${siteConfig.host}/en/product/${f.slug || "…"}. Made from the name; changing it breaks links already sent.`} htmlFor="p-slug">
            <input
              id="p-slug"
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
          <Field label="Drawing shown until there are photos" htmlFor="p-art">
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
        </div>
      </details>

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
