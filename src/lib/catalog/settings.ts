import type { HeroOffer, StorePromo, StoreSettings } from "./types";

// SAMPLE shop settings and promotion: seed data for site_settings and
// promotions, and the fallback when Supabase is not configured.

export const sampleSettings: StoreSettings = {
  deliveryFee: 4,
  freeShippingOver: 50,
  firstOrderFreeDelivery: true,
  // Not decided yet: empty hides every WhatsApp / Instagram button. Set from
  // the admin later (WhatsApp: international digits, 961 + number).
  whatsappNumber: "",
  instagramUrl: "",
  announcements: [
    { en: "Design your name necklace", ar: "صمّمي قلادتكِ باسمكِ" },
    { en: "Free shipping over $50", ar: "توصيل مجاني للطلبات فوق 50 دولار" },
    {
      en: "Excellent ★★★★★ quality — loved by our customers",
      ar: "جودة ممتازة ★★★★★ — تحبّها زبوناتنا",
    },
  ],
  deliveryTime: { en: "", ar: "" },
  deliveryDays: { min: 2, max: 7 },
  points: { enabled: true, perDollar: 10, stepDollars: 20, perReview: 10, redeemPoints: 100, redeemValue: 1 },
  whishOnline: false,
  cardOnline: false,
  metaPixelId: "",
  ga4Id: "",
};

// Beirut time.
const PROMO_END = "2026-10-31T23:59:59+03:00";

export const samplePromo: StorePromo = { code: "STORY15", percent: 15, endsAt: PROMO_END };

export const sampleHeroOffer: HeroOffer = { percent: 25, endsAt: PROMO_END };
