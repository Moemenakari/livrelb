import type { Locale } from "@/i18n/routing";

// Shapes follow the database tables in PROJECT_BRIEF §7, so the static
// sample data in this folder can be swapped for Supabase queries in Phase 2
// without touching the components.

export type Localized = Record<Locale, string>;

/** materials table. */
export type MaterialKey = "gold" | "silver" | "doubleGold" | "doubleSilver" | "steel";

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

/** `style` tells the look in plain words (slanted, upright, capitals…) under our place name. */
export type FontInfo = { name: Localized; style: Localized; script: FontScript };

/** Where the chain attaches to the name: both ends, or one ring on top. */
export type ChainConnection = "sides" | "center";

/** product_options: sizes, per product type. */
export type SizeOption = {
  kind: "chain" | "bracelet" | "ring";
  values: number[];
  default: number;
  /** USD added to the metal price for this size type (price_modifier_cents). */
  priceModifier?: number;
};

/** What a chain piece is worn as: necklace (chain sizes) or bracelet. */
export type Piece = "necklace" | "bracelet";

export const pieceOf = (kind: SizeOption["kind"] | undefined): Piece | undefined =>
  kind === "chain" ? "necklace" : kind === "bracelet" ? "bracelet" : undefined;

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
  /** coin: which Livre coin; the 1975 1 Livre when missing. */
  | { kind: "coin"; variant: "necklace" | "bracelet" | "earrings"; coin?: 250 | 500 }
  | { kind: "cedar"; variant?: Piece }
  | { kind: "ring"; engraving: "initial" | "plain" }
  | { kind: "hoops"; pearl: boolean };

/** product_media: real photos. Empty array = generated art + placeholders. */
export type ProductMedia = { src: string; alt: Localized; type?: "image" | "video" };

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
  /** An order with this piece pays no delivery (set in the admin). */
  freeDelivery?: boolean;
  /** The LIVRE gift box comes free with this piece (default on). */
  freeGiftBox?: boolean;
  /** Metals offered, in display order, each with its price. */
  offers: MaterialOffer[];
  defaultMaterial: MaterialKey;
  personalization?: Personalization;
  /**
   * Chain connection choices of a piece that is not personalized (coins,
   * cedars). Personalized pieces use personalization.connections.
   */
  connections?: ChainConnection[];
  /** Sizes of the piece as listed (necklace, bracelet or ring). */
  size?: SizeOption;
  /**
   * The same design worn the other way: bracelet sizes for a necklace,
   * chain sizes for a bracelet, with its own price change.
   */
  altSize?: SizeOption;
  art: ProductArt;
  media: ProductMedia[];
  /** Text for the "Size & Materials" tab. */
  details: Localized;
  /** Pieces left, only when stock is tracked (undefined = made to order). */
  stock?: number;
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
  /** "Estimated delivery" text; empty = built from deliveryDays. */
  deliveryTime: Localized;
  deliveryDays: { min: number; max: number };
  /** LIVRE Points rules (site_settings). */
  points: PointsRules;
  /** Whish online payment (OTP) is switched on. Off = Whish stays manual. */
  whishOnline: boolean;
  /** Visa / Mastercard on the website (also needs the gateway keys). */
  cardOnline: boolean;
  /** Analytics IDs from the admin; empty = off. */
  metaPixelId: string;
  ga4Id: string;
  /** Shipping tab text from the admin; empty = the default text. */
  shippingInfo?: Localized;
};

export type PointsRules = {
  enabled: boolean;
  /** Points earned for each full step ($15 by default). */
  perStep: number;
  /** Points count per full step of this many dollars ($20). */
  stepDollars: number;
  /** Points for an approved review. */
  perReview: number;
  /** redeemPoints points = redeemValue dollars off. */
  redeemPoints: number;
  redeemValue: number;
};

/** A delivery area and its own fee (null = the shop's delivery fee). */
export type DeliveryArea = { slug: string; name: Localized; fee: number | null };

/** A coupon the owner marked public: shown in the product page deals row. */
export type PublicCoupon = {
  code: string;
  type: "percent" | "fixed" | "free_delivery";
  /** Percent, or dollars for fixed coupons. */
  value: number;
  minOrder: number;
};

/** promotions (promo_bar): the code in the promo bar and hero sub-line. */
export type StorePromo = {
  code: string;
  percent: number;
  /** Text typed in the admin; the default tagline when missing. */
  text?: Localized;
  /** ISO date; null = no countdown. */
  endsAt: string | null;
};

/** promotions (hero): the first-order offer headline. */
export type HeroOffer = {
  percent: number;
  /** Headline typed in the admin; the default headline when missing. */
  headline?: Localized;
  endsAt: string | null;
};

/** A photo or video behind the homepage headline (Promotions in the admin). */
export type HeroSlide = {
  id: string;
  url: string;
  type: "image" | "video";
  headline?: Localized;
  /** A page of this site, e.g. /category/bracelets. */
  link?: string;
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
  /** Empty = the homepage shows the 3D coin. */
  heroSlides: HeroSlide[];
  areas: DeliveryArea[];
  /** Pieces sold per product slug (orders not cancelled). */
  sold: Record<string, number>;
  publicCoupons: PublicCoupon[];
  source: "supabase" | "static";
};
