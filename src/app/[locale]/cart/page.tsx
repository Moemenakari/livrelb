import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { getCatalog } from "@/lib/catalog";
import { CartContents } from "@/components/cart/cart-contents";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "cart" });
  return { title: t("title"), robots: { index: false } };
}

// The full bag (brief §8.4). The bag lives in the browser; prices come from
// the server quote.
export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  await resolveLocale(params);
  const t = await getTranslations("cart");
  const { settings } = await getCatalog();

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-20 lg:px-8 lg:pt-12">
      <h1 className="mb-8 text-4xl lg:text-5xl">{t("title")}</h1>
      <CartContents variant="page" freeShippingOver={settings.freeShippingOver} />
    </div>
  );
}
