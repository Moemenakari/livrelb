import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { getCatalog } from "@/lib/catalog";
import { getCheckoutOptions } from "@/lib/checkout/options";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false } };
}

// A static file, like the other pages: it holds nothing personal. Who is signed in, her saved details and the
// employees come from /api/checkout-init after the page opens (components/checkout/use-checkout-init.ts); only
// the prices (/api/quote) and Place order (/api/order) need the Worker.
//
// Checkout: she signs in first (Google), writes her name, phone and address (prefilled),
// and Place order saves the order and sends it to the shop's WhatsApp.
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
        loginRequired={settings.requireLogin}
        whatsapp={settings.whatsappNumber}
      />
    </div>
  );
}
