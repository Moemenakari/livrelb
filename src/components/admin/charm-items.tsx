"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import {
  bulkUpdateCharms,
  createCharmItemUpload,
  deleteCharmItem,
  importCharmItems,
  saveCharmItem,
  saveCharmSettings,
  type CharmBulk,
  type CharmImportRow,
  type CharmItemInput,
} from "@/lib/admin/charm-actions";
import { cutLevels, cutout, planCharmFiles, type CutLevel, type Plan } from "./charm-cutout";
import { toWebp } from "./media-manager";
import { FormError, useSave } from "./promo-forms";
import { Card, Field, buttonClass, dangerButtonClass, inputClass, secondaryButtonClass, smallButtonClass } from "./ui";

const SHOWN = 40;
const CHUNK = 100;

// The charms with photos: a name, a family (Charms / Turkish), a metal and
// (optionally) a price. They show on the Charms page, where customers add them
// to their design. Import a whole folder at once; each charm is also editable here,
// and many can be changed together.
export function CharmItems({
  items,
  defaultPrice,
  maxCharms,
  isOwner,
}: {
  items: CharmItemInput[];
  defaultPrice: string;
  maxCharms: string;
  isOwner: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [metal, setMetal] = useState("");
  const [stock, setStock] = useState("");
  const [shown, setShown] = useState(SHOWN);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const file = useRef<HTMLInputElement>(null);
  const { error: saveError, save } = useSave();

  const upload = async (files: FileList) => {
    setError(null);
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const body = await toWebp(f);
        const target = await createCharmItemUpload({ contentType: "image/webp", size: body.size });
        if (!target.ok || !target.data) throw new Error(target.ok ? "Upload failed." : target.error);
        const put = await fetch(target.data.uploadUrl, { method: "PUT", body, headers: { "Content-Type": "image/webp" } });
        if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
        const saved = await saveCharmItem({
          id: null,
          url: target.data.publicUrl,
          nameEn: f.name.replace(/\.[^.]+$/, "").slice(0, 60) || "Charm",
          nameAr: "",
          price: "",
          inStock: true,
          isActive: true,
          order: String(items.length + 1),
        });
        if (!saved.ok) throw new Error(saved.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (!family || i.family === family) &&
          (!metal || i.metal === metal) &&
          (!stock || (stock === "out" ? !i.inStock : stock === "hidden" ? !i.isActive : i.inStock && i.isActive)) &&
          (!q || `${i.nameEn} ${i.code ?? ""}`.toLowerCase().includes(q)),
      ),
    [items, q, family, metal, stock],
  );
  const hasFamilies = items.some((i) => i.family !== undefined);

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-4">
      {isOwner && <CharmSettings price={defaultPrice} max={maxCharms} />}
      <CharmImport />
      <Card
        title={`Charms (${items.length})`}
        actions={
          <>
            <input ref={file} type="file" multiple accept="image/*" hidden onChange={(e) => e.target.files && upload(e.target.files)} />
            <button type="button" disabled={busy} onClick={() => file.current?.click()} className={secondaryButtonClass}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
              Add photos one by one
            </button>
          </>
        }
      >
        <p className="mb-3 text-xs text-muted">
          Each photo is a charm customers can pick on the Charms page. Empty price = the standard charm price (${defaultPrice}). Tick many charms to change
          their price or stock together.
        </p>
        <FormError error={error ?? saveError} />
        {items.length > 8 && (
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_9rem_8rem_9rem]">
            <input
              type="search"
              aria-label="Search charms"
              placeholder="Search by name or code…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(SHOWN);
              }}
              className={`${inputClass} col-span-2 sm:col-span-1`}
            />
            <select aria-label="Family" value={family} onChange={(e) => { setFamily(e.target.value); setShown(SHOWN); }} className={inputClass}>
              <option value="">All families</option>
              <option value="charms">Charms</option>
              <option value="turkish">Turkish charms</option>
            </select>
            <select aria-label="Metal" value={metal} onChange={(e) => { setMetal(e.target.value); setShown(SHOWN); }} className={inputClass}>
              <option value="">Both metals</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
            </select>
            <select aria-label="Stock" value={stock} onChange={(e) => { setStock(e.target.value); setShown(SHOWN); }} className={inputClass}>
              <option value="">All</option>
              <option value="live">On sale</option>
              <option value="out">Out of stock</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        )}
        {filtered.length > 0 && (
          <BulkBar
            total={filtered.length}
            selected={selected}
            onSelectAll={() => setSelected(new Set(filtered.map((i) => i.id!)))}
            onClear={() => setSelected(new Set())}
            onError={setError}
          />
        )}
        <ul className="flex flex-col gap-3">
          {filtered.slice(0, shown).map((s) => (
            <ItemRow
              key={`${s.id}-${s.price}-${s.inStock}-${s.isActive}-${s.url}`}
              item={s}
              hasFamilies={hasFamilies}
              checked={selected.has(s.id!)}
              onCheck={(on) => toggle(s.id!, on)}
              onSave={(next) => save(() => saveCharmItem(next))}
            />
          ))}
        </ul>
        {filtered.length > shown && (
          <button type="button" onClick={() => setShown((n) => n + SHOWN)} className={`${secondaryButtonClass} mt-3`}>
            Show {Math.min(SHOWN, filtered.length - shown)} more ({filtered.length - shown} left)
          </button>
        )}
        {items.length === 0 && <p className="text-sm text-muted">No charms yet. Import a folder of photos to start.</p>}
        {items.length > 0 && filtered.length === 0 && <p className="text-sm text-muted">No charm matches.</p>}
      </Card>
    </div>
  );
}

// Change many charms at once: price, stock, shown, delete.
function BulkBar({
  total,
  selected,
  onSelectAll,
  onClear,
  onError,
}: {
  total: number;
  selected: Set<string>;
  onSelectAll: () => void;
  onClear: () => void;
  onError: (message: string | null) => void;
}) {
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const count = selected.size;

  const run = async (patch: Omit<CharmBulk, "ids"> & { remove?: boolean }, label: string) => {
    onError(null);
    setDone(null);
    setBusy(true);
    try {
      const ids = [...selected];
      let changed = 0;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const r = await bulkUpdateCharms({ ...patch, ids: ids.slice(i, i + CHUNK) });
        if (!r.ok) throw new Error(r.error);
        changed += r.data?.count ?? 0;
      }
      setDone(`${label}: ${changed} charm${changed === 1 ? "" : "s"}.`);
      if (patch.remove) onClear();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onSelectAll} className={smallButtonClass}>
          Tick all {total}
        </button>
        {count > 0 && (
          <button type="button" onClick={onClear} className={smallButtonClass}>
            Untick
          </button>
        )}
        <span className="text-muted">{count} ticked</span>
      </div>
      {count > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-muted">Price $</span>
            <input
              type="number"
              min="0"
              step="0.01"
              aria-label="New price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`${inputClass} h-9 w-24`}
            />
          </label>
          <button type="button" disabled={busy || !price.trim()} onClick={() => run({ price }, "Price set")} className={smallButtonClass}>
            Set price
          </button>
          <button type="button" disabled={busy} onClick={() => run({ price: "" }, "Standard price")} className={smallButtonClass}>
            Standard price
          </button>
          <button type="button" disabled={busy} onClick={() => run({ inStock: false }, "Out of stock")} className={smallButtonClass}>
            Out of stock
          </button>
          <button type="button" disabled={busy} onClick={() => run({ inStock: true }, "Back in stock")} className={smallButtonClass}>
            In stock
          </button>
          <button type="button" disabled={busy} onClick={() => run({ isActive: false }, "Hidden")} className={smallButtonClass}>
            Hide
          </button>
          <button type="button" disabled={busy} onClick={() => run({ isActive: true }, "Shown")} className={smallButtonClass}>
            Show
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (confirm(`Delete ${count} charm${count === 1 ? "" : "s"} for good? Hiding them is usually better.`)) run({ remove: true }, "Deleted");
            }}
            className={`${smallButtonClass} border-red-200 text-red-800`}
          >
            <Trash2 className="size-3.5" aria-hidden /> Delete
          </button>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
        </div>
      )}
      {done && <p className="text-emerald-700">{done}</p>}
    </div>
  );
}

// Owner: the standard price of one charm and the most charms on one chain.
function CharmSettings({ price: initialPrice, max: initialMax }: { price: string; max: string }) {
  const [price, setPrice] = useState(initialPrice);
  const [max, setMax] = useState(initialMax);
  const [saved, setSaved] = useState(false);
  const { pending, error, save } = useSave();
  return (
    <Card title="Charm prices">
      <form
        className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          save(() => saveCharmSettings({ price, max }), () => setSaved(true));
        }}
      >
        <Field label="Price of one charm ($)" hint="Used when a charm has no price of its own. The chain's price is the product “Charm necklace or bracelet” in Products." htmlFor="cs-price">
          <input id="cs-price" type="number" min="0" step="0.01" value={price} onChange={(e) => { setSaved(false); setPrice(e.target.value); }} className={inputClass} />
        </Field>
        <Field label="Most charms on one chain" htmlFor="cs-max">
          <input id="cs-max" type="number" min="1" max="30" value={max} onChange={(e) => { setSaved(false); setMax(e.target.value); }} className={inputClass} />
        </Field>
        <button disabled={pending} className={buttonClass}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Save
        </button>
      </form>
      <FormError error={error} />
      {saved && <p className="mt-2 text-sm text-emerald-700">Saved.</p>}
    </Card>
  );
}

const BATCH = 50;
const PARALLEL = 3;
const PREVIEW = 24;

type Preview = { name: string; url: string | null; problem?: string; label: string };

const priceText = (cents: number | null) => (cents === null ? "standard price" : `$${cents / 100}`);

function CharmImport() {
  const folder = useRef<HTMLInputElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [ignored, setIgnored] = useState(0);
  const [level, setLevel] = useState<CutLevel>("normal");
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = plans.filter((p) => p.row);
  const invalid = plans.filter((p) => !p.row);

  // "turkish / gold / $8: 120 photos"
  const groups = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of valid) {
      const key = `${p.row!.family === "turkish" ? "Turkish charms" : "Charms"} · ${p.row!.metal} · ${priceText(p.row!.priceCents)}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [valid]);

  const choose = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const planned = planCharmFiles(Array.from(list));
    setPlans(planned.plans);
    setIgnored(planned.ignored);
    setPreviews([]);
    setResult(null);
    setError(null);
    setFailed([]);
    setDone(0);
  };

  // Cuts out a spread of photos so the result can be judged on the beige page before importing everything.
  const preview = async () => {
    setPreviewing(true);
    setError(null);
    const step = Math.max(1, Math.floor(valid.length / PREVIEW));
    const sample = valid.filter((_, i) => i % step === 0).slice(0, PREVIEW);
    const next: Preview[] = [];
    for (const p of sample) {
      const label = `${p.row!.family === "turkish" ? "Turkish" : "Charms"} · ${p.row!.metal} · ${priceText(p.row!.priceCents)}`;
      try {
        const blob = await cutout(p.file, level);
        next.push({ name: p.file.name, url: URL.createObjectURL(blob), label });
      } catch (e) {
        next.push({ name: p.file.name, url: null, problem: e instanceof Error ? e.message : "Failed", label });
      }
    }
    setPreviews((old) => {
      old.forEach((o) => o.url && URL.revokeObjectURL(o.url));
      return next;
    });
    setPreviewing(false);
  };

  const run = async () => {
    setError(null);
    setResult(null);
    setFailed([]);
    setBusy(true);
    setDone(0);
    try {
      const uploaded: CharmImportRow[] = [];
      const problems: string[] = [];
      let next = 0;
      const worker = async () => {
        while (next < valid.length) {
          const p = valid[next++];
          try {
            const blob = await cutout(p.file, level);
            const target = await createCharmItemUpload({ contentType: blob.type, size: blob.size });
            if (!target.ok || !target.data) throw new Error(target.ok ? "upload failed" : target.error);
            const put = await fetch(target.data.uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": blob.type } });
            if (!put.ok) throw new Error(`upload failed (${put.status})`);
            uploaded.push({ ...p.row!, url: target.data.publicUrl, priceCents: p.row!.priceCents });
          } catch (e) {
            problems.push(`${p.file.webkitRelativePath || p.file.name}: ${e instanceof Error ? e.message : "failed"}`);
          }
          setDone(uploaded.length + problems.length);
        }
      };
      await Promise.all(Array.from({ length: Math.min(PARALLEL, valid.length) }, worker));

      let created = 0;
      let updated = 0;
      for (let i = 0; i < uploaded.length; i += BATCH) {
        const saved = await importCharmItems(uploaded.slice(i, i + BATCH));
        if (!saved.ok) throw new Error(saved.error);
        created += saved.data?.created ?? 0;
        updated += saved.data?.updated ?? 0;
      }
      setFailed(problems);
      setResult(
        `Done: ${created} new charm${created === 1 ? "" : "s"}, ${updated} photo${updated === 1 ? "" : "s"} replaced${problems.length ? `, ${problems.length} failed (below)` : ""}.`,
      );
      setPlans([]);
      setPreviews([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Import charm photos"
      actions={
        <>
          <input
            ref={folder}
            type="file"
            hidden
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={(e) => {
              choose(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={files}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              choose(e.target.files);
              e.target.value = "";
            }}
          />
          <button type="button" disabled={busy} onClick={() => folder.current?.click()} className={secondaryButtonClass}>
            <Upload className="size-4" aria-hidden />
            Choose a folder
          </button>
          <button type="button" disabled={busy} onClick={() => files.current?.click()} className={secondaryButtonClass}>
            Choose files
          </button>
        </>
      }
    >
      <ul className="mb-3 list-disc ps-5 text-xs text-muted">
        <li>
          Put the photos in folders: <b>family / metal / price</b>, e.g. <b>turkish / gold / 8 / IMG_001.jpg</b>. Family = <b>charms</b> or <b>turkish</b>, metal =
          <b> gold</b> or <b>silver</b>, the folder named with a number is the price in dollars. Then choose the main folder once.
        </li>
        <li>Photos can have a white background: it is removed here, and each charm is centered on a transparent 800×800 picture.</li>
        <li>Without a price folder the standard charm price is used. A charm already there (same family, metal and file name) only gets the new photo.</li>
      </ul>
      <FormError error={error} />
      {result && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{result}</p>}
      {failed.length > 0 && (
        <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-line p-2 text-xs text-red-700">
          {failed.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
      {plans.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            <b>{valid.length}</b> ready
            {invalid.length > 0 && (
              <>
                , <b className="text-red-700">{invalid.length}</b> with a problem (skipped)
              </>
            )}
            {ignored > 0 && <span className="text-muted"> · {ignored} other files ignored</span>}.
          </p>
          {groups.length > 0 && (
            <ul className="grid gap-x-4 text-xs text-muted sm:grid-cols-2">
              {groups.map(([label, count]) => (
                <li key={label} className="flex justify-between gap-2">
                  <span>{label}</span>
                  <span className="tabular-nums text-foreground">{count}</span>
                </li>
              ))}
            </ul>
          )}
          {invalid.length > 0 && (
            <ul className="max-h-40 overflow-y-auto rounded-lg border border-line p-2 text-xs text-red-700">
              {invalid.slice(0, 200).map((p) => (
                <li key={p.file.webkitRelativePath || p.file.name}>
                  {p.file.webkitRelativePath || p.file.name}: {p.problem}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Remove the white background" htmlFor="cut-level" className="min-w-56">
              <select id="cut-level" value={level} onChange={(e) => setLevel(e.target.value as CutLevel)} className={inputClass}>
                {cutLevels.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
            <button type="button" disabled={busy || previewing || valid.length === 0} onClick={preview} className={secondaryButtonClass}>
              {previewing && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Preview {Math.min(PREVIEW, valid.length)} photos
            </button>
            <button type="button" disabled={busy || valid.length === 0} onClick={run} className={buttonClass}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Import {valid.length} charm{valid.length === 1 ? "" : "s"}
            </button>
            {busy && (
              <span className="text-sm text-muted">
                {done} / {valid.length} done…
              </span>
            )}
          </div>
          {previews.length > 0 && (
            <>
              <p className="text-xs text-muted">How they will look on the Charms page (beige). If the edges look wrong, change the setting above and preview again.</p>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {previews.map((p) => (
                  <li key={p.name} className="overflow-hidden rounded-lg border border-line">
                    <div className="aspect-square bg-[#efe6d8]">
                      {p.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.url} alt="" className="size-full object-contain" />
                      ) : (
                        <p className="p-2 text-[11px] text-red-700">{p.problem}</p>
                      )}
                    </div>
                    <p className="truncate px-1.5 py-1 text-[10px] text-muted" title={`${p.name} · ${p.label}`}>
                      {p.label}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function ItemRow({
  item,
  hasFamilies,
  checked,
  onCheck,
  onSave,
}: {
  item: CharmItemInput;
  hasFamilies: boolean;
  checked: boolean;
  onCheck: (on: boolean) => void;
  onSave: (s: CharmItemInput) => void;
}) {
  const [s, setS] = useState(item);
  const [deleting, setDeleting] = useState(false);
  const set = <K extends keyof CharmItemInput>(k: K, v: CharmItemInput[K]) => setS((p) => ({ ...p, [k]: v }));
  const id = s.id!;
  return (
    <li className={`flex gap-3 rounded-lg border p-3 sm:flex-row ${checked ? "border-ink bg-surface/60" : "border-line"} ${s.isActive ? "" : "opacity-70"}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onCheck(e.target.checked)} aria-label={`Tick ${s.nameEn}`} className="mt-1 size-5 shrink-0 accent-[var(--cedar)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
        {/* The photos are transparent cut-outs: shown whole, on the beige of the Charms page. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.url} alt="" className="size-24 shrink-0 rounded-md border border-line bg-[#efe6d8] object-contain" />
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          <Field label="Name (English)" htmlFor={`ci-en-${id}`}>
            <input id={`ci-en-${id}`} maxLength={80} value={s.nameEn} onChange={(e) => set("nameEn", e.target.value)} className={inputClass} />
          </Field>
          {hasFamilies && (
            <>
              <Field label="Family" htmlFor={`ci-fa-${id}`}>
                <select id={`ci-fa-${id}`} value={s.family} onChange={(e) => set("family", e.target.value as "charms" | "turkish")} className={inputClass}>
                  <option value="charms">Charms</option>
                  <option value="turkish">Turkish charms</option>
                </select>
              </Field>
              <Field label="Metal" htmlFor={`ci-me-${id}`} hint={s.code ? `Code: ${s.code}` : undefined}>
                <select id={`ci-me-${id}`} value={s.metal} onChange={(e) => set("metal", e.target.value as "gold" | "silver" | "")} className={inputClass}>
                  <option value="">Both metals</option>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                </select>
              </Field>
            </>
          )}
          <Field label="Price ($, optional)" htmlFor={`ci-pr-${id}`}>
            <input id={`ci-pr-${id}`} type="number" min={0} step="0.01" value={s.price} onChange={(e) => set("price", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Order" htmlFor={`ci-or-${id}`}>
            <input id={`ci-or-${id}`} type="number" min={0} value={s.order} onChange={(e) => set("order", e.target.value)} className={inputClass} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.inStock} onChange={(e) => set("inStock", e.target.checked)} className="size-5 accent-[var(--cedar)]" />
            In stock
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.isActive} onChange={(e) => set("isActive", e.target.checked)} className="size-5 accent-[var(--cedar)]" />
            Show on the website
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" className={buttonClass} onClick={() => onSave(s)}>
              Save
            </button>
            <button
              type="button"
              disabled={deleting}
              className={dangerButtonClass}
              onClick={async () => {
                if (!confirm("Delete this charm?")) return;
                setDeleting(true);
                await deleteCharmItem(id);
                setDeleting(false);
              }}
            >
              <Trash2 className="size-4" aria-hidden /> Delete
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
