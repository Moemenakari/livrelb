import { ChevronRight, UserRound } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CHARMS_NAV_KEY, categoryHref } from "@/config/navigation";
import { whatsappUrl } from "@/config/site";
import { findCategory, getCatalog, navItems } from "@/lib/catalog";
import { WhatsAppIcon } from "@/components/icons/brand-icons";
import { CartButton } from "./cart-button";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { SearchButton, type SearchIndex } from "./search-button";

const iconButton =
  "flex size-9 items-center justify-center rounded-full transition-colors hover:text-gold-dark lg:size-10";
// The bottom block of the phone drawer: three equal buttons in one row, so all
// the menu links above fit on one phone screen.
const drawerAction =
  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs transition-colors hover:text-gold-dark";

// White header (restart brief): logo on the start side, small spaced
// uppercase menu, search / account / cart on the end side. On desktop the menu
// is always a second, centred row (it wraps onto a second line when the screen
// is too narrow for every item, so nothing is ever cut off).
export async function Navbar() {
  const locale = await getLocale();
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const tFooter = await getTranslations("footer");

  const brand = tCommon("brandName");
  const catalog = await getCatalog();
  // The categories and the Charms page, in the order set in the admin.
  const links = navItems(catalog).map(({ key, category }) =>
    category
      ? { href: categoryHref(category.slug), label: (category.navName ?? category.name)[locale], full: category.name[locale] }
      : { href: key === CHARMS_NAV_KEY ? "/charms" : "/", label: t("charms"), full: t("charms") },
  );

  // Small: names only. Searched in the browser (brief: simple search).
  const searchIndex: SearchIndex = {
    products: catalog.products.map((p) => ({
      slug: p.slug,
      name: p.name,
      categories: p.categories
        .map((slug) => findCategory(catalog, slug))
        .flatMap((c) => (c ? [c.name.en, c.name.ar] : []))
        .join(" "),
    })),
    categories: catalog.categories.map((c) => ({ slug: c.slug, name: c.name })),
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background">
      {/* Wider than the page container so the menu fits in one row at 1440px. */}
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center px-2 sm:px-4 lg:px-8">
        <div className="flex h-12 items-center gap-1 lg:h-16">
          <MobileMenu
            openLabel={t("openMenu")}
            closeLabel={t("closeMenu")}
            title={t("menuTitle")}
            header={<Logo name={brand} homeLabel={t("homeLabel")} className="text-xl" />}
          >
            <nav aria-label={t("mainLabel")} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
              <ul className="flex flex-1 flex-col divide-y divide-line">
                {links.map(({ href, full }) => (
                  <li key={href} className="flex min-h-10 flex-1">
                    <Link
                      href={href}
                      className="flex w-full items-center justify-between py-2 text-sm transition-colors hover:text-gold-dark"
                    >
                      {full}
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
            <div className="grid shrink-0 grid-flow-col auto-cols-fr gap-1 border-t border-line bg-surface p-2">
              <Link href="/account" className={drawerAction}>
                <UserRound className="size-5" strokeWidth={1.5} aria-hidden />
                {t("account")}
              </Link>
              {catalog.settings.whatsappNumber && (
                <a href={whatsappUrl(catalog.settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className={drawerAction}>
                  <WhatsAppIcon className="size-5 text-cedar" />
                  {tFooter("whatsapp")}
                </a>
              )}
            </div>
          </MobileMenu>

          <Logo
            name={brand}
            homeLabel={t("homeLabel")}
            className="ms-1 text-[1.2rem] lg:ms-0 lg:text-[1.55rem]"
          />
        </div>

        <nav
          aria-label={t("mainLabel")}
          className="order-last hidden w-full border-t border-line lg:block"
        >
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 py-3">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="tracking-caps text-[12px] font-medium whitespace-nowrap uppercase transition-colors hover:text-gold-dark rtl:text-sm"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ms-auto flex items-center">
          <SearchButton index={searchIndex} className={iconButton} />
          <Link href="/account" aria-label={t("account")} className={iconButton}>
            <UserRound className="size-5" strokeWidth={1.5} />
          </Link>
          <CartButton className={iconButton} />
        </div>
      </div>
    </header>
  );
}
