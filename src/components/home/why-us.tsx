import { Gem, Hand, HeartHandshake, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SectionTitle } from "./section-title";
import { homeInner } from "./layout";

const why = [
  { key: "handcrafted", icon: Hand },
  { key: "personalized", icon: Sparkles },
  { key: "quality", icon: Gem },
  { key: "trusted", icon: HeartHandshake },
] as const;

// Why LIVRE.
export async function WhyUs() {
  const t = await getTranslations("home.whyUs");

  return (
    <section className="bg-surface">
      <div className={`${homeInner} py-16 lg:py-24`}>
        <SectionTitle eyebrow={t("subtitle")} title={t("title")} />
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          {why.map(({ key, icon: Icon }) => (
            <li
              key={key}
              className="flex flex-col items-center gap-3 rounded-xl border border-line bg-background/85 p-5 text-center backdrop-blur-sm lg:p-7"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-blush text-gold-dark">
                <Icon className="size-5" strokeWidth={1.5} aria-hidden />
              </span>
              <h3 className="text-xl leading-tight lg:text-2xl">{t(`${key}.title`)}</h3>
              <p className="text-sm text-muted">{t(`${key}.text`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
