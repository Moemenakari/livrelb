// Public site address. Shop contacts (WhatsApp number, Instagram) live in
// site_settings, editable from the admin.
// ONE place for the public address: canonical links, sitemap, share pictures
// and the admin's link hints all read it. To move to livrelb.com later, set
// NEXT_PUBLIC_SITE_URL (a build variable) or change the fallback below.
const url = (process.env.NEXT_PUBLIC_SITE_URL || "https://shop.livrelb.workers.dev").replace(/\/$/, "");

export const siteConfig = {
  url,
  /** Address without https://, for hints like "shop.livrelb.workers.dev/r/amal". */
  host: url.replace(/^https?:\/\//, ""),
};

/** WhatsApp chat link (digits-only number: 961...), optionally prefilled. */
export function whatsappUrl(number: string, message?: string): string {
  const base = `https://wa.me/${number.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
