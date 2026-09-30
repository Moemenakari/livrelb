"use client";

import { useEffect, useRef, useState } from "react";
import { fonts as fontInfo, isArabic } from "@/lib/catalog/materials";
import type { FontKey } from "@/lib/catalog/types";
import { scriptFace } from "@/components/preview/script-fonts";

type Props = {
  /** Fonts this product allows, with their name in the page language. */
  fonts: { key: FontKey; name: string }[];
  value: FontKey | undefined;
  /** The customer's name, or the placeholder name when empty. */
  text: string;
  onChange: (font: FontKey) => void;
  label: string;
};

// "Choose font" (brief §8.3.4): a swipeable row of small cards, each
// writing the customer's own name in that font. Arabic names list the
// Arabic fonts first; Latin names hide them (they can't write Latin).
// The fonts download only once the row is near the screen: until then the
// cards show the name in the page font.
export function FontPicker({ fonts, value, text, onChange, label }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const row = rowRef.current;
    if (!row || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      { rootMargin: "200px" },
    );
    observer.observe(row);
    return () => observer.disconnect();
  }, [visible]);

  const arabic = isArabic(text);
  const byScript = (script: "latin" | "arabic") => fonts.filter((f) => fontInfo[f.key].script === script);
  const shown = arabic ? [...byScript("arabic"), ...byScript("latin")] : byScript("latin");

  // The list reorders when the name switches between Arabic and Latin:
  // start from its beginning again (left: 0 is the start in RTL too).
  useEffect(() => {
    rowRef.current?.scrollTo({ left: 0 });
  }, [arabic]);

  return (
    <div
      ref={rowRef}
      role="radiogroup"
      aria-label={label}
      className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0"
    >
      {shown.map((f) => {
        const face = scriptFace(f.key, text);
        const checked = value === f.key;
        return (
          <button
            key={f.key}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(f.key)}
            className={`flex w-28 shrink-0 snap-start flex-col items-center gap-1 rounded-lg border px-2 pt-2.5 pb-2 transition-colors focus-visible:outline-offset-2 ${
              checked ? "border-gold bg-gold/5 ring-1 ring-gold" : "border-line hover:border-muted"
            }`}
          >
            <span
              aria-hidden
              dir="auto"
              className="flex h-10 w-full items-center justify-center overflow-hidden leading-none whitespace-nowrap text-foreground"
              style={
                visible
                  ? {
                      fontFamily: face.family,
                      fontWeight: face.weight,
                      fontSize: `${Math.round(24 * face.scale)}px`,
                    }
                  : { fontSize: "15px" }
              }
            >
              {text}
            </span>
            <span className="text-[11px] text-muted">{f.name}</span>
          </button>
        );
      })}
    </div>
  );
}
