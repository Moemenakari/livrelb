"use client";

import { useRef, useState } from "react";
import { Film, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createSlideUpload, deleteHeroSlide, saveHeroSlide, type SlideInput } from "@/lib/admin/promo-actions";
import { toWebp } from "./media-manager";
import { FormError, useSave } from "./promo-forms";
import { Card, Field, buttonClass, inputClass, secondaryButtonClass } from "./ui";

// Photos and short videos behind the homepage headline. With none, the
// homepage shows the 3D Lira coin instead.
export function HeroSlides({ slides }: { slides: SlideInput[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const { error: saveError, save } = useSave();

  const upload = async (f: File) => {
    setError(null);
    setBusy(true);
    try {
      const isVideo = f.type.startsWith("video/");
      const body: Blob = isVideo ? f : await toWebp(f);
      const contentType = isVideo ? f.type : "image/webp";
      const target = await createSlideUpload({ contentType, size: body.size });
      if (!target.ok || !target.data) throw new Error(target.ok ? "Upload failed." : target.error);
      const put = await fetch(target.data.uploadUrl, { method: "PUT", body, headers: { "Content-Type": contentType } });
      if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
      const saved = await saveHeroSlide({
        id: null,
        url: target.data.publicUrl,
        type: isVideo ? "video" : "image",
        headlineEn: "",
        headlineAr: "",
        link: "",
        order: String(slides.length + 1),
        isActive: true,
      });
      if (!saved.ok) throw new Error(saved.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Homepage slides (photos & videos)"
      actions={
        <>
          <input ref={file} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button type="button" disabled={busy} onClick={() => file.current?.click()} className={secondaryButtonClass}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
            Add photo or video
          </button>
        </>
      }
    >
      <p className="mb-3 text-xs text-muted">
        They play behind the big headline on the homepage, one after another. Use tall photos (4:5) for phones, videos up to 40 MB without sound. Empty = the 3D Lira coin.
      </p>
      <FormError error={error ?? saveError} />
      <ul className="flex flex-col gap-3">
        {slides.map((s) => (
          <SlideRow key={s.id} slide={s} onSave={(next) => save(() => saveHeroSlide(next))} />
        ))}
      </ul>
      {slides.length === 0 && <p className="text-sm text-muted">No slides yet: the homepage shows the 3D coin.</p>}
    </Card>
  );
}

function SlideRow({ slide, onSave }: { slide: SlideInput; onSave: (s: SlideInput) => void }) {
  const [s, setS] = useState(slide);
  const [deleting, setDeleting] = useState(false);
  const set = <K extends keyof SlideInput>(k: K, v: SlideInput[K]) => setS((p) => ({ ...p, [k]: v }));
  const id = s.id!;
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line p-3 sm:flex-row">
      <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-md bg-surface">
        {s.type === "video" ? (
          <>
            <video src={s.url} className="size-full object-cover" muted playsInline preload="metadata" />
            <Film className="absolute start-1 top-1 size-4 text-white drop-shadow" aria-hidden />
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.url} alt="" className="size-full object-cover" />
        )}
      </div>
      <div className="grid flex-1 gap-2 sm:grid-cols-2">
        <Field label="Text (English, optional)" htmlFor={`sl-en-${id}`}>
          <input id={`sl-en-${id}`} maxLength={160} value={s.headlineEn} onChange={(e) => set("headlineEn", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Opens (page of the shop)" hint="e.g. /category/bracelets" htmlFor={`sl-ln-${id}`}>
          <input id={`sl-ln-${id}`} dir="ltr" maxLength={200} value={s.link} onChange={(e) => set("link", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Order" htmlFor={`sl-or-${id}`}>
          <input id={`sl-or-${id}`} type="number" min={0} value={s.order} onChange={(e) => set("order", e.target.value)} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={s.isActive} onChange={(e) => set("isActive", e.target.checked)} className="size-5 accent-[var(--cedar)]" />
          Show on the homepage
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
              if (!confirm("Delete this slide?")) return;
              setDeleting(true);
              await deleteHeroSlide(id);
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
