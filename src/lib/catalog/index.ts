import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { loadStaticCatalog } from "./static-catalog";
import { loadSupabaseCatalog } from "./supabase-catalog";
import type {
  Catalog,
  Category,
  CategorySlug,
  HomeSection,
  MaterialKey,
  MaterialOffer,
  Product,
  Review,
  ReviewStats,
} from "./types";

export * from "./types";
export { toCard, type CardProduct } from "./card";
export { materials } from "./materials";
export { styleNames, styleSamples } from "./categories";

/** Cache tag for everything the storefront reads. The admin revalidates it. */
export const CATALOG_TAG = "catalog";

// One query set per revalidation for the whole catalog: it is small (tens
// of products), and it keeps the free-plan database quiet.
// unstable_cache: Next 16 prefers "use cache", which needs Cache Components
// switched on for the whole app; this works without it and on OpenNext.
const cachedSupabaseCatalog = unstable_cache(loadSupabaseCatalog, ["catalog-v1"], {
  tags: [CATALOG_TAG],
  revalidate: process.env.NODE_ENV === "production" ? 3600 : 30,
});

/**
 * The storefront data. From Supabase when it is configured, otherwise from
 * the sample files in this folder, so the dev site never breaks.
 * Deduplicated per request by React cache().
 */
export const getCatalog = cache(async (): Promise<Catalog> => {
  if (!isSupabaseConfigured()) return loadStaticCatalog();
  return cachedSupabaseCatalog();
});

// Read helpers over a loaded catalog --------------------------------------

export function findProduct(catalog: Catalog, slug: string): Product | undefined {
  return catalog.products.find((p) => p.slug === slug);
}

export function findCategory(catalog: Catalog, slug: string): Category | undefined {
  return catalog.categories.find((c) => c.slug === slug);
}

export function productsIn(catalog: Catalog, slug: CategorySlug): Product[] {
  const category = findCategory(catalog, slug);
  if (category?.rule === "bestsellers") return catalog.products.filter((p) => p.isBestSeller);
  if (category?.rule === "new") return catalog.products.filter((p) => p.isNew);
  return catalog.products.filter((p) => p.categories.includes(slug));
}

/** Best sellers in the admin's order (best_seller_sort), then the shop's default order. */
export function bestSellers(catalog: Catalog, limit = 8): Product[] {
  return catalog.products
    .filter((p) => p.isBestSeller)
    .sort((a, b) => (a.bestSellerSort ?? 0) - (b.bestSellerSort ?? 0))
    .slice(0, limit);
}

export function newArrivals(catalog: Catalog, limit = 8): Product[] {
  return catalog.products.filter((p) => p.isNew).slice(0, limit);
}

/** A homepage section: the admin's texts and visibility, or the defaults when it has no row. */
export function homeSection(catalog: Catalog, key: string): HomeSection {
  return catalog.home[key] ?? { key, visible: true, products: [] };
}

/** Homepage "Shop by style" tiles, in the admin's order. */
export function homeCategories(catalog: Catalog): Category[] {
  return catalog.categories
    .filter((c) => c.showOnHome)
    .sort((a, b) => (a.homeSort ?? 0) - (b.homeSort ?? 0));
}

/** Same first category first, then the rest of the catalog. */
export function relatedProducts(catalog: Catalog, product: Product, limit = 4): Product[] {
  const main = product.categories[0];
  const others = catalog.products.filter((p) => p.slug !== product.slug);
  const same = others.filter((p) => p.categories.includes(main));
  const rest = others.filter((p) => !p.categories.includes(main));
  return [...same, ...rest].slice(0, limit);
}

/** Breadcrumb trail for a category, root first. */
export function categoryTrail(catalog: Catalog, slug: CategorySlug): Category[] {
  const trail: Category[] = [];
  let current = findCategory(catalog, slug);
  while (current && !trail.includes(current)) {
    trail.unshift(current);
    current = current.parent ? findCategory(catalog, current.parent) : undefined;
  }
  return trail;
}

export function offerFor(product: Product, material: MaterialKey): MaterialOffer | undefined {
  return product.offers.find((o) => o.material === material);
}

export function defaultOffer(product: Product): MaterialOffer {
  return offerFor(product, product.defaultMaterial) ?? product.offers[0];
}

/** "-24%" style discount of one offer, rounded. */
export function discountPercent(offer: MaterialOffer): number | undefined {
  if (!offer.compareAtPrice) return undefined;
  return Math.round((1 - offer.price / offer.compareAtPrice) * 100);
}

/** Average and count of a product's visible reviews; null when it has none. */
export function reviewStats(catalog: Catalog, slug: string): ReviewStats | null {
  const own = catalog.reviews.filter((r) => r.productSlug === slug);
  if (own.length === 0) return null;
  return { rating: own.reduce((sum, r) => sum + r.rating, 0) / own.length, count: own.length };
}

/** The product's own reviews first, then other reviews to fill the section. */
export function reviewsFor(catalog: Catalog, slug: string, limit = 4): Review[] {
  const own = catalog.reviews.filter((r) => r.productSlug === slug);
  const others = catalog.reviews.filter((r) => r.productSlug !== slug);
  return [...own, ...others].slice(0, limit);
}
