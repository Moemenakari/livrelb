import { defineRouting } from "next-intl/routing";

// The website is in English only. Arabic stays where it belongs: the products (Arabic names,
// letters and fonts). Old /ar links are sent to /en by the proxy.
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localeDetection: false,
});

/** "ar" stays in the type for the Arabic product names kept in the data. */
export type Locale = "en" | "ar";

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
