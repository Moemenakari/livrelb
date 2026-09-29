"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCartCount } from "@/lib/cart";

// Cart icon with the number of pieces in the bag.
export function CartButton({ className }: { className: string }) {
  const t = useTranslations("nav");
  const count = useCartCount();

  return (
    <Link href="/cart" aria-label={t("cartCount", { count })} className={`relative ${className}`}>
      <ShoppingBag className="size-5.5" strokeWidth={1.5} />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute end-0.5 top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-gold px-1 text-[10px] leading-4.5 font-semibold text-white"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
