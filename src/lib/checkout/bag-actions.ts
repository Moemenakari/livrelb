"use server";

import type { CartItem } from "@/lib/cart";
import { decodeBag } from "@/lib/bag-transfer";
import { findProduct, getCatalog } from "@/lib/catalog";
import { findShape } from "@/lib/charms";
import { getCharmData } from "@/lib/charms/data";
import { quoteCart } from "./actions";

/**
 * A bag that came in the address (?bag=, from the in-app browser) becomes real bag lines. Nothing in the
 * address is trusted: each line is checked against the catalog and priced again by the database (the
 * same quote the cart uses), and a line the shop doesn't know or can't sell is dropped.
 */
export async function restoreBag(param: string): Promise<Omit<CartItem, "id">[]> {
  const lines = decodeBag(typeof param === "string" ? param : "");
  if (lines.length === 0) return [];

  const quote = await quoteCart({
    items: lines.map((l) => ({ product: l.slug, material: l.material, qty: l.qty, text: l.text, font: l.font, size: l.size, connection: l.connection, charms: l.charms })),
  });
  if (!quote.ok) return [];

  const catalog = await getCatalog();
  const stock = lines.some((l) => l.charms?.some((c) => c.startsWith("stock:"))) ? (await getCharmData()).stock : [];

  const restored: Omit<CartItem, "id">[] = [];
  lines.forEach((l, i) => {
    const priced = quote.quote.lines[i];
    if (!priced || "error" in priced) return;
    const product = findProduct(catalog, l.slug) ?? (catalog.charmDesign?.slug === l.slug ? catalog.charmDesign : undefined);
    if (!product) return;
    const charmNames = l.charms?.map((key) => (key.startsWith("stock:") ? stock.find((s) => s.id === key.slice(6))?.name : findShape(key)?.name));
    if (charmNames?.some((n) => !n)) return;
    restored.push({
      slug: product.slug,
      name: product.name,
      art: product.art,
      sizeKind: l.sizeKind,
      material: l.material,
      text: l.text,
      font: l.font as CartItem["font"],
      size: l.size,
      connection: l.connection,
      charms: l.charms,
      charmNames: charmNames as CartItem["charmNames"],
      unitPrice: priced.unitPrice,
      qty: l.qty,
    });
  });
  return restored;
}
