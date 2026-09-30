import type { HeroOffer, StorePromo, StoreSettings } from "./types";

// SAMPLE shop settings and promotion: seed data for site_settings and
// promotions, and the fallback when Supabase is not configured.

export const sampleSettings: StoreSettings = {
  deliveryFee: 4,
  freeShippingOver: 50,
  firstOrderFreeDelivery: true,
  giftBoxPrice: 5,
  // International format, digits only (961 + number). PLACEHOLDER [CONFIRM].
  whatsappNumber: "96100000000",
  instagramUrl: "https://www.instagram.com/",
  announcements: [
    { en: "Design your name necklace", ar: "صمّمي قلادتكِ باسمكِ" },
    { en: "Free shipping over $50", ar: "توصيل مجاني للطلبات فوق 50 دولار" },
    {
      en: "Excellent ★★★★★ quality — loved by our customers",
      ar: "جودة ممتازة ★★★★★ — تحبّها زبوناتنا",
    },
  ],
};

// Beirut time.
const PROMO_END = "2026-10-31T23:59:59+03:00";

export const samplePromo: StorePromo = { code: "STORY15", percent: 15, endsAt: PROMO_END };

export const sampleHeroOffer: HeroOffer = { percent: 25, endsAt: PROMO_END };
