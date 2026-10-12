"use client";

import { useEffect } from "react";
import { REF_CODE } from "@/lib/checkout/cookies";

// An employee's link can carry the code on any page: livrelb.com/en/product/x?ref=amal. The shop's pages are
// static files, so no server code sees that address any more; this asks /r/amal instead (the proxy saves the
// code in the cookies the checkout reads, and answers with a redirect we do not follow). Once per tab.
export function RefCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref")?.toLowerCase();
    if (!ref || !REF_CODE.test(ref)) return;
    try {
      if (sessionStorage.getItem("livre-ref") === ref) return;
      sessionStorage.setItem("livre-ref", ref);
    } catch {
      // Storage blocked: ask again on the next page, it is only a cookie.
    }
    void fetch(`/r/${ref}`, { redirect: "manual", credentials: "same-origin" }).catch(() => {});
  }, []);
  return null;
}
