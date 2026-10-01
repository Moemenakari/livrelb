import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";
import { policies } from "@/content/pages";
import { alternates, pageUrl } from "@/lib/seo";

const locales = ["en", "ar"] as const;

// sitemap.xml: every public page in English and Arabic, each pointing at
// its twin (hreflang). Products and categories come from the catalog.
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

  return paths.flatMap(({ path, priority }) =>
    locales.map((locale) => ({
      url: pageUrl(locale, path),
      changeFrequency: "weekly" as const,
      priority,
      alternates: { languages: alternates(locale, path).languages as Record<string, string> },
    })),
  );
}
