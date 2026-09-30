"use client";

import { useEffect, useState } from "react";
import { quoteCart } from "@/lib/checkout/actions";
import type { CartItemInput, Quote } from "@/lib/checkout/types";

type Input = { items: CartItemInput[]; coupon?: string; phone?: string; area?: string };

/**
 * The server's prices for the bag (quote_order), refreshed shortly after
 * anything changes. `fresh` is false while a newer quote is on its way:
 * show the last one dimmed. `quote` is null before the first answer.
 */
export function useQuote(input: Input) {
  const key = JSON.stringify(input);
  const [state, setState] = useState<{ key: string; quote: Quote | null; failed: boolean } | null>(null);

  useEffect(() => {
    if (input.items.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await quoteCart(JSON.parse(key) as Input);
      if (cancelled) return;
      setState((prev) => ({
        key,
        quote: result.ok ? result.quote : (prev?.quote ?? null),
        failed: !result.ok,
      }));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // key holds the whole input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    quote: state?.quote ?? null,
    fresh: state?.key === key && !state.failed,
    failed: state?.key === key && state.failed,
  };
}
