import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// Product photos are served from Cloudflare R2 (NEXT_PUBLIC_R2_PUBLIC_URL,
// e.g. https://images.livrelb.com). Changing host later = changing the env var.
const imagesUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const isDev = process.env.NODE_ENV !== "production";

const origin = (url: string | undefined) => (url ? new URL(url).origin : "");

// Content Security Policy without nonces, so pages stay statically generated
// (Next.js guide "Without Nonces"). The browser only talks to this site and
// Supabase (Google login); images come from here and R2.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${origin(imagesUrl)}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${origin(supabaseUrl)} ${supabaseUrl ? origin(supabaseUrl).replace("https://", "wss://") : ""}${isDev ? " ws:" : ""}`.trim(),
  `media-src 'self' blob: ${origin(imagesUrl)}`.trim(),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
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
