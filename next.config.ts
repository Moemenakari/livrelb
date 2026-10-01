import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// Product photos are served from Cloudflare R2 (NEXT_PUBLIC_R2_PUBLIC_URL,
// e.g. https://images.livrelb.com). Changing host later = changing the env var.
const imagesUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const isDev = process.env.NODE_ENV !== "production";

const origin = (url: string | undefined) => (url ? new URL(url).origin : "");
// Hosted card checkout: the bank's own address (CARD_GATEWAY_URL).
const cardOrigin = origin(process.env.CARD_GATEWAY_URL);
// Analytics load only after the visitor accepts cookies (see components/analytics).
const analyticsScripts = "https://connect.facebook.net https://www.googletagmanager.com";
const analyticsConnect =
  "https://www.facebook.com https://connect.facebook.net https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com";

// Content Security Policy without nonces, so pages stay statically generated
// (Next.js guide "Without Nonces"). The browser only talks to this site,
// Supabase (Google login) and R2 (admin photo uploads); images come from
// here and R2.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${analyticsScripts} ${cardOrigin}${isDev ? " 'unsafe-eval'" : ""}`.replace(/\s+/g, " "),
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${origin(imagesUrl)} https://www.facebook.com https://*.google-analytics.com https://www.googletagmanager.com`.trim(),
  "font-src 'self' data:",
  // R2: the admin uploads photos straight to the bucket (signed URLs).
  `connect-src 'self' ${analyticsConnect} ${cardOrigin} https://*.r2.cloudflarestorage.com ${origin(supabaseUrl)} ${supabaseUrl ? origin(supabaseUrl).replace("https://", "wss://") : ""}${isDev ? " ws:" : ""}`.trim(),
  `media-src 'self' blob: ${origin(imagesUrl)}`.trim(),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self' ${cardOrigin}`.trim(),
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // HTTPS only, for two years (production: the dev server is plain http).
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imagesUrl
      ? [{ protocol: "https", hostname: new URL(imagesUrl).hostname, pathname: "/**" }]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
