# LIVRE admin guide / دليل لوحة التحكم

For each part of the storefront: where it is controlled in the admin, and how.
لكل جزء من المتجر: أين تتحكمين فيه من لوحة الإدارة، وكيف.

---

## Home page / الصفحة الرئيسية

Admin → **Home page** (`/admin/home`). One page, one **Save home page** button at the bottom. Saved changes show in the shop right away.
لوحة الإدارة ← **Home page**. صفحة واحدة وزر **Save home page** بالأسفل. التغييرات تظهر في المتجر مباشرة.

> First time only: the database needs the update `supabase/migrations/20261007100000_home_page_controls.sql` (Supabase → SQL Editor → paste → Run). Until then the page says so, and the shop keeps working with its old homepage.
> مرة واحدة فقط: لازم تشغيل ملف التحديث أعلاه في Supabase → SQL Editor. قبلها الصفحة تخبرك بذلك والمتجر يعمل كالمعتاد.

### 1. Lira Collection products / منتجات مجموعة الليرة

- **Add a product…** picks a product from the list. Up to **8**.
- The arrows set the order; **×** removes one. The shop shows them in this order.
- Nothing picked = the shop shows every product of the *Lira Collection* category.
- Section title, text and button link: see "Section texts" below.

- اختاري منتجاً من **Add a product…** (حتى **8**)، والأسهم للترتيب و **×** للحذف.
- إذا لم تختاري شيئاً يظهر كل منتجات فئة *Lira Collection*.

### 2. Shop by style tiles / مربعات "تسوّقي حسب الستايل"

- Tick a category to **show** it on the homepage. Untick to hide it.
- The arrows set the order. The **first** tile is the big one.
  Recommended order: Name Necklaces, Lira Collection, 500 & 250 Lira Collection, Bracelets, Rings, Earrings, Gifts, Men's Jewelry.
- **Add photo** uploads the tile photo (JPG/PNG/WebP). Without a photo the tile shows the drawing.
- The new category **500 & 250 Lira Collection** is created by the database update. Put products in it from the product editor (Categories).

- علّمي الفئة لتظهر، والأسهم للترتيب، وأول مربع هو الكبير. **Add photo** لرفع صورة المربع، وبدونها يظهر الرسم.

### 3. Best sellers order / ترتيب الأكثر مبيعاً

- A product is a best seller when its **Best seller badge** is on (product editor).
- Here you only set the **order** with the arrows. The first 8 show on the homepage.

### 4. Section texts / نصوص الأقسام

Open a section and type the title / line / button link in English and Arabic. **Empty = the default text.** Untick **Show this section** to hide the whole section.

| Section | What you can change |
|---|---|
| Lira Collection | title, text, button link |
| Shop by style | title, line |
| Best sellers | title, line, button link |
| How it works | title (the three steps' texts stay as they are) |
| New arrivals | title, line, button link (products with the **New** badge, newest first) |
| Try your picture | title, line, **order button link** |
| Create something personal | title, text, button link |

**Try your picture → order button:** create a product "Photo pendant" (with its price) in Products, then write its page here, e.g. `/product/photo-pendant`. Until then the button opens the Gifts category.
**زر "اطلبي ميدالية الصورة":** أنشئي منتج "Photo pendant" بسعره من Products، ثم اكتبي رابطه هنا مثل `/product/photo-pendant`.

### Things that are not on this page / أشياء في مكان آخر

- The first screen (photos / videos / offer headline / countdown): **Promotions**.
- The promo code in the bar: **Promotions**.
- Reviews on the homepage: **Reviews** (approved ones show).
- Deposit percent for the "cash on delivery" orders (the homepage chip says it): the database default is 50 (a Settings field comes with the checkout work).

---

## Shop menu order / ترتيب قائمة الموقع

Admin → **Home page** → **Shop menu order**. The arrows set the order of the header and the phone menu (the categories and the **Charms** page). Needs the Phase 1 database update.
لوحة الإدارة ← **Home page** ← **Shop menu order**: الأسهم ترتّب القائمة (الفئات وصفحة Charms).

Agreed order: Name Necklaces, Charms, Necklaces, Lira Collection, 500 & 250 Lira, Bracelets, Men's Jewelry, Rings, Earrings, Gifts, Best Sellers, New.

## Charms / التشارمز

- **Prices:** Settings → **Charms page**: price of one charm ($9.50 by default) and the most charms on a chain. The price of the **chain** is the product **“Charm necklace or bracelet”** in Products ($14 in gold and silver; its necklace and bracelet sizes are there too). A charm photo can have its own price.
- **Charm photos (up to ~1000):** Admin → **Charm photos** → **Import charm photos (bulk)**. Transparent PNG, square 800×800, the charm centered. File name: **family_metal_code.png**, e.g. `turkish_gold_heart-01.png` (family = `charms` or `turkish`, metal = `gold` or `silver`). The name is made from the code, the price is the standard one; edit them below. Importing the same file name again only replaces the photo. The page warns about files that aren't square or have a background.
- The customer adds her charms to the **bag** like any piece (chain + each charm, priced by the server).

## Name pieces, letters, numbers and zodiac / الأسماء والأحرف والأرقام والأبراج

The product page offers **Name, Letter, Number, Zodiac sign** (letter pieces offer the last three). Prices per metal are in the product editor. The category pages of name categories show a piece **once for each font** it allows (turn fonts off in the product to hide them).

## Payment and checkout / الدفع

Settings → **Payment at checkout** (needs the Phase 1 database update):

- **Full payment by transfer** (Whish / OMT / Suyool), **Deposit now + rest on delivery** (percent in the same card, 50 by default), **Order on WhatsApp** button. Plain cash on delivery is gone.
- **Send the money to:** your number (and the name on the account): shown to the customer after she orders.
- **Checkout needs a login:** she signs in with Google first (only works when Google sign-in is on in Supabase).
- Delivery fees: Admin → **Delivery & times** (Tripoli $2 and the rest of Lebanon $5 by default; free delivery rules unchanged).

After a transfer order: the order is **New** (awaiting payment). She taps “I sent the transfer” (and may add a receipt picture). In **Orders → the order → Payment** you see the receipt, check the money in Whish/OMT/Suyool, then press **Confirm the payment**: the order becomes **Confirmed**.

The WhatsApp buttons write to your number, or to the **employee's own number** when the visitor came by that employee's link.

## Phone verification on WhatsApp / تأكيد الهاتف على واتساب

At checkout, after she writes her phone, she can verify it: we send a 6-digit code to her WhatsApp, she types it, and the phone is remembered as hers (never asked again). She gets **LIVRE Points once** (Settings → **Phone verification**, default 10 = $1 off; needs `20261007130000_phone_verification_points.sql`). It never blocks an order: her Google account is already a proof.

It uses Meta's **WhatsApp Cloud API** (about $0.011 per code for Lebanon, no monthly fee). It stays hidden until these 3 values are set on the server (Cloudflare → the Worker → Settings → Variables; locally in `.env.local`):

1. developers.facebook.com → create an app (type Business) → add the **WhatsApp** product.
2. In **WhatsApp Manager**: add the sending number and create an **Authentication** template named `livre_verification_code`, in **English (en)** and in **Arabic (ar)**. Wait for Meta to approve it.
3. **Business settings → System users**: make a permanent token with the permission `whatsapp_business_messaging`.

```
WHATSAPP_TOKEN=<the permanent token>
WHATSAPP_PHONE_NUMBER_ID=<the sending number's id>
WHATSAPP_OTP_TEMPLATE=livre_verification_code
```

## What is not built yet / لم يُبنَ بعد

- Uploading the customer's photo with the order for the **photo pendant** (the preview on the home page works; the order button opens the product you set).
