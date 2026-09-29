import { getTranslations } from "next-intl/server";
import { promo } from "@/config/promo";
import { CopyCode } from "./copy-code";

// Cedar bar under the header (restart brief). Values from config/promo.ts
// until the promotions table exists.
export async function PromoBar() {
  const t = await getTranslations("promo");

  return (
    <aside aria-label={t("label")} className="relative z-[1] bg-cedar text-white">
      <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center text-[12px] sm:text-[13px]">
        <span>{t("tagline")}</span>
        <strong className="font-semibold">{t("offer", { percent: promo.percent })}</strong>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1.5">
          {t("code")}
          <CopyCode code={promo.code} copyLabel={t("copy", { code: promo.code })} copiedLabel={t("copied")} />
        </span>
      </p>
    </aside>
  );
}
