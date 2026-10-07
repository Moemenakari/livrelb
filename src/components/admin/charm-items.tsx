"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import {
  createCharmItemUpload,
  deleteCharmItem,
  importCharmItems,
  saveCharmItem,
  type CharmImportRow,
  type CharmItemInput,
} from "@/lib/admin/charm-actions";
import { toWebp } from "./media-manager";
import { FormError, useSave } from "./promo-forms";
import { Card, Field, buttonClass, inputClass, secondaryButtonClass } from "./ui";

const SHOWN = 40;

// The charms with photos: a name, a family (Charms / Turkish), a metal and
// (optionally) a price. They show on the Charms page, where customers add them
// to their design. Bulk import below; each charm is also editable here.
export function CharmItems({ items, defaultPrice }: { items: CharmItemInput[]; defaultPrice: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(SHOWN);
  const file = useRef<HTMLInputElement>(null);
  const { error: saveError, save } = useSave();
  const hasFamilies = items.some((i) => i.family !== undefined);

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
    () => (q ? items.filter((i) => `${i.nameEn} ${i.nameAr} ${i.code ?? ""}`.toLowerCase().includes(q)) : items),
    [items, q],
  );

  return (
    <div className="flex flex-col gap-4">
      <CharmImport />
      <Card
        title={`Charm photos (${items.length})`}
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
          Each photo is a charm customers can pick on the Charms page. Write its name. Empty price = the standard charm price ($
          {defaultPrice}). Mark it &quot;Out of stock&quot; when it sells out.
        </p>
        <FormError error={error ?? saveError} />
        {items.length > 8 && (
          <input
            type="search"
            aria-label="Search charms"
            placeholder="Search by name or code…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(SHOWN);
            }}
            className={`${inputClass} mb-3`}
          />
        )}
        <ul className="flex flex-col gap-3">
          {filtered.slice(0, shown).map((s) => (
            <ItemRow key={s.id} item={s} hasFamilies={hasFamilies} onSave={(next) => save(() => saveCharmItem(next))} />
          ))}
        </ul>
        {filtered.length > shown && (
          <button type="button" onClick={() => setShown((n) => n + SHOWN)} className={`${secondaryButtonClass} mt-3`}>
            Show {Math.min(SHOWN, filtered.length - shown)} more ({filtered.length - shown} left)
          </button>
        )}
        {items.length === 0 && <p className="text-sm text-muted">No charm photos yet. Import or add photos to start.</p>}
      </Card>
    </div>
  );
}

// Photo files are named family_metal_code.png: turkish_gold_heart-01.png is the
// Turkish charm "heart-01" in gold. A charm already there (same family, metal and
// code) only gets the new photo; its name and price stay.
const FILE_NAME = /^(charms|turkish)_(gold|silver)_([a-z0-9-]{1,60})\.png$/;
const BATCH = 50;
const PARALLEL = 4;

type Planned = { file: File; row?: Omit<CharmImportRow, "url">; problem?: string };

function plan(files: File[]): Planned[] {
  const seen = new Set<string>();
  return files.map((file) => {
    const m = FILE_NAME.exec(file.name.toLowerCase());
    if (!m) return { file, problem: "Name must be family_metal_code.png, e.g. turkish_gold_heart-01.png" };
    if (file.type !== "image/png") return { file, problem: "Not a PNG" };
    if (file.size > 3 * 1024 * 1024) return { file, problem: "Bigger than 3 MB" };
    const row = { family: m[1] as CharmImportRow["family"], metal: m[2] as CharmImportRow["metal"], code: m[3] };
    const key = `${row.family}|${row.metal}|${row.code}`;
    if (seen.has(key)) return { file, problem: "The same charm twice in this import" };
    seen.add(key);
    return { file, row };
  });
}

/** Warnings only: a square 800 x 800 picture whose corners are transparent. */
async function warnings(file: File): Promise<string[]> {
  const out: string[] = [];
  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width !== bitmap.height) out.push(`not square (${bitmap.width}×${bitmap.height})`);
    else if (bitmap.width !== 800) out.push(`${bitmap.width}×${bitmap.height}, not 800×800`);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 16;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0, 16, 16);
    bitmap.close();
    const alpha = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[3];
    if ([alpha(0, 0), alpha(15, 0), alpha(0, 15), alpha(15, 15)].every((a) => a === 255)) out.push("the corners are not transparent (background left?)");
  } catch {
    out.push("could not be read as a picture");
  }
  return out;
}

function CharmImport() {
  const input = useRef<HTMLInputElement>(null);
  const [planned, setPlanned] = useState<Planned[]>([]);
  const [warned, setWarned] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = planned.filter((p) => p.row);
  const invalid = planned.filter((p) => !p.row);

  const choose = async (list: FileList) => {
    setResult(null);
    setError(null);
    setDone(0);
    const next = plan(Array.from(list));
    setPlanned(next);
    const found: Record<string, string[]> = {};
    for (const p of next) {
      if (!p.row) continue;
      const w = await warnings(p.file);
      if (w.length > 0) found[p.file.name] = w;
    }
    setWarned(found);
  };

  const run = async () => {
    setError(null);
    setResult(null);
    setBusy(true);
    setDone(0);
    try {
      // Upload in parallel (a few at a time), then register them 50 at a time.
      const uploaded: CharmImportRow[] = [];
      let next = 0;
      const worker = async () => {
        while (next < valid.length) {
          const p = valid[next++];
          const target = await createCharmItemUpload({ contentType: "image/png", size: p.file.size });
          if (!target.ok || !target.data) throw new Error(`${p.file.name}: ${target.ok ? "upload failed" : target.error}`);
          const put = await fetch(target.data.uploadUrl, { method: "PUT", body: p.file, headers: { "Content-Type": "image/png" } });
          if (!put.ok) throw new Error(`${p.file.name}: upload failed (${put.status})`);
          uploaded.push({ ...p.row!, url: target.data.publicUrl });
          setDone(uploaded.length);
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
      setResult(`Done: ${created} new charm${created === 1 ? "" : "s"}, ${updated} photo${updated === 1 ? "" : "s"} replaced.`);
      setPlanned([]);
      setWarned({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Import charm photos (bulk)"
      actions={
        <>
          <input ref={input} type="file" multiple accept="image/png" hidden onChange={(e) => e.target.files && choose(e.target.files)} />
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className={secondaryButtonClass}>
            <Upload className="size-4" aria-hidden />
            Choose PNG files
          </button>
        </>
      }
    >
      <ul className="mb-3 list-disc ps-5 text-xs text-muted">
        <li>
          Transparent PNG (background removed), square 800×800, the charm centered. Up to 3 MB each.
        </li>
        <li>
          File name: <b>family_metal_code.png</b>, with family = <b>charms</b> or <b>turkish</b>, metal = <b>gold</b> or <b>silver</b>, code = letters, numbers and
          dashes. Example: <b>turkish_gold_heart-01.png</b>.
        </li>
        <li>The name is made from the code (heart-01 → Heart 01) and the price is the standard charm price. Edit them below after the import.</li>
        <li>Importing a file again with the same name only replaces its photo.</li>
      </ul>
      <FormError error={error} />
      {result && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{result}</p>}
      {planned.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            <b>{valid.length}</b> ready{invalid.length > 0 && <>, <b className="text-red-700">{invalid.length}</b> with a problem (skipped)</>}
            {Object.keys(warned).length > 0 && <>, <b className="text-amber-700">{Object.keys(warned).length}</b> with a warning</>}.
          </p>
          {(invalid.length > 0 || Object.keys(warned).length > 0) && (
            <ul className="max-h-48 overflow-y-auto rounded-lg border border-line p-2 text-xs">
              {invalid.map((p) => (
                <li key={p.file.name} className="text-red-700">
                  {p.file.name}: {p.problem}
                </li>
              ))}
              {Object.entries(warned).map(([name, w]) => (
                <li key={name} className="text-amber-700">
                  {name}: {w.join(", ")}
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-3">
            <button type="button" disabled={busy || valid.length === 0} onClick={run} className={buttonClass}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Import {valid.length} charm{valid.length === 1 ? "" : "s"}
            </button>
            {busy && (
              <span className="text-sm text-muted">
                {done} / {valid.length} uploaded…
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function ItemRow({ item, hasFamilies, onSave }: { item: CharmItemInput; hasFamilies: boolean; onSave: (s: CharmItemInput) => void }) {
  const [s, setS] = useState(item);
  const [deleting, setDeleting] = useState(false);
  const set = <K extends keyof CharmItemInput>(k: K, v: CharmItemInput[K]) => setS((p) => ({ ...p, [k]: v }));
  const id = s.id!;
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line p-3 sm:flex-row">
      {/* The photos are transparent cut-outs: shown whole. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.url} alt="" className="size-24 shrink-0 rounded-md border border-line bg-surface object-contain" />
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
            className={secondaryButtonClass}
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
    </li>
  );
}
