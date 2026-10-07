import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { developer } from "@/config/site";
import { resolveLocale } from "@/i18n/resolve-locale";
import { about } from "@/content/pages";
import { alternates } from "@/lib/seo";
import { InfoPage } from "@/components/ui/info-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ar") return {};
  return { title: about.en.title, description: about.en.intro, alternates: alternates(locale, "/about") };
}

// Our story: placeholder text (the 1975 Lira, the cedar). Nour reviews it.
export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  await resolveLocale(params);
  const page = about.en;
  const t = await getTranslations("footer");
  return (
    <InfoPage title={page.title} intro={page.intro} blocks={page.blocks} draft>
      <p className="border-t border-line pt-6 text-sm text-muted">
        {t("owner")} · {t("programmedBy")}{" "}
        <a href={developer.url} target="_blank" rel="noopener" className="underline underline-offset-4 hover:text-gold-dark">
          {developer.name}
        </a>
      </p>
    </InfoPage>
  );
}
