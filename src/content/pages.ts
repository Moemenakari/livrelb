// Text of the information pages, in English and Arabic. These are simple
// TEMPLATES written for a small Lebanese online jewelry shop: they are
// marked as drafts on the site and must be read and approved by Nour before
// launch. Change the text here, nothing else needs to move.

type Lang = "en" | "ar";
export type Block = { heading?: string; paragraphs?: string[]; list?: string[] };
export type PageContent = { title: string; intro: string; blocks: Block[] };

export type PolicySlug = "shipping" | "returns" | "privacy" | "terms";

export const policies: Record<PolicySlug, Record<Lang, PageContent>> = {
  shipping: {
    en: {
      title: "Shipping & delivery",
      intro: "Every LIVRE piece is made to order, then delivered to your door anywhere in Lebanon.",
      blocks: [
        {
          heading: "How long it takes",
          paragraphs: [
            "We take 3 to 4 days to design and handmake your piece, so every letter comes out sharp and beautiful. Then it is delivered: 2 days in Tripoli, a little longer elsewhere in Lebanon. You can follow every step on the Track my order page, and we will message you if anything changes.",
          ],
        },
        {
          heading: "Delivery fee",
          list: [
            "Delivery inside Lebanon costs $4.",
            "Orders over $50 have free delivery.",
            "Your first order has free delivery.",
          ],
        },
        {
          heading: "Payment on delivery",
          paragraphs: [
            "You can pay cash to the driver when your order arrives. If online payment is available at checkout (Whish or Visa / Mastercard), you can pay before delivery instead.",
          ],
        },
        {
          heading: "Tracking your order",
          paragraphs: [
            "After you order, use “Track my order” with your order number and phone number to see each step: confirmed, being handcrafted, out for delivery and delivered. We also update you on WhatsApp.",
          ],
        },
        {
          heading: "If you are not home",
          paragraphs: ["The driver will call you. If nobody answers, we will contact you on WhatsApp to arrange another time."],
        },
      ],
    },
    ar: {
      title: "الشحن والتوصيل",
      intro: "كل قطعة من LIVRE تُصنع حسب الطلب ثم تصل إلى باب بيتكِ في أي مكان في لبنان.",
      blocks: [
        {
          heading: "كم يستغرق طلبكِ",
          paragraphs: [
            "نأخذ من 3 إلى 4 أيام لتصميم قطعتكِ وصنعها يدوياً، لتخرج كل الحروف واضحة وجميلة. ثم نوصلها: يومان في طرابلس، وأكثر بقليل في باقي مناطق لبنان. يمكنكِ متابعة كل خطوة في صفحة «تتبّع طلبي»، وسنراسلكِ إذا تغيّر أي شيء.",
          ],
        },
        {
          heading: "رسوم التوصيل",
          list: ["التوصيل داخل لبنان 4$.", "التوصيل مجاني للطلبات فوق 50$.", "التوصيل مجاني لطلبكِ الأول."],
        },
        {
          heading: "الدفع عند الاستلام",
          paragraphs: [
            "يمكنكِ الدفع نقداً للسائق عند وصول طلبكِ. وإذا توفّر الدفع الإلكتروني عند إتمام الطلب (Whish أو فيزا / ماستركارد) يمكنكِ الدفع قبل التوصيل.",
          ],
        },
        {
          heading: "تتبّع طلبكِ",
          paragraphs: [
            "بعد الطلب، استعملي «تتبّع طلبي» برقم الطلب ورقم هاتفكِ لترى كل مرحلة: تم التأكيد، قيد التصنيع، خرج للتوصيل، تم التسليم. كما نبقيكِ على اطلاع عبر واتساب.",
          ],
        },
        {
          heading: "إذا لم تكوني في البيت",
          paragraphs: ["سيتصل بكِ السائق. وإذا لم يجب أحد سنراسلكِ عبر واتساب لنتفق على موعد آخر."],
        },
      ],
    },
  },
  returns: {
    en: {
      title: "Returns & exchanges",
      intro: "We want you to love your piece. Here is what we can do if something is not right.",
      blocks: [
        {
          heading: "Personalized pieces",
          paragraphs: [
            "Name necklaces, bracelets, rings and anything engraved or cut with your text are made only for you, so they cannot be returned or exchanged unless they arrive damaged or with a mistake that is ours (for example a wrong spelling compared to your order).",
          ],
        },
        {
          heading: "Ready-made pieces",
          paragraphs: [
            "Non-personalized pieces (for example the Lira coin pieces) can be exchanged within 7 days of delivery if they are unworn, in their original box and with the receipt. The customer pays the delivery of an exchange unless the piece was damaged.",
          ],
        },
        {
          heading: "Damaged or wrong item",
          paragraphs: [
            "Message us on WhatsApp within 48 hours of delivery with your order number and a clear photo. We will remake or replace the piece at no cost, or refund you if we cannot.",
          ],
        },
        {
          heading: "Care and wear",
          paragraphs: [
            "Normal wear, scratches, bending, contact with perfume or chemicals, and loss are not covered. See the FAQ for how to care for your jewelry.",
          ],
        },
        {
          heading: "Refunds",
          paragraphs: [
            "An approved refund goes back the way you paid: cash refunds are arranged with you directly, online payments go back to the same wallet or card.",
          ],
        },
      ],
    },
    ar: {
      title: "الإرجاع والاستبدال",
      intro: "نريدكِ أن تحبّي قطعتكِ. هذا ما يمكننا فعله إذا كان هناك أي مشكلة.",
      blocks: [
        {
          heading: "القطع المخصصة",
          paragraphs: [
            "عقود الأسماء والأساور والخواتم وكل ما يُنقش أو يُقصّ بنصّكِ تُصنع لكِ وحدكِ، لذلك لا يمكن إرجاعها أو استبدالها إلا إذا وصلت تالفة أو بخطأ منّا (مثلاً إملاء مختلف عمّا طلبتِ).",
          ],
        },
        {
          heading: "القطع الجاهزة",
          paragraphs: [
            "القطع غير المخصصة (مثل قطع الليرة) يمكن استبدالها خلال 7 أيام من التسليم إذا لم تُلبس، وبعلبتها الأصلية ومع الإيصال. تدفع الزبونة توصيل الاستبدال إلا إذا كانت القطعة تالفة.",
          ],
        },
        {
          heading: "قطعة تالفة أو خاطئة",
          paragraphs: [
            "راسلينا على واتساب خلال 48 ساعة من التسليم مع رقم الطلب وصورة واضحة. سنعيد صنع القطعة أو نستبدلها مجاناً، أو نردّ لكِ المبلغ إذا لم نستطع.",
          ],
        },
        {
          heading: "العناية والاستعمال",
          paragraphs: [
            "الاستعمال العادي والخدوش والثني وملامسة العطر أو المواد الكيميائية والضياع غير مشمولة. راجعي الأسئلة الشائعة لمعرفة كيف تعتنين بمجوهراتكِ.",
          ],
        },
        {
          heading: "استرداد المبلغ",
          paragraphs: ["يعود المبلغ المعتمد بالطريقة التي دفعتِ بها: الدفع النقدي نرتّبه معكِ مباشرة، والدفع الإلكتروني يعود إلى المحفظة أو البطاقة نفسها."],
        },
      ],
    },
  },
  privacy: {
    en: {
      title: "Privacy policy",
      intro: "We only keep what we need to make and deliver your order. We never sell your data.",
      blocks: [
        {
          heading: "What we keep",
          list: [
            "Your name, phone number, area and delivery address: to make, deliver and track your order and to contact you about it.",
            "Your order history and LIVRE Points: so you can track orders and use your points.",
            "If you use Google sign-in: your Google account name and email, only to link your points. We never post anything.",
            "If you send a charm request: the design and the photo you upload.",
          ],
        },
        {
          heading: "What we never keep",
          paragraphs: [
            "We never see or store your card number: card payments happen on your bank's secure page. We do not ask for your email to order.",
          ],
        },
        {
          heading: "Who sees it",
          paragraphs: [
            "Only our team and the delivery driver (name, phone and address, to deliver). Our website is hosted on Cloudflare and our database on Supabase; they process data for us and do not use it for anything else.",
          ],
        },
        {
          heading: "Cookies",
          paragraphs: [
            "We use small necessary cookies (your cart, your language, remembering your device after an order). Analytics cookies (Meta Pixel, Google Analytics) load only if you accept them in the cookie banner.",
          ],
        },
        {
          heading: "Your choices",
          paragraphs: ["You can ask us on WhatsApp to see, correct or delete your data at any time. We will do it within a few days, unless we must keep an order record."],
        },
      ],
    },
    ar: {
      title: "سياسة الخصوصية",
      intro: "نحتفظ فقط بما نحتاجه لصنع طلبكِ وتوصيله. ولا نبيع بياناتكِ أبداً.",
      blocks: [
        {
          heading: "ما نحتفظ به",
          list: [
            "اسمكِ ورقم هاتفكِ ومنطقتكِ وعنوان التوصيل: لصنع طلبكِ وتوصيله وتتبّعه والتواصل معكِ بشأنه.",
            "سجل طلباتكِ ونقاط LIVRE: لتتبّع الطلبات واستعمال نقاطكِ.",
            "إذا استعملتِ الدخول عبر Google: اسم حسابكِ وبريده فقط لربط نقاطكِ. لا ننشر أي شيء.",
            "إذا أرسلتِ طلب تشارمز: التصميم والصورة التي ترفعينها.",
          ],
        },
        {
          heading: "ما لا نحتفظ به أبداً",
          paragraphs: ["لا نرى رقم بطاقتكِ ولا نحفظه: الدفع بالبطاقة يتم على صفحة البنك الآمنة. ولا نطلب بريدكِ الإلكتروني لإتمام الطلب."],
        },
        {
          heading: "من يرى بياناتكِ",
          paragraphs: [
            "فريقنا وسائق التوصيل فقط (الاسم والهاتف والعنوان للتوصيل). موقعنا مستضاف على Cloudflare وقاعدة بياناتنا على Supabase؛ يعالجان البيانات لأجلنا ولا يستعملانها لأي غرض آخر.",
          ],
        },
        {
          heading: "ملفات الارتباط (Cookies)",
          paragraphs: [
            "نستعمل ملفات ارتباط صغيرة ضرورية (سلّتكِ ولغتكِ وتذكّر جهازكِ بعد الطلب). ملفات التحليلات (Meta Pixel وGoogle Analytics) لا تعمل إلا إذا وافقتِ عليها في شريط الموافقة.",
          ],
        },
        {
          heading: "خياراتكِ",
          paragraphs: ["يمكنكِ أن تطلبي منّا على واتساب في أي وقت الاطلاع على بياناتكِ أو تصحيحها أو حذفها. ننفّذ ذلك خلال أيام قليلة، إلا إذا وجب الاحتفاظ بسجل الطلب."],
        },
      ],
    },
  },
  terms: {
    en: {
      title: "Terms of service",
      intro: "By ordering from LIVRE you agree to these simple terms.",
      blocks: [
        {
          heading: "Orders",
          paragraphs: [
            "An order is confirmed when we contact you or mark it Confirmed on your tracking page. We may decline or cancel an order (for example if the name is unclear or an item is unavailable) and we will tell you why.",
          ],
        },
        {
          heading: "Personalized pieces",
          paragraphs: [
            "You are responsible for checking the spelling of the name or text before you order. We make the piece exactly as typed. See “Returns & exchanges” for what happens if we make a mistake.",
          ],
        },
        {
          heading: "Prices and payment",
          paragraphs: [
            "Prices are in US dollars and include the piece and the gift box. Delivery is added at checkout unless it is free. Prices and offers can change, but never for an order already placed. Payment is cash on delivery, or online when available.",
          ],
        },
        {
          heading: "Coupons and LIVRE Points",
          paragraphs: [
            "Coupons have an end date and cannot be combined unless we say so. LIVRE Points are added after an order is delivered and approved by our team, they have no cash value and can only be used on our website. We can cancel points or coupons obtained by mistake or misuse.",
          ],
        },
        {
          heading: "Materials",
          paragraphs: [
            "Pieces are stainless steel: gold, silver or plain, and Double Gold or Double Silver with a double layer for longer wear. Colors in photos can look a little different on your screen.",
          ],
        },
        {
          heading: "Contact",
          paragraphs: ["Questions about these terms? Message us on WhatsApp or Instagram."],
        },
      ],
    },
    ar: {
      title: "شروط الخدمة",
      intro: "بطلبكِ من LIVRE فإنكِ توافقين على هذه الشروط البسيطة.",
      blocks: [
        {
          heading: "الطلبات",
          paragraphs: [
            "يُعتبر الطلب مؤكداً عندما نتواصل معكِ أو تظهر حالته «تم التأكيد» في صفحة التتبّع. يمكننا رفض الطلب أو إلغاؤه (مثلاً إذا كان الاسم غير واضح أو القطعة غير متوفرة) وسنخبركِ بالسبب.",
          ],
        },
        {
          heading: "القطع المخصصة",
          paragraphs: [
            "أنتِ مسؤولة عن التأكد من إملاء الاسم أو النص قبل الطلب. نصنع القطعة تماماً كما كُتبت. راجعي «الإرجاع والاستبدال» لمعرفة ما يحدث إذا أخطأنا نحن.",
          ],
        },
        {
          heading: "الأسعار والدفع",
          paragraphs: [
            "الأسعار بالدولار الأمريكي وتشمل القطعة وعلبة الهدية. يُضاف التوصيل عند إتمام الطلب إلا إذا كان مجانياً. قد تتغير الأسعار والعروض لكن ليس لطلب تم تقديمه. الدفع نقداً عند الاستلام أو إلكترونياً عند توفره.",
          ],
        },
        {
          heading: "الكوبونات ونقاط LIVRE",
          paragraphs: [
            "للكوبونات تاريخ انتهاء ولا يمكن جمعها إلا إذا قلنا ذلك. تُضاف نقاط LIVRE بعد تسليم الطلب وموافقة فريقنا، وليس لها قيمة نقدية ولا تُستعمل إلا على موقعنا. يمكننا إلغاء النقاط أو الكوبونات التي حُصل عليها بالخطأ أو بسوء الاستعمال.",
          ],
        },
        {
          heading: "المواد",
          paragraphs: ["القطع من ستانلس ستيل: ذهبي أو فضي أو عادي، وبطلاء ذهب أو فضة مزدوج ليدوم أكثر. قد تبدو الألوان في الصور مختلفة قليلاً على شاشتكِ."],
        },
        {
          heading: "التواصل",
          paragraphs: ["أي سؤال عن هذه الشروط؟ راسلينا على واتساب أو إنستغرام."],
        },
      ],
    },
  },
};

export type Faq = { q: string; a: string };
export const faq: Record<Lang, { title: string; intro: string; items: Faq[] }> = {
  en: {
    title: "Frequently asked questions",
    intro: "Quick answers about sizes, materials, care, delivery, points and the gift box.",
    items: [
      { q: "How do I choose my chain length?", a: "Chains come in 35, 40, 45, 50 and 55 cm. 40 cm sits at the base of the neck, 45 cm is the most popular and falls just below the collarbone, 50 to 55 cm hangs lower. Every name necklace has a 5 cm extender. Open “Size guide” on the product page for details." },
      { q: "What size is the pendant?", a: "A name pendant is about 1.5 cm tall for capital letters; the width depends on the name. Coin pendants are 2 cm. Names up to 10 letters work well." },
      { q: "What are the pieces made of?", a: "Stainless steel in gold, silver or plain steel. Double Gold and Double Silver Stainless Steel have a double layer for longer wear. All pieces are hypoallergenic and water resistant." },
      { q: "How do I care for my jewelry?", a: "Put it on after perfume and lotion, take it off before swimming or sport when you can, wipe it with a soft dry cloth, and keep it in its box. This keeps the plating bright for much longer." },
      { q: "Can I write my name in Arabic?", a: "Yes. Type the name in Arabic and choose one of the Arabic fonts. You see a live preview before you order." },
      { q: "How long does delivery take?", a: "We design and handmake your piece in 3 to 4 days, then deliver it in 2 days in Tripoli (a little longer elsewhere in Lebanon). Delivery is $4, free over $50 and free on your first order." },
      { q: "How can I pay?", a: "Cash on delivery, Whish, or Visa / Mastercard when online payment is switched on. We never see your card details." },
      { q: "How do LIVRE Points work?", a: "For every $15 you spend you earn 10 points. After your order is delivered, our team approves the points and sends you a message with a thank-you coupon valid for 20 days. Every 10 points are worth $1 off your next order, and each review you write earns 1 point." },
      { q: "Is there a gift box?", a: "Yes, every order comes in a LIVRE gift box at no extra cost. You can add a short gift note at checkout." },
      { q: "Can I return a personalized piece?", a: "Personalized pieces are made only for you, so they cannot be returned unless damaged or made with our mistake. Read “Returns & exchanges” for the details." },
      { q: "Can you make a custom charm or a design I drew?", a: "Yes! Open the Charms page, pick from 290+ shapes and letters or upload a photo of your idea, and send it to us. We reply on WhatsApp with the price." },
    ],
  },
  ar: {
    title: "الأسئلة الشائعة",
    intro: "إجابات سريعة عن المقاسات والمواد والعناية والتوصيل والنقاط وعلبة الهدية.",
    items: [
      { q: "كيف أختار طول السلسلة؟", a: "السلاسل بأطوال 35 و40 و45 و50 و55 سم. 40 سم عند أسفل الرقبة، و45 سم الأكثر طلباً وتقع تحت عظمة الترقوة مباشرة، و50 إلى 55 سم أطول. لكل عقد اسم وصلة تمديد 5 سم. افتحي «دليل المقاسات» في صفحة المنتج للتفاصيل." },
      { q: "ما حجم القلادة؟", a: "قلادة الاسم بارتفاع حوالي 1.5 سم للأحرف الكبيرة، والعرض حسب الاسم. قلادات العملة 2 سم. الأسماء حتى 10 أحرف تعمل بشكل جيد." },
      { q: "مم تُصنع القطع؟", a: "ستانلس ستيل ذهبي أو فضي أو عادي. الستانلس بطلاء الذهب أو الفضة المزدوج له طبقة مضاعفة لتدوم أكثر. كل القطع لا تسبب الحساسية ومقاومة للماء." },
      { q: "كيف أعتني بمجوهراتي؟", a: "ضعيها بعد العطر والكريم، وانزعيها قبل السباحة أو الرياضة قدر الإمكان، وامسحيها بقطعة قماش ناعمة جافة، واحفظيها في علبتها. هكذا يبقى الطلاء لامعاً لوقت أطول." },
      { q: "هل يمكن كتابة اسمي بالعربية؟", a: "نعم. اكتبي الاسم بالعربية واختاري أحد الخطوط العربية. سترين معاينة مباشرة قبل الطلب." },
      { q: "كم يستغرق التوصيل؟", a: "نصمّم قطعتكِ ونصنعها يدوياً خلال 3 إلى 4 أيام، ثم تصلكِ خلال يومين في طرابلس (وأكثر بقليل في باقي لبنان). التوصيل 4$، ومجاني فوق 50$ ومجاني لطلبكِ الأول." },
      { q: "كيف أدفع؟", a: "الدفع عند الاستلام، أو Whish، أو فيزا / ماستركارد عند تفعيل الدفع الإلكتروني. لا نرى بيانات بطاقتكِ أبداً." },
      { q: "كيف تعمل نقاط LIVRE؟", a: "مقابل كل 15$ تدفعينها تربحين 10 نقاط. بعد تسليم طلبكِ يوافق فريقنا على النقاط ويرسل لكِ رسالة شكر مع كوبون صالح 20 يوماً. كل 10 نقاط تساوي خصم 1$ على طلبكِ القادم، وكل تقييم تكتبينه يمنحكِ نقطة واحدة." },
      { q: "هل توجد علبة هدية؟", a: "نعم، كل طلب يصل في علبة هدية LIVRE دون أي تكلفة إضافية. ويمكنكِ إضافة بطاقة إهداء قصيرة عند إتمام الطلب." },
      { q: "هل يمكن إرجاع قطعة مخصصة؟", a: "القطع المخصصة تُصنع لكِ وحدكِ فلا تُرجع إلا إذا كانت تالفة أو بخطأ منّا. اقرئي «الإرجاع والاستبدال» للتفاصيل." },
      { q: "هل تصنعون تشارم خاص أو تصميماً رسمته؟", a: "نعم! افتحي صفحة التشارمز واختاري من أكثر من 290 شكلاً وحرفاً أو ارفعي صورة فكرتكِ وأرسليها لنا. نردّ عليكِ على واتساب مع السعر." },
    ],
  },
};

export const about: Record<Lang, { title: string; intro: string; blocks: Block[] }> = {
  en: {
    title: "Our story",
    intro: "A Lebanese jewelry brand that turns your name, and a small piece of our history, into something you wear every day.",
    blocks: [
      {
        heading: "The 1975 Lira",
        paragraphs: [
          "Before everything changed, a single Lebanese Lira coin carried a cedar on one side and a promise on the other. The 1975 Lira is the heart of LIVRE: the coin our grandparents held, reborn as jewelry in gold and silver.",
        ],
      },
      {
        heading: "Your name, handcrafted",
        paragraphs: [
          "We cut every name in flowing script, in English or Arabic, and check each piece by hand before it leaves Lebanon's workshop for your door. Nothing is mass produced: if it says Maya, it was made for Maya.",
        ],
      },
      {
        heading: "Why the cedar",
        paragraphs: ["The cedar is how we remember home. It is on our logo and in every box, a small reminder that what we make is rooted somewhere."],
      },
    ],
  },
  ar: {
    title: "قصتنا",
    intro: "علامة مجوهرات لبنانية تحوّل اسمكِ، وقطعة صغيرة من تاريخنا، إلى شيء ترتدينه كل يوم.",
    blocks: [
      {
        heading: "ليرة 1975",
        paragraphs: [
          "قبل أن يتغيّر كل شيء، كانت ليرة لبنانية واحدة تحمل أرزة على وجه ووعداً على الآخر. ليرة 1975 هي قلب LIVRE: العملة التي حملها أجدادنا، وُلدت من جديد مجوهرات بالذهب والفضة.",
        ],
      },
      {
        heading: "اسمكِ بصناعة يدوية",
        paragraphs: [
          "نقصّ كل اسم بخط انسيابي، بالإنكليزية أو العربية، ونفحص كل قطعة يدوياً قبل أن تغادر الورشة إلى بابكِ. لا شيء يُصنع بالجملة: إن كُتب «مايا» فقد صُنعت لمايا.",
        ],
      },
      {
        heading: "لماذا الأرزة",
        paragraphs: ["الأرزة هي طريقتنا لنتذكّر الوطن. هي على شعارنا وفي كل علبة، تذكير صغير بأن ما نصنعه له جذور."],
      },
    ],
  },
};

/** Set to false once Nour has reviewed the policy and story pages. */
export const showDraftNotice = true;
