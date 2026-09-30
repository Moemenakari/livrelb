"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Film, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { createMediaUpload } from "@/lib/admin/product-actions";
import { MAX_PHOTOS, type ProductForm } from "@/lib/admin/product-types";
import { secondaryButtonClass } from "./ui";

type Media = ProductForm["media"];

/**
 * Photos are made smaller and turned into WebP in the browser before the
 * upload (max 1800 px on the long side), so phones upload fast and the
 * storefront stays light.
 */
export async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob) throw new Error("This photo couldn't be converted.");
  return blob;
}

// 1–7 photos + one optional video: upload, drag (or arrows) to reorder,
// star = main photo (first), remove.
export function MediaManager({ slug, media, onChange }: { slug: string; media: Media; onChange: (m: Media) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const photos = media.filter((m) => m.type === "image").length;
  const hasVideo = media.some((m) => m.type === "video");

  const upload = async (files: FileList) => {
    setError(null);
    let next = [...media];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      if (isVideo && next.some((m) => m.type === "video")) {
        setError("Only one video per product.");
        continue;
      }
      if (!isVideo && next.filter((m) => m.type === "image").length >= MAX_PHOTOS) {
        setError(`Up to ${MAX_PHOTOS} photos.`);
        break;
      }
      try {
        setBusy(`Uploading ${file.name}…`);
        const body: Blob = isVideo ? file : await toWebp(file);
        const contentType = isVideo ? file.type : "image/webp";
        const target = await createMediaUpload({ slug: slug || "new", contentType, size: body.size });
        if (!target.ok || !target.data) throw new Error(target.ok ? "Upload failed." : target.error);
        const res = await fetch(target.data.uploadUrl, { method: "PUT", body, headers: { "Content-Type": contentType } });
        if (!res.ok) throw new Error(`Upload failed (${res.status}).`);
        next = [...next, { url: target.data.publicUrl, type: isVideo ? "video" : "image", altEn: "", altAr: "" }];
        onChange(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      }
    }
    setBusy(null);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= media.length || from === to) return;
    const next = [...media];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {media.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {media.map((m, i) => (
            <li
              key={m.url}
              draggable
              onDragStart={() => setDragging(i)}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragging !== null) move(dragging, i);
                setDragging(null);
              }}
              className={`group relative overflow-hidden rounded-lg border bg-surface ${i === 0 ? "border-gold ring-1 ring-gold" : "border-line"} ${dragging === i ? "opacity-50" : ""}`}
            >
              <div className="aspect-square">
                {m.type === "video" ? (
                  <video src={m.url} className="size-full object-cover" muted playsInline preload="metadata" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="size-full cursor-grab object-cover" />
                )}
              </div>
              {i === 0 && m.type === "image" && (
                <span className="absolute start-1 top-1 rounded bg-gold px-1.5 py-0.5 text-[10px] font-medium text-white">Main</span>
              )}
              {m.type === "video" && (
                <span className="absolute start-1 top-1 flex items-center gap-1 rounded bg-ink px-1.5 py-0.5 text-[10px] text-white">
                  <Film className="size-3" aria-hidden /> Video
                </span>
              )}
              <div className="flex justify-between gap-1 border-t border-line bg-background p-1">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded p-1 disabled:opacity-30" aria-label="Move left">
                  <ArrowLeft className="size-3.5" />
                </button>
                {m.type === "image" && i !== 0 && (
                  <button type="button" onClick={() => move(i, 0)} className="rounded p-1" aria-label="Make main photo" title="Make main photo">
                    <Star className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onChange(media.filter((_, j) => j !== i))}
                  className="rounded p-1 text-red-700"
                  aria-label="Remove"
                >
                  <Trash2 className="size-3.5" />
                </button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === media.length - 1} className="rounded p-1 disabled:opacity-30" aria-label="Move right">
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/webm"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) upload(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => input.current?.click()} disabled={Boolean(busy)} className={secondaryButtonClass}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
          {busy ?? "Add photos or a video"}
        </button>
        <span className="text-xs text-muted">
          {photos}/{MAX_PHOTOS} photos{hasVideo ? " · 1 video" : ""}. Drag or use the arrows to reorder; ★ = main photo. Photos are turned into WebP automatically.
        </span>
      </div>
      {media.length === 0 && <p className="text-xs text-muted">No photos yet: the storefront shows the drawn artwork until you add them.</p>}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
