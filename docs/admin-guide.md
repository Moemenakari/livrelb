# LIVRE admin guide / دليل لوحة التحكم

For each part of the storefront: where it is controlled in the admin, and how.
لكل جزء من المتجر: أين تتحكمين فيه من لوحة الإدارة، وكيف.

---

## Home page / الصفحة الرئيسية

Admin → **Home page** (`/admin/home`). One page, one **Save home page** button at the bottom. Saved changes show in the shop right away.
لوحة الإدارة ← **Home page**. صفحة واحدة وزر **Save home page** بالأسفل. التغييرات تظهر في المتجر مباشرة.

> First time only: the database needs the update `supabase/migrations/20261009120000_admin_redesign.sql` (Supabase → SQL Editor → paste → Run). It is ONE file for the whole admin update (order of the home sections, deleted orders, automatic points, customer verification, two Admins). Until then everything keeps working; only the new features say so.
> مرة واحدة فقط: لازم تشغيل ملف التحديث أعلاه في Supabase → SQL Editor. هو ملف واحد لكل تحديث الأدمن. قبلها كل شيء يعمل كالمعتاد، والميزات الجديدة فقط تخبرك.

### 0. Page layout / ترتيب أقسام الصفحة

- **Page layout** lists the sections top to bottom, as the shop shows them. The **Hero** and the **Lira Collection** are locked (the 3D coin lives there).
- Every other section has a **number box**: type a number and press Enter to move it there (for example Best sellers last, New arrivals fourth). The arrows also move it. The **eye** hides a section. **Edit the texts** opens its title, line and button.
- The first screen's photos and videos are the **Homepage slides** card above (they used to be in Promotions).
- **Page layout** يعرض الأقسام من فوق لتحت كما يظهرها المتجر. **Hero** و **Lira Collection** مقفلان (الليرة ثلاثية الأبعاد هناك).
- لكل قسم آخر **خانة رقم**: اكتبي الرقم ثم Enter ينتقل القسم إلى هذا المكان. الأسهم تنقله أيضاً، و**العين** تخفيه، و **Edit the texts** يفتح عنوانه ونصه وزره.
- صور وفيديوهات الشاشة الأولى في بطاقة **Homepage slides** أعلاه (كانت في Promotions).

### 1. Lira Collection products / منتجات مجموعة الليرة

- **Add a product…** picks a product from the list. Up to **8**.
- The arrows set the order; **×** removes one. The shop shows them in this order.
- Nothing picked = the shop shows every product of the *Lira Collection* category.
- Section title, text and button link: **Edit the texts** inside the section in Page layout.

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

## Login and orders on WhatsApp / الدخول والطلبات

- **Login:** before she adds a piece to the bag, goes to checkout or places the order, she signs up / logs in with **Google or her email** (a link is sent to her email). We keep her email. Turn this off in Settings → **Checkout** (“Checkout needs an account”).
- **Place order:** the order is saved (it gets its number, you see it in **Orders**) and WhatsApp opens at once with the order written for you (pieces, total, name, phone, area, address) to **your WhatsApp number** (Settings → Contacts), or to the **employee's own number** when she came by that employee's link. Nothing is paid on the site: you confirm and arrange payment in the chat.
- Delivery fees: Admin → **Delivery & times** (Tripoli $2 and the rest of Lebanon $5 by default; free delivery rules unchanged).

## Try your picture / جرّبي صورتك

Her photo is turned into a black-and-white **engraving** inside a round, square or heart pendant, on a necklace (one ring or two) or a keychain. It all happens in her browser; the **Order on WhatsApp** button writes the choices to you, and she sends the photo in the chat.
## Not built (on purpose)

- Payment on the site (transfer / deposit / card) and phone verification by WhatsApp code: removed to keep the shop light; orders are confirmed on WhatsApp.
