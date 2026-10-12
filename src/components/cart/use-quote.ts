"use client";

import { useEffect, useState } from "react";
import { requestJson } from "@/lib/checkout/client";
import type { CartItemInput, Quote, QuoteResult } from "@/lib/checkout/types";

type Input = { items: CartItemInput[]; coupon?: string; phone?: string; area?: string; usePoints?: boolean };

// A plain POST to /api/quote (src/app/api/quote/route.ts) and not a server action: the shop's pages are static
// files, and a server action posts to the page's own address, which a file cannot answer.
async function fetchQuote(input: Input): Promise<QuoteResult> {
  // Tries again twice if the shop is busy (503), then lets the cart say prices cannot be checked just now.
  const result = await requestJson<QuoteResult>("/api/quote", { body: input, delays: [500, 1200] });
  return result.kind === "ok" ? result.data : { ok: false, error: "unavailable" };
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
