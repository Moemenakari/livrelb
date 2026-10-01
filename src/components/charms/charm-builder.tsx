"use client";

import { useDeferredValue, useId, useMemo, useRef, useState, useTransition } from "react";
import { Check, ImagePlus, Loader2, MessageCircle, Search, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { whatsappUrl } from "@/config/site";
import { allShapes, findShape, groupOrder, MAX_CHARMS, type CharmGroup, type CharmShape } from "@/lib/charms";
import { createCharmPhotoUpload, submitCharmRequest, type CharmRequestResult } from "@/lib/charms/actions";
import type { StockCharm } from "@/lib/charms/data";
import type { MetalTone } from "@/lib/catalog/types";
import { formatPrice } from "@/lib/format";
import { metalEdge } from "@/components/preview/metal";
import { ScrollRow } from "@/components/ui/scroll-row";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { CharmArt, CharmDefs } from "./charm-art";

type Props = {
  /** Shop WhatsApp number; empty hides every WhatsApp button. */
  whatsapp: string;
  /** R2 is set up, so photos can be uploaded. */
  uploadEnabled: boolean;
  /** Price of one charm in USD (Settings). */
  price: number;
  /** Turkish charms in stock, added by staff in the admin. */
  stock: StockCharm[];
};

type Tab = "shapes" | "stock" | "photo";
/** What is on the chain: a drawn shape or a charm from stock. */
type Entry = { key: string; price: number; name: { en: string; ar: string } } & ({ shape: CharmShape } | { image: string });

const PAGE = 60;
const MAX_PHOTO = 5 * 1024 * 1024;
const input =
  "h-12 w-full rounded-lg border border-line bg-background px-4 text-base outline-none placeholder:text-muted focus:border-gold";
const chip = "shrink-0 rounded-full border px-3.5 py-2 text-sm transition-colors";

// Charms page: choose drawn shapes (292) or the Turkish charms in stock, or
// upload a picture of the charms you want. Every charm costs the same price
// (Settings), in gold or silver. The request goes to the team.
export function CharmBuilder({ whatsapp, uploadEnabled, price, stock }: Props) {
  const t = useTranslations("charms");
  const locale = useLocale() as "en" | "ar";
  const gradient = `charm${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [tab, setTab] = useState<Tab>("shapes");
  const [tone, setTone] = useState<Extract<MetalTone, "gold" | "silver">>("gold");
  const [group, setGroup] = useState<"all" | CharmGroup>("all");
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [shown, setShown] = useState(PAGE);
  const [picked, setPicked] = useState<string[]>([]);
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

  const stockById = useMemo(() => new Map(stock.map((s) => [s.id, s])), [stock]);

  const list = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    return allShapes.filter(
      (s) =>
        (group === "all" || s.group === group) &&
        (!q || s.name.en.toLowerCase().includes(q) || s.name.ar.includes(q) || ("glyph" in s && s.glyph.toLowerCase() === q)),
    );
  }, [group, deferred]);

  const entries: Entry[] = picked.flatMap((key): Entry[] => {
    if (key.startsWith("stock:")) {
      const item = stockById.get(key.slice(6));
      return item ? [{ key, price: item.price, name: item.name, image: item.imageUrl }] : [];
    }
    const shape = findShape(key);
    return shape ? [{ key, price, name: shape.name, shape }] : [];
  });
  const total = entries.reduce((sum, e) => sum + e.price, 0);
  const full = picked.length >= MAX_CHARMS;

  const add = (key: string) => setPicked((p) => (p.length >= MAX_CHARMS ? p : [...p, key]));
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

  const summary = () =>
    [
      t("whatsapp.message"),
      entries.length > 0 && `${t("summary.shapes")}: ${entries.map((e) => e.name.en).join(", ")}`,
      entries.length > 0 && `${t("summary.total")}: ${formatPrice(total)}`,
      `${t("summary.metal")}: ${t(`metal.${tone}`)}`,
      photo && `${t("summary.photo")}: ${photo}`,
      name.trim() && `${t("summary.name")}: ${name.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");

  if (result?.ok) {
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-2xl border border-line bg-surface p-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-cedar text-white">
          <Check className="size-7" aria-hidden />
        </span>
        <h2 className="text-3xl">{t("done.title")}</h2>
        <p className="text-muted">{t("done.text", { ref: result.ref })}</p>
        {result.totalCents !== null && <p className="font-medium">{t("done.total", { total: formatPrice(result.totalCents / 100) })}</p>}
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
  const tabs: Tab[] = ["shapes", "stock", "photo"];

  return (
    <div className="flex flex-col gap-8">
      <CharmDefs id={gradient} tone={tone} />

      {/* How to choose + metal */}
      <div className="flex flex-col gap-4">
        <div role="tablist" aria-label={t("tabs.label")} className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1">
          {tabs.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              id={`charm-tab-${k}`}
              aria-selected={tab === k}
              aria-controls={`charm-panel-${k}`}
              onClick={() => setTab(k)}
              className={`rounded-full px-2 py-2.5 text-sm transition-colors ${tab === k ? "bg-ink text-white" : "hover:bg-background"}`}
            >
              {t(`tabs.${k}`)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <p className="text-sm font-medium text-gold-dark">{t("each", { price: formatPrice(price) })}</p>
        </div>
      </div>

      {/* Shapes */}
      {tab === "shapes" && (
        <section id="charm-panel-shapes" role="tabpanel" aria-labelledby="charm-tab-shapes" className="flex flex-col gap-4">
          <p className="text-sm text-muted">{t("count", { count: allShapes.length })}</p>
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

          <ScrollRow className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0" gridFromLg>
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
          </ScrollRow>

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
      )}

      {/* Turkish charms in stock */}
      {tab === "stock" && (
        <section id="charm-panel-stock" role="tabpanel" aria-labelledby="charm-tab-stock" className="flex flex-col gap-4">
          <p className="text-sm text-muted">{t("stock.hint")}</p>
          {stock.length === 0 ? (
            <p className="rounded-xl bg-surface px-5 py-8 text-center text-muted">{t("stock.empty")}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {stock.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={full || !s.inStock}
                    onClick={() => add(`stock:${s.id}`)}
                    aria-label={t("add", { name: s.name[locale] })}
                    className="flex w-full flex-col overflow-hidden rounded-xl border border-line bg-background text-start transition-colors hover:border-gold disabled:opacity-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.imageUrl} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                    <span className="flex flex-col gap-0.5 p-3">
                      <span className="text-sm font-medium">{s.name[locale]}</span>
                      <span className="text-xs text-gold-dark">{s.inStock ? formatPrice(s.price) : t("stock.soldOut")}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Upload a picture */}
      {tab === "photo" && (
        <section id="charm-panel-photo" role="tabpanel" aria-labelledby="charm-tab-photo" className="flex flex-col gap-3 rounded-xl border border-line p-5">
          <ImagePlus className="size-6 text-gold-dark" strokeWidth={1.5} aria-hidden />
          <h2 className="text-xl">{t("photo.title")}</h2>
          <p className="text-sm text-muted">{t("photo.hint")}</p>
          {uploadEnabled ? (
            <>
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
                  <img src={photo} alt="" className="size-20 rounded-lg border border-line object-cover" />
                  <button type="button" onClick={() => setPhoto(null)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
                    <X className="size-4" aria-hidden />
                    {t("photo.remove")}
                  </button>
                </div>
              ) : (
                <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={`${secondaryButton} self-start`}>
                  {uploading && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  {uploading ? t("photo.uploading") : t("photo.choose")}
                </button>
              )}
              {uploadError && (
                <p className="text-sm text-red-700" role="alert">
                  {t("photo.error")}
                </p>
              )}
            </>
          ) : (
            <p className="rounded-lg bg-surface px-4 py-3 text-sm">{t("photo.unavailable")}</p>
          )}
          <p className="text-sm">{t("photo.price")}</p>
          <p className="text-xs text-muted">{t("photo.ai")}</p>
        </section>
      )}

      {/* The chosen charms on a chain, with the total. */}
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
        <ChainPreview entries={entries} gradient={gradient} tone={tone} onRemove={removeAt} removeLabel={(e) => t("remove", { name: e.name[locale] })} />
        <p className="mt-2 text-sm" aria-live="polite">
          {entries.length === 0 ? (
            <span className="text-xs text-muted">{t("empty", { max: MAX_CHARMS })}</span>
          ) : (
            <>
              <strong className="font-semibold">
                {t("total", { count: entries.length, price: formatPrice(total / entries.length), total: formatPrice(total) })}
              </strong>
              <span className="mt-0.5 block text-xs text-muted">{full ? t("full", { max: MAX_CHARMS }) : t("picked")}</span>
            </>
          )}
        </p>
      </section>

      {/* Send */}
      <section className="mx-auto flex w-full max-w-xl flex-col gap-4" aria-labelledby="charms-send">
        <h2 id="charms-send" className="text-3xl">
          {t("form.title")}
        </h2>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(async () => {
              setResult(await submitCharmRequest({ name, phone, items: picked, metal: tone, note, imageUrl: photo ?? "", website }));
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
          {whatsapp && (
            <a href={whatsappUrl(whatsapp, summary())} target="_blank" rel="noopener noreferrer" className={`${secondaryButton} w-full`}>
              <MessageCircle className="size-4.5" aria-hidden />
              {t("whatsapp.cta")}
            </a>
          )}
        </form>
      </section>
    </div>
  );
}

// The chosen charms hanging from a fine chain.
function ChainPreview({
  entries,
  gradient,
  tone,
  onRemove,
  removeLabel,
}: {
  entries: Entry[];
  gradient: string;
  tone: MetalTone;
  onRemove: (index: number) => void;
  removeLabel: (entry: Entry) => string;
}) {
  const W = 360;
  const H = 120;
  const count = entries.length;
  const size = count > 8 ? 26 : count > 5 ? 32 : 38;
  // Quadratic chain: from (0, 10) dipping and back up.
  const point = (u: number) => ({
    x: W * u,
    y: (1 - u) * (1 - u) * 10 + 2 * (1 - u) * u * 100 + u * u * 10,
  });
  const edge = metalEdge[tone];

  return (
    <div className="overflow-hidden rounded-xl bg-surface">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto max-h-28 w-full sm:max-h-none" role="img" aria-label="">
        <path d={`M 0 10 Q ${W / 2} 100 ${W} 10`} fill="none" stroke={edge} strokeWidth="2.2" strokeDasharray="3.2 1.6" strokeLinecap="round" />
        {entries.map((e, i) => {
          const { x, y } = point((i + 1) / (count + 1));
          const k = size / 24;
          return (
            <g key={`${e.key}-${i}`}>
              <circle cx={x} cy={y} r="3.2" fill="none" stroke={`url(#${gradient}-fill)`} strokeWidth="1.6" />
              <g transform={`translate(${x - size / 2} ${y + 3}) scale(${k})`} className="cursor-pointer" onClick={() => onRemove(i)}>
                <title>{removeLabel(e)}</title>
                <rect x="-2" y="-2" width="28" height="28" fill="transparent" />
                {"shape" in e ? (
                  <CharmArt as="g" shape={e.shape} gradient={gradient} tone={tone} />
                ) : (
                  <image href={e.image} x="0" y="0" width="24" height="24" preserveAspectRatio="xMidYMid slice" />
                )}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
