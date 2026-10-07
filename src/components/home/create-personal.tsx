import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { productHref } from "@/config/navigation";
import { homeSection, type Catalog } from "@/lib/catalog";
import type { Locale } from "@/i18n/routing";
import { ProductArt } from "@/components/product/product-art";
import { primaryButton } from "@/components/ui/styles";
import { homeCover } from "./layout";

const chipClass = "inline-flex items-center gap-2 rounded-full border border-ink/15 bg-background px-4 py-2 text-sm";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-cedar" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.4L3 21Z" strokeLinejoin="round" />
      <path d="M9 9.5c.3 2.2 2.3 4.2 4.5 4.5l1.2-1.3-1.8-1-.8.6a3.5 3.5 0 0 1-1.6-1.6l.6-.8-1-1.8L9 9.5Z" strokeLinejoin="round" />
    </svg>
  );
}

// "Create something personal" + how it works: we confirm every order on WhatsApp.
export async function CreatePersonal({ catalog, locale }: { catalog: Catalog; locale: Locale }) {
  const t = await getTranslations("home.create");
  const section = homeSection(catalog, "create");
  if (!section.visible) return null;
  const { whatsappNumber } = catalog.settings;

  return (
    <section data-coin-cover className={`${homeCover} bg-background`}>
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
        <div className="grid items-center gap-8 overflow-hidden rounded-2xl bg-blush lg:grid-cols-2">
          <div className="flex flex-col items-center gap-5 p-8 text-center lg:items-start lg:p-14 lg:text-start">
            <h2 className="text-4xl lg:text-5xl">{section.title?.[locale] ?? t("title")}</h2>
            <p className="max-w-md text-foreground/75">{section.subtitle?.[locale] ?? t("text")}</p>
            <Link href={section.ctaHref ?? productHref("cursive-name-necklace")} className={primaryButton}>
              {t("cta")}
            </Link>
            <div className="mt-2 flex flex-col items-center gap-2 lg:items-start">
              <p className="text-sm text-muted">{t("payTitle")}</p>
              <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                {whatsappNumber && (
                  <span className={chipClass}>
                    <WhatsAppIcon />
                    {t("payWhatsapp")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center self-stretch bg-surface/70 px-8 py-6">
            <ProductArt
              art={{ kind: "name", variant: "necklace" }}
              material="gold"
              text="Forever"
              connection="sides"
              aspect="square"
              className="max-w-sm"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
