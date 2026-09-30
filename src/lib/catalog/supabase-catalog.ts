import "server-only";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient, createPublicClient } from "@/lib/supabase/public";
import { styleKeys } from "./categories";
import { isFontKey, materials } from "./materials";
import { reviews as sampleReviews, showSampleReviews } from "./reviews";
import type {
  Catalog,
  Category,
  HeroOffer,
  Localized,
  MaterialKey,
  Product,
  ProductArt,
  PublicCoupon,
  Review,
  SizeOption,
  StorePromo,
  StyleKey,
} from "./types";

// Loads the storefront catalog from Supabase and maps rows (cents,
// snake_case, _en/_ar columns) to the shapes the pages use (dollars,
// Localized). Metals and fonts must be known to the code (a swatch, a font
// file), so unknown keys are skipped rather than breaking a page.

const isMaterialKey = (k: string | undefined): k is MaterialKey => Boolean(k && k in materials);
const isStyleKey = (k: string | null): k is StyleKey => Boolean(k && styleKeys.includes(k as StyleKey));
const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;
const dollars = (cents: number) => cents / 100;
const loc = (en: string, ar: string): Localized => ({ en, ar });

function asArt(value: Json | null): ProductArt | undefined {
  return value && typeof value === "object" && !Array.isArray(value) && "kind" in value
    ? (value as unknown as ProductArt)
    : undefined;
}

type OptionRow = {
  kind: SizeOption["kind"];
  value: number;
  price_modifier_cents: number;
  is_default: boolean;
};

/**
 * The sizes of one size type. A product lists its own type first (the one
 * with the default) and may add the other chain type: a necklace that can
 * also be a bracelet. Its default is the marked one, else the middle size.
 */
function sizeOf(options: OptionRow[], kind: SizeOption["kind"] | undefined): SizeOption | undefined {
  const own = options.filter((o) => o.kind === kind);
  if (!kind || own.length === 0) return undefined;
  const values = own.map((o) => Number(o.value));
  const marked = own.find((o) => o.is_default);
  return {
    kind,
    values,
    default: marked ? Number(marked.value) : values[Math.floor((values.length - 1) / 2)],
    priceModifier: own[0].price_modifier_cents ? dollars(own[0].price_modifier_cents) : undefined,
  };
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`Supabase: could not load ${what}: ${error?.message ?? "no data"}`);
}

const productColumns = `
  slug, name_en, name_ar, summary_en, summary_ar, description_en, description_ar,
  details_en, details_ar, style, is_best_seller, is_new, personalization, max_length,
  sample_text, chain_connections, art, sort_order, stock_qty,
  product_materials (price_cents, compare_at_price_cents, is_default, sort_order, materials (key)),
  product_options (kind, value, price_modifier_cents, is_default, sort_order),
  product_fonts (sort_order, fonts (key)),
  product_media (url, type, alt_en, alt_ar, sort_order),
  product_categories (sort_order, categories (slug))
`;

export async function loadSupabaseCatalog(): Promise<Catalog> {
  const db = createPublicClient();
  // Development may also show sample reviews, which the public role can't
  // read: use the secret key when set, else the sample file.
  const reviewReader = showSampleReviews ? (createAdminClient() ?? null) : null;

  // Sales counts and public coupons: server-only numbers (secret key).
  const admin = createAdminClient();
  const [productsRes, categoriesRes, reviewsRes, settingsRes, promotionsRes, areasRes, statsRes] = await Promise.all([
    db.from("products").select(productColumns).eq("status", "active").order("sort_order"),
    db.from("categories").select("*").eq("is_active", true).order("sort_order"),
    (reviewReader ?? db)
      .from("reviews")
      .select(
        "id, customer_name, city, city_ar, rating, text, text_ar, review_date, is_sample, products (slug)",
      )
      .eq("is_approved", true)
      .order("review_date", { ascending: false }),
    db.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    db.from("promotions").select("*").eq("is_active", true).order("sort_order"),
    db.from("areas").select("slug, name_en, name_ar, delivery_fee_cents").eq("is_active", true).order("sort_order"),
    admin ? admin.rpc("storefront_stats") : Promise.resolve({ data: null, error: null }),
  ]);

  if (productsRes.error) fail("products", productsRes.error);
  if (categoriesRes.error) fail("categories", categoriesRes.error);
  if (reviewsRes.error) fail("reviews", reviewsRes.error);
  if (settingsRes.error || !settingsRes.data) fail("site settings", settingsRes.error);
  if (promotionsRes.error) fail("promotions", promotionsRes.error);

  const products = productsRes.data.flatMap((row): Product[] => {
    const offers = [...row.product_materials]
      .sort(bySort)
      .filter((pm) => isMaterialKey(pm.materials?.key))
      .map((pm) => ({
        material: pm.materials!.key as MaterialKey,
        price: dollars(pm.price_cents),
        compareAtPrice: pm.compare_at_price_cents ? dollars(pm.compare_at_price_cents) : undefined,
      }));
    const art = asArt(row.art);
    if (offers.length === 0 || !art) return [];

    const defaultKey = row.product_materials.find((pm) => pm.is_default)?.materials?.key;
    const options = [...row.product_options].sort(bySort);
    const mainKind = (options.find((o) => o.is_default) ?? options[0])?.kind;
    const fonts = [...row.product_fonts]
      .sort(bySort)
      .map((pf) => pf.fonts?.key)
      .filter(isFontKey);

    return [
      {
        slug: row.slug,
        name: loc(row.name_en, row.name_ar),
        summary: loc(row.summary_en, row.summary_ar),
        description: loc(row.description_en, row.description_ar),
        details: loc(row.details_en, row.details_ar),
        categories: [...row.product_categories]
          .sort(bySort)
          .flatMap((pc) => (pc.categories ? [pc.categories.slug] : [])),
        style: isStyleKey(row.style) ? row.style : undefined,
        isBestSeller: row.is_best_seller,
        isNew: row.is_new,
        offers,
        defaultMaterial: isMaterialKey(defaultKey) ? defaultKey : offers[0].material,
        personalization:
          row.personalization && row.max_length
            ? {
                kind: row.personalization,
                maxLength: row.max_length,
                fonts: fonts.length > 0 ? fonts : ["beirut"],
                connections: row.chain_connections,
                sample: row.sample_text ?? "",
              }
            : undefined,
        connections: row.personalization ? undefined : row.chain_connections,
        size: sizeOf(options, mainKind),
        altSize: sizeOf(options, options.find((o) => o.kind !== mainKind && o.kind !== "ring")?.kind),
        art,
        stock: row.stock_qty ?? undefined,
        // Photos in order (the first is the main one), then the video.
        media: [...row.product_media]
          .sort((a, b) => Number(a.type === "video") - Number(b.type === "video") || a.sort_order - b.sort_order)
          .map((m) => ({ src: m.url, alt: loc(m.alt_en, m.alt_ar), type: m.type })),
      },
    ];
  });

  const slugById = new Map(categoriesRes.data.map((c) => [c.id, c.slug]));
  const categories = categoriesRes.data.flatMap((row): Category[] => {
    const art = asArt(row.art);
    if (!art) return [];
    return [
      {
        slug: row.slug,
        name: loc(row.name_en, row.name_ar),
        navName:
          row.nav_name_en && row.nav_name_ar ? loc(row.nav_name_en, row.nav_name_ar) : undefined,
        description: loc(row.description_en, row.description_ar),
        parent: row.parent_id ? slugById.get(row.parent_id) : undefined,
        rule: row.rule === "bestsellers" || row.rule === "new" ? row.rule : undefined,
        styles: row.styles.filter(isStyleKey),
        art,
        artSample: row.art_sample ?? undefined,
      },
    ];
  });

  let reviews: Review[] = reviewsRes.data
    .filter((r) => showSampleReviews || !r.is_sample)
    .map((r) => ({
      id: r.id,
      productSlug: r.products?.slug ?? null,
      author: r.customer_name,
      city: loc(r.city ?? "", r.city_ar ?? r.city ?? ""),
      rating: r.rating,
      text: loc(r.text, r.text_ar ?? r.text),
      date: r.review_date,
      isSample: r.is_sample,
    }));
  if (showSampleReviews && !reviewReader) {
    reviews = [...reviews, ...sampleReviews.filter((r) => r.isSample)];
  }

  const s = settingsRes.data;
  // Numbers only: a failed stats call just hides "X sold" and the coupons.
  const stats = (statsRes.error ? {} : (statsRes.data ?? {})) as {
    sold?: Record<string, number>;
    coupons?: { code: string; type: PublicCoupon["type"]; value: number; min_order_cents: number }[];
  };
  // Promotions run between their start and end times (set in the admin).
  const now = Date.now();
  const running = promotionsRes.data.filter(
    (p) => (!p.starts_at || Date.parse(p.starts_at) <= now) && (!p.ends_at || Date.parse(p.ends_at) > now),
  );
  const typed = (en: string | null, ar: string | null) => (en?.trim() ? loc(en.trim(), ar?.trim() || en.trim()) : undefined);
  const bar = running.find((p) => p.placement === "promo_bar" && p.code && p.percent);
  const hero = running.find((p) => p.placement === "hero" && p.percent);
  const promo: StorePromo | null = bar
    ? { code: bar.code!, percent: bar.percent!, endsAt: bar.ends_at, text: typed(bar.headline_en, bar.headline_ar) }
    : null;
  const heroOffer: HeroOffer | null = hero
    ? { percent: hero.percent!, endsAt: hero.ends_at, headline: typed(hero.headline_en, hero.headline_ar) }
    : null;

  return {
    products,
    categories,
    reviews,
    settings: {
      deliveryFee: dollars(s.delivery_fee_cents),
      freeShippingOver: dollars(s.free_shipping_threshold_cents),
      firstOrderFreeDelivery: s.first_order_free_delivery,
      whatsappNumber: s.whatsapp_number,
      instagramUrl: s.instagram_url,
      announcements: Array.isArray(s.announcements)
        ? (s.announcements as { en?: string; ar?: string }[]).flatMap((a) =>
            a?.en && a?.ar ? [loc(a.en, a.ar)] : [],
          )
        : [],
      deliveryTime: loc(s.delivery_time_en, s.delivery_time_ar),
      deliveryDays: { min: s.delivery_days_min, max: s.delivery_days_max },
      points: {
        enabled: s.points_enabled,
        perDollar: s.points_per_dollar,
        perReview: s.points_per_review,
        redeemPoints: s.points_redeem_points,
        redeemValue: dollars(s.points_redeem_cents),
      },
      whishOnline: s.whish_online_enabled,
      shippingInfo: s.shipping_info_en.trim()
        ? loc(s.shipping_info_en, s.shipping_info_ar.trim() || s.shipping_info_en)
        : undefined,
    },
    promo,
    heroOffer,
    areas: (areasRes.data ?? []).map((a) => ({
      slug: a.slug,
      name: loc(a.name_en, a.name_ar),
      fee: a.delivery_fee_cents === null ? null : dollars(a.delivery_fee_cents),
    })),
    sold: stats.sold ?? {},
    publicCoupons: (stats.coupons ?? []).map(
      (c): PublicCoupon => ({
        code: c.code,
        type: c.type,
        value: c.type === "fixed" ? dollars(c.value) : c.value,
        minOrder: dollars(c.min_order_cents),
      }),
    ),
    source: "supabase",
  };
}
