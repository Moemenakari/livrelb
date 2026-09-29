import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { SectionPlaceholder } from "@/components/home/section-placeholder";

// Homepage sections in the order of brief §8.1 (the announcement bar and
// footer, items 1 and 11, live in the layout). Numbers match the brief.
const sections = [
  { key: "hero", number: "2", className: "min-h-[70svh]" },
  { key: "lira", number: "3", className: "min-h-[28rem]" },
  { key: "shopByStyle", number: "4", className: "min-h-72" },
  { key: "bestSellers", number: "5", className: "min-h-80" },
  { key: "howItWorks", number: "6", className: "min-h-64" },
  { key: "season", number: "6b", className: "min-h-48" },
  { key: "reviews", number: "7", className: "min-h-64" },
  { key: "newArrivals", number: "8", className: "min-h-80" },
  { key: "whyUs", number: "9", className: "min-h-64" },
  { key: "trustBar", number: "10", className: "min-h-28" },
] as const;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  await resolveLocale(params);
  const t = await getTranslations("home");

  return (
    <>
      <h1 className="sr-only">{t("title")}</h1>
      <div className="flex flex-col gap-4 py-4 lg:gap-6 lg:py-6">
        {sections.map(({ key, number, className }) => (
          <SectionPlaceholder
            key={key}
            number={number}
            badge={t("placeholder")}
            title={t(`sections.${key}.title`)}
            description={t(`sections.${key}.description`)}
            className={className}
          />
        ))}
      </div>
    </>
  );
}
