import type { Locale } from "@/i18n/routing";

// Shapes follow the database tables in PROJECT_BRIEF §7, so the static
// sample data in this folder can be swapped for Supabase queries in Phase 2
// without touching the components.

export type Localized = Record<Locale, string>;

/** materials table. */
export type MaterialKey = "silver" | "gold18" | "rose" | "gold14" | "whiteGold14";

/** The three metal colors the previews and art can render. */
export type MetalTone = "gold" | "silver" | "rose";

export type Material = {
  key: MaterialKey;
  name: Localized;
  tone: MetalTone;
  /** Swatch color for material dots and cards. */
  swatch: string;
  /** Added to the product price. */
  priceModifier: number;
};

/** fonts table: our own display names, never the font file's name. */
export type FontKey = "beirut" | "byblos" | "batroun";

/** Where the chain attaches to the name: both ends, or one ring on top. */
export type ChainConnection = "sides" | "center";

/** product_options: sizes, per product type. */
export type SizeOption = {
  kind: "chain" | "bracelet" | "ring";
  values: number[];
  default: number;
};

export type Personalization = {
  kind: "name" | "initial";
  maxLength: number;
  fonts: FontKey[];
  /** Chain connection choices (brief §8.3.6). Empty when not applicable. */
  connections: ChainConnection[];
  /** Name shown on the card and product art. */
  sample: string;
};

/**
 * What the generated product art draws until real photos are uploaded.
 * Every product gets an art so no card is ever an empty grey box.
 */
export type ProductArt =
  | { kind: "name"; variant: "necklace" | "bracelet" }
  | { kind: "coin"; variant: "necklace" | "bracelet" | "earrings" }
  | { kind: "cedar" }
  | { kind: "ring"; engraving: "initial" | "plain" }
  | { kind: "hoops"; pearl: boolean };

/** product_media: real photos. Empty array = generated art + placeholders. */
export type ProductMedia = { src: string; alt: Localized };

export type CategorySlug =
  | "name-necklaces"
  | "necklaces"
  | "bracelets"
  | "mens-jewelry"
  | "rings"
  | "earrings"
  | "lira-collection"
  | "gifts"
  | "bestsellers"
  | "new";

/** Style groups shown as round thumbnails on a category page. */
export type StyleKey =
  | "cursive"
  | "arabic"
  | "bold"
  | "dainty"
  | "initial"
  | "twoFonts";

export type Product = {
  slug: string;
  name: Localized;
  /** One or two lines for the top of the product page. */
  summary: Localized;
  description: Localized;
  price: number;
  compareAtPrice?: number;
  categories: CategorySlug[];
  style?: StyleKey;
  isBestSeller?: boolean;
  isNew?: boolean;
  materials: MaterialKey[];
  defaultMaterial: MaterialKey;
  personalization?: Personalization;
  size?: SizeOption;
  art: ProductArt;
  media: ProductMedia[];
  /** Text for the "Size & Materials" tab. */
  details: Localized;
};

export type Category = {
  slug: CategorySlug;
  name: Localized;
  /** Shorter label for the navbar, when different. */
  navName?: Localized;
  description: Localized;
  parent?: CategorySlug;
  /** Round style thumbnails on the category page. */
  styles?: StyleKey[];
  /** Art for the category tile until a photo exists. */
  art: ProductArt;
  artSample?: string;
};

export type Review = {
  id: string;
  /** null = a review of the store, not one piece. */
  productSlug: string | null;
  author: string;
  city: Localized;
  rating: number;
  text: Localized;
  date: string;
  /** Placeholder review: shown in development only, never in production. */
  isSample: boolean;
};

export type ReviewStats = { rating: number; count: number };
