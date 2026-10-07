"use server";

import { refresh, revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";
import { createUploadUrl, isR2Configured } from "@/lib/storage/r2";
import { AdminError, authorize, run, type ActionResult } from "./auth";
import { homeSectionKeys, type HomePageInput } from "./home-types";
import { can } from "./permissions";

const MAX_LIRA = 8;
const MAX_TILE_IMAGE = 8 * 1024 * 1024;
const imageTypes = ["image/webp", "image/jpeg", "image/png"];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** A signed upload link for one "Shop by style" tile photo. */
export async function createTileUpload(input: { contentType: string; size: number }): Promise<ActionResult<{ uploadUrl: string; publicUrl: string }>> {
  return run(async () => {
    await authorize("products.edit");
    if (!isR2Configured()) throw new AdminError("Photo storage (Cloudflare R2) isn't set up yet.");
    if (!imageTypes.includes(input.contentType)) throw new AdminError("Use a JPG, PNG or WebP photo.");
    if (!Number.isFinite(input.size) || input.size <= 0 || input.size > MAX_TILE_IMAGE) {
      throw new AdminError(`This photo is too big (max ${MAX_TILE_IMAGE / 1024 / 1024} MB).`);
    }
    const target = await createUploadUrl({ folder: "home", contentType: input.contentType });
    return { uploadUrl: target.uploadUrl, publicUrl: target.publicUrl };
  });
}

/** Saves the admin's Home page: section texts, Lira products, tiles and best sellers order. */
export async function saveHomePage(input: HomePageInput): Promise<ActionResult> {
  return run(async () => {
    const { staff, db } = await authorize("collections.manage");
    if (!can(staff, "products.edit")) throw new AdminError("You don't have permission to do this.");

    const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");

    // Validate everything before anything is written, so a mistake never leaves half a save.
    const sections = (Array.isArray(input.sections) ? input.sections : []).map((s) => {
      if (!homeSectionKeys.includes(s.key)) throw new AdminError("Reload the page and try again.");
      const ctaHref = str(s.ctaHref, 200);
      if (ctaHref && !/^\/[A-Za-z0-9\-_/?=&.]*$/.test(ctaHref)) {
        throw new AdminError("Button link: a page of this site, like /category/bracelets.");
      }
      return {
        key: s.key,
        is_visible: Boolean(s.visible),
        title_en: str(s.titleEn, 120),
        title_ar: str(s.titleAr, 120),
        subtitle_en: str(s.subtitleEn, 300),
        subtitle_ar: str(s.subtitleAr, 300),
        cta_href: ctaHref,
      };
    });

    const liraSlugs = [...new Set((Array.isArray(input.liraSlugs) ? input.liraSlugs : []).filter((s) => SLUG.test(s)))];
    if (liraSlugs.length > MAX_LIRA) throw new AdminError(`Up to ${MAX_LIRA} Lira products.`);
    const bestSlugs = [...new Set((Array.isArray(input.bestSellers) ? input.bestSellers : []).filter((s) => SLUG.test(s)))];

    const tiles = (Array.isArray(input.tiles) ? input.tiles : []).map((tile, i) => {
      if (!SLUG.test(tile.slug)) throw new AdminError("Reload the page and try again.");
      const imageUrl = str(tile.imageUrl, 500);
      if (imageUrl && (!base || !imageUrl.startsWith(`${base}/`))) throw new AdminError("Upload the tile photo again.");
      return { slug: tile.slug, show_on_home: Boolean(tile.show), home_sort: i, image_url: imageUrl || null };
    });

    const { data: products, error: productsError } = await db.from("products").select("id, slug").in("slug", [...liraSlugs, ...bestSlugs]);
    if (productsError) throw productsError;
    const idOf = new Map((products ?? []).map((p) => [p.slug, p.id]));
    for (const slug of liraSlugs) if (!idOf.has(slug)) throw new AdminError("A picked product doesn't exist anymore. Reload the page.");

    try {
      const { error: sectionsError } = await db.from("home_sections").upsert(sections, { onConflict: "key" });
      if (sectionsError) throw sectionsError;

      // Lira products: write the picked ones in order, then remove the rest.
      if (liraSlugs.length > 0) {
        const { error } = await db
          .from("home_section_products")
          .upsert(liraSlugs.map((slug, i) => ({ section_key: "lira", product_id: idOf.get(slug)!, sort_order: i })), { onConflict: "section_key,product_id" });
        if (error) throw error;
      }
      const keep = liraSlugs.map((slug) => idOf.get(slug)!);
      const cleanup = db.from("home_section_products").delete().eq("section_key", "lira");
      const { error: cleanupError } = keep.length > 0 ? await cleanup.not("product_id", "in", `(${keep.join(",")})`) : await cleanup;
      if (cleanupError) throw cleanupError;

      for (const tile of tiles) {
        const { slug, ...row } = tile;
        const { error } = await db.from("categories").update(row).eq("slug", slug);
        if (error) throw error;
      }

      // Best sellers in the chosen order; every other piece goes back to 0.
      const { error: resetError } = await db.from("products").update({ best_seller_sort: 0 }).gt("best_seller_sort", 0);
      if (resetError) throw resetError;
      for (const [i, slug] of bestSlugs.entries()) {
        const { error } = await db.from("products").update({ best_seller_sort: i + 1 }).eq("slug", slug);
        if (error) throw error;
      }
    } finally {
      // Whatever was saved shows in the shop right away, even after a failure.
      revalidateTag(CATALOG_TAG, { expire: 0 });
    }
    refresh();
  });
}
