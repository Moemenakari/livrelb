import type { MetadataRoute } from "next";

// Lets the phone save LIVRE as an app on the home screen (opens full screen,
// no browser bar). Served at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LIVRE — Personalized jewelry",
    short_name: "LIVRE",
    description: "Personalized name jewelry and the 1975 Lira collection, made in Lebanon.",
    start_url: "/en?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7f2",
    theme_color: "#faf7f2",
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Charms", url: "/en/charms" },
      { name: "Track my order", url: "/en/track" },
    ],
  };
}
