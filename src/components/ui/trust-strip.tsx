import { Clock, Gem, ShieldCheck, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";

// Thin reassurance strip at the top of category pages (brief §8.2).
export async function TrustStrip() {
  const t = await getTranslations("trust");
  const items = [
    { icon: Truck, label: t("freeShipping") },
    { icon: Gem, label: t("handcrafted") },
    { icon: ShieldCheck, label: t("securePayment") },
    { icon: Clock, label: t("delivery") },
  ];

  return (
    <div className="border-b border-line bg-surface">
      <ul className="no-scrollbar mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 py-2.5 text-[12px] whitespace-nowrap text-foreground/80 lg:justify-between lg:px-8">
        {items.map(({ icon: Icon, label }) => (
          <li key={label} className="flex shrink-0 items-center gap-2">
            <Icon className="size-4 text-gold-dark" strokeWidth={1.5} aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
