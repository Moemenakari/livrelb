import type { Locale } from "@/i18n/routing";

// Shapes follow the database tables in PROJECT_BRIEF §7, so the static
// sample data in this folder can be swapped for Supabase queries in Phase 2
// without touching the components.

export type Localized = Record<Locale, string>;

/** materials table. */
export type MaterialKey = "silver" | "gold" | "rose" | "doubleGold";

/** The three metal colors the previews and art can render. */
export type MetalTone = "gold" | "silver" | "rose";

export type Material = {
  key: MaterialKey;
  name: Localized;
  tone: MetalTone;
  /** Swatch color for material dots and cards. */
  swatch: string;
};

/** product_materials: a metal a product comes in, with its own price (USD). */
export type MaterialOffer = {
  material: MaterialKey;
  price: number;
  compareAtPrice?: number;
};

/** fonts table: our own display names (Lebanese places), never the font file's name. */
export type FontKey =
  | "beirut"
  | "byblos"
  | "batroun"
  | "tyre"
  | "saida"
  | "jounieh"
  | "zahle"
  | "ehden"
  | "faraya"
  | "bcharre"
  | "baalbek"
  | "anjar"
  | "tripoli"
  | "harissa"
  | "deir-el-qamar";

/** Which names a font is offered for: Arabic fonts only show for Arabic names. */
export type FontScript = "latin" | "arabic";

export type FontInfo = { name: Localized; script: FontScript };

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
  /** Fonts the customer may choose (product_fonts); the first is the default. */
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

/** Category slugs come from the database, so any string. */
export type CategorySlug = string;

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
  categories: CategorySlug[];
  style?: StyleKey;
  isBestSeller?: boolean;
  isNew?: boolean;
  /** Metals offered, in display order, each with its price. */
  offers: MaterialOffer[];
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
  /** Lists products by flag instead of by link (bestsellers, new arrivals). */
  rule?: "bestsellers" | "new";
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

/** site_settings: shop rules shown in the storefront (USD). */
export type StoreSettings = {
  deliveryFee: number;
  freeShippingOver: number;
  firstOrderFreeDelivery: boolean;
  /** Empty until the owner sets it: every WhatsApp button is hidden. */
  whatsappNumber: string;
  /** Empty until the owner sets it: the Instagram link is hidden. */
  instagramUrl: string;
  announcements: Localized[];
};

/** promotions (promo_bar): the code in the promo bar and hero sub-line. */
export type StorePromo = {
  code: string;
  percent: number;
  /** ISO date; null = no countdown. */
  endsAt: string | null;
};

/** promotions (hero): the first-order offer headline. */
export type HeroOffer = {
  percent: number;
  endsAt: string | null;
};

/** Everything the storefront reads, from Supabase or the sample files. */
export type Catalog = {
  products: Product[];
  categories: Category[];
  /** Reviews the visitor may see (samples only in development). */
  reviews: Review[];
  settings: StoreSettings;
  /** null when no promo code is running. */
  promo: StorePromo | null;
  heroOffer: HeroOffer | null;
  source: "supabase" | "static";
};
