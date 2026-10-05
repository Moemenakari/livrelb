"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseEnv } from "@/lib/supabase/env";

const SEEN_KEY = "livre_seen_day";

// Counts page views for the admin activity page: one anonymous +1 per page
// per day (no cookie, no personal data), and "visitor" on the first page a
// browser opens each day. Production only; never blocks the page.
export function PageViews() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    let firstToday = false;
    try {
      // Beirut day, the same day the database files the view under.
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut" }).format(new Date());
      firstToday = localStorage.getItem(SEEN_KEY) !== today;
      if (firstToday) localStorage.setItem(SEEN_KEY, today);
    } catch {
      // Storage blocked: count the view without the visitor flag.
    }
    try {
      const { url, publishableKey } = getSupabaseEnv();
      fetch(`${url}/rest/v1/rpc/record_page_view`, {
        method: "POST",
        keepalive: true,
        headers: { apikey: publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_path: pathname, p_new_visitor: firstToday }),
      }).catch(() => {});
    } catch {
      // Supabase not configured.
    }
  }, [pathname]);

  return null;
}
