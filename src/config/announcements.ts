import type { Locale } from "@/i18n/routing";

// Announcement bar texts (brief §8.1.1). Temporary home: in the admin phase
// they move to site_settings so the owner can edit them without a deploy.
export const announcements: Record<Locale, string>[] = [
  {
    en: "Design your name necklace",
    ar: "صمّمي قلادتك باسمك",
  },
  {
    en: "Free shipping over $50",
    ar: "توصيل مجاني للطلبات فوق 50 دولار",
  },
  {
    en: "Excellent ★★★★★ quality — loved by our customers",
    ar: "جودة ممتازة ★★★★★ — تحبّها زبوناتنا",
  },
];
