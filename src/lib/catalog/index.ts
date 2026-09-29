import type { Locale } from "@/i18n/routing";
import { getCategory } from "./categories";
import { materials } from "./materials";
import { products } from "./products";
import type { CategorySlug, Localized, MaterialKey, Product } from "./types";

export * from "./types";
export { toCard, type CardProduct } from "./card";
export { categories, getCategory, isCategorySlug, styleNames, styleSamples } from "./categories";
export { allMaterials, fontNames, materials } from "./materials";
export { reviews, reviewsFor } from "./reviews";
export { products };

// Read helpers. Phase 2 turns these into Supabase queries with the same
// signatures, so pages don't change.

export function localize(value: Localized, locale: Locale): string {
  return value[locale];
}

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function productsIn(slug: CategorySlug): Product[] {
  if (slug === "bestsellers") return products.filter((p) => p.isBestSeller);
  if (slug === "new") return products.filter((p) => p.isNew);
  return products.filter((p) => p.categories.includes(slug));
}

export function bestSellers(limit = 8): Product[] {
  return productsIn("bestsellers").slice(0, limit);
}

export function newArrivals(limit = 8): Product[] {
  return productsIn("new").slice(0, limit);
}

/** Same first category first, then the rest of the catalog. */
export function relatedProducts(product: Product, limit = 4): Product[] {
  const main = product.categories[0];
  const others = products.filter((p) => p.slug !== product.slug);
  const same = others.filter((p) => p.categories.includes(main));
  const rest = others.filter((p) => !p.categories.includes(main));
  return [...same, ...rest].slice(0, limit);
}

/** Breadcrumb trail for a category, root first. */
export function categoryTrail(slug: CategorySlug) {
  const trail = [];
  let current = getCategory(slug);
  while (current) {
    trail.unshift(current);
    current = current.parent ? getCategory(current.parent) : undefined;
  }
  return trail;
}

export function priceFor(product: Product, material: MaterialKey) {
  const extra = materials[material].priceModifier;
  return {
    price: product.price + extra,
    compareAtPrice: product.compareAtPrice ? product.compareAtPrice + extra : undefined,
  };
}

/** "-26%" style discount, rounded. */
export function discountPercent(product: Product): number | undefined {
  if (!product.compareAtPrice) return undefined;
  return Math.round((1 - product.price / product.compareAtPrice) * 100);
}
