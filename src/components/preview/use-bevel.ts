"use client";

import { useEffect, useState } from "react";

/**
 * The metal bevel filter is costly to paint on phones. Draw the plain metal
 * first so the page shows fast, then switch the bevel on a moment later.
 */
export function useBevel(): boolean {
  const [bevel, setBevel] = useState(false);
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    const handle = idle(() => setBevel(true));
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle as number);
      else window.clearTimeout(handle as number);
    };
  }, []);
  return bevel;
}
