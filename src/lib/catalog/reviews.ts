import type { Review } from "./types";

// SAMPLE reviews to lay out the pages. They must be replaced by real,
// approved customer reviews (reviews table, brief §7) before launch.
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
  },
];

export function reviewsFor(slug: string): Review[] {
  const own = reviews.filter((r) => r.productSlug === slug);
  // Until each product has its own reviews, fill with the store's.
  return own.length >= 3 ? own : [...own, ...reviews.filter((r) => r.productSlug !== slug)].slice(0, 4);
}
