// Contact channels. PLACEHOLDERS until the owner confirms them; the WhatsApp
// number later moves to site_settings (admin-editable).
export const siteConfig = {
  // International format, digits only (961 + number).
  whatsappNumber: "96100000000",
  instagramUrl: "https://www.instagram.com/",
  url: "https://livrelb.com",
};

export const whatsappUrl = `https://wa.me/${siteConfig.whatsappNumber}`;

/** WhatsApp chat link with a prefilled message. */
export function whatsappMessageUrl(message: string): string {
  return `${whatsappUrl}?text=${encodeURIComponent(message)}`;
}
