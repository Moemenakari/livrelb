import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";
import { policies } from "@/content/pages";
import { pageUrl } from "@/lib/seo";

// sitemap.xml: every public page (English). Products and categories come from the catalog.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getCatalog();
  const paths = [
    { path: "/", priority: 1 },
    { path: "/charms", priority: 0.8 },
    { path: "/faq", priority: 0.5 },
    { path: "/about", priority: 0.5 },
    { path: "/contact", priority: 0.5 },
    { path: "/size-guide", priority: 0.4 },
    ...Object.keys(policies).map((slug) => ({ path: `/policies/${slug}`, priority: 0.3 })),
    ...catalog.categories.map((c) => ({ path: `/category/${c.slug}`, priority: 0.8 })),
    ...catalog.products.map((p) => ({ path: `/product/${p.slug}`, priority: 0.9 })),
  ];

  return paths.map(({ path, priority }) => ({ url: pageUrl("en", path), changeFrequency: "weekly" as const, priority }));
}
