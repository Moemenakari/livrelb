import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { helpLinks, mainCategories, policyLinks } from "@/config/navigation";
import { siteConfig, whatsappUrl } from "@/config/site";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons/brand-icons";
import { Logo } from "./logo";

const socialButton =
  "inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-gold hover:text-gold";

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
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 flex flex-col items-start gap-4 lg:col-span-1">
            <Logo
              name={tCommon("brandName")}
              homeLabel={tNav("homeLabel")}
              className="text-2xl"
            />
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              {t("about")}
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={socialButton}
              >
                <WhatsAppIcon className="size-4" />
                {t("whatsapp")}
              </a>
              <a
                href={siteConfig.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={socialButton}
              >
                <InstagramIcon className="size-4" />
                {t("instagram")}
              </a>
            </div>
          </div>

          {columns.map(({ title, links }) => (
            <nav key={title} aria-label={title}>
              <h2 className="tracking-caps text-xs text-gold">{title}</h2>
              <ul className="mt-4 flex flex-col gap-3 text-sm">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-foreground/80 transition-colors hover:text-gold"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          {/* Year as a string so it isn't number-formatted ("2,026"). */}
          <p>{t("copyright", { year: String(new Date().getFullYear()) })}</p>
          <p>{t("payment")}</p>
        </div>
      </div>
    </footer>
  );
}
