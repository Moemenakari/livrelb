import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { getCatalog } from "@/lib/catalog";
import { getCharmData } from "@/lib/charms/data";
import { formatPrice } from "@/lib/format";
import { alternates } from "@/lib/seo";
import { CharmBuilder, type CharmDesign } from "@/components/charms/charm-builder";
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

// Edits in the admin (price, charms) show within a minute.
export const revalidate = 60;

// Charms: charms you design. Pick charms in gold or silver, on a necklace or
// a bracelet, and add the design to the bag like any piece.
export default async function CharmsPage({ params }: PageProps<"/[locale]/charms">) {
  await resolveLocale(params);
  const t = await getTranslations("charms");
  const tPages = await getTranslations("pages");
  const { settings, charmDesign } = await getCatalog();
  const { priceCents, max, stock } = await getCharmData();
  const price = priceCents / 100;

  // The chain: its price per metal and its sizes come from the product in the admin.
  const gold = charmDesign?.offers.find((o) => o.material === "gold")?.price;
  const silver = charmDesign?.offers.find((o) => o.material === "silver")?.price;
  const sizeOf = (kind: "chain" | "bracelet") => {
    const s = [charmDesign?.size, charmDesign?.altSize].find((x) => x?.kind === kind);
    return s ? { values: s.values, default: s.default } : null;
  };
  const design: CharmDesign | null =
    charmDesign && gold !== undefined && silver !== undefined
      ? { slug: charmDesign.slug, name: charmDesign.name, art: charmDesign.art, base: { gold, silver }, sizes: { necklace: sizeOf("chain"), bracelet: sizeOf("bracelet") } }
      : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-3 pb-72 lg:px-8 lg:pt-6">
      <Breadcrumbs label={tPages("breadcrumbLabel")} items={[{ label: tPages("home"), href: "/" }, { label: t("nav") }]} />
      <header className="flex flex-col items-center gap-2 pt-4 text-center">
        <h1 className="text-5xl font-semibold lg:text-6xl">{t("title")}</h1>
        <p className="font-display text-2xl text-gold-dark lg:text-3xl">{t("tagline")}</p>
        <p className="max-w-xl text-sm text-muted lg:text-base">{t("subtitle", { price: formatPrice(price) })}</p>
      </header>
      <CharmBuilder whatsapp={settings.whatsappNumber} price={price} max={max} stock={stock} design={design} />
    </div>
  );
}
