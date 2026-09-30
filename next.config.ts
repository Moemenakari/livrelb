import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// Product photos are served from Cloudflare R2 (NEXT_PUBLIC_R2_PUBLIC_URL,
// e.g. https://images.livrelb.com). Changing host later = changing the env var.
const imagesUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imagesUrl
      ? [{ protocol: "https", hostname: new URL(imagesUrl).hostname, pathname: "/**" }]
      : [],
  },
};

export default withNextIntl(nextConfig);
