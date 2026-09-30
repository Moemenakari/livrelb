import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { money } from "@/lib/admin/format";
import { can } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { AdminArt } from "@/components/admin/admin-preview";
import type { ProductArt as Art } from "@/lib/catalog/types";
import { Badge, Empty, PageHeader, buttonClass, inputClass, secondaryButtonClass } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Products" };

const statusText = { active: "Visible", draft: "Hidden", archived: "Archived" } as const;
const statusTone = { active: "green", draft: "neutral", archived: "red" } as const;

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = one("q").trim().slice(0, 60);
  const status = (["active", "draft", "archived"] as const).find((s) => s === one("status"));
  const category = one("category");
  const badge = one("badge");

  const db = await createClient();
  let query = db
    .from("products")
    .select(
      `id, slug, name_en, status, is_best_seller, is_new, stock_qty, art, sample_text, updated_at,
       product_materials (price_cents, is_default), product_media (url, type, sort_order),
       product_categories!inner (categories!inner (slug))`,
    )
    .order("sort_order")
    .order("created_at");
  if (!category) {
    // Products without a category still show: no inner join.
    query = db
      .from("products")
      .select(
        `id, slug, name_en, status, is_best_seller, is_new, stock_qty, art, sample_text, updated_at,
         product_materials (price_cents, is_default), product_media (url, type, sort_order),
         product_categories (categories (slug))`,
      )
      .order("sort_order")
      .order("created_at") as typeof query;
  } else {
    query = query.eq("product_categories.categories.slug", category);
  }
  if (q) query = query.or(`name_en.ilike.%${q.replace(/[%_,()]/g, "")}%,name_ar.ilike.%${q.replace(/[%_,()]/g, "")}%,slug.ilike.%${q.replace(/[%_,()]/g, "")}%`);
  if (status) query = query.eq("status", status);
  if (badge === "best") query = query.eq("is_best_seller", true);
  if (badge === "new") query = query.eq("is_new", true);

  const [{ data: products }, { data: categories }] = await Promise.all([
    query,
    db.from("categories").select("slug, name_en, rule").order("sort_order"),
  ]);

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={`${(products ?? []).length} products`}
        actions={
          can(staff, "products.create") && (
            <Link href="/admin/products/new" className={buttonClass}>
              <Plus className="size-4" aria-hidden />
              New product
            </Link>
          )
        }
      />

      <form method="get" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input name="q" type="search" defaultValue={q} placeholder="Search name or link" className={`${inputClass} col-span-2`} />
        <select name="status" defaultValue={status ?? ""} className={inputClass} aria-label="Status">
          <option value="">Visible + hidden</option>
          <option value="active">Visible</option>
          <option value="draft">Hidden</option>
          <option value="archived">Archived</option>
        </select>
        <select name="category" defaultValue={category} className={inputClass} aria-label="Category">
          <option value="">All categories</option>
          {(categories ?? [])
            .filter((c) => !c.rule)
            .map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name_en}
              </option>
            ))}
        </select>
        <select name="badge" defaultValue={badge} className={inputClass} aria-label="Badge">
          <option value="">All badges</option>
          <option value="best">Best sellers</option>
          <option value="new">New</option>
        </select>
        <div className="col-span-2 flex gap-2 sm:col-span-5">
          <button className={secondaryButtonClass}>Filter</button>
          <Link href="/admin/products" className={`${secondaryButtonClass} border-transparent`}>
            Clear
          </Link>
        </div>
      </form>

      {(products ?? []).length === 0 ? (
        <Empty>No products match.</Empty>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(products ?? []).map((p) => {
            const price = (p.product_materials.find((m) => m.is_default) ?? p.product_materials[0])?.price_cents;
            const photo = [...p.product_media].sort((a, b) => a.sort_order - b.sort_order).find((m) => m.type === "image");
            return (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex gap-3 rounded-xl border border-line bg-background p-2.5 hover:border-ink">
                  <div className="flex size-20 shrink-0 items-center overflow-hidden rounded-lg bg-blush">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.url} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <AdminArt art={p.art as unknown as Art} material="gold" text={p.sample_text ?? "Maya"} aspect="square" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5 text-sm">
                    <span className="truncate font-medium">{p.name_en}</span>
                    <span className="text-muted">{price ? money(price) : "No price"}</span>
                    <span className="mt-auto flex flex-wrap gap-1">
                      <Badge tone={statusTone[p.status]}>{statusText[p.status]}</Badge>
                      {p.is_best_seller && <Badge tone="gold">Best seller</Badge>}
                      {p.is_new && <Badge tone="blue">New</Badge>}
                      {p.stock_qty !== null && <Badge tone={p.stock_qty <= 3 ? "red" : "neutral"}>{p.stock_qty} in stock</Badge>}
                      {!photo && <Badge>No photos</Badge>}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
