import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/resolve-locale";
import { bestSellers, toCard } from "@/lib/catalog";
import { ProductCard } from "@/components/product/product-card";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("home");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="sr-only">{t("title")}</h1>
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {bestSellers().map((p) => (
          <li key={p.slug}>
            <ProductCard product={toCard(p, locale)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
