import type { ChainConnection, FontKey, MaterialKey, ProductArt } from "@/lib/catalog/types";

// The product editor's form data (client) = what saveProduct() checks and
// sends to admin_save_product (server). Money in USD in the form.

export type ProductForm = {
  id: string | null;
  slug: string;
  nameEn: string;
  nameAr: string;
  summaryEn: string;
  summaryAr: string;
  descriptionEn: string;
  descriptionAr: string;
  detailsEn: string;
  detailsAr: string;
  status: "draft" | "active" | "archived";
  style: string;
  isBestSeller: boolean;
  isNew: boolean;
  personalization: "name" | "initial" | "";
  maxLength: number;
  sampleText: string;
  connections: ChainConnection[];
  art: ProductArt;
  /** null = stock not tracked (made to order). */
  stock: number | null;
  materials: { key: MaterialKey; price: string; compareAt: string; isDefault: boolean }[];
  options: { kind: "chain" | "bracelet" | "ring"; value: string; modifier: string; isDefault: boolean }[];
  /** Allowed fonts, the first is the default. */
  fonts: FontKey[];
  categories: string[];
  /** Up to 7 photos + 1 video; the first photo is the main one. */
  media: { url: string; type: "image" | "video"; altEn: string; altAr: string }[];
};

export const artPresets: { label: string; art: ProductArt }[] = [
  { label: "Name necklace", art: { kind: "name", variant: "necklace" } },
  { label: "Name bracelet", art: { kind: "name", variant: "bracelet" } },
  { label: "Lira coin necklace", art: { kind: "coin", variant: "necklace" } },
  { label: "Lira coin bracelet", art: { kind: "coin", variant: "bracelet" } },
  { label: "Lira coin earrings", art: { kind: "coin", variant: "earrings" } },
  { label: "Cedar", art: { kind: "cedar" } },
  { label: "Ring with initial", art: { kind: "ring", engraving: "initial" } },
  { label: "Plain ring", art: { kind: "ring", engraving: "plain" } },
  { label: "Hoops", art: { kind: "hoops", pearl: false } },
  { label: "Pearl hoops", art: { kind: "hoops", pearl: true } },
];

export function artKey(art: ProductArt): string {
  return JSON.stringify(art, Object.keys(art).sort());
}

export const MAX_PHOTOS = 7;
