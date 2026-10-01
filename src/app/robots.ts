import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// robots.txt: the shop is open to search engines; the admin, the cart and
// order pages (private) are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/en/cart", "/ar/cart", "/en/checkout", "/ar/checkout", "/en/order/", "/ar/order/", "/en/track", "/ar/track", "/en/account", "/ar/account"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
