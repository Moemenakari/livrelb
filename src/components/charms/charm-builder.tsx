"use client";

import { useDeferredValue, useId, useMemo, useRef, useState, useTransition } from "react";
import { Check, ImagePlus, Loader2, MessageCircle, Search, Sparkles, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { whatsappUrl } from "@/config/site";
import { allShapes, findShape, groupOrder, LETTERS_MAX, MAX_CHARMS, type CharmGroup, type CharmShape } from "@/lib/charms";
import { createCharmPhotoUpload, submitCharmRequest, type CharmRequestResult } from "@/lib/charms/actions";
import type { MetalTone } from "@/lib/catalog/types";
import { metalEdge } from "@/components/preview/metal";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { CharmArt, CharmDefs } from "./charm-art";

type Props = {
  /** Shop WhatsApp number; empty hides every WhatsApp button. */
  whatsapp: string;
  /** R2 is set up, so photos can be uploaded. */
  uploadEnabled: boolean;
};

const PAGE = 60;
const MAX_PHOTO = 5 * 1024 * 1024;
const input =
  "h-12 w-full rounded-lg border border-line bg-background px-4 text-base outline-none placeholder:text-muted focus:border-gold";
const chip = "shrink-0 rounded-full border px-3.5 py-2 text-sm transition-colors";

// Charms page: choose among 290+ shapes and letters, see them hang on a
// chain, add letters and / or a photo, then send the design to the team.
export function CharmBuilder({ whatsapp, uploadEnabled }: Props) {
  const t = useTranslations("charms");
  const locale = useLocale() as "en" | "ar";
  const gradient = `charm${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [tone, setTone] = useState<Extract<MetalTone, "gold" | "silver">>("gold");
  const [group, setGroup] = useState<"all" | CharmGroup>("all");
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [shown, setShown] = useState(PAGE);
  const [picked, setPicked] = useState<string[]>([]);
  const [letters, setLetters] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [result, setResult] = useState<CharmRequestResult | null>(null);
  const [sending, send] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    return allShapes.filter(
      (s) =>
        (group === "all" || s.group === group) &&
        (!q || s.name.en.toLowerCase().includes(q) || s.name.ar.includes(q) || (("glyph" in s) && s.glyph.toLowerCase() === q)),
    );
  }, [group, deferred]);

  const chosen = picked.flatMap((slug) => {
    const s = findShape(slug);
    return s ? [s] : [];
  });
  const full = picked.length >= MAX_CHARMS;

  const add = (slug: string) => setPicked((p) => (p.length >= MAX_CHARMS ? p : [...p, slug]));
  const removeAt = (i: number) => setPicked((p) => p.filter((_, j) => j !== i));

  const upload = async (file: File) => {
    setUploadError(false);
    if (file.size > MAX_PHOTO || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError(true);
      return;
    }
    setUploading(true);
    try {
      const target = await createCharmPhotoUpload(file.type);
      if (!target.ok) throw new Error(target.error);
      const put = await fetch(target.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("put");
      setPhoto(target.publicUrl);
    } catch {
      setUploadError(true);
    } finally {
      setUploading(false);
    }
  };

  const summary = () => {
    const names = chosen.map((s) => s.name.en).join(", ");
    return [
      t("whatsapp.message"),
      names && `${t("summary.shapes")}: ${names}`,
      letters.trim() && `${t("summary.letters")}: ${letters.trim()}`,
      `${t("summary.metal")}: ${t(`metal.${tone}`)}`,
      photo && `${t("summary.photo")}: ${photo}`,
      name.trim() && `${t("summary.name")}: ${name.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  if (result?.ok) {
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-2xl border border-line bg-surface p-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-cedar text-white">
          <Check className="size-7" aria-hidden />
        </span>
        <h2 className="text-3xl">{t("done.title")}</h2>
        <p className="text-muted">{t("done.text", { ref: result.ref })}</p>
        {whatsapp && (
          <a href={whatsappUrl(whatsapp, summary())} target="_blank" rel="noopener noreferrer" className={`${primaryButton} bg-cedar hover:bg-cedar/90`}>
            <MessageCircle className="size-4.5" aria-hidden />
            {t("done.whatsapp")}
          </a>
        )}
        <button
          type="button"
          className={secondaryButton}
          onClick={() => {
            setResult(null);
            setPicked([]);
            setLetters("");
            setPhoto(null);
            setNote("");
          }}
        >
          {t("done.another")}
        </button>
      </section>
    );
  }

  const errorKey = result && !result.ok ? result.error : null;

  return (
    <div className="flex flex-col gap-12">
      <CharmDefs id={gradient} tone={tone} />

      {/* 1. Shapes */}
      <section className="flex flex-col gap-5" aria-labelledby="charms-shapes">
        <div className="flex flex-col gap-1">
          <h2 id="charms-shapes" className="text-3xl">
            {t("stepShapes")}
          </h2>
          <p className="text-sm text-muted">{t("count", { count: allShapes.length })}</p>
        </div>

        <div role="group" aria-label={t("metal.label")} className="flex gap-2">
          {(["gold", "silver"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={tone === m}
              onClick={() => setTone(m)}
              className={`${chip} flex items-center gap-2 ${tone === m ? "border-ink bg-ink text-white" : "border-line hover:border-muted"}`}
            >
              <span aria-hidden className="size-3 rounded-full" style={{ background: m === "gold" ? "#d9b76e" : "#c9ccd1" }} />
              {t(`metal.${m}`)}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-4.5 -translate-y-1/2 text-muted" strokeWidth={1.5} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
            placeholder={t("search")}
            aria-label={t("search")}
            className={`${input} ps-11`}
          />
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
          {(["all", ...groupOrder] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={group === g}
              onClick={() => {
                setGroup(g);
                setShown(PAGE);
              }}
              className={`${chip} ${group === g ? "border-gold bg-gold/10 text-gold-dark" : "border-line hover:border-muted"}`}
            >
              {t(`groups.${g}`)}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <p className="rounded-xl bg-surface px-5 py-8 text-center text-muted">{t("noResults")}</p>
        ) : (
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10">
            {list.slice(0, shown).map((s) => (
              <li key={s.slug}>
                <button
                  type="button"
                  disabled={full}
                  onClick={() => add(s.slug)}
                  aria-label={t("add", { name: s.name[locale] })}
                  title={s.name[locale]}
                  className="flex aspect-square w-full items-center justify-center rounded-xl border border-line bg-background p-2.5 transition-colors hover:border-gold hover:bg-gold/5 active:scale-95 disabled:opacity-40"
                >
                  <CharmArt shape={s} gradient={gradient} tone={tone} className="size-full" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {shown < list.length && (
          <button type="button" className={`${secondaryButton} self-center`} onClick={() => setShown((n) => n + PAGE)}>
            {t("showMore", { left: list.length - shown })}
          </button>
        )}
      </section>

      {/* Preview: the chosen charms on a chain. */}
      <section
        className="sticky bottom-0 z-10 rounded-2xl border border-line bg-background/95 p-4 shadow-[0_-8px_30px_-16px_rgba(43,38,34,0.4)] backdrop-blur lg:static lg:shadow-none"
        aria-label={t("yourDesign")}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">{t("yourDesign")}</h2>
          {picked.length > 0 && (
            <button type="button" onClick={() => setPicked([])} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
              <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
              {t("clear")}
            </button>
          )}
        </div>
        <ChainPreview shapes={chosen} letters={letters.trim()} gradient={gradient} tone={tone} onRemove={removeAt} removeLabel={(s) => t("remove", { name: s.name[locale] })} />
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {picked.length === 0 ? t("empty", { max: MAX_CHARMS }) : full ? t("full", { max: MAX_CHARMS }) : t("picked", { count: picked.length, max: MAX_CHARMS })}
        </p>
      </section>

      {/* 2. Letters */}
      <section className="flex flex-col gap-3" aria-labelledby="charms-letters">
        <h2 id="charms-letters" className="text-3xl">
          {t("stepLetters")}
        </h2>
        <label htmlFor="charms-letters-input" className="text-sm font-medium">
          {t("lettersLabel", { max: LETTERS_MAX })}
        </label>
        <input
          id="charms-letters-input"
          value={letters}
          onChange={(e) => setLetters([...e.target.value].slice(0, LETTERS_MAX).join(""))}
          autoComplete="off"
          dir="auto"
          className={input}
        />
        <p className="text-sm text-muted">{t("lettersHint")}</p>
      </section>

      {/* 3. Photo, AI, WhatsApp */}
      <section className="flex flex-col gap-4" aria-labelledby="charms-idea">
        <h2 id="charms-idea" className="text-3xl">
          {t("stepIdea")}
        </h2>
        <div className="grid gap-3 lg:grid-cols-3">
          {uploadEnabled && (
            <div className="flex flex-col gap-3 rounded-xl border border-line p-5">
              <ImagePlus className="size-6 text-gold-dark" strokeWidth={1.5} aria-hidden />
              <h3 className="text-xl">{t("photo.title")}</h3>
              <p className="text-sm text-muted">{t("photo.hint")}</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                  e.target.value = "";
                }}
              />
              {photo ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="" className="size-16 rounded-lg border border-line object-cover" />
                  <button type="button" onClick={() => setPhoto(null)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
                    <X className="size-4" aria-hidden />
                    {t("photo.remove")}
                  </button>
                </div>
              ) : (
                <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={secondaryButton}>
                  {uploading && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  {uploading ? t("photo.uploading") : t("photo.choose")}
                </button>
              )}
              {uploadError && (
                <p className="text-sm text-red-700" role="alert">
                  {t("photo.error")}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gold/60 bg-gold/5 p-5">
            <Sparkles className="size-6 text-gold-dark" strokeWidth={1.5} aria-hidden />
            <h3 className="text-xl">{t("ai.title")}</h3>
            <p className="text-sm text-muted">{t("ai.text")}</p>
            <span className="self-start rounded-full bg-ink px-3 py-1 text-xs text-white">{t("ai.soon")}</span>
          </div>

          {whatsapp && (
            <div className="flex flex-col gap-3 rounded-xl border border-line p-5">
              <MessageCircle className="size-6 text-cedar" strokeWidth={1.5} aria-hidden />
              <h3 className="text-xl">{t("whatsapp.title")}</h3>
              <p className="text-sm text-muted">{t("whatsapp.text")}</p>
              <a href={whatsappUrl(whatsapp, summary())} target="_blank" rel="noopener noreferrer" className={secondaryButton}>
                {t("whatsapp.cta")}
              </a>
            </div>
          )}
        </div>
      </section>

      {/* 4. Send */}
      <section className="mx-auto flex w-full max-w-xl flex-col gap-4" aria-labelledby="charms-send">
        <h2 id="charms-send" className="text-3xl">
          {t("stepSend")}
        </h2>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(async () => {
              setResult(
                await submitCharmRequest({ name, phone, shapes: picked, letters, metal: tone, note, imageUrl: photo ?? "", website }),
              );
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="charms-name" className="text-sm font-medium">
              {t("form.name")}
            </label>
            <input id="charms-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={80} className={input} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="charms-phone" className="text-sm font-medium">
              {t("form.phone")}
            </label>
            <input
              id="charms-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03 123 456"
              required
              maxLength={25}
              dir="ltr"
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="charms-note" className="text-sm font-medium">
              {t("form.note")}
            </label>
            <textarea
              id="charms-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full rounded-lg border border-line bg-background px-4 py-3 text-base outline-none placeholder:text-muted focus:border-gold"
            />
          </div>
          {/* Honeypot: people never see it. */}
          <input tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} className="absolute -start-[9999px] h-0 w-0 opacity-0" name="website" />
          {errorKey && (
            <p className="rounded-lg bg-surface px-4 py-3 text-sm" role="alert">
              {t(`errors.${errorKey}`)}
            </p>
          )}
          <button type="submit" disabled={sending} className={`${primaryButton} w-full py-4`}>
            {sending && <Loader2 className="size-4.5 animate-spin" aria-hidden />}
            {t("form.submit")}
          </button>
          <p className="text-center text-xs text-muted">{t("form.privacy")}</p>
        </form>
      </section>
    </div>
  );
}

// The chosen charms hanging from a fine chain, plus the letters as a plate.
function ChainPreview({
  shapes,
  letters,
  gradient,
  tone,
  onRemove,
  removeLabel,
}: {
  shapes: CharmShape[];
  letters: string;
  gradient: string;
  tone: MetalTone;
  onRemove: (index: number) => void;
  removeLabel: (shape: CharmShape) => string;
}) {
  const W = 360;
  const H = 130;
  const count = shapes.length;
  const size = count > 8 ? 26 : count > 5 ? 32 : 38;
  // Quadratic chain: from (0, 10) dipping to (180, 70) and back up.
  const point = (t: number) => ({
    x: W * t,
    y: (1 - t) * (1 - t) * 10 + 2 * (1 - t) * t * 100 + t * t * 10,
  });
  const edge = metalEdge[tone];

  return (
    <div className="overflow-hidden rounded-xl bg-surface">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto max-h-28 w-full sm:max-h-none" role="img" aria-label="">
        <path d={`M 0 10 Q ${W / 2} 100 ${W} 10`} fill="none" stroke={edge} strokeWidth="2.2" strokeDasharray="3.2 1.6" strokeLinecap="round" />
        {shapes.map((s, i) => {
          const { x, y } = point((i + 1) / (count + 1));
          const k = size / 24;
          return (
            <g key={`${s.slug}-${i}`}>
              <circle cx={x} cy={y} r="3.2" fill="none" stroke={`url(#${gradient}-fill)`} strokeWidth="1.6" />
              <g transform={`translate(${x - size / 2} ${y + 3}) scale(${k})`} className="cursor-pointer" onClick={() => onRemove(i)}>
                <title>{removeLabel(s)}</title>
                <rect x="-2" y="-2" width="28" height="28" fill="transparent" />
                <CharmArt as="g" shape={s} gradient={gradient} tone={tone} />
              </g>
            </g>
          );
        })}
        {letters && (
          // Drawn inside a 24-high box so the metal gradient (0 to 24) fits it.
          <g transform={`translate(${W / 2} ${H - 34})`}>
            <text
              x="0"
              y="19"
              textAnchor="middle"
              fontSize="24"
              fill={`url(#${gradient}-fill)`}
              stroke={edge}
              strokeWidth="0.4"
              paintOrder="stroke"
              style={{ fontFamily: "var(--font-cormorant), var(--font-naskh), serif" }}
            >
              {letters}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
