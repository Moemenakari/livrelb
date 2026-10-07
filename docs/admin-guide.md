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
  Recommended order: Name Necklaces, Lira Collection, 1500 & 250 Lira Collection, Bracelets, Rings, Earrings, Gifts, Men's Jewelry.
- **Add photo** uploads the tile photo (JPG/PNG/WebP). Without a photo the tile shows the drawing.
- The new category **1500 & 250 Lira Collection** is created by the database update. Put products in it from the product editor (Categories).

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
