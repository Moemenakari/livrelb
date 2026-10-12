"use client";

import { useEffect, useState } from "react";
import type { CartItemInput, Quote, QuoteResult } from "@/lib/checkout/types";

type Input = { items: CartItemInput[]; coupon?: string; phone?: string; area?: string; usePoints?: boolean };

// A plain POST to /api/quote (src/app/api/quote/route.ts) and not a server action: the shop's pages are static
// files, and a server action posts to the page's own address, which a file cannot answer.
async function fetchQuote(input: Input): Promise<QuoteResult> {
  try {
    const response = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    return response.ok ? ((await response.json()) as QuoteResult) : { ok: false, error: "unavailable" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

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
      const result = await fetchQuote(JSON.parse(key) as Input);
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
