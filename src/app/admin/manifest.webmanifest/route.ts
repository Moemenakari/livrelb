// The admin's own home-screen app ("LIVRE Admin"). Saved from any /admin page,
// it opens straight on the admin (or its login), never on the shop. Separate
// id and scope from the storefront manifest, so both can sit on one phone.
export const dynamic = "force-static";

export function GET() {
  return new Response(
    JSON.stringify({
      id: "/admin",
      name: "LIVRE Admin",
      short_name: "LIVRE Admin",
      description: "Products, orders, staff and settings for LIVRE.",
      start_url: "/admin?source=app",
      scope: "/admin",
      display: "standalone",
      orientation: "portrait",
      background_color: "#ffffff",
      theme_color: "#ffffff",
      lang: "en",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [
        { name: "Orders", url: "/admin/orders" },
        { name: "Products", url: "/admin/products" },
      ],
    }),
    { headers: { "Content-Type": "application/manifest+json", "X-Robots-Tag": "noindex" } },
  );
}
