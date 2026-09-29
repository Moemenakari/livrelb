// Link targets for the navbar, mobile menu and footer. Labels live in
// messages/*.json under the same keys. Category URLs are placeholders until
// the catalog phase builds the pages (they show the 404 page for now).

export const mainCategories = [
  { key: "nameNecklaces", href: "/category/name-necklaces" },
  { key: "necklaces", href: "/category/necklaces" },
  { key: "bracelets", href: "/category/bracelets" },
  { key: "rings", href: "/category/rings" },
  { key: "earrings", href: "/category/earrings" },
  { key: "liraCollection", href: "/category/lira-collection" },
  { key: "gifts", href: "/gifts" },
  { key: "newArrivals", href: "/category/new-arrivals" },
] as const;

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
