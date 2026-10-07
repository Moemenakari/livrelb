import "server-only";
import { headers } from "next/headers";
import { getSupabaseSecretKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";

// Rate limits for the public server functions (checkout, track, points),
// counted in the database (hit_rate_limit) so every Cloudflare isolate
// shares them. Keys are HMAC hashes: no IP or phone number is stored.

type Rule = { limit: number; windowSeconds: number };

/** Per bucket: a looser limit per IP (mobile carriers share IPs) and a tighter one per phone. */
const rules = {
  checkout: { ip: { limit: 30, windowSeconds: 600 }, phone: { limit: 8, windowSeconds: 600 } },
  track: { ip: { limit: 30, windowSeconds: 600 }, phone: { limit: 10, windowSeconds: 600 } },
  points: { ip: { limit: 30, windowSeconds: 600 }, phone: { limit: 10, windowSeconds: 600 } },
  // Charm requests and reference photo uploads from the Charms page.
  charm: { ip: { limit: 12, windowSeconds: 600 }, phone: { limit: 4, windowSeconds: 600 } },
  payment: { ip: { limit: 20, windowSeconds: 600 }, phone: { limit: 5, windowSeconds: 600 } },
  // Phone verification: codes sent (each costs money) and codes tried.
  otp: { ip: { limit: 10, windowSeconds: 600 }, phone: { limit: 3, windowSeconds: 600 } },
  otpcheck: { ip: { limit: 30, windowSeconds: 600 }, phone: { limit: 8, windowSeconds: 600 } },
  // "I sent the transfer" and the receipt screenshot after an order (keyed by order).
  transfer: { ip: { limit: 20, windowSeconds: 600 }, phone: { limit: 6, windowSeconds: 600 } },
  receipt: { ip: { limit: 20, windowSeconds: 600 }, phone: { limit: 6, windowSeconds: 600 } },
  // Staff login (/admin): slows down password guessing.
  login: { ip: { limit: 20, windowSeconds: 900 }, phone: { limit: 8, windowSeconds: 900 } },
} satisfies Record<string, { ip: Rule; phone: Rule }>;

export type RateBucket = keyof typeof rules;

async function hash(value: string): Promise<string> {
  const key = process.env.CUSTOMER_COOKIE_SECRET || getSupabaseSecretKey() || "livre";
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(value)));
  return Array.from(sig.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The visitor's IP as Cloudflare (or a proxy) reports it. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * Counts one attempt and says whether it is allowed. `phone` must already
 * be normalized (E.164). Fails open if the database can't be reached, so a
 * hiccup never blocks a real order (the database checks everything anyway).
 */
export async function rateLimit(bucket: RateBucket, phone?: string | null): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const db = createAdminClient();
  if (!db) return true;
  const rule = rules[bucket];
  const checks: [string, Rule][] = [[`${bucket}:ip:${await clientIp()}`, rule.ip]];
  if (phone) checks.push([`${bucket}:phone:${phone}`, rule.phone]);

  const results = await Promise.all(
    checks.map(async ([key, r]) => {
      const { data, error } = await db.rpc("hit_rate_limit", {
        p_key: `${bucket}:${await hash(key)}`,
        p_limit: r.limit,
        p_window_seconds: r.windowSeconds,
      });
      return error ? true : data !== false;
    }),
  );
  return results.every(Boolean);
}
