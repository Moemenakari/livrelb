// Builds src/lib/charms/shapes.generated.ts: the 200+ charm shapes of the
// Charms page. Each shape is a Lucide icon (ISC license) copied as plain SVG
// path data, so the page ships only the shapes it shows (no icon library).
//   node scripts/build-charms.mjs
// Add or remove a line below and run it again. Missing icon names are
// reported and skipped.
import { writeFileSync, mkdirSync } from "node:fs";

// group -> [lucide icon name, English, Arabic]
const groups = {
  love: [
    ["heart", "Heart", "قلب"],
    ["heart-handshake", "Hearts joined", "قلوب متحدة"],
    ["heart-pulse", "Heartbeat", "نبض القلب"],
    ["heart-crack", "Broken heart", "قلب مكسور"],
    ["hand-heart", "Hand with heart", "يد وقلب"],
    ["heart-plus", "Heart plus", "قلب زائد"],
    ["book-heart", "Love book", "كتاب الحب"],
    ["message-circle-heart", "Love message", "رسالة حب"],
    ["gift", "Gift", "هدية"],
    ["party-popper", "Celebration", "احتفال"],
    ["balloon", "Balloon", "بالون"],
    ["cake", "Cake", "كعكة"],
    ["cake-slice", "Cake slice", "قطعة كعك"],
    ["cupcake", "Cupcake", "كب كيك"],
    ["baby", "Baby", "طفل"],
    ["smile", "Smile", "ابتسامة"],
    ["laugh", "Laugh", "ضحكة"],
    ["kiss", "Kiss", "قبلة"],
    ["ribbon", "Ribbon", "شريط"],
    ["bed-double", "Bed", "سرير"],
  ],
  sky: [
    ["star", "Star", "نجمة"],
    ["sparkle", "Sparkle", "لمعة"],
    ["sparkles", "Sparkles", "لمعات"],
    ["moon", "Moon", "قمر"],
    ["moon-star", "Moon and star", "هلال ونجمة"],
    ["sun", "Sun", "شمس"],
    ["sun-medium", "Little sun", "شمس صغيرة"],
    ["sunrise", "Sunrise", "شروق"],
    ["sunset", "Sunset", "غروب"],
    ["sun-moon", "Sun and moon", "شمس وقمر"],
    ["cloud", "Cloud", "غيمة"],
    ["cloud-sun", "Sun and cloud", "شمس وغيمة"],
    ["cloud-moon", "Night cloud", "غيمة ليلية"],
    ["cloud-rain", "Rain", "مطر"],
    ["cloud-snow", "Snow", "ثلج"],
    ["cloud-lightning", "Storm", "عاصفة"],
    ["rainbow", "Rainbow", "قوس قزح"],
    ["snowflake", "Snowflake", "ندفة ثلج"],
    ["zap", "Lightning", "برق"],
    ["flame", "Flame", "لهب"],
    ["droplet", "Drop", "قطرة"],
    ["droplets", "Drops", "قطرات"],
    ["wind", "Wind", "ريح"],
    ["waves", "Waves", "أمواج"],
    ["mountain", "Mountain", "جبل"],
    ["mountain-snow", "Snowy mountain", "جبل مثلج"],
    ["telescope", "Telescope", "تلسكوب"],
    ["orbit", "Orbit", "مدار"],
    ["rocket", "Rocket", "صاروخ"],
    ["satellite", "Satellite", "قمر صناعي"],
    ["globe", "Globe", "كرة أرضية"],
    ["earth", "Earth", "الأرض"],
    ["atom", "Atom", "ذرة"],
    ["eclipse", "Eclipse", "كسوف"],
    ["galaxy", "Galaxy", "مجرة"],
    ["umbrella", "Umbrella", "مظلة"],
    ["tornado", "Tornado", "إعصار"],
    ["compass", "Compass", "بوصلة"],
    ["telescope", "Stargazer", "راصد النجوم"],
    ["thermometer-sun", "Warm day", "يوم دافئ"],
  ],
  nature: [
    ["flower", "Flower", "زهرة"],
    ["flower-2", "Blossom", "زهرة متفتحة"],
    ["clover", "Clover", "برسيم"],
    ["leaf", "Leaf", "ورقة"],
    ["leafy-green", "Green leaves", "أوراق خضراء"],
    ["trees", "Trees", "أشجار"],
    ["tree-pine", "Pine tree", "شجرة صنوبر"],
    ["tree-deciduous", "Tree", "شجرة"],
    ["tree-palm", "Palm tree", "نخلة"],
    ["sprout", "Sprout", "برعم"],
    ["wheat", "Wheat", "قمح"],
    ["cherry", "Cherry", "كرز"],
    ["apple", "Apple", "تفاحة"],
    ["grape", "Grapes", "عنب"],
    ["citrus", "Lemon", "ليمون"],
    ["banana", "Banana", "موز"],
    ["carrot", "Carrot", "جزرة"],
    ["bean", "Bean", "حبة"],
    ["nut", "Nut", "جوزة"],
    ["shell", "Shell", "صدفة"],
    ["feather", "Feather", "ريشة"],
    ["vegan", "Plant", "نبتة"],
    ["mushroom", "Mushroom", "فطر"],
    ["cactus", "Cactus", "صبار"],
    ["bug", "Bug", "حشرة"],
    ["hop", "Hop", "حشيشة"],
    ["trees", "Forest", "غابة"],
    ["tent-tree", "Camp", "مخيم"],
    ["mountain", "Peak", "قمة"],
    ["waves", "Sea", "بحر"],
  ],
  animals: [
    ["cat", "Cat", "قطة"],
    ["dog", "Dog", "كلب"],
    ["bird", "Bird", "عصفور"],
    ["fish", "Fish", "سمكة"],
    ["fish-symbol", "Fish symbol", "رمز السمكة"],
    ["rabbit", "Rabbit", "أرنب"],
    ["turtle", "Turtle", "سلحفاة"],
    ["squirrel", "Squirrel", "سنجاب"],
    ["rat", "Mouse", "فأر"],
    ["snail", "Snail", "حلزون"],
    ["worm", "Worm", "دودة"],
    ["panda", "Panda", "باندا"],
    ["origami", "Paper bird", "عصفور ورقي"],
    ["paw-print", "Paw", "بصمة قدم"],
    ["bone", "Bone", "عظمة"],
    ["egg", "Egg", "بيضة"],
    ["bat", "Bat", "خفاش"],
    ["shrimp", "Shrimp", "روبيان"],
    ["rabbit", "Bunny", "أرنوب"],
    ["bird", "Dove", "حمامة"],
    ["feather", "Wing feather", "ريشة جناح"],
    ["ham", "Piglet", "خنزير"],
    ["beef", "Bull", "ثور"],
    ["drumstick", "Chicken", "دجاجة"],
  ],
  symbols: [
    ["infinity", "Infinity", "لا نهاية"],
    ["key", "Key", "مفتاح"],
    ["key-round", "Round key", "مفتاح دائري"],
    ["lock", "Lock", "قفل"],
    ["lock-open", "Open lock", "قفل مفتوح"],
    ["anchor", "Anchor", "مرساة"],
    ["crown", "Crown", "تاج"],
    ["diamond", "Diamond", "ألماس"],
    ["gem", "Gem", "جوهرة"],
    ["award", "Award", "وسام"],
    ["trophy", "Trophy", "كأس"],
    ["medal", "Medal", "ميدالية"],
    ["shield", "Shield", "درع"],
    ["shield-check", "Protection", "حماية"],
    ["flag", "Flag", "علم"],
    ["bell", "Bell", "جرس"],
    ["bookmark", "Bookmark", "فاصل كتاب"],
    ["eye", "Eye", "عين"],
    ["hand", "Hand", "يد"],
    ["handshake", "Handshake", "مصافحة"],
    ["fingerprint-pattern", "Fingerprint", "بصمة"],
    ["cross", "Cross", "صليب"],
    ["hexagon", "Hexagon", "سداسي"],
    ["pentagon", "Pentagon", "خماسي"],
    ["octagon", "Octagon", "ثماني"],
    ["triangle", "Triangle", "مثلث"],
    ["square", "Square", "مربع"],
    ["circle", "Circle", "دائرة"],
    ["badge", "Badge", "شارة"],
    ["scale", "Scales", "ميزان"],
    ["target", "Target", "هدف"],
    ["hourglass", "Hourglass", "ساعة رملية"],
    ["club", "Club", "سباتي"],
    ["spade", "Spade", "ورق شدة"],
    ["dice-1", "Dice one", "نرد ١"],
    ["dice-3", "Dice three", "نرد ٣"],
    ["dice-5", "Dice five", "نرد ٥"],
    ["dice-6", "Dice six", "نرد ٦"],
    ["puzzle", "Puzzle", "أحجية"],
    ["lightbulb", "Idea", "فكرة"],
    ["magnet", "Magnet", "مغناطيس"],
    ["circle-dot", "Dot", "نقطة"],
    ["asterisk", "Asterisk", "نجمية"],
    ["ampersand", "And", "و"],
    ["at-sign", "At sign", "آت"],
    ["hash", "Hash", "هاش"],
    ["percent", "Percent", "نسبة"],
    ["peace", "Peace", "سلام"],
    ["yin-yang", "Balance", "توازن"],
    ["venus", "Venus", "فينوس"],
    ["mars", "Mars", "مريخ"],
    ["accessibility", "Person", "شخص"],
    ["sigma", "Sigma", "سيغما"],
    ["pi", "Pi", "باي"],
    ["omega", "Omega", "أوميغا"],
    ["swords", "Swords", "سيفان"],
    ["sword", "Sword", "سيف"],
  ],
  fun: [
    ["music", "Music note", "نوتة موسيقية"],
    ["music-2", "Notes", "نوتات"],
    ["headphones", "Headphones", "سماعات"],
    ["guitar", "Guitar", "غيتار"],
    ["drum", "Drum", "طبل"],
    ["mic", "Microphone", "ميكروفون"],
    ["camera", "Camera", "كاميرا"],
    ["film", "Film", "فيلم"],
    ["clapperboard", "Clapperboard", "كلاكيت"],
    ["gamepad-2", "Game", "لعبة"],
    ["plane", "Plane", "طائرة"],
    ["ship", "Ship", "سفينة"],
    ["sailboat", "Sailboat", "قارب شراعي"],
    ["car", "Car", "سيارة"],
    ["bike", "Bike", "دراجة"],
    ["train-front", "Train", "قطار"],
    ["coffee", "Coffee", "قهوة"],
    ["wine", "Wine", "نبيذ"],
    ["martini", "Cocktail", "كوكتيل"],
    ["beer", "Beer", "بيرة"],
    ["pizza", "Pizza", "بيتزا"],
    ["ice-cream-cone", "Ice cream", "بوظة"],
    ["cookie", "Cookie", "كوكيز"],
    ["candy", "Candy", "حلوى"],
    ["candy-cane", "Candy cane", "عصا حلوى"],
    ["popcorn", "Popcorn", "فشار"],
    ["croissant", "Croissant", "كرواسون"],
    ["donut", "Donut", "دونات"],
    ["utensils", "Fork and knife", "شوكة وسكين"],
    ["palette", "Palette", "لوحة ألوان"],
    ["brush", "Brush", "فرشاة"],
    ["pen-tool", "Pen", "قلم"],
    ["pencil", "Pencil", "قلم رصاص"],
    ["scissors", "Scissors", "مقص"],
    ["scroll", "Scroll", "مخطوطة"],
    ["book-open", "Open book", "كتاب مفتوح"],
    ["graduation-cap", "Graduation", "تخرّج"],
    ["glasses", "Glasses", "نظارة"],
    ["shirt", "Shirt", "قميص"],
    ["footprints", "Footprints", "آثار أقدام"],
    ["dumbbell", "Dumbbell", "دمبل"],
    ["tent", "Tent", "خيمة"],
    ["castle", "Castle", "قلعة"],
    ["church", "Church", "كنيسة"],
    ["house", "Home", "بيت"],
    ["building-2", "Building", "مبنى"],
    ["ferris-wheel", "Ferris wheel", "دولاب هوائي"],
    ["luggage", "Suitcase", "حقيبة سفر"],
    ["backpack", "Backpack", "حقيبة ظهر"],
    ["map-pin", "Pin", "دبوس موقع"],
    ["mail", "Letter", "رسالة"],
    ["phone", "Phone", "هاتف"],
    ["angry", "Angry", "غاضب"],
    ["frown", "Sad", "حزين"],
    ["hand-metal", "Rock on", "روك"],
    ["thumbs-up", "Thumbs up", "إعجاب"],
    ["biceps-flexed", "Strong", "قوي"],
    ["brain", "Brain", "دماغ"],
    ["ear", "Ear", "أذن"],
    ["lamp", "Lamp", "مصباح"],
    ["flashlight", "Flashlight", "كشاف"],
    ["candle-holder", "Candle", "شمعة"],
    ["wand-sparkles", "Magic wand", "عصا سحرية"],
    ["ghost", "Ghost", "شبح"],
    ["skull", "Skull", "جمجمة"],
    ["drama", "Theatre", "مسرح"],
    ["hat-glasses", "Detective", "محقق"],
    ["bot", "Robot", "روبوت"],
    ["alien", "Alien", "فضائي"],
    ["swatch-book", "Colors", "ألوان"],
    ["stamp", "Stamp", "ختم"],
    ["feather", "Writer", "كاتب"],
  ],
};

const root = new URL("../node_modules/lucide-react/dist/esm/icons/", import.meta.url);
const seen = new Set();
const out = [];
const missing = [];

for (const [group, list] of Object.entries(groups)) {
  for (const [icon, en, ar] of list) {
    const slug = `${group}-${en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    if (seen.has(slug)) continue;
    let data;
    try {
      data = (await import(new URL(`${icon}.mjs`, root))).__iconData;
    } catch {
      missing.push(icon);
      continue;
    }
    if (!data) {
      missing.push(icon);
      continue;
    }
    const nodes = data.node.map(([tag, attrs]) => {
      const { key: _key, ...rest } = attrs;
      return [tag, rest];
    });
    seen.add(slug);
    out.push({ slug, group, name: { en, ar }, nodes });
  }
}

mkdirSync(new URL("../src/lib/charms/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../src/lib/charms/shapes.generated.ts", import.meta.url),
  `// GENERATED by scripts/build-charms.mjs. Do not edit by hand.
// Shapes are Lucide icons (ISC license), copied as SVG path data.

export type ShapeGroup = ${Object.keys(groups).map((g) => `"${g}"`).join(" | ")};
export type ShapeNode = [tag: string, attrs: Record<string, string | number>];
export type IconShape = {
  slug: string;
  group: ShapeGroup;
  name: { en: string; ar: string };
  nodes: ShapeNode[];
};

export const iconShapes: IconShape[] = ${JSON.stringify(out)};
`,
);

console.log(`Wrote ${out.length} shapes.`);
if (missing.length) console.log(`Skipped (not in this Lucide version): ${[...new Set(missing)].join(", ")}`);
