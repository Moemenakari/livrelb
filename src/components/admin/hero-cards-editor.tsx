"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, Eye, EyeOff, ImagePlus, Loader2, MessageSquareQuote, Plus, StickyNote, X } from "lucide-react";
import type en from "../../../messages/en.json";
import { createTileUpload } from "@/lib/admin/home-actions";
import { HERO_ICONS, HERO_PRICE_MAX, HERO_ROWS, HERO_TEXT_MAX, MAX_PER_ROW, blankHeroCard, cardsOfRow, type HeroCard, type HeroRow } from "@/lib/hero-cards";
import { HeroIcon, WallCard, type WallCardData } from "@/components/home/hero-wall-card";
import { Field, inputClass, secondaryButtonClass, smallButtonClass } from "./ui";

export type HeroLabels = typeof en.adminHeroCards;
export type ReviewOption = { id: string; rating: number; text: string; author: string; city: string };

// A photo on a card is shown very small: a 160 px square (centre crop) as WebP, a few KB.
async function toThumb(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 160;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 160, 160);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob) throw new Error("");
  return blob;
}

/** Uploads to the shop's photo storage (the same signed upload the Home page tiles use); returns the public address. */
async function uploadToR2(blob: Blob): Promise<string> {
  const target = await createTileUpload({ contentType: "image/webp", size: blob.size });
  if (!target.ok || !target.data) throw new Error(target.ok ? "" : target.error);
  const put = await fetch(target.data.uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "image/webp" } });
  if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
  return target.data.publicUrl;
}

type Props = {
  cards: HeroCard[];
  onChange: (cards: HeroCard[]) => void;
  reviews: ReviewOption[];
  labels: HeroLabels;
  /** Sends the small photo somewhere and returns its address (tests replace it). */
  upload?: (blob: Blob) => Promise<string>;
};

// The cards behind the Lira coin (Admin > Settings): three rows, each with its own list. A card is a note
// (icon or a very small photo, text, stars, price) or one of the shop's approved reviews, with a live preview.
export function HeroCardsEditor({ cards, onChange, reviews, labels, upload = uploadToR2 }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<{ id: string; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoFor = useRef<string | null>(null);
  // An upload can finish after other edits: always change the latest list, never an old copy.
  const latest = useRef(cards);
  useEffect(() => {
    latest.current = cards;
  });

  const update = (id: string, patch: Partial<HeroCard>) => onChange(latest.current.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id: string) => onChange(cards.filter((c) => c.id !== id));
  const add = (kind: HeroCard["kind"], row: HeroRow) => {
    const card = blankHeroCard(kind, row);
    onChange([...cards, card]);
    setOpenId(card.id);
  };
  // Up / down inside the card's own row.
  const move = (id: string, by: -1 | 1) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    const same = cardsOfRow(cards, card.row);
    const j = same.findIndex((c) => c.id === id) + by;
    if (j < 0 || j >= same.length) return;
    const next = [...cards];
    const a = cards.indexOf(card);
    const b = cards.indexOf(same[j]);
    [next[a], next[b]] = [next[b], next[a]];
    onChange(next);
  };
  // To another row: at the end of it.
  const changeRow = (id: string, row: HeroRow) => {
    const card = cards.find((c) => c.id === id);
    if (card && card.row !== row) onChange([...cards.filter((c) => c.id !== id), { ...card, row }]);
  };

  const pickPhoto = (id: string) => {
    photoFor.current = id;
    fileRef.current?.click();
  };
  const onFile = async (file: File | undefined) => {
    const id = photoFor.current;
    if (!file || !id) return;
    setPhotoError(null);
    setBusyId(id);
    try {
      update(id, { imageUrl: await upload(await toThumb(file)) });
    } catch (e) {
      setPhotoError({ id, message: e instanceof Error && e.message ? e.message : labels.uploadFailed });
    } finally {
      setBusyId(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const rowTitle = (row: HeroRow) => labels.rowTitle.replace("{n}", String(row));
  const preview = (c: HeroCard): WallCardData | null => {
    if (c.kind === "note") return { kind: "note", icon: c.icon, text: c.text, stars: c.stars, price: c.price, imageUrl: c.imageUrl };
    const r = reviews.find((x) => x.id === c.reviewId);
    return r ? { kind: "review", rating: r.rating, text: r.text, author: r.author, city: r.city } : null;
  };
  const summary = (c: HeroCard) => {
    if (c.kind === "review") {
      const r = reviews.find((x) => x.id === c.reviewId);
      return r ? `${r.author}: ${r.text}` : labels.kindReview;
    }
    return c.text || c.price || (c.icon ? labels.icons[c.icon] : "") || labels.kindNote;
  };
  const chip = (c: HeroCard) =>
    c.kind === "review" ? (
      <MessageSquareQuote className="size-5 shrink-0 text-cedar" aria-hidden />
    ) : c.imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={c.imageUrl} alt="" className="size-7 shrink-0 rounded object-cover" />
    ) : c.icon ? (
      <HeroIcon icon={c.icon} className="size-5" />
    ) : (
      <StickyNote className="size-5 shrink-0 text-muted" aria-hidden />
    );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted">{labels.hint}</p>
      {cards.length === 0 && <p className="rounded-lg bg-surface px-3 py-2 text-sm text-muted">{labels.empty}</p>}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />

      {HERO_ROWS.map((row) => {
        const list = cardsOfRow(cards, row);
        const full = list.length >= MAX_PER_ROW;
        const right = row !== 2;
        return (
          <section key={row} aria-label={rowTitle(row)} className="rounded-xl border border-line p-3">
            <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="text-sm font-semibold">{rowTitle(row)}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                {right ? <ArrowRight className="size-3" aria-hidden /> : <ArrowLeft className="size-3" aria-hidden />}
                {right ? labels.rowRight : labels.rowLeft}
              </span>
              <span className="ms-auto text-xs text-muted">
                {labels.rowCount.replace("{count}", String(list.length)).replace("{max}", String(MAX_PER_ROW))} · {labels.rowHint}
              </span>
            </header>

            <ol className="mt-3 flex flex-col gap-2">
              {list.length === 0 && <li className="text-sm text-muted">{labels.emptyRow}</li>}
              {list.map((c, i) => {
                const open = openId === c.id;
                const shown = preview(c);
                return (
                  <li key={c.id} className={`rounded-lg border ${c.visible ? "border-line" : "border-dashed border-line bg-surface"}`}>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 p-2">
                      <button type="button" aria-expanded={open} aria-label={`${open ? labels.done : labels.edit}: ${summary(c)}`} onClick={() => setOpenId(open ? null : c.id)} className="flex min-w-0 basis-full items-center gap-2 text-start sm:basis-0 sm:flex-1">
                        {chip(c)}
                        <span className="min-w-0 flex-1 truncate text-sm">{summary(c)}</span>
                        {!c.visible && <span className="shrink-0 text-xs text-muted">{labels.hidden}</span>}
                        <ChevronDown className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
                      </button>
                      <span className="ms-auto flex items-center gap-1">
                        <button type="button" aria-pressed={c.visible} aria-label={c.visible ? labels.hide : labels.show} onClick={() => update(c.id, { visible: !c.visible })} className={smallButtonClass}>
                          {c.visible ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
                        </button>
                        <button type="button" disabled={i === 0} aria-label={labels.moveUp} onClick={() => move(c.id, -1)} className={smallButtonClass}>
                          <ArrowUp className="size-3.5" aria-hidden />
                        </button>
                        <button type="button" disabled={i === list.length - 1} aria-label={labels.moveDown} onClick={() => move(c.id, 1)} className={smallButtonClass}>
                          <ArrowDown className="size-3.5" aria-hidden />
                        </button>
                        <button type="button" aria-label={labels.remove} onClick={() => remove(c.id)} className={`${smallButtonClass} hover:text-red-700`}>
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </span>
                    </div>

                    {open && (
                      <div className="grid gap-4 border-t border-line p-3 md:grid-cols-[minmax(0,1fr)_14rem]">
                        <div className="flex min-w-0 flex-col gap-3">
                          {c.kind === "note" ? (
                            <>
                              <Field label={labels.text} htmlFor={`hc-text-${c.id}`}>
                                <input id={`hc-text-${c.id}`} maxLength={HERO_TEXT_MAX} placeholder={labels.textPlaceholder} value={c.text} onChange={(e) => update(c.id, { text: e.target.value })} className={inputClass} />
                              </Field>
                              <div className="flex flex-col gap-1.5">
                                <span className="text-sm font-medium">{labels.icon}</span>
                                <div role="group" aria-label={labels.icon} className="flex flex-wrap gap-1.5">
                                  <button type="button" aria-pressed={c.icon === ""} onClick={() => update(c.id, { icon: "" })} className={`${smallButtonClass} h-10 ${c.icon === "" ? "border-ink bg-surface" : ""}`}>
                                    {labels.noIcon}
                                  </button>
                                  {HERO_ICONS.map((key) => (
                                    <button
                                      key={key}
                                      type="button"
                                      aria-pressed={c.icon === key}
                                      aria-label={labels.icons[key]}
                                      title={labels.icons[key]}
                                      onClick={() => update(c.id, { icon: key })}
                                      className={`${smallButtonClass} size-10 !px-0 ${c.icon === key ? "border-ink bg-surface" : ""}`}
                                    >
                                      <HeroIcon icon={key} className="size-5" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <span className="text-sm font-medium">{labels.photo}</span>
                                <div className="flex flex-wrap items-center gap-2">
                                  {c.imageUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={c.imageUrl} alt="" className="size-12 rounded-lg object-cover" />
                                  )}
                                  <button type="button" disabled={busyId === c.id} onClick={() => pickPhoto(c.id)} className={secondaryButtonClass}>
                                    {busyId === c.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
                                    {c.imageUrl ? labels.changePhoto : labels.addPhoto}
                                  </button>
                                  {c.imageUrl && (
                                    <button type="button" aria-label={labels.removePhoto} onClick={() => update(c.id, { imageUrl: "" })} className={smallButtonClass}>
                                      <X className="size-3.5" aria-hidden />
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-muted">{labels.photoHint}</p>
                                {photoError?.id === c.id && (
                                  <p className="text-xs text-red-700" role="alert">
                                    {photoError.message}
                                  </p>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <Field label={labels.stars} htmlFor={`hc-stars-${c.id}`}>
                                  <select id={`hc-stars-${c.id}`} value={c.stars} onChange={(e) => update(c.id, { stars: Number(e.target.value) })} className={inputClass}>
                                    <option value={0}>{labels.noStars}</option>
                                    {[1, 2, 3, 4, 5].map((n) => (
                                      <option key={n} value={n}>
                                        {n} ★
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                                <Field label={labels.price} htmlFor={`hc-price-${c.id}`}>
                                  <input id={`hc-price-${c.id}`} maxLength={HERO_PRICE_MAX} placeholder={labels.pricePlaceholder} value={c.price} onChange={(e) => update(c.id, { price: e.target.value })} className={inputClass} />
                                </Field>
                              </div>
                            </>
                          ) : (
                            <Field label={labels.review} htmlFor={`hc-review-${c.id}`}>
                              {reviews.length === 0 ? (
                                <p className="text-sm text-muted">{labels.noReviews}</p>
                              ) : (
                                <select id={`hc-review-${c.id}`} value={c.reviewId} onChange={(e) => update(c.id, { reviewId: e.target.value })} className={inputClass}>
                                  <option value="">{labels.pickReview}</option>
                                  {reviews.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.author}: {r.text.length > 50 ? `${r.text.slice(0, 50)}…` : r.text}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </Field>
                          )}
                          <Field label={labels.moveToRow} htmlFor={`hc-row-${c.id}`}>
                            <select id={`hc-row-${c.id}`} value={c.row} onChange={(e) => changeRow(c.id, Number(e.target.value) as HeroRow)} className={inputClass}>
                              {HERO_ROWS.map((r) => (
                                <option key={r} value={r}>
                                  {rowTitle(r)} ({r !== 2 ? labels.rowRight : labels.rowLeft})
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>

                        <div className="flex min-w-0 flex-col gap-1.5">
                          <span className="text-xs font-medium text-muted">{labels.preview}</span>
                          <ul className="overflow-hidden rounded-xl bg-surface p-2">{shown ? <WallCard card={shown} /> : <li className="h-20 w-52" />}</ul>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" disabled={full} onClick={() => add("note", row)} className={secondaryButtonClass}>
                <Plus className="size-4" aria-hidden /> {labels.addNote}
              </button>
              <button type="button" disabled={full} onClick={() => add("review", row)} className={secondaryButtonClass}>
                <Plus className="size-4" aria-hidden /> {labels.addReview}
              </button>
              {full && <span className="text-xs text-muted">{labels.limit}</span>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
