import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { PointsLookup, TrackForm } from "@/components/checkout/track-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/track">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "track" });
  return { title: t("title"), robots: { index: false } };
}

// Track my order: order number + phone, no login.
export default async function TrackPage({ params, searchParams }: PageProps<"/[locale]/track">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("track");
  const { number } = await searchParams;
  const prefill = typeof number === "string" && /^\d{1,12}$/.test(number) ? number : "";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 pt-10 pb-20 lg:pt-14">
      <header className="flex flex-col gap-3 text-center">
        <h1 className="text-4xl lg:text-5xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>
      <TrackForm locale={locale} number={prefill} />
      <PointsLookup />
    </div>
  );
}
