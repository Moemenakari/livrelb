import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { getCatalog } from "@/lib/catalog";
import { getCheckoutOptions } from "@/lib/checkout/options";
import { CheckoutForm } from "@/components/checkout/checkout-form";

// The area and "Who helped you?" lists refresh every 5 minutes.
export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false } };
}

// Checkout (brief §8.4): one page, phone + name, no account, no email.
export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("checkout");
  const [{ settings }, options] = await Promise.all([getCatalog(), getCheckoutOptions(locale)]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-20 lg:px-8 lg:pt-12">
      <h1 className="mb-8 text-4xl lg:text-5xl">{t("title")}</h1>
      {!options.available && (
        <p className="mb-8 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{t("errors.unavailable")}</p>
      )}
      <CheckoutForm
        areas={options.areas}
        helpers={options.helpers}
        freeShippingOver={settings.freeShippingOver}
      />
    </div>
  );
}
