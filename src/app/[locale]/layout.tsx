import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getDirection, routing } from "@/i18n/routing";
import { resolveLocale } from "@/i18n/resolve-locale";
import { getCatalog } from "@/lib/catalog";
import { siteConfig } from "@/config/site";
import { defaultOgImage } from "@/lib/seo";
import { Analytics } from "@/components/analytics/analytics";
import { PwaRegister } from "@/components/layout/pwa";
import { JsonLd } from "@/components/seo/json-ld";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PromoBar } from "@/components/layout/promo-bar";
import { WheelCoin } from "@/components/layout/wheel-coin";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { fontVariables } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL(siteConfig.url),
    applicationName: "LIVRE",
    appleWebApp: { capable: true, title: "LIVRE", statusBarStyle: "default" },
    formatDetection: { telephone: false },
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
    openGraph: {
      type: "website",
      siteName: "LIVRE",
      title: t("title"),
      description: t("description"),
      locale: locale === "ar" ? "ar_LB" : "en_US",
      images: [defaultOgImage],
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description"), images: [defaultOgImage.url] },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("common");
  const { settings } = await getCatalog();
  const sameAs = settings.instagramUrl ? [settings.instagramUrl] : [];

  return (
    <html lang={locale} dir={getDirection(locale)} className={fontVariables}>
      <body className="flex min-h-dvh flex-col">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "LIVRE",
            url: siteConfig.url,
            logo: `${siteConfig.url}/icon.svg`,
            image: `${siteConfig.url}/og-default.png`,
            description: "Personalized jewelry and the 1975 Lira collection, made to order in Lebanon.",
            areaServed: "LB",
            ...(sameAs.length ? { sameAs } : {}),
          }}
        />
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-cedar focus:px-4 focus:py-2 focus:text-white"
          >
            {t("skipToContent")}
          </a>
          <AnnouncementBar />
          <Navbar />
          <PromoBar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <WheelCoin />
          <WhatsAppFloat />
          <CartDrawer freeShippingOver={settings.freeShippingOver} />
          <Analytics pixelId={settings.metaPixelId} ga4Id={settings.ga4Id} />
          <PwaRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
