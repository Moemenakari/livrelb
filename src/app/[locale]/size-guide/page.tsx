import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { InfoPage } from "@/components/ui/info-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/size-guide">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "product" });
  return { title: t("sizeGuideTitle"), description: t("sizeGuideIntro") };
}

const chains = [35, 40, 45, 50, 55] as const;

// Size guide: the same texts as the product page dialog, on its own page.
export default async function SizeGuidePage({ params }: PageProps<"/[locale]/size-guide">) {
  await resolveLocale(params);
  const t = await getTranslations("product");
  return (
    <InfoPage title={t("sizeGuideTitle")} intro={t("sizeGuideIntro")}>
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">{t("chainTitle")}</h2>
        <ul className="divide-y divide-line border-y border-line">
          {chains.map((v) => (
            <li key={v} className="flex gap-4 py-3">
              <span className="w-16 shrink-0 font-medium">{t("cm", { value: v })}</span>
              <span className="text-muted">{t(`chainGuide.${v}`)}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-2xl">{t("braceletTitle")}</h2>
        <p className="text-foreground/85">{t("braceletGuide")}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-2xl">{t("ringTitle")}</h2>
        <p className="text-foreground/85">{t("ringGuide")}</p>
      </section>
    </InfoPage>
  );
}
