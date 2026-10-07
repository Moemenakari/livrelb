// Text of the information pages (English). These are simple
// TEMPLATES written for a small Lebanese online jewelry shop: they are
// marked as drafts on the site and must be read and approved by Nour before
// launch. Change the text here, nothing else needs to move.

type Lang = "en";
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
            "Delivery inside Lebanon costs $5 ($2 in Tripoli).",
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
};

/** Set to false once Nour has reviewed the policy and story pages. */
export const showDraftNotice = true;
