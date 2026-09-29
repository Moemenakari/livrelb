"use client";

import type { CardProduct } from "@/lib/catalog/card";
import { useRecentlyViewed } from "@/lib/recently-viewed";
import { swipeRow } from "@/components/ui/styles";
import { ProductCard } from "./product-card";

// Pieces this visitor opened before, newest first (brief §8.3.13). Hidden
// until there is at least one.
export function RecentlyViewed({
  title,
  current,
  candidates,
}: {
  title: string;
  current: string;
  candidates: CardProduct[];
}) {
  const slugs = useRecentlyViewed();
  const items = slugs
    .filter((s) => s !== current)
    .map((s) => candidates.find((c) => c.slug === s))
    .filter((c): c is CardProduct => Boolean(c))
    .slice(0, 4);

  if (items.length === 0) return null;

  return (
    <section className="border-t border-line pt-14">
      <h2 className="mb-8 text-center text-3xl">{title}</h2>
      <ul className={`lg:grid-cols-4 ${swipeRow}`}>
        {items.map((p) => (
          <li key={p.slug} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-auto">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
