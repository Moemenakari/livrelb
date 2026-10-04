"use client";

import { useId, useState } from "react";
import { useLocale } from "next-intl";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { productHref } from "@/config/navigation";
import { fonts as fontInfo, textScript } from "@/lib/catalog/materials";
import type { ChainConnection, FontKey, MaterialKey } from "@/lib/catalog/types";
import { NAME_MAX_LENGTH, NamePreview } from "@/components/preview/name-preview";

const metals: { key: MaterialKey; label: "gold" | "silver"; swatch: string }[] = [
  { key: "gold", label: "gold", swatch: "#d9b76e" },
  { key: "silver", label: "silver", swatch: "#c9ccd1" },
];

const toggle = "rounded-full border px-3 py-1.5 text-xs transition-colors";
const on = "border-ink bg-ink text-white";
const off = "border-line hover:border-muted";

/** The piece the card designs; its default font draws the name. */
const PRODUCT = "cursive-name-necklace";

// Small "try your name" card in the hero (brief §8.1.2): type a name, pick
// gold / silver and where the chain attaches.
export function HeroMiniPreview({ fonts }: { fonts: FontKey[] }) {
  const t = useTranslations("home.mini");
  const id = useId();
  const [text, setText] = useState("");
  const [material, setMaterial] = useState<MaterialKey>("gold");
  const [connection, setConnection] = useState<ChainConnection>("sides");
  const locale = useLocale() as "en" | "ar";
  // Arrows step through the fonts that can write the typed name (Arabic names
  // get the Arabic fonts, Latin names the Latin ones).
  const [fontIndex, setFontIndex] = useState(0);
  const script = textScript(text || "A");
  const choices = fonts.filter((f) => fontInfo[f].script === script);
  const list = choices.length > 0 ? choices : fonts;
  const font = list[((fontIndex % list.length) + list.length) % list.length];
  const step = (by: number) => setFontIndex((i) => i + by);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-background/90 p-4 shadow-[0_12px_40px_-20px_rgba(43,38,34,0.35)] backdrop-blur sm:flex-row sm:items-center sm:p-5">
      <div className="flex shrink-0 items-center overflow-hidden rounded-xl bg-surface sm:w-52">
        <NamePreview
          text={text}
          material={material}
          font={font}
          connection={connection}
          aspect="strip"
          shine
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <label htmlFor={id} className="font-display text-xl leading-none">
          {t("title")}
        </label>
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={NAME_MAX_LENGTH}
          placeholder={t("inputLabel")}
          autoComplete="off"
          className="h-10 rounded-full border border-line bg-surface px-4 text-sm outline-none placeholder:text-muted focus:border-gold"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label={t("metalLabel")} className="flex gap-1.5">
            {metals.map((m) => (
              <button
                key={m.key}
                type="button"
                aria-pressed={material === m.key}
                onClick={() => setMaterial(m.key)}
                className={`${toggle} flex items-center gap-1.5 ${material === m.key ? on : off}`}
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: m.swatch }}
                />
                {t(m.label)}
              </button>
            ))}
          </div>
          <div role="group" aria-label={t("connectionLabel")} className="flex gap-1.5">
            {(["sides", "center"] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={connection === r}
                onClick={() => setConnection(r)}
                className={`${toggle} ${connection === r ? on : off}`}
              >
                {t(r)}
              </button>
            ))}
          </div>
          <div role="group" aria-label={t("fontLabel")} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={t("prevFont")}
              className="flex size-9 items-center justify-center rounded-full border border-line hover:border-muted"
            >
              <ChevronLeft className="size-4 rtl:-scale-x-100" strokeWidth={1.5} aria-hidden />
            </button>
            <span className="flex min-w-16 flex-col items-center text-center leading-tight" aria-live="polite">
              <span className="text-xs">{fontInfo[font].name[locale]}</span>
              <span className="text-[10px] text-muted">{fontInfo[font].style[locale]}</span>
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={t("nextFont")}
              className="flex size-9 items-center justify-center rounded-full border border-line hover:border-muted"
            >
              <ChevronRight className="size-4 rtl:-scale-x-100" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          <Link
            // Carry the design over so the product page opens already filled.
            href={{
              pathname: productHref(PRODUCT),
              query: { ...(text.trim() && { name: text.trim() }), material, connection, font },
            }}
            className="ms-auto inline-flex items-center gap-1 text-sm font-medium text-gold-dark underline-offset-4 hover:underline"
          >
            {t("cta")}
            <ArrowRight className="size-4 rtl:-scale-x-100" strokeWidth={1.5} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
