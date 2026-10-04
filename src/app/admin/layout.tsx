import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/layout/pwa";
import { fontVariables } from "../fonts";
import "../globals.css";

// Admin root layout (/admin): English only, outside the storefront's
// locale routes, never indexed.
export const metadata: Metadata = {
  title: { default: "LIVRE Admin", template: "%s · LIVRE Admin" },
  robots: { index: false, follow: false },
  // Saved to the home screen from here, the app opens on the admin, not the shop.
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "LIVRE Admin", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" dir="ltr" className={fontVariables}>
      <body className="min-h-dvh bg-surface">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
