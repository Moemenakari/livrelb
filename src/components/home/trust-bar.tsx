import { BadgePercent, ShieldCheck, Tag, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { homeCover } from "./layout";

const trust = [
  { key: "freeShipping", icon: Truck },
  { key: "securePayment", icon: ShieldCheck },
  { key: "bestPrice", icon: Tag },
  { key: "sales", icon: BadgePercent },
] as const;

export async function TrustBar() {
  const t = await getTranslations("home.trustBar");

  return (
    <section data-coin-cover aria-label={t("label")} className={`${homeCover} border-t border-line bg-background`}>
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 lg:grid-cols-4 lg:px-8">
        {trust.map(({ key, icon: Icon }) => (
          <li key={key} className="flex flex-col items-center gap-2 text-center lg:flex-row lg:gap-4 lg:text-start">
            <Icon className="size-7 shrink-0 text-gold-dark" strokeWidth={1.25} aria-hidden />
            <span className="flex flex-col">
              <span className="font-medium">{t(key)}</span>
              <span className="text-sm text-muted">{t(`${key}Text`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
