import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { getCatalog } from "@/lib/catalog";
import { savedCustomer } from "@/lib/checkout/customer";
import { getCheckoutOptions } from "@/lib/checkout/options";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false } };
}

// Checkout: she signs in first (Google or email), writes her name, phone and address (prefilled),
// and Place order saves the order and sends it to the shop's WhatsApp. Rendered per request.
export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("checkout");
  const [{ settings }, options, saved] = await Promise.all([getCatalog(), getCheckoutOptions(locale), savedCustomer()]);

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
        saved={saved}
        loginRequired={settings.requireLogin}
        whatsapp={settings.whatsappNumber}
      />
    </div>
  );
}
