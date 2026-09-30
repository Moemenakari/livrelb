"use client";

import { useRef, useState } from "react";
import { Check, EyeOff, ImagePlus, Loader2, Plus, Star } from "lucide-react";
import { addReview, createReviewPhotoUpload, setReviewApproved, type ReviewInput } from "@/lib/admin/review-actions";
import { toWebp } from "./media-manager";
import { FormError, useSave } from "./promo-forms";
import { Badge, Field, buttonClass, inputClass, secondaryButtonClass, smallButtonClass, textareaClass } from "./ui";

export type ReviewRow = {
  id: string;
  name: string;
  city: string | null;
  rating: number;
  text: string;
  source: string;
  date: string;
  approved: boolean;
  isSample: boolean;
  product: string | null;
  photoUrl: string | null;
  hasCustomer: boolean;
};

function AddReview({ products, onDone }: { products: { id: string; name: string }[]; onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [r, setR] = useState<ReviewInput>({ name: "", city: "", rating: 5, text: "", textAr: "", source: "instagram", productId: "", date: today, photoUrl: "", phone: "", approve: true });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const { pending, error, save } = useSave();
  const set = <K extends keyof ReviewInput>(k: K, v: ReviewInput[K]) => setR((p) => ({ ...p, [k]: v }));

  const upload = async (f: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const blob = await toWebp(f);
      const t = await createReviewPhotoUpload(blob.size);
      if (!t.ok || !t.data) throw new Error(t.ok ? "Upload failed." : t.error);
      const res = await fetch(t.data.uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "image/webp" } });
      if (!res.ok) throw new Error(`Upload failed (${res.status}).`);
      set("photoUrl", t.data.publicUrl);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    }
    setUploading(false);
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save(() => addReview(r), onDone);
      }}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Customer name" htmlFor="rv-name">
          <input id="rv-name" required maxLength={80} value={r.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
        </Field>
        <Field label="City" htmlFor="rv-city">
          <input id="rv-city" maxLength={60} value={r.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Came from" htmlFor="rv-src">
          <select id="rv-src" value={r.source} onChange={(e) => set("source", e.target.value as ReviewInput["source"])} className={inputClass}>
            <option value="instagram">Instagram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="website">Website</option>
          </select>
        </Field>
        <Field label="Date" htmlFor="rv-date">
          <input id="rv-date" type="date" value={r.date} onChange={(e) => set("date", e.target.value)} className={inputClass} />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => set("rating", n)} aria-label={`${n} stars`} aria-pressed={r.rating === n} className="p-1">
              <Star className={`size-6 ${n <= r.rating ? "fill-gold text-gold" : "text-line"}`} />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Review (as she wrote it)" htmlFor="rv-text">
          <textarea id="rv-text" required rows={3} maxLength={2000} dir="auto" value={r.text} onChange={(e) => set("text", e.target.value)} className={textareaClass} />
        </Field>
        <Field label="Arabic translation (optional)" htmlFor="rv-ar">
          <textarea id="rv-ar" rows={3} maxLength={2000} dir="rtl" value={r.textAr} onChange={(e) => set("textAr", e.target.value)} className={textareaClass} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Product (optional)" htmlFor="rv-prod">
          <select id="rv-prod" value={r.productId} onChange={(e) => set("productId", e.target.value)} className={inputClass}>
            <option value="">The shop in general</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Her phone (optional)" hint="If she ordered before, she gets the review points." htmlFor="rv-phone">
          <input id="rv-phone" type="tel" value={r.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} dir="ltr" />
        </Field>
        <Field label="Photo (optional)">
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => file.current?.click()} disabled={uploading} className={secondaryButtonClass}>
              {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
              {r.photoUrl ? "Change" : "Add photo"}
            </button>
            {r.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photoUrl} alt="" className="size-11 rounded object-cover" />
            )}
          </div>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={r.approve} onChange={(e) => set("approve", e.target.checked)} className="size-4 accent-[var(--cedar)]" />
        Show it in the shop now
      </label>
      <FormError error={error ?? uploadError} />
      <button disabled={pending || uploading} className={`${buttonClass} self-start`}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Add review
      </button>
    </form>
  );
}

export function ReviewsManager({ reviews, products, pointsPerReview }: { reviews: ReviewRow[]; products: { id: string; name: string }[]; pointsPerReview: number }) {
  const [adding, setAdding] = useState(false);
  const { pending, error, save } = useSave();

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-line bg-background p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-sans text-base font-semibold">Add a review from Instagram / WhatsApp</h2>
          <button type="button" onClick={() => setAdding((a) => !a)} className={smallButtonClass}>
            <Plus className="size-3.5" aria-hidden /> {adding ? "Close" : "New"}
          </button>
        </div>
        {adding && (
          <div className="mt-3">
            <AddReview products={products} onDone={() => setAdding(false)} />
          </div>
        )}
      </section>

      <FormError error={error} />
      <ul className="flex flex-col gap-2">
        {reviews.map((r) => (
          <li key={r.id} className={`rounded-xl border bg-background p-4 ${r.approved ? "border-line" : "border-amber-300"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 text-sm">
                <p className="font-medium">
                  {r.name}
                  {r.city && <span className="font-normal text-muted"> · {r.city}</span>}
                </p>
                <p className="text-gold" aria-label={`${r.rating} stars`}>
                  {"★".repeat(r.rating)}
                  <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.approved ? <Badge tone="green">Shown</Badge> : <Badge tone="gold">Waiting</Badge>}
                <Badge>{r.source}</Badge>
                {r.isSample && <Badge tone="red">Sample</Badge>}
              </div>
            </div>
            <p className="mt-2 text-sm whitespace-pre-line" dir="auto">
              {r.text}
            </p>
            {r.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photoUrl} alt="" className="mt-2 h-24 rounded-lg object-cover" />
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>
                {r.date}
                {r.product && ` · ${r.product}`}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => save(() => setReviewApproved(r.id, !r.approved))}
                className={smallButtonClass}
              >
                {r.approved ? <EyeOff className="size-3.5" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
                {r.approved ? "Hide" : r.hasCustomer ? `Approve (+${pointsPerReview} points)` : "Approve"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {reviews.length === 0 && <p className="text-sm text-muted">No reviews yet.</p>}
    </div>
  );
}
