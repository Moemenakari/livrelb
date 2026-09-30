import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  // "/" always opens English; Arabic only via /ar or the language switch.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
