import type { Locale } from "@/i18n/routing";
import { materials } from "./materials";
import type {
  ChainConnection,
  FontKey,
  MaterialKey,
  MetalTone,
  Product,
  ProductArt,
} from "./types";

/** A metal on a card: what the dot shows and what it costs. */
export type CardOffer = {
  material: MaterialKey;
  name: string;
  swatch: string;
  tone: MetalTone;
  price: number;
  compareAtPrice?: number;
};

/** Just what a product card needs, in one language (keeps pages light). */
export type CardProduct = {
  slug: string;
  name: string;
  /** Default metal's price, for sorting. */
  price: number;
  isBestSeller: boolean;
  isNew: boolean;
  offers: CardOffer[];
  defaultMaterial: MaterialKey;
  /** Personalizable pieces: the name drawn by default. */
  sample?: string;
  /** Allowed fonts, the product's default first. */
  fonts?: FontKey[];
  connection?: ChainConnection;
  art: ProductArt;
  media: { src: string; alt: string }[];
  categories: Product["categories"];
  style?: Product["style"];
};

export function toCard(product: Product, locale: Locale): CardProduct {
  const p = product.personalization;
  const offers = product.offers.map((o) => ({
    material: o.material,
    name: materials[o.material].name[locale],
    swatch: materials[o.material].swatch,
    tone: materials[o.material].tone,
    price: o.price,
    compareAtPrice: o.compareAtPrice,
  }));
  const main = offers.find((o) => o.material === product.defaultMaterial) ?? offers[0];
  return {
    slug: product.slug,
    name: product.name[locale],
    price: main.price,
    isBestSeller: Boolean(product.isBestSeller),
    isNew: Boolean(product.isNew),
    offers,
    defaultMaterial: main.material,
    sample: p?.sample,
    fonts: p?.fonts,
    connection: p ? (p.connections.includes("sides") ? "sides" : p.connections[0]) : undefined,
    art: product.art,
    media: product.media.map((m) => ({ src: m.src, alt: m.alt[locale] })),
    categories: product.categories,
    style: product.style,
  };
}
