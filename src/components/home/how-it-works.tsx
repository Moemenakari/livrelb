import { Hand, PenLine, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { homeSection, type Catalog } from "@/lib/catalog";
import type { Locale } from "@/i18n/routing";
import { SectionTitle } from "./section-title";
import { homeInner } from "./layout";

const steps = [
  { n: "01", key: "personalize", icon: PenLine },
  { n: "02", key: "craft", icon: Hand },
  { n: "03", key: "deliver", icon: Truck },
] as const;

// 01 / 02 / 03: the coin drifts behind this one.
export async function HowItWorks({ catalog, locale }: { catalog: Catalog; locale: Locale }) {
  const t = await getTranslations("home.steps");
  const section = homeSection(catalog, "steps");
  if (!section.visible) return null;

  return (
    <section className="bg-surface">
      <div className={`${homeInner} py-16 lg:py-24`}>
        <SectionTitle title={section.title?.[locale] ?? t("title")} />
        <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map(({ n, key, icon: Icon }, i) => (
            <li key={key} className="flex flex-col items-center gap-3 text-center">
              <span className="font-display text-6xl leading-none text-gold" lang="en">
                {n}
              </span>
              <Icon className="size-5 text-cedar" strokeWidth={1.5} aria-hidden />
              <h3 className="text-2xl">{section.items[i + 1]?.title?.[locale] ?? t(`${key}.title`)}</h3>
              <p className="max-w-xs text-muted">{section.items[i + 1]?.text?.[locale] ?? t(`${key}.text`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
