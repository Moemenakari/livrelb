import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { helpLinks, mainCategories, policyLinks } from "@/config/navigation";
import { siteConfig, whatsappUrl } from "@/config/site";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons/brand-icons";
import { Logo } from "./logo";

const socialButton =
  "inline-flex items-center gap-2 rounded-full border border-line bg-background px-4 py-2 text-sm transition-colors hover:border-gold";

export async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  const columns = [
    {
      title: t("shop"),
      links: mainCategories.map(({ key, href }) => ({
        href,
        label: tNav(`categories.${key}`),
      })),
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
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 flex flex-col items-start gap-5 lg:col-span-1">
            <Logo
              name={tCommon("brandName")}
              homeLabel={tNav("homeLabel")}
              className="text-3xl"
            />
            <p className="max-w-xs text-muted">{t("about")}</p>
            <div className="flex flex-wrap gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={socialButton}
              >
                <WhatsAppIcon className="size-4 text-cedar" />
                {t("whatsapp")}
              </a>
              <a
                href={siteConfig.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={socialButton}
              >
                <InstagramIcon className="size-4 text-cedar" />
                {t("instagram")}
              </a>
            </div>
          </div>

          {columns.map(({ title, links }) => (
            <nav key={title} aria-label={title}>
              <h2 className="text-xl">{title}</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-muted transition-colors hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-line pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          {/* Year as a string so it isn't number-formatted ("2,026"). */}
          <p>{t("copyright", { year: String(new Date().getFullYear()) })}</p>
          <p>{t("payment")}</p>
        </div>
      </div>
    </footer>
  );
}
