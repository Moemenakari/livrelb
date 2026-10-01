"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CedarMark } from "@/components/icons/cedar-mark";
import { primaryButton, secondaryButton } from "@/components/ui/styles";

// 500 in the brand style: something broke on our side; try again or go home.
// The error is not shown to the visitor (it can hold private details).
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("serverError");

  useEffect(() => {
    // Only the short reference reaches the logs, never customer data.
    console.error("page error", error.digest ?? "");
  }, [error]);

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <CedarMark className="size-12 text-cedar" />
      <p className="font-display text-7xl leading-none text-gold lining-nums" lang="en" aria-hidden>
        {"500"}
      </p>
      <h1 className="text-4xl">{t("title")}</h1>
      <p className="text-muted">{t("description")}</p>
      {error.digest && (
        <p className="text-xs text-muted" dir="ltr">
          {t("reference", { id: error.digest })}
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className={primaryButton}>
          {t("retry")}
        </button>
        <Link href="/" className={secondaryButton}>
          {t("backHome")}
        </Link>
      </div>
    </section>
  );
}
