"use client";

import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { MessageCircle, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { whatsappUrl } from "@/config/site";
import { addToCart } from "@/lib/cart";
import { ensureLogin } from "@/components/auth/login-dialog";
import { allShapes, findShape, groupOrder, isGlyph, type CharmGroup } from "@/lib/charms";
import type { CharmFamily, StockCharm } from "@/lib/charms/data";
import type { Localized, MetalTone, ProductArt } from "@/lib/catalog/types";
import { formatPrice } from "@/lib/format";
import { useWhatsappNumber } from "@/lib/use-whatsapp";
import { ScrollRow } from "@/components/ui/scroll-row";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { CharmArt, CharmDefs } from "./charm-art";
import { CharmPreview, type Entry, type Piece, type Sides } from "./charm-preview";

type Metal = Extract<MetalTone, "gold" | "silver">;

const NAME_MAX = 8;
// Every letter (Latin and Arabic) and digit is a charm: a name is typed as its letters.
const glyphSlug = new Map(allShapes.filter(isGlyph).map((s) => [s.glyph.toUpperCase(), s.slug]));
// The demo card slides up this long after the page opens.
const DEMO_MS = 4000;

/** The chain a design hangs on: the "charm-design" product (price and sizes from the admin). */
export type CharmDesign = {
  slug: string;
  name: Localized;
  art: ProductArt;
  /** Price of the chain alone, per metal (USD). */
  base: Record<Metal, number>;
  sizes: Record<Exclude<Piece, "keychain">, { values: number[]; default: number } | null>;
};

type Props = {
  /** Shop WhatsApp number; empty hides every WhatsApp button. */
  whatsapp: string;
  /** Price of one charm in USD (Settings). */
  price: number;
  /** The most charms on one chain (Settings). */
  max: number;
  /** Charms with photos, added or imported by staff. */
  stock: StockCharm[];
  /** null until the database has the chain product: the page then only offers WhatsApp. */
  design: CharmDesign | null;
};

const PAGE = 60;
const input =
  "h-12 w-full rounded-lg border border-line bg-background px-4 text-base outline-none placeholder:text-muted focus:border-gold";
const chip = "shrink-0 rounded-full border px-3.5 py-2 text-sm transition-colors";
const chipOn = "border-ink bg-ink text-white";
const chipOff = "border-line hover:border-muted";

// Charms page: pick charms (drawn shapes, letters and numbers, or the charms
// with photos), in gold or silver, on a necklace or bracelet. The design goes to
// the bag like any piece: chain + each charm, priced again by the server.
export function CharmBuilder({ whatsapp, price, max, stock, design }: Props) {
  const t = useTranslations("charms");
  const tProduct = useTranslations("product");
  const locale = useLocale() as "en" | "ar";
  const gradient = `charm${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const number = useWhatsappNumber(whatsapp);

  const [family, setFamily] = useState<CharmFamily>("charms");
  const [tone, setTone] = useState<Metal>("gold");
  const [piece, setPiece] = useState<Piece>("necklace");
  const [sizes, setSizes] = useState<Partial<Record<Piece, number>>>({});
  const [group, setGroup] = useState<"all" | CharmGroup>("all");
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [shown, setShown] = useState(PAGE);
  const [picked, setPicked] = useState<string[]>([]);
  const [sides, setSides] = useState<Sides>("two");
  const [name, setName] = useState("");
  // The demo card: opens by itself once, stays shut after she closes it.
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setOpen(true), DEMO_MS);
    return () => clearTimeout(id);
  }, []);

  const stockById = useMemo(() => new Map(stock.map((s) => [s.id, s])), [stock]);
  const available = (s: StockCharm) => s.metal === null || s.metal === tone;
  const photoCharms = stock.filter((s) => s.family === family && available(s));

  const q = deferred.trim().toLowerCase();
  const shapes = useMemo(
    () =>
      family !== "charms"
        ? []
        : allShapes.filter(
            (s) =>
              (group === "all" || s.group === group) &&
              (!q || s.name.en.toLowerCase().includes(q) || s.name.ar.includes(q) || ("glyph" in s && s.glyph.toLowerCase() === q)),
          ),
    [family, group, q],
  );
  const photos = group === "all" ? photoCharms.filter((s) => !q || s.name.en.toLowerCase().includes(q) || s.name.ar.includes(q)) : [];

  const entries: Entry[] = picked.flatMap((key): Entry[] => {
    if (key.startsWith("stock:")) {
      const item = stockById.get(key.slice(6));
      return item ? [{ key, price: item.price, name: item.name, image: item.imageUrl }] : [];
    }
    const shape = findShape(key);
    return shape ? [{ key, price, name: shape.name, shape }] : [];
  });
  const counts = new Map<string, number>();
  for (const key of picked) counts.set(key, (counts.get(key) ?? 0) + 1);

  const base = design?.base[tone] ?? 0;
  const charmsTotal = entries.reduce((sum, e) => sum + e.price, 0);
  const total = base + charmsTotal;
  const full = picked.length >= max;

  // The bag takes a chain or a bracelet; a keychain is sent on WhatsApp.
  const bagPiece = piece === "keychain" ? null : piece;
  const sizeList = (bagPiece && design?.sizes[bagPiece]) || null;
  const size = sizeList && bagPiece ? (sizes[bagPiece] ?? sizeList.default) : undefined;

  const show = () => {
    if (!dismissed) setOpen(true);
  };
  const add = (key: string) => {
    setPicked((p) => (p.length >= max ? p : [...p, key]));
    show();
  };
  const addName = () => {
    const keys = [...name.toUpperCase()].flatMap((ch) => glyphSlug.get(ch) ?? []);
    if (keys.length === 0) return;
    setPicked((p) => [...p, ...keys].slice(0, max));
    setName("");
    show();
  };
  const removeAt = (i: number) => setPicked((p) => p.filter((_, j) => j !== i));
  const moveTo = (from: number, to: number) =>
    setPicked((p) => {
      const next = [...p];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });

  const toBag = async () => {
    if (!design || !bagPiece || entries.length === 0) return;
    if (!(await ensureLogin())) return;
    addToCart({
      slug: design.slug,
      name: design.name,
      art: design.art,
      sizeKind: bagPiece === "necklace" ? "chain" : "bracelet",
      size,
      material: tone,
      charms: entries.map((e) => e.key),
      charmNames: entries.map((e) => e.name),
      unitPrice: total,
    });
    setPicked([]);
  };

  const summary = () =>
    [
      t("whatsapp.message"),
      entries.length > 0 && `${t("summary.shapes")}: ${entries.map((e) => e.name.en).join(", ")}`,
      `${t("summary.piece")}: ${t(`piece.${piece}`)}${size ? ` ${size} cm` : ""}`,
      `${t("summary.metal")}: ${t(`metal.${tone}`)}`,
      `${t("summary.sides")}: ${t(`sides.${sides}`)}`,
      entries.length > 0 && design && `${t("summary.total")}: ${formatPrice(total)}`,
    ]
      .filter(Boolean)
      .join("\n");

  const tile =
    "relative flex aspect-square w-full items-center justify-center rounded-xl border bg-background p-2.5 transition-colors active:scale-95 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-8">
      <CharmDefs id={gradient} tone={tone} />

      {/* Filters: family, metal, necklace or bracelet. */}
      <div className="flex flex-col gap-4">
        <div role="group" aria-label={t("family.label")} className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1">
          {(["charms", "turkish"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={family === f}
              onClick={() => {
                setFamily(f);
                setShown(PAGE);
              }}
              className={`rounded-full px-2 py-2.5 text-sm transition-colors ${family === f ? "bg-ink text-white" : "hover:bg-background"}`}
            >
              {t(`family.${f}`)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div role="group" aria-label={t("metal.label")} className="flex gap-2">
            {(["gold", "silver"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={tone === m} onClick={() => {
                  setTone(m);
                  // A photo charm that only exists in the other metal leaves the chain.
                  setPicked((p) =>
                    p.filter((key) => {
                      const item = key.startsWith("stock:") ? stockById.get(key.slice(6)) : undefined;
                      return !item || item.metal === null || item.metal === m;
                    }),
                  );
                }} className={`${chip} flex items-center gap-2 ${tone === m ? chipOn : chipOff}`}>
                <span aria-hidden className="size-3 rounded-full" style={{ background: m === "gold" ? "#d9b76e" : "#c9ccd1" }} />
                {t(`metal.${m}`)}
              </button>
            ))}
          </div>
          <div role="group" aria-label={t("piece.label")} className="flex flex-wrap gap-2">
            {(["necklace", "bracelet", "keychain"] as const).map(
              (p) =>
                (p === "keychain" || !design || design.sizes[p]) && (
                  <button key={p} type="button" aria-pressed={piece === p} onClick={() => setPiece(p)} className={`${chip} ${piece === p ? chipOn : chipOff}`}>
                    {t(`piece.${p}`)}
                  </button>
                ),
            )}
            {sizeList && bagPiece && (
              <select
                aria-label={t("piece.size")}
                value={size}
                onChange={(e) => setSizes((s) => ({ ...s, [bagPiece]: Number(e.target.value) }))}
                className="h-10 rounded-full border border-line bg-background px-3 text-sm"
              >
                {sizeList.values.map((v) => (
                  <option key={v} value={v}>
                    {tProduct("cm", { value: v })}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div role="group" aria-label={t("sides.label")} className="flex gap-2">
            {(["one", "two"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={sides === s} onClick={() => setSides(s)} className={`${chip} ${sides === s ? chipOn : chipOff}`}>
                {t(`sides.${s}`)}
              </button>
            ))}
          </div>
          <p className="text-sm font-medium text-gold-dark">{t("each", { price: formatPrice(price) })}</p>
        </div>
      </div>

      {/* The charms to choose from. */}
      <section className="flex flex-col gap-4" aria-label={t(`family.${family}`)}>
        {family === "charms" && (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addName();
              }}
              className="flex gap-2"
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={NAME_MAX}
                placeholder={t("name.placeholder", { max: NAME_MAX })}
                aria-label={t("name.label")}
                className={input}
              />
              <button type="submit" disabled={full || name.trim() === ""} className={`${secondaryButton} shrink-0`}>
                <Plus className="size-4.5" aria-hidden />
                {t("name.add")}
              </button>
            </form>
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
          </>
        )}

        {family === "turkish" && <p className="text-sm text-muted">{t("stock.hint")}</p>}

        {shapes.length === 0 && photos.length === 0 ? (
          <p className="rounded-xl bg-surface px-5 py-8 text-center text-muted">{family === "turkish" ? t("stock.empty") : t("noResults")}</p>
        ) : (
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10">
            {photos.map((s) => {
              const n = counts.get(`stock:${s.id}`) ?? 0;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={full || !s.inStock}
                    onClick={() => add(`stock:${s.id}`)}
                    aria-label={t("add", { name: s.name[locale] })}
                    title={s.name[locale]}
                    className={`${tile} ${n > 0 ? "border-gold bg-gold/5" : "border-line hover:border-gold"}`}
                  >
                    {/* The photo is a transparent cut-out: shown whole, in its own shape. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.imageUrl} alt="" loading="lazy" className="size-full object-contain" />
                    {!s.inStock && <span className="absolute inset-x-0 bottom-0 rounded-b-xl bg-background/90 py-0.5 text-[10px] text-muted">{t("stock.soldOut")}</span>}
                    {n > 0 && <Count n={n} />}
                  </button>
                </li>
              );
            })}
            {shapes.slice(0, shown).map((s) => {
              const n = counts.get(s.slug) ?? 0;
              return (
                <li key={s.slug}>
                  <button
                    type="button"
                    disabled={full}
                    onClick={() => add(s.slug)}
                    aria-label={t("add", { name: s.name[locale] })}
                    title={s.name[locale]}
                    className={`${tile} ${n > 0 ? "border-gold bg-gold/5" : "border-line hover:border-gold hover:bg-gold/5"}`}
                  >
                    <CharmArt shape={s} gradient={gradient} tone={tone} className="size-full" />
                    {n > 0 && <Count n={n} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {shown < shapes.length && (
          <button type="button" className={`${secondaryButton} self-center`} onClick={() => setShown((n) => n + PAGE)}>
            {t("showMore", { left: shapes.length - shown })}
          </button>
        )}
      </section>

      {/* The chosen charms on a chain, with the price breakdown. */}
      {!open && dismissed && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed end-3 bottom-3 z-30 inline-flex items-center gap-2 rounded-full border border-line/70 bg-surface/90 px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md"
        >
          <ShoppingBag className="size-4.5" strokeWidth={1.5} aria-hidden />
          {t("reopen", { count: picked.length })}
        </button>
      )}
      {open && (
      <section
        className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-md animate-rise-in rounded-2xl border border-line/70 bg-surface/80 p-3 shadow-[0_10px_40px_-14px_rgba(43,38,34,0.45)] backdrop-blur-md lg:inset-x-auto lg:end-6 lg:mx-0 lg:w-[26rem]"
        aria-label={t("yourDesign")}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg">{t("yourDesign")}</h2>
          <div className="flex items-center gap-2">
            {picked.length > 0 && (
              <button type="button" onClick={() => setPicked([])} className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">
                <Trash2 className="size-3.5" strokeWidth={1.5} aria-hidden />
                {t("clear")}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setDismissed(true);
              }}
              aria-label={t("close")}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-background/80 px-3 py-1.5 text-xs font-medium hover:border-muted"
            >
              <X className="size-3.5" strokeWidth={1.5} aria-hidden />
              {t("close")}
            </button>
          </div>
        </div>
        <CharmPreview
          entries={entries}
          gradient={gradient}
          tone={tone}
          piece={piece}
          sides={sides}
          onMove={moveTo}
          onRemove={removeAt}
          removeLabel={(e) => t("remove", { name: e.name[locale] })}
          removeSelected={t("removeSelected")}
          hint={entries.length === 0 ? t("empty", { max }) : t("picked")}
        />
        <div className="text-sm" aria-live="polite">
          {entries.length > 0 && (
            <>
              {design ? (
                <strong className="font-semibold">
                  {t("breakdown", { chain: formatPrice(base), count: entries.length, charms: formatPrice(charmsTotal), total: formatPrice(total) })}
                </strong>
              ) : (
                <strong className="font-semibold">{t("total", { count: entries.length, price: formatPrice(charmsTotal / entries.length), total: formatPrice(charmsTotal) })}</strong>
              )}
              {full && <span className="block text-xs text-muted">{t("full", { max })}</span>}
              {design && bagPiece && <span className="block text-xs text-muted">{t("deliveryNote")}</span>}
              {piece === "keychain" && <span className="block text-xs text-muted">{t("keychainNote")}</span>}
            </>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {design && bagPiece && (
            <button type="button" disabled={entries.length === 0} onClick={toBag} className={`${primaryButton} flex-1`}>
              <ShoppingBag className="size-4.5" aria-hidden />
              {t("addToBag")}
            </button>
          )}
          {number && (
            <a href={whatsappUrl(number, summary())} target="_blank" rel="noopener noreferrer" className={`${secondaryButton} flex-1`}>
              <MessageCircle className="size-4.5" aria-hidden />
              {t("whatsapp.cta")}
            </a>
          )}
        </div>
        {!design && <p className="mt-2 text-xs text-muted">{t("noBag")}</p>}
      </section>
      )}
    </div>
  );
}

/** "×2": how many times this charm is on the chain (shown from the second one). */
function Count({ n }: { n: number }) {
  if (n < 2) return null;
  return (
    <span className="absolute -end-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] leading-5 font-medium text-white" dir="ltr">
      {`×${n}`}
    </span>
  );
}
