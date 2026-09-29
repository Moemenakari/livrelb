import { ChevronRight, Search, ShoppingBag, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { mainCategories } from "@/config/navigation";
import { whatsappUrl } from "@/config/site";
import { WhatsAppIcon } from "@/components/icons/brand-icons";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";

const iconButton =
  "flex size-10 items-center justify-center rounded-full transition-colors hover:text-gold-dark";
const iconClass = "size-5.5";
const drawerLink =
  "flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:text-gold-dark";

export async function Navbar() {
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const tFooter = await getTranslations("footer");

  const brand = tCommon("brandName");
  const categories = mainCategories.map(({ key, href }) => ({
    href,
    label: t(`categories.${key}`),
  }));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background">
      {/* 1fr | auto | 1fr keeps the logo centered whatever sits beside it. */}
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-2 sm:px-4 lg:h-20 lg:px-8">
        <div className="flex items-center">
          <MobileMenu
            openLabel={t("openMenu")}
            closeLabel={t("closeMenu")}
            title={t("menuTitle")}
            header={
              <Logo name={brand} homeLabel={t("homeLabel")} className="text-xl" />
            }
          >
            <nav aria-label={t("mainLabel")} className="flex-1 overflow-y-auto px-5">
              <ul className="divide-y divide-line">
                {categories.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-center justify-between py-4 transition-colors hover:text-gold-dark"
                    >
                      {label}
                      <ChevronRight
                        className="size-4 text-muted rtl:-scale-x-100"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex shrink-0 flex-col gap-1 border-t border-line bg-surface p-3">
              <Link href="/account" className={drawerLink}>
                <UserRound className="size-5" strokeWidth={1.5} aria-hidden />
                {t("account")}
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={drawerLink}
              >
                <WhatsAppIcon className="size-5 text-cedar" />
                {tFooter("whatsapp")}
              </a>
              <LocaleSwitcher className="mt-2 flex items-center justify-center rounded-full border border-line bg-background py-2.5 text-sm transition-colors hover:border-gold" />
            </div>
          </MobileMenu>

          <Link href="/search" aria-label={t("search")} className={iconButton}>
            <Search className={iconClass} strokeWidth={1.5} />
          </Link>
        </div>

        <Logo
          name={brand}
          homeLabel={t("homeLabel")}
          className="text-[1.6rem] lg:text-[2rem]"
        />

        <div className="flex items-center justify-end">
          <LocaleSwitcher className="flex h-10 min-w-10 items-center justify-center px-1.5 text-sm transition-colors hover:text-gold-dark" />
          <Link href="/account" aria-label={t("account")} className={iconButton}>
            <UserRound className={iconClass} strokeWidth={1.5} />
          </Link>
          <Link href="/cart" aria-label={t("cart")} className={iconButton}>
            <ShoppingBag className={iconClass} strokeWidth={1.5} />
          </Link>
        </div>
      </div>

      <nav aria-label={t("mainLabel")} className="hidden border-t border-line lg:block">
        <ul className="mx-auto flex h-12 max-w-7xl items-center justify-center gap-9 px-8">
          {categories.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="tracking-caps text-[13px] uppercase transition-colors hover:text-gold-dark"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
