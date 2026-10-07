import { Banknote, Smartphone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { categoryHref, helpLinks, navCategories, policyLinks } from "@/config/navigation";
import { developer, whatsappUrl } from "@/config/site";
import { findCategory, getCatalog } from "@/lib/catalog";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons/brand-icons";
import { InstallApp } from "./pwa";
import { Logo } from "./logo";

const socialButton =
  "inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-colors hover:border-gold hover:text-gold";

// Near-black footer (restart brief) with the WhatsApp list signup: the
// store never asks for email (brief §6), so the "newsletter" is WhatsApp.
// WhatsApp and Instagram links are hidden while their setting is empty.
export async function Footer() {
  const locale = await getLocale();
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const tPay = await getTranslations("payment");
  const tWhatsapp = await getTranslations("whatsapp");
  const catalog = await getCatalog();
  const { whatsappNumber, instagramUrl } = catalog.settings;

  const columns = [
    {
      title: t("shop"),
      links: navCategories.slice(0, 8).flatMap((slug) => {
        const category = findCategory(catalog, slug);
        return category ? [{ href: categoryHref(slug), label: category.name[locale] }] : [];
      }),
    },
    {
      title: t("help"),
      links: helpLinks.map(({ key, href }) => ({ href, label: t(`links.${key}`) })),
    },
    {
      title: t("policies"),
      links: policyLinks.map(({ key, href }) => ({ href, label: t(`links.${key}`) })),
    },
  ];

  return (
    <footer className="relative z-[1] bg-ink text-white/70">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
        {whatsappNumber && (
          <div className="flex flex-col gap-6 border-b border-white/10 pb-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-lg">
              <h2 className="text-3xl text-white">{t("newsletterTitle")}</h2>
              <p className="mt-2">{t("newsletterText")}</p>
            </div>
            <a
              href={whatsappUrl(whatsappNumber, tWhatsapp("join"))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 self-start rounded-full bg-white px-7 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-gold hover:text-white lg:self-auto"
            >
              <WhatsAppIcon className="size-5 text-cedar" />
              {t("newsletterCta")}
            </a>
          </div>
        )}

        <div className="mt-12 grid grid-cols-2 gap-x-6 first:mt-0 gap-y-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 flex flex-col items-start gap-5 lg:col-span-1">
            <Logo
              name={tCommon("brandName")}
              homeLabel={tNav("homeLabel")}
              className="text-3xl"
              onDark
            />
            <p className="max-w-xs">{t("about")}</p>
            <InstallApp />
            {(whatsappNumber || instagramUrl) && (
              <div className="flex flex-wrap gap-3">
                {whatsappNumber && (
                  <a href={whatsappUrl(whatsappNumber)} target="_blank" rel="noopener noreferrer" className={socialButton}>
                    <WhatsAppIcon className="size-4" />
                    {t("whatsapp")}
                  </a>
                )}
                {instagramUrl && (
                  <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={socialButton}>
                    <InstagramIcon className="size-4" />
                    {t("instagram")}
                  </a>
                )}
              </div>
            )}
          </div>

          {columns.map(({ title, links }) => (
            <nav key={title} aria-label={title}>
              <h2 className="text-xl text-white">{title}</h2>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="transition-colors hover:text-gold">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-white/10 pt-6 text-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="me-1">{t("paymentLabel")}</span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-2.5 py-1 text-white">
              <Banknote className="size-4" strokeWidth={1.5} aria-hidden />
              {tPay("cod")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-2.5 py-1 text-white">
              <Smartphone className="size-4" strokeWidth={1.5} aria-hidden />
              {tPay("whish")}
            </span>
          </div>
          <div className="flex flex-col gap-1 lg:items-end">
            {/* Year as a string so it isn't number-formatted ("2,026"). */}
            <p>{t("copyright", { year: String(new Date().getFullYear()) })}</p>
            <p className="text-white/50">{t("madeIn")}</p>
            <p className="text-white/50">
              {t("owner")} · {t("programmedBy")}{" "}
              <a href={developer.url} target="_blank" rel="noopener" className="underline underline-offset-4 hover:text-gold">
                {developer.name}
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
