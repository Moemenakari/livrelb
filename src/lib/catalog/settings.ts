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
  heroCards: [],
  deliveryTime: { en: "", ar: "" },
  deliveryDays: { min: 2, max: 7 },
  processingDays: { min: 3, max: 4 },
  points: { enabled: true, perStep: 10, stepDollars: 15, perReview: 1, redeemPoints: 10, redeemValue: 1 },
  charmsNavSort: 20,
  requireLogin: false,
  metaPixelId: "",
  ga4Id: "",
};

// Beirut time.
const PROMO_END = "2026-10-31T23:59:59+03:00";

export const samplePromo: StorePromo = { code: "STORY15", percent: 15, endsAt: PROMO_END };

export const sampleHeroOffer: HeroOffer = { percent: 25, endsAt: PROMO_END };
