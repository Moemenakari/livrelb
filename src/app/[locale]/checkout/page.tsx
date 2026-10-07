import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { getCatalog } from "@/lib/catalog";
import { googleLoginEnabled, savedCustomer } from "@/lib/checkout/customer";
import { getCheckoutOptions } from "@/lib/checkout/options";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { cardConfigured } from "@/lib/payments/card";
import { whatsappOtpConfigured } from "@/lib/otp/whatsapp";
import { verifiedPhoneOfBrowser } from "@/lib/otp/verified";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false } };
}

// Checkout: one page. She signs in with Google first (when the owner asks for it and Google
// sign-in is on), then name, phone and address (prefilled), then how she pays: a transfer, or a
// deposit now and the rest on delivery. Rendered per request: her account is prefilled.
export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("checkout");
  const [{ settings }, options, saved, googleEnabled, verifiedPhone] = await Promise.all([
    getCatalog(),
    getCheckoutOptions(locale),
    savedCustomer(),
    googleLoginEnabled(),
    verifiedPhoneOfBrowser(),
  ]);

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
        googleEnabled={googleEnabled}
        cardEnabled={settings.cardOnline && cardConfigured()}
        payments={settings.payments}
        depositPercent={settings.depositPercent}
        loginRequired={settings.payments.ready && settings.payments.requireLogin && googleEnabled}
        whatsapp={settings.whatsappNumber}
        phoneVerification={{
          enabled: whatsappOtpConfigured(),
          verifiedPhone,
          points: settings.phoneVerifyPoints,
          pointValue: settings.points.redeemPoints > 0 ? settings.points.redeemValue / settings.points.redeemPoints : 0,
        }}
      />
    </div>
  );
}
