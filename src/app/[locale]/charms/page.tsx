import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { getCatalog } from "@/lib/catalog";
import { getCharmData } from "@/lib/charms/data";
import { formatPrice } from "@/lib/format";
import { alternates } from "@/lib/seo";
import { isR2Configured } from "@/lib/storage/r2";
import { CharmBuilder } from "@/components/charms/charm-builder";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export async function generateMetadata({ params }: PageProps<"/[locale]/charms">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "charms" });
  const { priceCents } = await getCharmData();
  return {
    title: t("title"),
    description: t("subtitle", { price: formatPrice(priceCents / 100) }),
    alternates: alternates(locale, "/charms"),
  };
}

// Edits in the admin (price, Turkish charms) show within a minute.
export const revalidate = 60;

// Charms: charms you design. Pick drawn shapes or the Turkish charms in
// stock, or upload a picture, then send it to the team.
export default async function CharmsPage({ params }: PageProps<"/[locale]/charms">) {
  await resolveLocale(params);
  const t = await getTranslations("charms");
  const tPages = await getTranslations("pages");
  const { settings } = await getCatalog();
  const { priceCents, stock } = await getCharmData();
  const price = priceCents / 100;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-3 pb-24 lg:px-8 lg:pt-6">
      <Breadcrumbs label={tPages("breadcrumbLabel")} items={[{ label: tPages("home"), href: "/" }, { label: t("nav") }]} />
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl lg:text-6xl">{t("title")}</h1>
        <p className="max-w-xl text-muted">{t("subtitle", { price: formatPrice(price) })}</p>
      </header>
      <CharmBuilder whatsapp={settings.whatsappNumber} uploadEnabled={isR2Configured()} price={price} stock={stock} />
    </div>
  );
}
