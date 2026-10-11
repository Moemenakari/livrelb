import type { CartItem } from "@/lib/cart";

// Carrying the bag from an in-app browser (Instagram, Facebook...) to the phone's real browser, where each
// browser has its own storage: the bag travels in the address as ?bag=<compact text>. It holds only what
// the customer chose (never a price, never a name or a picture): the real browser sends it to the server
// (restoreBag), which checks every line against the catalog and prices it again.

export const MAX_BAG_LINES = 10;
export const MAX_BAG_QTY = 10;
export const MAX_BAG_PARAM = 4000;

export type BagLine = {
  slug: string;
  material: CartItem["material"];
  qty: number;
  text?: string;
  font?: string;
  size?: number;
  connection?: "sides" | "center";
  charms?: string[];
  sizeKind?: "chain" | "bracelet" | "ring";
};

const MATERIALS = ["gold", "silver", "doubleGold", "doubleSilver", "steel"];
const SLUG = /^[a-z0-9-]{1,80}$/;
const CHARM = /^(stock:[0-9a-f-]{36}|[a-z0-9_-]{1,60})$/i;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const bin = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** The bag as a short text for the address ("" when the bag is empty). */
export function encodeBag(items: CartItem[]): string {
  const lines = items.slice(0, MAX_BAG_LINES).map((i) => [
    i.slug,
    i.material,
    Math.min(MAX_BAG_QTY, i.qty),
    i.text ?? null,
    i.font ?? null,
    i.size ?? null,
    i.connection ?? null,
    i.charms ?? null,
    i.sizeKind ?? null,
  ]);
  return lines.length > 0 ? toBase64Url(JSON.stringify(lines)) : "";
}

/** Reads ?bag= back. Anything unexpected is dropped; the result is capped (lines, quantities, lengths). */
export function decodeBag(param: string): BagLine[] {
  if (!param || param.length > MAX_BAG_PARAM) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(param));
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const lines: BagLine[] = [];
  for (const entry of raw.slice(0, MAX_BAG_LINES)) {
    if (!Array.isArray(entry)) continue;
    const [slug, material, qty, text, font, size, connection, charms, sizeKind] = entry as unknown[];
    if (typeof slug !== "string" || !SLUG.test(slug)) continue;
    if (typeof material !== "string" || !MATERIALS.includes(material)) continue;
    if (!Number.isInteger(qty) || (qty as number) < 1) continue;
    const cleanCharms = Array.isArray(charms) ? charms.filter((c): c is string => typeof c === "string" && CHARM.test(c)).slice(0, 30) : undefined;
    lines.push({
      slug,
      material: material as BagLine["material"],
      qty: Math.min(MAX_BAG_QTY, qty as number),
      text: typeof text === "string" ? text.trim().slice(0, 20) || undefined : undefined,
      font: typeof font === "string" && font.length <= 20 ? font : undefined,
      size: typeof size === "number" && Number.isFinite(size) && size > 0 && size < 200 ? size : undefined,
      connection: connection === "sides" || connection === "center" ? connection : undefined,
      charms: cleanCharms && cleanCharms.length > 0 ? cleanCharms : undefined,
      sizeKind: sizeKind === "chain" || sizeKind === "bracelet" || sizeKind === "ring" ? sizeKind : undefined,
    });
  }
  return lines;
}
