import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

// Search and sharing basics: canonical address, English/Arabic alternates
// (hreflang) and the picture shown when a link is shared.

type Locale = "en" | "ar";

/** Full address of a path in a language, e.g. url("ar", "/faq"). */
export const pageUrl = (locale: Locale, path: string) => `${siteConfig.url}/${locale}${path === "/" ? "" : path}`;

/** `alternates` for a page's metadata: canonical + hreflang en / ar / x-default. */
export function alternates(locale: Locale, path: string): NonNullable<Metadata["alternates"]> {
  return {
    canonical: pageUrl(locale, path),
    languages: {
      en: pageUrl("en", path),
      ar: pageUrl("ar", path),
      "x-default": pageUrl("en", path),
    },
  };
}

/** Default share picture (public/og-default.png, made by scripts/build-og.mjs). */
export const defaultOgImage = { url: "/og-default.png", width: 1200, height: 630, alt: "LIVRE" };

/** JSON-LD as the string put in <script type="application/ld+json">. */
export function jsonLdString(data: unknown): string {
  // "<" is escaped so text inside the data can never close the script tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Absolute address of a stored image (R2 URLs already are). */
export const absoluteUrl = (src: string) => (src.startsWith("http") ? src : `${siteConfig.url}${src}`);
