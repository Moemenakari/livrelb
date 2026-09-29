import type { Locale } from "@/i18n/routing";
import { materials } from "./materials";
import type { FontKey, MaterialKey, Product, ProductArt, RingStyle } from "./types";

/** Just what a product card needs, in one language (keeps pages light). */
export type CardProduct = {
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  priceModifiers: Partial<Record<MaterialKey, number>>;
  isBestSeller: boolean;
  isNew: boolean;
  materials: MaterialKey[];
  defaultMaterial: MaterialKey;
  /** Personalizable pieces: the name drawn by default. */
  sample?: string;
  font?: FontKey;
  rings?: RingStyle;
  art: ProductArt;
  media: { src: string; alt: string }[];
  categories: Product["categories"];
  style?: Product["style"];
};


export function toCard(product: Product, locale: Locale): CardProduct {
  const p = product.personalization;
  return {
    slug: product.slug,
    name: product.name[locale],
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    priceModifiers: Object.fromEntries(
      product.materials.map((m) => [m, materials[m].priceModifier]),
    ),
    isBestSeller: Boolean(product.isBestSeller),
    isNew: Boolean(product.isNew),
    materials: product.materials,
    defaultMaterial: product.defaultMaterial,
    sample: p?.sample,
    font: p?.fonts[0],
    rings: p ? (p.rings.includes("sides") ? "sides" : p.rings[0]) : undefined,
    art: product.art,
    media: product.media.map((m) => ({ src: m.src, alt: m.alt[locale] })),
    categories: product.categories,
    style: product.style,
  };
}
