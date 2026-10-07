import "server-only";
import type { createAdminClient } from "@/lib/supabase/public";
import type { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { statusLabels } from "./format";
import type { Permission } from "./permissions";

// Turns audit_log lines (every change by staff, new reviews) and new orders
// into short readable events, for the admin Activity page and the phone
// notifications. A product save writes many lines (prices, photos, fonts...):
// they collapse into one event.

// The owner's own client (RLS: owner reads the audit log) or the server's.
type Db = NonNullable<ReturnType<typeof createAdminClient>> | Awaited<ReturnType<typeof createClient>>;

export type AuditRow = {
  id: number;
  actor_staff_id: string | null;
  table_name: string;
  row_id: string | null;
  action: string;
  changes: Json | null;
  created_at: string;
};

export type ActivityKind = "order" | "cancel" | "review" | "team";

/**
 * Can someone with these permissions see this kind of event? Orders need
 * "orders.view", reviews "reviews.manage"; changes by the team (prices,
 * titles, product details...) are for every staff member.
 */
export function canSee(kind: ActivityKind, allowed: { has(p: Permission): boolean }): boolean {
  if (kind === "team") return true;
  return allowed.has(kind === "review" ? "reviews.manage" : "orders.view");
}

export type ActivityEvent = {
  key: string;
  kind: ActivityKind;
  /** Staff member who did it; null = a customer or the shop itself. */
  actorId: string | null;
  title: string;
  detail: string;
  href: string;
  at: string;
};

const parts: Record<string, string> = {
  products: "details",
  product_materials: "prices",
  product_options: "sizes",
  product_fonts: "fonts",
  product_media: "photos",
  product_categories: "categories",
};

const things: Record<string, [label: string, href: string]> = {
  categories: ["a category", "/admin/products"],
  materials: ["a material", "/admin/products"],
  fonts: ["a font", "/admin/products"],
  areas: ["the delivery areas", "/admin/delivery"],
  collections: ["a season page", "/admin/seasons"],
  collection_products: ["a season page", "/admin/seasons"],
  home_sections: ["the home page", "/admin/home"],
  home_section_products: ["the home page", "/admin/home"],
  promotions: ["a promotion", "/admin/promotions"],
  coupons: ["a coupon", "/admin/promotions"],
  reviews: ["a review", "/admin/reviews"],
  site_settings: ["the settings", "/admin/settings"],
  staff: ["a staff member", "/admin/staff"],
  staff_permissions: ["staff permissions", "/admin/staff"],
  manual_entries: ["a sales entry", "/admin/sales"],
  points_ledger: ["LIVRE Points", "/admin/customers"],
  customers: ["a customer", "/admin/customers"],
  imported_orders: ["imported orders", "/admin/sales"],
};

const verbs: Record<string, string> = { insert: "added", update: "edited", delete: "removed", import: "imported" };

const field = (changes: Json | null, key: string): Json | undefined =>
  changes && typeof changes === "object" && !Array.isArray(changes) ? changes[key] : undefined;
const text = (v: Json | undefined) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// Only the product tables point at a product: season pages and reviews also
// carry a product_id but are not product edits.
const productIdOf = (r: AuditRow) =>
  r.table_name === "products" ? r.row_id ?? "" : r.table_name in parts ? text(field(r.changes, "product_id")) || (r.row_id ?? "") : "";
const orderIdOf = (r: AuditRow) => (r.table_name === "orders" ? r.row_id ?? "" : r.table_name === "order_adjustments" ? text(field(r.changes, "order_id")) : "");

export type Names = {
  staff: Map<string, string>;
  products: Map<string, string>;
  orders: Map<string, number>;
};

/** Staff, product and order names the rows point to. */
export async function loadNames(db: Db, rows: AuditRow[]): Promise<Names> {
  const productIds = [...new Set(rows.map(productIdOf).filter(isUuid))];
  const orderIds = [...new Set(rows.map(orderIdOf).filter(isUuid))];
  const [{ data: staff }, { data: products }, { data: orders }] = await Promise.all([
    db.from("staff").select("id, name"),
    productIds.length ? db.from("products").select("id, name_en").in("id", productIds) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from("orders").select("id, number").in("id", orderIds) : Promise.resolve({ data: [] }),
  ]);
  return {
    staff: new Map((staff ?? []).map((s) => [s.id, s.name])),
    products: new Map((products ?? []).map((p) => [p.id, p.name_en])),
    orders: new Map((orders ?? []).map((o) => [o.id, o.number])),
  };
}

/** One readable event per change (product saves collapsed). Oldest first in, newest first out. */
export function describe(rows: AuditRow[], names: Names): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  // Open product edits: actor + product -> event index, for collapsing.
  const productEdits = new Map<string, { index: number; parts: Set<string>; at: number }>();

  for (const r of [...rows].sort((a, b) => a.id - b.id)) {
    const who = r.actor_staff_id ? names.staff.get(r.actor_staff_id) ?? "A staff member" : null;
    const verb = verbs[r.action] ?? r.action;

    // A customer's review from the website.
    if (r.table_name === "reviews" && r.action === "insert" && !who) {
      const rating = Number(text(field(r.changes, "rating"))) || 0;
      events.push({
        key: `a${r.id}`,
        kind: "review",
        actorId: null,
        title: `New review ${"★".repeat(Math.min(5, rating))}`,
        detail: `${text(field(r.changes, "customer_name")) || "A customer"}: ${text(field(r.changes, "text")).slice(0, 120)}`,
        href: "/admin/reviews",
        at: r.created_at,
      });
      continue;
    }

    const orderId = orderIdOf(r);
    if (orderId) {
      const number = names.orders.get(orderId);
      const label = number ? `order #${number}` : "an order";
      // The orders guard logs [old, new] for status, staff_id and total on
      // EVERY update: only a pair whose two values differ is a change.
      const changed = (key: string) => {
        const pair = field(r.changes, key);
        return Array.isArray(pair) && text(pair[0]) !== text(pair[1]) ? text(pair[1]) : null;
      };
      const next = r.table_name === "orders" ? changed("status") : null;
      const href = number ? `/admin/orders/${number}` : "/admin/orders";
      if (next === "cancelled") {
        events.push({ key: `a${r.id}`, kind: "cancel", actorId: r.actor_staff_id, title: `Order ${number ? `#${number} ` : ""}cancelled`, detail: who ? `By ${who}` : "Cancelled", href, at: r.created_at });
      } else if (who) {
        let what: string;
        if (r.table_name === "order_adjustments") what = `${verb} an adjustment on ${label}`;
        else if (next) what = `moved ${label} to ${statusLabels[next as keyof typeof statusLabels] ?? next}`;
        else if (changed("staff_id") !== null) what = `reassigned ${label}`;
        // Only the total moved: the adjustment that caused it has its own line.
        else if (changed("total_cents") !== null) continue;
        else what = `updated ${label}`;
        events.push({ key: `a${r.id}`, kind: "team", actorId: r.actor_staff_id, title: who, detail: what, href, at: r.created_at });
      }
      continue;
    }

    // Other changes by the shop itself (points after delivery...) aren't news.
    if (!who) continue;

    const productId = productIdOf(r);
    if (productId) {
      const name = names.products.get(productId) ?? "a product";
      const key = `${r.actor_staff_id}:${productId}`;
      const part = r.table_name === "products" && r.action !== "update" ? null : parts[r.table_name];
      const open = productEdits.get(key);
      const at = new Date(r.created_at).getTime();
      if (open && at - open.at < 120_000) {
        if (part) open.parts.add(part);
        open.at = at;
        const e = events[open.index];
        e.detail = e.detail.startsWith("added") || e.detail.startsWith("removed") ? e.detail : `edited ${name} (${[...open.parts].join(", ")})`;
        e.at = r.created_at;
        continue;
      }
      const detail = r.table_name === "products" && r.action !== "update" ? `${verb} ${name}` : `edited ${name}${part ? ` (${part})` : ""}`;
      productEdits.set(key, { index: events.length, parts: new Set(part ? [part] : []), at });
      events.push({ key: `a${r.id}`, kind: "team", actorId: r.actor_staff_id, title: who, detail, href: isUuid(productId) ? `/admin/products/${productId}` : "/admin/products", at: r.created_at });
      continue;
    }

    const [label, href] = things[r.table_name] ?? [r.table_name.replace(/_/g, " "), "/admin"];
    const prev = events.at(-1);
    // The same person saving the same kind of thing again within 2 minutes: one line.
    if (prev && prev.actorId === r.actor_staff_id && prev.href === href && prev.detail === `${verb} ${label}` && new Date(r.created_at).getTime() - new Date(prev.at).getTime() < 120_000) {
      prev.at = r.created_at;
      continue;
    }
    events.push({ key: `a${r.id}`, kind: "team", actorId: r.actor_staff_id, title: who, detail: `${verb} ${label}`, href, at: r.created_at });
  }
  return events.reverse();
}

export type NewOrder = { id: string; number: number; customer_name: string; total_cents: number; created_at: string };

export function orderEvent(o: NewOrder): ActivityEvent {
  return {
    key: `o${o.id}`,
    kind: "order",
    actorId: null,
    title: `New order #${o.number}`,
    detail: `${o.customer_name} · $${(o.total_cents / 100).toFixed(2).replace(/\.00$/, "")}`,
    href: `/admin/orders/${o.number}`,
    at: o.created_at,
  };
}
