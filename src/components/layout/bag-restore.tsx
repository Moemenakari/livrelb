"use client";

import { useEffect } from "react";
import { restoreToCart } from "@/lib/cart";
import { restoreBag } from "@/lib/checkout/bag-actions";

const DONE_KEY = "livre-bag-restored";

/**
 * The real browser opened from an in-app browser with the bag in the address (?bag=): the server checks
 * and prices every line, the lines go into the bag, and ?bag= is removed from the address.
 */
export function BagRestore() {
  useEffect(() => {
    const param = new URL(window.location.href).searchParams.get("bag");
    if (!param) return;
    let alive = true;
    void (async () => {
      try {
        // The same address opened twice never adds the bag twice.
        if (window.sessionStorage.getItem(DONE_KEY) !== param) {
          const lines = await restoreBag(param);
          if (!alive) return;
          if (lines.length > 0) restoreToCart(lines);
          window.sessionStorage.setItem(DONE_KEY, param);
        }
      } catch {
        // Not restored (offline, storage blocked): the address is cleaned anyway.
      }
      if (!alive) return;
      const url = new URL(window.location.href);
      url.searchParams.delete("bag");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    })();
    return () => {
      alive = false;
    };
  }, []);
  return null;
}
