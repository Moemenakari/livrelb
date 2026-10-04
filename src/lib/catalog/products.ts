import { allFonts } from "./materials";
import type {
  ChainConnection,
  FontKey,
  Localized,
  MaterialKey,
  MaterialOffer,
  Personalization,
  Product,
  SizeOption,
} from "./types";

// SAMPLE catalog for building the storefront (restart brief). It seeds the
// database (npm run db:seed:generate) and is the fallback when Supabase is
// not configured. Star ratings come from the reviews, never from here.
// `media` stays empty until real photos exist.

// Sample prices, as the owner would type them in the admin: every metal of
// every product has its own price (product_materials). Here Gold and
// Silver share one price and Double Gold Stainless Steel is listed
// separately; nothing is calculated from another price.
const offers = (
  keys: MaterialKey[],
  price: number,
  compareAt: number | undefined,
  doubleGold: [price: number, compareAt?: number],
): MaterialOffer[] => [
  ...keys.map((material) => ({ material, price, compareAtPrice: compareAt })),
  { material: "doubleGold", price: doubleGold[0], compareAtPrice: doubleGold[1] },
];

const chain: SizeOption = { kind: "chain", values: [35, 40, 45, 50, 55], default: 45 };
const bracelet: SizeOption = { kind: "bracelet", values: [15, 16, 17, 18, 19], default: 17 };
const ring: SizeOption = { kind: "ring", values: [5, 6, 7, 8, 9], default: 7 };

/** All 15 fonts, the product's default first. */
const withDefault = (first: FontKey): FontKey[] => [first, ...allFonts.filter((f) => f !== first)];

const nameNecklace = (sample: string, defaultFont: FontKey = "beirut"): Personalization => ({
  kind: "name",
  maxLength: 10,
  fonts: withDefault(defaultFont),
  connections: ["sides", "center"],
  sample,
});

const plated: MaterialKey[] = ["gold", "silver"];

const nameDetails: Localized = {
  en: "Pendant height: about 1.5 cm for capital letters, width depends on the name.\nChain: fine cable chain, 1 mm, with a 5 cm extender on 35–45 cm.\nGold, Silver and plain Stainless Steel: water resistant and made to last. Double Gold and Double Silver Stainless Steel: a double layer of plating for extra wear.",
  ar: "ارتفاع الحرف الكبير نحو 1.5 سم، ويختلف العرض حسب الاسم.\nالسلسلة: سلسلة ناعمة 1 ملم، مع وصلة تطويل 5 سم للمقاسات 35–45 سم.\nستانلس ستيل ذهبي أو فضي أو عادي: مقاوم للماء ويدوم طويلاً. ستانلس ستيل بطلاء ذهب أو فضة مزدوج: طبقتان من الطلاء لتدوم أكثر.",
};

const coinDetails: Localized = {
  en: "Coin pendant: 2 cm, both faces of the 1975 1 Livre coin in relief.\nChain: 1.5 mm cable chain.\nStainless steel in gold, silver or plain steel. Double Gold and Double Silver Stainless Steel have a double layer for extra wear. Water resistant.",
  ar: "ميدالية الليرة: 2 سم، بوجهَي ليرة 1975 البارزين.\nالسلسلة: 1.5 ملم.\nستانلس ستيل ذهبي أو فضي أو عادي. الستانلس بطلاء الذهب أو الفضة المزدوج فيه طبقتان لتدوم أكثر. مقاوم للماء.",
};

const livresDetails = (value: 250 | 500, year: number, ar: string): Localized => ({
  en: `Coin pendant: 2.4 cm, both faces of the ${year} ${value} Livres coin in relief: the cedar and "مصرف لبنان" on one side, the big ${value} on the other.
Chain: 1.5 mm cable chain.
Stainless steel in gold, silver or plain steel. Double Gold and Double Silver Stainless Steel have a double layer for extra wear. Water resistant.`,
  ar: `ميدالية الليرة: 2.4 سم، بوجهَي ${ar} ${year} البارزين: الأرزة و«مصرف لبنان» على وجه، والرقم ${value} الكبير على الآخر.
السلسلة: 1.5 ملم.
ستانلس ستيل ذهبي أو فضي أو عادي. الستانلس بطلاء الذهب أو الفضة المزدوج فيه طبقتان لتدوم أكثر. مقاوم للماء.`,
});

const simpleDetails: Localized = {
  en: "Stainless steel in gold, silver or plain steel, or Double Gold / Double Silver Stainless Steel with a double layer. Hypoallergenic and nickel free.",
  ar: "ستانلس ستيل ذهبي أو فضي أو عادي، أو بطلاء ذهب أو فضة مزدوج. لا تسبب الحساسية وخالية من النيكل.",
};

// Every necklace can also be ordered as a bracelet and every bracelet as a
// necklace (a necklace costs $6.49 more), and every chain piece lets the customer pick
// where the chain attaches: one ring on top or both sides. The first
// connection is the default: both sides for a name, one ring for the rest.
const PIECE_PRICE_CHANGE = 6.49;
const connections: ChainConnection[] = ["center", "sides"];

function wearable(p: Product): Product {
  if (p.size?.kind !== "chain" && p.size?.kind !== "bracelet") return p;
  const altSize: SizeOption =
    p.size.kind === "chain"
      ? { ...bracelet, priceModifier: -PIECE_PRICE_CHANGE }
      : { ...chain, priceModifier: PIECE_PRICE_CHANGE };
  return p.personalization
    ? {
        ...p,
        altSize,
        personalization: {
          ...p.personalization,
          connections: p.personalization.kind === "name" ? ["sides", "center"] : connections,
        },
      }
    : { ...p, altSize, connections };
}

export const products: Product[] = ([
  {
    slug: "cursive-name-necklace",
    name: { en: "Cursive Name Necklace", ar: "قلادة الاسم بخط متصل" },
    summary: {
      en: "Your name in flowing handwriting, cut from one piece of metal.",
      ar: "اسمكِ بخط يد منساب، مقصوص من قطعة معدن واحدة.",
    },
    description: {
      en: "Our most loved piece. Type any name or word up to 10 letters and we cut it in one flowing line, then polish it by hand. Wear it alone on a fine chain or layer it with your Lira coin. Every necklace is made to order in Lebanon and arrives in our signature box.",
      ar: "القطعة الأحب إلى زبوناتنا. اكتبي أي اسم أو كلمة حتى 10 أحرف ونقصّها بخط واحد منساب ثم نلمّعها يدوياً. البسيها وحدها على سلسلة ناعمة أو مع قلادة الليرة. كل قلادة تُصنع حسب الطلب في لبنان وتصلكِ في علبتنا الخاصة.",
    },
    categories: ["name-necklaces", "necklaces", "gifts"],
    style: "cursive",
    isBestSeller: true,
    offers: offers(plated, 44, 58, [132, 174]),
    defaultMaterial: "gold",
    personalization: nameNecklace("Maya"),
    size: chain,
    art: { kind: "name", variant: "necklace" },
    media: [],
    details: nameDetails,
  },
  {
    slug: "arabic-name-necklace",
    name: { en: "Arabic Name Necklace", ar: "قلادة الاسم بالعربي" },
    summary: {
      en: "Your name in Arabic calligraphy, joined letter to letter.",
      ar: "اسمكِ بالخط العربي، حرفاً موصولاً بحرف.",
    },
    description: {
      en: "Arabic letters were made to flow. We draw your name in a Ruqaa-inspired script so every letter joins the next, then cut and polish it by hand. A beautiful gift for anyone far from home.",
      ar: "الحروف العربية خُلقت لتنساب. نرسم اسمكِ بخط مستوحى من الرقعة فيتصل كل حرف بالذي يليه، ثم نقصّه ونلمّعه يدوياً. هدية جميلة لكل من هو بعيد عن الوطن.",
    },
    categories: ["name-necklaces", "necklaces", "gifts"],
    style: "arabic",
    isBestSeller: true,
    offers: offers(plated, 44, 57, [132, 171]),
    defaultMaterial: "gold",
    personalization: nameNecklace("ليلى", "tripoli"),
    size: chain,
    art: { kind: "name", variant: "necklace" },
    media: [],
    details: nameDetails,
  },
  {
    slug: "lira-coin-necklace",
    name: { en: "1 Livre Coin Necklace", ar: "قلادة الليرة" },
    summary: {
      en: "The 1975 Lebanese Lira, recast as a pendant.",
      ar: "ليرة لبنان لعام 1975، بشكل ميدالية.",
    },
    description: {
      en: "Our signature. The cedar and 'Banque du Liban' on the front, the laurel wreath and '1 Livre' on the back, just like the coin in your teta's drawer. Wear either side.",
      ar: "قطعتنا المميزة. الأرزة و«مصرف لبنان» على الوجه، وإكليل الغار و«١ ليرة» على الظهر، تماماً مثل الليرة في جارور التيتا. البسيها على أي وجه.",
    },
    categories: ["lira-collection", "necklaces", "gifts"],
    isBestSeller: true,
    offers: offers(["silver", "gold"], 54, 70, [162, 210]),
    defaultMaterial: "gold",
    size: chain,
    art: { kind: "coin", variant: "necklace" },
    media: [],
    details: coinDetails,
  },
  {
    slug: "250-livres-coin-necklace",
    name: { en: "250 Livres Coin Necklace", ar: "قلادة الـ٢٥٠ ليرة" },
    summary: {
      en: "The golden 250 of the 90s, with its sunburst of leaves.",
      ar: "الـ٢٥٠ الذهبية تبع التسعينات، مع دائرة الأوراق حولها.",
    },
    description: {
      en: "New in the Lira collection. The 1996 250 Livres was the coin of every manoushe, every bus ride and every \"keep the change\". We recast it as a pendant with all its details: the cedar and \"مصرف لبنان\" on one face, the big 250 inside a sunburst of leaves on the other. Wear it alone, or layer it with the 500 for the full story.",
      ar: "جديد في مجموعة الليرة. الـ٢٥٠ ليرة تبع ١٩٩٦ كانت ليرة كل منقوشة وكل مشوار بالفان وكل «خلّي الباقي». صببناها ميدالية بكل تفاصيلها: الأرزة و«مصرف لبنان» على وجه، والـ٢٥٠ الكبيرة وسط دائرة أوراق على الوجه الآخر. البسيها وحدها أو مع الـ٥٠٠ لتكتمل القصة.",
    },
    categories: ["lira-collection", "necklaces", "gifts"],
    isNew: true,
    offers: offers(plated, 54, 70, [162, 210]),
    defaultMaterial: "gold",
    size: chain,
    art: { kind: "coin", variant: "necklace", coin: 250 },
    media: [],
    details: livresDetails(250, 1996, "ليرة الـ٢٥٠"),
  },
  {
    slug: "500-livres-coin-necklace",
    name: { en: "500 Livres Coin Necklace", ar: "قلادة الـ٥٠٠ ليرة" },
    summary: {
      en: "The silver 500, the biggest coin in your pocket.",
      ar: "الـ٥٠٠ الفضية، أكبر ليرة بجيبتك.",
    },
    description: {
      en: "New in the Lira collection. The 2006 500 Livres, the coin we all saved in a jar. The cedar and \"مصرف لبنان\" around a bold ٥٠٠ on one face, a strong 500 framed by a ring of panels on the other, recast as a pendant in the metal you choose. A piece of home you can hold, and the perfect gift for anyone who misses it.",
      ar: "جديد في مجموعة الليرة. الـ٥٠٠ ليرة تبع ٢٠٠٦، الليرة يلي كلنا جمعناها بالقجّة. الأرزة و«مصرف لبنان» حول ٥٠٠ عريضة على وجه، و500 كبيرة داخل حلقة على الوجه الآخر، مصبوبة ميدالية بالمعدن يلي بتختاريه. قطعة من الوطن بإيدك، وأحلى هدية لكل حدا مشتاقله.",
    },
    categories: ["lira-collection", "necklaces", "mens-jewelry", "gifts"],
    isNew: true,
    offers: offers(plated, 54, 70, [162, 210]),
    defaultMaterial: "silver",
    size: chain,
    art: { kind: "coin", variant: "necklace", coin: 500 },
    media: [],
    details: livresDetails(500, 2006, "ليرة الـ٥٠٠"),
  },
  {
    slug: "name-bracelet",
    name: { en: "Cursive Name Bracelet", ar: "سوار الاسم بخط متصل" },
    summary: {
      en: "A name on your wrist, on a fine chain.",
      ar: "اسم على معصمكِ، على سلسلة ناعمة.",
    },
    description: {
      en: "The same flowing script as our name necklace, sized for the wrist. Adjustable chain, two rings on the sides so the name always sits straight.",
      ar: "نفس الخط المنساب لقلادة الاسم، على مقاس المعصم. سلسلة قابلة للتعديل وحلقتان على الجانبين ليبقى الاسم مستقيماً.",
    },
    categories: ["bracelets", "gifts"],
    isBestSeller: true,
    offers: offers(plated, 34, 44, [102, 132]),
    defaultMaterial: "gold",
    personalization: { ...nameNecklace("Rami"), connections: [] },
    size: bracelet,
    art: { kind: "name", variant: "bracelet" },
    media: [],
    details: nameDetails,
  },
  {
    slug: "cedar-necklace",
    name: { en: "Cedar Necklace", ar: "قلادة الأرزة" },
    summary: {
      en: "A little cedar to keep Lebanon close.",
      ar: "أرزة صغيرة تبقي لبنان قريباً.",
    },
    description: {
      en: "A dainty cedar pendant on a fine chain. Our patriotic best seller, and the gift we send most to Lebanese abroad.",
      ar: "ميدالية أرزة ناعمة على سلسلة رفيعة. الأكثر مبيعاً من قطعنا الوطنية، والهدية التي نرسلها أكثر للبنانيين في الخارج.",
    },
    categories: ["necklaces", "gifts"],
    isBestSeller: true,
    offers: offers(plated, 34, 43, [102, 129]),
    defaultMaterial: "gold",
    size: chain,
    art: { kind: "cedar" },
    media: [],
    details: simpleDetails,
  },
  {
    slug: "initial-necklace",
    name: { en: "Script Initial Necklace", ar: "قلادة الحرف" },
    summary: {
      en: "One letter, big meaning.",
      ar: "حرف واحد، ومعنى كبير.",
    },
    description: {
      en: "Your initial, or the initial of someone you love, in our cursive script. Small enough for every day, easy to layer.",
      ar: "حرفكِ الأول أو حرف من تحبين، بخطنا المتصل. صغيرة لكل يوم وسهلة التنسيق مع قلادات أخرى.",
    },
    categories: ["name-necklaces", "necklaces", "gifts"],
    style: "initial",
    isBestSeller: true,
    offers: offers(plated, 30, 37, [90, 111]),
    defaultMaterial: "gold",
    personalization: {
      kind: "initial",
      maxLength: 1,
      fonts: ["beirut"],
      connections: ["center"],
      sample: "M",
    },
    size: chain,
    art: { kind: "name", variant: "necklace" },
    media: [],
    details: nameDetails,
  },
  {
    slug: "bold-name-necklace",
    name: { en: "Bold Name Necklace", ar: "قلادة الاسم العريضة" },
    summary: {
      en: "Thick, rounded letters that stand out.",
      ar: "أحرف عريضة ومستديرة تلفت النظر.",
    },
    description: {
      en: "For the girl who wants her name seen. Rounded, bold script cut thicker than our classic pieces, still light enough to wear all day.",
      ar: "لمن تريد أن يُرى اسمها. خط عريض ومستدير أسمك من قطعنا الكلاسيكية، وخفيف بما يكفي لتلبسيه طوال اليوم.",
    },
    categories: ["name-necklaces", "necklaces"],
    style: "bold",
    isNew: true,
    offers: offers(plated, 47, 60, [141, 180]),
    defaultMaterial: "gold",
    personalization: nameNecklace("Jana", "faraya"),
    size: chain,
    art: { kind: "name", variant: "necklace" },
    media: [],
    details: nameDetails,
  },
  {
    slug: "dainty-name-necklace",
    name: { en: "Dainty Name Necklace", ar: "قلادة الاسم الناعمة" },
    summary: {
      en: "Fine, elegant script for a minimal look.",
      ar: "خط رفيع وأنيق لإطلالة بسيطة.",
    },
    description: {
      en: "Our finest script, with long elegant swirls. Barely-there and perfect for layering with a coin or cedar.",
      ar: "أرفع خطوطنا، بانحناءات طويلة وأنيقة. ناعمة جداً ومثالية مع قلادة الليرة أو الأرزة.",
    },
    categories: ["name-necklaces", "necklaces"],
    style: "dainty",
    isBestSeller: true,
    offers: offers(plated, 40, 50, [120, 150]),
    defaultMaterial: "silver",
    personalization: nameNecklace("Rita"),
    size: chain,
    art: { kind: "name", variant: "necklace" },
    media: [],
    details: nameDetails,
  },
  {
    slug: "choose-your-font-name-necklace",
    name: { en: "Choose-Your-Font Name Necklace", ar: "قلادة الاسم بخط تختارينه" },
    summary: {
      en: "Three scripts, one name: pick the one that feels like you.",
      ar: "ثلاثة خطوط لاسم واحد: اختاري الذي يشبهكِ.",
    },
    description: {
      en: "Can't decide? Preview your name in Beirut, Byblos and Batroun, our three signature scripts, and choose your favorite.",
      ar: "محتارة؟ شاهدي اسمكِ بخطوطنا الثلاثة بيروت وجبيل والبترون، واختاري المفضل.",
    },
    categories: ["name-necklaces", "necklaces", "gifts"],
    style: "twoFonts",
    isNew: true,
    offers: offers(plated, 50, 64, [150, 192]),
    defaultMaterial: "gold",
    personalization: nameNecklace("Sarah"),
    size: chain,
    art: { kind: "name", variant: "necklace" },
    media: [],
    details: nameDetails,
  },
  {
    slug: "arabic-letter-necklace",
    name: { en: "Arabic Letter Necklace", ar: "قلادة الحرف العربي" },
    summary: {
      en: "A single Arabic letter in calligraphy.",
      ar: "حرف عربي واحد بخط جميل.",
    },
    description: {
      en: "One Arabic letter, drawn in calligraphy and cut by hand. Minimal, meaningful and easy to layer.",
      ar: "حرف عربي واحد، مرسوم بالخط ومقصوص يدوياً. بسيطة وذات معنى وسهلة التنسيق.",
    },
    categories: ["name-necklaces", "necklaces"],
    style: "initial",
    isNew: true,
    offers: offers(plated, 30, undefined, [90]),
    defaultMaterial: "gold",
    personalization: {
      kind: "initial",
      maxLength: 1,
      fonts: ["tripoli", "harissa", "deir-el-qamar"],
      connections: ["center"],
      sample: "ن",
    },
    size: chain,
    art: { kind: "name", variant: "necklace" },
    media: [],
    details: nameDetails,
  },
  {
    slug: "arabic-name-bracelet",
    name: { en: "Arabic Name Bracelet", ar: "سوار الاسم بالعربي" },
    summary: {
      en: "An Arabic name on a fine chain bracelet.",
      ar: "اسم بالعربي على سوار ناعم.",
    },
    description: {
      en: "Our Arabic calligraphy name, sized for the wrist. Lovely for him or her.",
      ar: "اسم بالخط العربي على مقاس المعصم. جميل له أو لها.",
    },
    categories: ["bracelets", "mens-jewelry"],
    offers: offers(plated, 37, undefined, [111]),
    defaultMaterial: "silver",
    personalization: { ...nameNecklace("كريم", "tripoli"), connections: [] },
    size: bracelet,
    art: { kind: "name", variant: "bracelet" },
    media: [],
    details: nameDetails,
  },
  {
    slug: "lira-coin-bracelet",
    name: { en: "Lira Coin Bracelet", ar: "سوار الليرة" },
    summary: {
      en: "A mini Lira coin on a fine chain.",
      ar: "ليرة صغيرة على سلسلة ناعمة.",
    },
    description: {
      en: "The 1 Livre coin in miniature, centered on a delicate bracelet. Pairs perfectly with the coin necklace.",
      ar: "ليرة لبنانية مصغّرة في وسط سوار ناعم. تتناسق تماماً مع قلادة الليرة.",
    },
    categories: ["lira-collection", "bracelets", "gifts"],
    offers: offers(["silver", "gold"], 40, 50, [120, 150]),
    defaultMaterial: "gold",
    size: bracelet,
    art: { kind: "coin", variant: "bracelet" },
    media: [],
    details: coinDetails,
  },
  {
    slug: "lira-coin-earrings",
    name: { en: "Lira Coin Earrings", ar: "أقراط الليرة" },
    summary: {
      en: "Two little Lira coins that catch the light.",
      ar: "ليرتان صغيرتان تلمعان مع كل حركة.",
    },
    description: {
      en: "Tiny 1 Livre coins on fine hooks, cedar side out. Light, playful and very Lebanese.",
      ar: "ليرات صغيرة على خطافات رفيعة، والأرزة إلى الخارج. خفيفة ومرحة ولبنانية جداً.",
    },
    categories: ["lira-collection", "earrings"],
    isNew: true,
    offers: offers(["silver", "gold"], 37, undefined, [111]),
    defaultMaterial: "gold",
    art: { kind: "coin", variant: "earrings" },
    media: [],
    details: coinDetails,
  },
  {
    slug: "mens-lira-pendant",
    name: { en: "Men's Lira Pendant", ar: "ميدالية الليرة للرجال" },
    summary: {
      en: "A larger Lira coin on a stronger chain.",
      ar: "ليرة أكبر على سلسلة أمتن.",
    },
    description: {
      en: "The 1975 Lira at full size on a 2 mm chain. Made to be worn every day.",
      ar: "ليرة 1975 بحجمها الكامل على سلسلة 2 ملم. مصنوعة لتُلبس كل يوم.",
    },
    categories: ["lira-collection", "mens-jewelry"],
    offers: offers(["silver", "gold"], 60, undefined, [180]),
    defaultMaterial: "silver",
    size: { kind: "chain", values: [50, 55, 60], default: 55 },
    art: { kind: "coin", variant: "necklace" },
    media: [],
    details: coinDetails,
  },
  {
    slug: "mens-cedar-pendant",
    name: { en: "Men's Cedar Pendant", ar: "ميدالية الأرزة للرجال" },
    summary: {
      en: "A bold cedar for him.",
      ar: "أرزة عريضة له.",
    },
    description: {
      en: "A larger, heavier cedar on a 2 mm chain. Simple, strong and proudly Lebanese.",
      ar: "أرزة أكبر وأثقل على سلسلة 2 ملم. بسيطة وقوية ولبنانية بفخر.",
    },
    categories: ["mens-jewelry", "necklaces"],
    offers: offers(["silver", "gold"], 50, undefined, [150]),
    defaultMaterial: "silver",
    size: { kind: "chain", values: [50, 55, 60], default: 55 },
    art: { kind: "cedar" },
    media: [],
    details: simpleDetails,
  },
  {
    slug: "initial-signet-ring",
    name: { en: "Initial Signet Ring", ar: "خاتم الحرف" },
    summary: {
      en: "Your initial engraved on a polished signet.",
      ar: "حرفكِ محفور على خاتم مصقول.",
    },
    description: {
      en: "A modern signet with one engraved initial in our cursive script. Stack it or wear it alone.",
      ar: "خاتم عصري بحرف واحد محفور بخطنا المتصل. البسيه وحده أو مع خواتم أخرى.",
    },
    categories: ["rings", "gifts"],
    offers: offers(plated, 40, 50, [120, 150]),
    defaultMaterial: "gold",
    personalization: {
      kind: "initial",
      maxLength: 1,
      fonts: ["beirut"],
      connections: [],
      sample: "L",
    },
    size: ring,
    art: { kind: "ring", engraving: "initial" },
    media: [],
    details: simpleDetails,
  },
  {
    slug: "dainty-stacking-ring",
    name: { en: "Dainty Stacking Ring", ar: "خاتم ناعم" },
    summary: {
      en: "A thin band to stack and mix.",
      ar: "حلقة رفيعة للتنسيق.",
    },
    description: {
      en: "A 1.2 mm polished band. Wear one, or three in mixed metals.",
      ar: "حلقة مصقولة بعرض 1.2 ملم. البسي واحدة أو ثلاثاً بألوان مختلفة.",
    },
    categories: ["rings"],
    isNew: true,
    offers: offers(plated, 24, undefined, [72]),
    defaultMaterial: "gold",
    size: ring,
    art: { kind: "ring", engraving: "plain" },
    media: [],
    details: simpleDetails,
  },
  {
    slug: "mini-huggie-hoops",
    name: { en: "Mini Huggie Hoops", ar: "أقراط حلق صغيرة" },
    summary: {
      en: "Small hoops that hug the lobe.",
      ar: "حلقات صغيرة تلتف حول الأذن.",
    },
    description: {
      en: "Everyday huggies with a secure click closure. Comfortable enough to sleep in.",
      ar: "حلقات يومية بقفل آمن. مريحة لدرجة أنكِ تنامين بها.",
    },
    categories: ["earrings", "gifts"],
    isNew: true,
    isBestSeller: true,
    offers: offers(plated, 30, 37, [90, 111]),
    defaultMaterial: "gold",
    art: { kind: "hoops", pearl: false },
    media: [],
    details: simpleDetails,
  },
  {
    slug: "pearl-drop-earrings",
    name: { en: "Pearl Drop Earrings", ar: "أقراط اللؤلؤ" },
    summary: {
      en: "A freshwater pearl on a mini hoop.",
      ar: "لؤلؤة طبيعية على حلقة صغيرة.",
    },
    description: {
      en: "A soft freshwater pearl hanging from a mini hoop. Elegant for weddings, easy for every day.",
      ar: "لؤلؤة ناعمة معلقة بحلقة صغيرة. أنيقة للأعراس وسهلة لكل يوم.",
    },
    categories: ["earrings", "gifts"],
    offers: offers(plated, 37, undefined, [111]),
    defaultMaterial: "gold",
    art: { kind: "hoops", pearl: true },
    media: [],
    details: simpleDetails,
  },
  {
    slug: "mens-arabic-name-necklace",
    name: { en: "Men's Arabic Name Chain", ar: "سلسلة الاسم بالعربي للرجال" },
    summary: {
      en: "A bold Arabic name on a stronger chain.",
      ar: "اسم بالعربي بخط عريض على سلسلة أمتن.",
    },
    description: {
      en: "His name in Arabic calligraphy, cut thicker and hung on a 2 mm chain.",
      ar: "اسمه بالخط العربي، مقصوص بسماكة أكبر على سلسلة 2 ملم.",
    },
    categories: ["mens-jewelry", "name-necklaces"],
    style: "arabic",
    offers: offers(["silver", "gold"], 54, undefined, [162]),
    defaultMaterial: "silver",
    personalization: nameNecklace("علي", "tripoli"),
    size: { kind: "chain", values: [50, 55, 60], default: 55 },
    art: { kind: "name", variant: "necklace" },
    media: [],
    details: nameDetails,
  },
] satisfies Product[]).map(wearable);
