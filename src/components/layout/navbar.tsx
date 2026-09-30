import { ChevronRight, UserRound } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { categoryHref, navCategories } from "@/config/navigation";
import { whatsappUrl } from "@/config/site";
import { findCategory, getCatalog } from "@/lib/catalog";
import { WhatsAppIcon } from "@/components/icons/brand-icons";
import { CartButton } from "./cart-button";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { SearchButton, type SearchIndex } from "./search-button";

const iconButton =
  "flex size-9 items-center justify-center rounded-full transition-colors hover:text-gold-dark lg:size-10";
const drawerLink =
  "flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:text-gold-dark";

// White header (restart brief): logo on the start side, small spaced
// uppercase menu, search / account / cart on the end side. The menu sits
// inline from 1440px up and wraps to a second row below that, from the same
// markup (flex-wrap + order).
export async function Navbar() {
  const locale = await getLocale();
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const tFooter = await getTranslations("footer");

  const brand = tCommon("brandName");
  const catalog = await getCatalog();
  const categoryLinks = navCategories.flatMap((slug) => {
    const category = findCategory(catalog, slug);
    if (!category) return [];
    return {
      href: categoryHref(slug),
      label: (category.navName ?? category.name)[locale],
      full: category.name[locale],
    };
  });
  // Charms is its own page (design your charms): second in the menu.
  const links = [
    ...categoryLinks.slice(0, 1),
    { href: "/charms", label: t("charms"), full: t("charms") },
    ...categoryLinks.slice(1),
  ];

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
      {/* Wider than the page container so the one-row menu fits at 1440px. */}
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center px-2 sm:px-4 lg:px-8">
        <div className="flex h-12 items-center gap-1 lg:h-16">
          <MobileMenu
            openLabel={t("openMenu")}
            closeLabel={t("closeMenu")}
            title={t("menuTitle")}
            header={<Logo name={brand} homeLabel={t("homeLabel")} className="text-xl" />}
          >
            <nav aria-label={t("mainLabel")} className="flex-1 overflow-y-auto px-5">
              <ul className="divide-y divide-line">
                {links.map(({ href, full }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-center justify-between py-4 transition-colors hover:text-gold-dark"
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
            <div className="flex shrink-0 flex-col gap-1 border-t border-line bg-surface p-3">
              <Link href="/account" className={drawerLink}>
                <UserRound className="size-5" strokeWidth={1.5} aria-hidden />
                {t("account")}
              </Link>
              {catalog.settings.whatsappNumber && (
                <a href={whatsappUrl(catalog.settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className={drawerLink}>
                  <WhatsAppIcon className="size-5 text-cedar" />
                  {tFooter("whatsapp")}
                </a>
              )}
              <LocaleSwitcher className="mt-2 flex items-center justify-center rounded-full border border-line bg-background py-2.5 text-sm transition-colors hover:border-gold" />
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
          className="order-last hidden w-full border-t border-line lg:block min-[90rem]:order-none min-[90rem]:w-auto min-[90rem]:flex-1 min-[90rem]:border-t-0"
        >
          <ul className="flex h-12 items-center justify-center gap-x-7 min-[90rem]:h-16 min-[90rem]:gap-x-6">
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
          <LocaleSwitcher className="hidden h-10 min-w-10 items-center justify-center px-1.5 text-sm transition-colors hover:text-gold-dark sm:flex" />
          <Link href="/account" aria-label={t("account")} className={`hidden sm:flex ${iconButton}`}>
            <UserRound className="size-5" strokeWidth={1.5} />
          </Link>
          <CartButton className={iconButton} />
        </div>
      </div>
    </header>
  );
}
