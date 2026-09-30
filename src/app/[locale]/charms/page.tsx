import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { getCatalog } from "@/lib/catalog";
import { allShapes } from "@/lib/charms";
import { isR2Configured } from "@/lib/storage/r2";
import { CharmBuilder } from "@/components/charms/charm-builder";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { eyebrow } from "@/components/ui/styles";

export async function generateMetadata({ params }: PageProps<"/[locale]/charms">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "charms" });
  return { title: t("title"), description: t("subtitle", { count: allShapes.length }) };
}

export const revalidate = 3600;

// Charms: design your own from 290+ shapes and letters (or a photo of your
// idea), then send it to the team. Requests land in the admin.
export default async function CharmsPage({ params }: PageProps<"/[locale]/charms">) {
  await resolveLocale(params);
  const t = await getTranslations("charms");
  const tPages = await getTranslations("pages");
  const { settings } = await getCatalog();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-3 pb-24 lg:px-8 lg:pt-6">
      <Breadcrumbs label={tPages("breadcrumbLabel")} items={[{ label: tPages("home"), href: "/" }, { label: t("nav") }]} />
      <header className="flex flex-col items-center gap-3 text-center">
        <p className={eyebrow}>{t("eyebrow")}</p>
        <h1 className="text-4xl lg:text-6xl">{t("title")}</h1>
        <p className="max-w-xl text-muted">{t("subtitle", { count: allShapes.length })}</p>
      </header>
      <CharmBuilder whatsapp={settings.whatsappNumber} uploadEnabled={isR2Configured()} />
    </div>
  );
}
