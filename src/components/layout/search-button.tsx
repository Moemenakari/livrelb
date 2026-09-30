"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { categoryHref, productHref } from "@/config/navigation";
import type { Localized } from "@/lib/catalog/types";

export type SearchIndex = {
  products: { slug: string; name: Localized; categories: string }[];
  categories: { slug: string; name: Localized }[];
};

// Same letters whatever the spelling: case, Arabic short vowels, alef /
// taa marbuta / yaa variants.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

const matches = (haystack: string, words: string[]) => words.every((w) => haystack.includes(w));

// Search icon in the header: opens a search box over the page that finds
// products by name (English and Arabic) and by category, and categories.
export function SearchButton({ index, className }: { index: SearchIndex; className: string }) {
  const t = useTranslations("search");
  const locale = useLocale() as "en" | "ar";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const prepared = useMemo(
    () => ({
      products: index.products.map((p) => ({
        ...p,
        haystack: normalize(`${p.name.en} ${p.name.ar} ${p.categories}`),
      })),
      categories: index.categories.map((c) => ({ ...c, haystack: normalize(`${c.name.en} ${c.name.ar}`) })),
    }),
    [index],
  );

  const words = normalize(query).split(" ").filter(Boolean);
  const products = words.length ? prepared.products.filter((p) => matches(p.haystack, words)).slice(0, 8) : [];
  const categories = words.length ? prepared.categories.filter((c) => matches(c.haystack, words)).slice(0, 4) : [];

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={t("open")} className={className}>
        <Search className="size-5.5" strokeWidth={1.5} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t("open")}>
          <div aria-hidden onClick={close} className="absolute inset-0 bg-ink/40" />
          <div className="relative max-h-[85dvh] overflow-y-auto bg-background shadow-xl">
            <div className="mx-auto flex max-w-3xl items-center gap-3 border-b border-line px-4 py-3 lg:py-5">
              <Search className="size-5 shrink-0 text-muted" strokeWidth={1.5} aria-hidden />
              <label htmlFor="site-search" className="sr-only">
                {t("open")}
              </label>
              <input
                ref={inputRef}
                id="site-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("placeholder")}
                autoComplete="off"
                className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none"
              />
              <button
                type="button"
                onClick={close}
                aria-label={t("close")}
                className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="mx-auto max-w-3xl px-4 py-4" aria-live="polite">
              {words.length === 0 ? (
                <p className="py-4 text-sm text-muted">{t("hint")}</p>
              ) : products.length + categories.length === 0 ? (
                <p className="py-4 text-sm text-muted">{t("noResults", { query })}</p>
              ) : (
                <div className="flex flex-col gap-5 pb-2">
                  {categories.length > 0 && (
                    <section>
                      <h2 className="mb-2 text-xs font-medium tracking-caps text-muted uppercase rtl:tracking-normal">
                        {t("categories")}
                      </h2>
                      <ul className="flex flex-wrap gap-2">
                        {categories.map((c) => (
                          <li key={c.slug}>
                            <Link
                              href={categoryHref(c.slug)}
                              onClick={close}
                              className="inline-flex rounded-full border border-line px-4 py-2 text-sm hover:border-gold"
                            >
                              {c.name[locale]}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {products.length > 0 && (
                    <section>
                      <h2 className="mb-1 text-xs font-medium tracking-caps text-muted uppercase rtl:tracking-normal">
                        {t("products")}
                      </h2>
                      <ul className="divide-y divide-line">
                        {products.map((p) => (
                          <li key={p.slug}>
                            <Link
                              href={productHref(p.slug)}
                              onClick={close}
                              className="block py-3 text-[15px] hover:text-gold-dark"
                            >
                              {p.name[locale]}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
