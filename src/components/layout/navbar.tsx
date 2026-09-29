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
  "flex size-10 items-center justify-center rounded-full transition-colors hover:text-gold";
const iconClass = "size-5.5";

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
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur-md">
      {/* 1fr | auto | 1fr keeps the logo centered whatever sits beside it. */}
      <div className="mx-auto grid h-14 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-2 sm:px-4 lg:h-16 lg:px-8">
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
                      className="flex items-center justify-between py-4 transition-colors hover:text-gold"
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
            <div className="flex shrink-0 flex-col gap-1 border-t border-line p-3">
              <Link
                href="/account"
                className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:text-gold"
              >
                <UserRound className="size-5" strokeWidth={1.5} aria-hidden />
                {t("account")}
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:text-gold"
              >
                <WhatsAppIcon className="size-5" />
                {tFooter("whatsapp")}
              </a>
              <LocaleSwitcher className="mt-2 flex items-center justify-center rounded-full border border-line py-2.5 text-sm transition-colors hover:border-gold hover:text-gold" />
            </div>
          </MobileMenu>

          <Link href="/search" aria-label={t("search")} className={iconButton}>
            <Search className={iconClass} strokeWidth={1.5} />
          </Link>
        </div>

        <Logo
          name={brand}
          homeLabel={t("homeLabel")}
          className="text-2xl lg:text-3xl"
        />

        <div className="flex items-center justify-end">
          <LocaleSwitcher className="flex h-10 min-w-10 items-center justify-center px-1.5 text-sm transition-colors hover:text-gold" />
          <Link href="/account" aria-label={t("account")} className={iconButton}>
            <UserRound className={iconClass} strokeWidth={1.5} />
          </Link>
          <Link href="/cart" aria-label={t("cart")} className={iconButton}>
            <ShoppingBag className={iconClass} strokeWidth={1.5} />
          </Link>
        </div>
      </div>

      <nav aria-label={t("mainLabel")} className="hidden border-t border-line lg:block">
        <ul className="mx-auto flex h-11 max-w-7xl items-center justify-center gap-8 px-8">
          {categories.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="tracking-caps text-xs uppercase text-foreground/85 transition-colors hover:text-gold"
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
