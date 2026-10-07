import type { Locale } from "@/i18n/routing";
import { materials } from "./materials";
import type {
  ChainConnection,
  FontKey,
  MaterialKey,
  MetalTone,
  PointsRules,
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
  /** An order with this piece pays no delivery (set in the admin). */
  freeDelivery: boolean;
  /** LIVRE Points earned by buying it at its default price (0 = points are off or too low). */
  points: number;
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

export function toCard(product: Product, locale: Locale, points?: PointsRules): CardProduct {
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
    freeDelivery: Boolean(product.freeDelivery),
    // Same rule as the database and the product page: whole steps of the price.
    points: points?.enabled ? Math.floor(main.price / points.stepDollars) * points.perStep : 0,
    offers,
    defaultMaterial: main.material,
    sample: p?.sample,
    fonts: p?.fonts,
    connection: (p?.connections ?? product.connections)?.[0],
    art: product.art,
    media: product.media.filter((m) => m.type !== "video").map((m) => ({ src: m.src, alt: m.alt[locale] })),
    categories: product.categories,
    style: product.style,
  };
}
