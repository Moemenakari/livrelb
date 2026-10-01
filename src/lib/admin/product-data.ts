import "server-only";
import { allMaterials, fonts as fontInfo, isFontKey, materials as materialInfo } from "@/lib/catalog/materials";
import { suggestedPriceFactor } from "@/lib/catalog/pricing";
import type { ChainConnection, FontKey, MaterialKey, ProductArt } from "@/lib/catalog/types";
import { createClient } from "@/lib/supabase/server";
import { artPresets, type ProductForm } from "./product-types";

export type EditorLookups = {
  materials: { key: MaterialKey; name: string; factor: number }[];
  fonts: { key: FontKey; name: string; script: "latin" | "arabic" }[];
  categories: { slug: string; name: string }[];
};

export async function editorLookups(): Promise<EditorLookups> {
  const db = await createClient();
  const [{ data: cats }, { data: fontRows }, { data: materialRows }] = await Promise.all([
    db.from("categories").select("slug, name_en, rule").order("sort_order"),
    db.from("fonts").select("key, is_active").order("sort_order"),
    db.from("materials").select("key, is_active").order("sort_order"),
  ]);
  const activeMaterials = new Set((materialRows ?? []).filter((m) => m.is_active).map((m) => m.key));
  const activeFonts = (fontRows ?? []).filter((f) => f.is_active && isFontKey(f.key)).map((f) => f.key as FontKey);
  return {
    materials: allMaterials
      .filter((k) => activeMaterials.size === 0 || activeMaterials.has(k))
      .map((k) => ({ key: k, name: materialInfo[k].name.en, factor: suggestedPriceFactor[k] })),
    fonts: (activeFonts.length ? activeFonts : (Object.keys(fontInfo) as FontKey[])).map((k) => ({
      key: k,
      name: fontInfo[k].name.en,
      script: fontInfo[k].script,
    })),
    // Bestsellers / New arrivals list products by their badge, not by link.
    categories: (cats ?? []).filter((c) => !c.rule).map((c) => ({ slug: c.slug, name: c.name_en })),
  };
}

const dollars = (c: number | null | undefined) => (c === null || c === undefined ? "" : String(c / 100));

export function emptyProduct(): ProductForm {
  return {
    id: null,
    slug: "",
    nameEn: "",
    nameAr: "",
    summaryEn: "",
    summaryAr: "",
    descriptionEn: "",
    descriptionAr: "",
    detailsEn: "",
    detailsAr: "",
    status: "draft",
    style: "",
    isBestSeller: false,
    isNew: true,
    freeDelivery: false,
    freeGiftBox: true,
    personalization: "name",
    maxLength: 10,
    sampleText: "",
    connections: ["sides", "center"],
    art: artPresets[0].art,
    stock: null,
    materials: [
      { key: "gold", price: "", compareAt: "", isDefault: true },
      { key: "silver", price: "", compareAt: "", isDefault: false },
      { key: "rose", price: "", compareAt: "", isDefault: false },
    ],
    options: [35, 40, 45, 50, 55].map((v) => ({ kind: "chain" as const, value: String(v), modifier: "0", isDefault: v === 45 })),
    fonts: ["beirut"],
    categories: [],
    media: [],
  };
}

export type ProductMeta = { createdBy: string | null; updatedBy: string | null; createdAt: string; updatedAt: string };

export async function loadProduct(id: string): Promise<{ form: ProductForm; meta: ProductMeta } | null> {
  const db = await createClient();
  const { data: p } = await db
    .from("products")
    .select(
      `*, product_materials (price_cents, compare_at_price_cents, is_default, sort_order, materials (key)),
       product_options (kind, value, price_modifier_cents, is_default, sort_order),
       product_fonts (sort_order, fonts (key)),
       product_categories (sort_order, categories (slug)),
       product_media (url, type, alt_en, alt_ar, sort_order)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;
  const by = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

  return {
    meta: { createdBy: p.created_by, updatedBy: p.updated_by, createdAt: p.created_at, updatedAt: p.updated_at },
    form: {
      id: p.id,
      slug: p.slug,
      nameEn: p.name_en,
      nameAr: p.name_ar,
      summaryEn: p.summary_en,
      summaryAr: p.summary_ar,
      descriptionEn: p.description_en,
      descriptionAr: p.description_ar,
      detailsEn: p.details_en,
      detailsAr: p.details_ar,
      status: p.status,
      style: p.style ?? "",
      isBestSeller: p.is_best_seller,
      isNew: p.is_new,
      freeDelivery: p.free_delivery,
      freeGiftBox: p.free_gift_box,
      personalization: p.personalization ?? "",
      maxLength: p.max_length ?? 10,
      sampleText: p.sample_text ?? "",
      connections: p.chain_connections as ChainConnection[],
      art: (p.art as unknown as ProductArt) ?? artPresets[0].art,
      stock: p.stock_qty,
      materials: [...p.product_materials]
        .sort(by)
        .filter((m) => m.materials && (allMaterials as string[]).includes(m.materials.key))
        .map((m) => ({
          key: m.materials!.key as MaterialKey,
          price: dollars(m.price_cents),
          compareAt: dollars(m.compare_at_price_cents),
          isDefault: m.is_default,
        })),
      options: [...p.product_options].sort(by).map((o) => ({
        kind: o.kind,
        value: String(Number(o.value)),
        modifier: dollars(o.price_modifier_cents),
        isDefault: o.is_default,
      })),
      fonts: [...p.product_fonts].sort(by).map((f) => f.fonts?.key).filter(isFontKey),
      categories: [...p.product_categories].sort(by).flatMap((c) => (c.categories ? [c.categories.slug] : [])),
      media: [...p.product_media].sort(by).map((m) => ({ url: m.url, type: m.type, altEn: m.alt_en, altAr: m.alt_ar })),
    },
  };
}
