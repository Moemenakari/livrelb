import { getLocale, getTranslations } from "next-intl/server";
import { getCatalog } from "@/lib/catalog";
import { CopyCode } from "./copy-code";

// Cedar bar under the header (restart brief): the active promo_bar
// promotion. Hidden when no code is running.
export async function PromoBar() {
  const t = await getTranslations("promo");
  const locale = (await getLocale()) === "ar" ? "ar" : "en";
  const { promo } = await getCatalog();
  if (!promo) return null;

  return (
    <aside aria-label={t("label")} className="relative z-[1] bg-cedar text-white">
      <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-1.5 text-center text-[11px] sm:text-[12px]">
        <span>{promo.text?.[locale] ?? t("tagline")}</span>
        <strong className="font-semibold">{t("offer", { percent: promo.percent })}</strong>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1.5">
          {t("code")}
          <CopyCode className="px-1.5 py-0 text-[10.5px] sm:text-[11.5px]" code={promo.code} copyLabel={t("copy", { code: promo.code })} copiedLabel={t("copied")} />
        </span>
      </p>
    </aside>
  );
}
