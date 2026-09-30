import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/resolve-locale";
import { about } from "@/content/pages";
import { InfoPage } from "@/components/ui/info-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ar") return {};
  return { title: about[locale].title, description: about[locale].intro };
}

// Our story: placeholder text (the 1975 Lira, the cedar). Nour reviews it.
export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const locale = await resolveLocale(params);
  const page = about[locale];
  return <InfoPage title={page.title} intro={page.intro} blocks={page.blocks} draft />;
}
