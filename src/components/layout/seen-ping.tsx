"use client";

import { useEffect } from "react";

// Tells the shop a remembered customer is back (once per browser session), so
// the admin can show her last visit. Visitors who are not signed in or
// remembered send nothing.
export function SeenPing() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("livre-seen")) return;
      if (!/(?:^|;\s*)(livre_known=1|sb-)/.test(document.cookie)) return;
      sessionStorage.setItem("livre-seen", "1");
      void fetch("/api/seen", { method: "POST", keepalive: true });
    } catch {
      // Storage blocked: skip, it is only a statistic.
    }
  }, []);
  return null;
}
