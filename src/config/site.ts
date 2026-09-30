// Public site address. Shop contacts (WhatsApp number, Instagram) live in
// site_settings, editable from the admin.
export const siteConfig = {
  url: "https://livrelb.com",
};

/** WhatsApp chat link (digits-only number: 961...), optionally prefilled. */
export function whatsappUrl(number: string, message?: string): string {
  const base = `https://wa.me/${number.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
