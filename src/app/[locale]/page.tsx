import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  await resolveLocale(params);
  const t = await getTranslations("common");

  return <h1>{t("brandName")}</h1>;
}
