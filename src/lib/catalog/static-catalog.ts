import { sampleAreas } from "./areas";
import { categories } from "./categories";
import { products } from "./products";
import { reviews, showSampleReviews } from "./reviews";
import { sampleHeroOffer, samplePromo, sampleSettings } from "./settings";
import type { Catalog } from "./types";

// The catalog from the sample files: used when Supabase is not configured.
export function loadStaticCatalog(): Catalog {
  return {
    products,
    categories,
    reviews: reviews.filter((r) => showSampleReviews || !r.isSample),
    settings: sampleSettings,
    promo: samplePromo,
    heroOffer: sampleHeroOffer,
    heroSlides: [],
    home: {},
    charmDesign: null,
    areas: sampleAreas.map((a) => ({ ...a, fee: null, days: a.slug === "tripoli" ? { min: 2, max: 2 } : null })),
    sold: {},
    publicCoupons: [],
    source: "static",
  };
}
