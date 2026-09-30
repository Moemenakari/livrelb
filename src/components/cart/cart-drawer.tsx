"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { closeCart, useCartCount, useCartDrawer } from "@/lib/cart";
import { CartContents } from "./cart-contents";

// Bag drawer: slides in from the end side when a piece is added.
export function CartDrawer({ freeShippingOver }: { freeShippingOver: number }) {
  const t = useTranslations("cart");
  const open = useCartDrawer();
  const count = useCartCount();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} inert={!open}>
      <div
        aria-hidden
        onClick={closeCart}
        className={`absolute inset-0 bg-ink/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className={`absolute inset-y-0 end-0 flex w-full max-w-[26rem] flex-col bg-background shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <h2 id="cart-drawer-title" className="text-2xl">
            {t("title")} <span className="ms-1 font-sans text-sm text-muted">{t("count", { count })}</span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeCart}
            aria-label={t("close")}
            className="flex size-10 items-center justify-center rounded-full hover:bg-surface"
          >
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>
        {open && <CartContents variant="drawer" freeShippingOver={freeShippingOver} onNavigate={closeCart} />}
      </div>
    </div>
  );
}
