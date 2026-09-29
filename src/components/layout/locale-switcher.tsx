"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Links to the current page in the other language (en <-> ar).
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const target =
    routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    <Link
      href={pathname}
      locale={target}
      lang={target}
      hrefLang={target}
      aria-label={t("ariaLabel")}
      className={className}
    >
      {t("label")}
    </Link>
  );
}
