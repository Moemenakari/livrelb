import type { CategorySlug } from "@/lib/catalog/types";

// Navbar and mobile menu order (restart brief). Labels come from the
// category data (navName, else name).
export const navCategories: CategorySlug[] = [
  "name-necklaces",
  "necklaces",
  "bracelets",
  "mens-jewelry",
  "rings",
  "earrings",
  "lira-collection",
  "gifts",
  "bestsellers",
  "new",
];

export const categoryHref = (slug: CategorySlug) => `/category/${slug}`;
export const productHref = (slug: string) => `/product/${slug}`;

// Help and policy pages are built in a later phase (they 404 for now).
export const helpLinks = [
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
