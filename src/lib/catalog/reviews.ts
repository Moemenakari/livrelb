import type { Review, ReviewStats } from "./types";

// SAMPLE reviews to lay out the pages (is_sample in the reviews table).
// They show in development only; production shows real approved reviews,
// entered from the admin (Instagram / WhatsApp reviews, website reviews).
export const reviews: Review[] = [
  {
    id: "r1",
    productSlug: "cursive-name-necklace",
    author: "Maya K.",
    city: { en: "Beirut", ar: "بيروت" },
    rating: 5,
    text: {
      en: "Exactly like the preview on the site. The gold is so shiny and it came in the cutest box. My sister already ordered one!",
      ar: "تماماً مثل المعاينة على الموقع. الذهب يلمع كثيراً ووصلت في علبة رائعة. أختي طلبت واحدة فوراً!",
    },
    date: "2026-09-12",
    isSample: true,
  },
  {
    id: "r2",
    productSlug: "lira-coin-necklace",
    author: "Rana H.",
    city: { en: "Jounieh", ar: "جونية" },
    rating: 5,
    text: {
      en: "Bought the Lira necklace for my mom, she cried. It really looks like the old coin, both sides.",
      ar: "اشتريت قلادة الليرة لأمي وبكت. تشبه الليرة القديمة فعلاً، على الوجهين.",
    },
    date: "2026-09-03",
    isSample: true,
  },
  {
    id: "r3",
    productSlug: "arabic-name-necklace",
    author: "Lea S.",
    city: { en: "Zahle", ar: "زحلة" },
    rating: 5,
    text: {
      en: "The Arabic calligraphy is beautiful and every letter is connected. Delivered in 3 days, paid cash on delivery.",
      ar: "الخط العربي جميل وكل الحروف موصولة. وصلت خلال 3 أيام والدفع عند الاستلام.",
    },
    date: "2026-08-27",
    isSample: true,
  },
  {
    id: "r4",
    productSlug: "cursive-name-necklace",
    author: "Nadine A.",
    city: { en: "Tripoli", ar: "طرابلس" },
    rating: 5,
    text: {
      en: "Second order already. The rose gold is my favorite, I wear it every day and it still shines.",
      ar: "هذا طلبي الثاني. الذهب الوردي المفضل عندي، ألبسه كل يوم وما زال يلمع.",
    },
    date: "2026-08-19",
    isSample: true,
  },
  {
    id: "r5",
    productSlug: "name-bracelet",
    author: "Joelle M.",
    city: { en: "Byblos", ar: "جبيل" },
    rating: 4,
    text: {
      en: "So pretty and delicate. I chose 16 cm and it fits perfectly.",
      ar: "ناعم وجميل جداً. اخترت 16 سم وجاء على المقاس تماماً.",
    },
    date: "2026-08-08",
    isSample: true,
  },
  {
    id: "r6",
    productSlug: "cedar-necklace",
    author: "Sara T.",
    city: { en: "Saida", ar: "صيدا" },
    rating: 5,
    text: {
      en: "Sent the cedar necklace to my cousin in Canada. She loved it. The team on WhatsApp was super helpful.",
      ar: "أرسلت قلادة الأرزة لبنت خالتي في كندا وأحبّتها كثيراً. الفريق على واتساب كان متعاوناً جداً.",
    },
    date: "2026-07-30",
    isSample: true,
  },
];

/** Samples are for development only (Part A decision). */
export const showSampleReviews = process.env.NODE_ENV !== "production";

export function visibleReviews(): Review[] {
  return reviews.filter((r) => showSampleReviews || !r.isSample);
}

/** Average and count of a product's visible reviews; null when it has none. */
export function reviewStats(slug: string): ReviewStats | null {
  const own = visibleReviews().filter((r) => r.productSlug === slug);
  if (own.length === 0) return null;
  return { rating: own.reduce((sum, r) => sum + r.rating, 0) / own.length, count: own.length };
}

/** The product's own reviews first, then other reviews to fill the section. */
export function reviewsFor(slug: string, limit = 4): Review[] {
  const visible = visibleReviews();
  const own = visible.filter((r) => r.productSlug === slug);
  return [...own, ...visible.filter((r) => r.productSlug !== slug)].slice(0, limit);
}
