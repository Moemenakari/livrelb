"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createCharmItemUpload, deleteCharmItem, saveCharmItem, type CharmItemInput } from "@/lib/admin/charm-actions";
import { toWebp } from "./media-manager";
import { FormError, useSave } from "./promo-forms";
import { Card, Field, buttonClass, inputClass, secondaryButtonClass } from "./ui";

// The Turkish charms we have in stock: a photo, a name and (optionally) a
// price. They show on the Charms page, where customers add them to their design.
export function CharmItems({ items, defaultPrice }: { items: CharmItemInput[]; defaultPrice: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <Card
      title="Turkish charms in stock"
      actions={
        <>
          <input ref={file} type="file" multiple accept="image/*" hidden onChange={(e) => e.target.files && upload(e.target.files)} />
          <button type="button" disabled={busy} onClick={() => file.current?.click()} className={secondaryButtonClass}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
            Add photos
          </button>
        </>
      }
    >
      <p className="mb-3 text-xs text-muted">
        Each photo becomes a charm customers can pick on the Charms page. After uploading, write its name (English and Arabic). Empty price = the standard
        charm price (${defaultPrice}). Mark it &quot;Out of stock&quot; when it sells out.
      </p>
      <FormError error={error ?? saveError} />
      <ul className="flex flex-col gap-3">
        {items.map((s) => (
          <ItemRow key={s.id} item={s} onSave={(next) => save(() => saveCharmItem(next))} />
        ))}
      </ul>
      {items.length === 0 && <p className="text-sm text-muted">No Turkish charms yet. Add photos to start.</p>}
    </Card>
  );
}

function ItemRow({ item, onSave }: { item: CharmItemInput; onSave: (s: CharmItemInput) => void }) {
  const [s, setS] = useState(item);
  const [deleting, setDeleting] = useState(false);
  const set = <K extends keyof CharmItemInput>(k: K, v: CharmItemInput[K]) => setS((p) => ({ ...p, [k]: v }));
  const id = s.id!;
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line p-3 sm:flex-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.url} alt="" className="size-24 shrink-0 rounded-md border border-line object-cover" />
      <div className="grid flex-1 gap-2 sm:grid-cols-2">
        <Field label="Name (English)" htmlFor={`ci-en-${id}`}>
          <input id={`ci-en-${id}`} maxLength={80} value={s.nameEn} onChange={(e) => set("nameEn", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Name (Arabic)" htmlFor={`ci-ar-${id}`}>
          <input id={`ci-ar-${id}`} dir="rtl" maxLength={80} value={s.nameAr} onChange={(e) => set("nameAr", e.target.value)} className={inputClass} />
        </Field>
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
