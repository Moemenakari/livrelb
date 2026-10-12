"use client";

import { useEffect, useRef, useState } from "react";
import { requestJson } from "@/lib/checkout/client";
import type { HelperOption, SavedCustomer } from "@/lib/checkout/types";

type Loaded = { saved: SavedCustomer | null; helpers: HelperOption[] };

/**
 * What the static checkout page asks the Worker once it is open (GET /api/checkout-init): who this browser is, her
 * saved details and the employees for "Who helped you?". It tries again by itself if the shop is busy; if it
 * still fails the form works without them (status "failed"): she types her details, and the server checks the
 * login again at Place order. `onLoaded` runs once, when the answer arrives.
 */
export function useCheckoutInit(onLoaded: (loaded: Loaded) => void): Loaded & { status: "loading" | "ready" | "failed" } {
  const [state, setState] = useState<Loaded & { status: "loading" | "ready" | "failed" }>({ status: "loading", saved: null, helpers: [] });
  const callback = useRef(onLoaded);
  useEffect(() => {
    callback.current = onLoaded;
  });

  useEffect(() => {
    let cancelled = false;
    void requestJson<Loaded>("/api/checkout-init", { delays: [600, 1500] }).then((result) => {
      if (cancelled) return;
      if (result.kind === "ok") {
        setState({ status: "ready", saved: result.data.saved, helpers: result.data.helpers ?? [] });
        callback.current(result.data);
      } else {
        setState({ status: "failed", saved: null, helpers: [] });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
