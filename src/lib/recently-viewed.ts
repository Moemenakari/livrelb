"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createLocalStore } from "./local-store";

// Product slugs the visitor opened, newest first (brief §8.3.13).
const MAX = 8;
const store = createLocalStore<string[]>("livre:recent", []);

export function useRecentlyViewed(): string[] {
  return useSyncExternalStore(store.subscribe, store.read, store.serverSnapshot);
}

/** Records a product view once the page has mounted. */
export function useTrackView(slug: string) {
  useEffect(() => {
    store.write([slug, ...store.read().filter((s) => s !== slug)].slice(0, MAX));
  }, [slug]);
}
