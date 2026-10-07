import type { CategorySlug } from "@/lib/catalog/types";

/** The product that carries a charm design in the cart (seeded by the database; never listed). */
export const CHARM_DESIGN_SLUG = "charm-design";

/** The Charms page sits in the menu next to the categories. */
export const CHARMS_NAV_KEY = "charms";

// Default menu order of the header and the phone drawer; the admin's Home page
// sets the real one (categories.nav_sort), this is the order before that.
// Labels come from the category data (navName, else name).
export const defaultNavOrder: string[] = [
  "name-necklaces",
  CHARMS_NAV_KEY,
  "necklaces",
  "lira-collection",
  "lira-500-250",
  "bracelets",
  "mens-jewelry",
  "rings",
  "earrings",
  "gifts",
  "bestsellers",
  "new",
];

/** Place in the default menu, spaced by 10 like the database's nav_sort. */
export const defaultNavSort = (key: string) => {
  const i = defaultNavOrder.indexOf(key);
  return i < 0 ? 1000 : (i + 1) * 10;
};

export const navCategories: CategorySlug[] = defaultNavOrder.filter((key) => key !== CHARMS_NAV_KEY);

export const categoryHref = (slug: CategorySlug) => `/category/${slug}`;
export const productHref = (slug: string) => `/product/${slug}`;

export const helpLinks = [
  { key: "charms", href: "/charms" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
  { key: "faq", href: "/faq" },
  { key: "sizeGuide", href: "/size-guide" },
] as const;

export const policyLinks = [
  { key: "shipping", href: "/policies/shipping" },
  { key: "returns", href: "/policies/returns" },
  { key: "privacy", href: "/policies/privacy" },
  { key: "terms", href: "/policies/terms" },
] as const;
