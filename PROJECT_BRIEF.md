# PROJECT BRIEF — LIVRE

> This is the master brief for the AI coding agent (Claude inside Antigravity).
> Read this whole file before writing any code. Follow the phases in order.
> When something here is marked **[CONFIRM]**, ask the owner before implementing it.

---

## 1. What we are building

An online jewelry & accessories store for Lebanon, focused on **personalized name jewelry** (name necklaces, bracelets, rings, initials, letters, charms) plus a signature product line built around the **old Lebanese 1-Lira coin** ("Livre").

The business today runs on 5 separate Instagram pages, each handled by one employee with her own phone number. Customers get lost, data is never saved, and the owner (Nour) can't see who sold what. **This website replaces that chaos with ONE store**, while still tracking which employee brought each customer and each order.

### Goals (in priority order)
1. Customers can browse a large catalog (500+ products, growing) and order easily from mobile.
2. Customers can **type their name and see a live preview** before buying — this is the core selling feature.
3. Every order and every customer is saved in a proper database (no more lost data).
4. Every order is **attributed to the employee** who brought the customer — without adding friction to checkout.
5. Owner controls discounts, coupons, countdown timers, and banners from an admin panel.
6. Strong Lebanese identity: cedar, the old Lira, Lebanese emotion — premium but playful ("girly/TikTok" feel for the target audience).

### Out of scope for v1
- Full financial management (profit/loss, per-employee bonuses or commissions, supplier costs, stock accounting). Do NOT build it. Only the simple sales summary in section 8.5.
- Bulk WhatsApp/SMS marketing. Only store a `marketing_opt_in` flag on customers.
- Online card payments.

---

## 2. Brand & design

- **Name:** **LIVRE** ("1 Livre" = the old Lebanese 1-Lira coin). Domain: **`livrelb.com`**.
- **Source of the identity:** the 1975 Banque du Liban 1-Livre nickel coin (reference photo: `assets/lira-coin-1975.jpg`).
  - Front: the cedar, "مصرف لبنان" in Arabic on top, "BANQUE DU LIBAN" around the bottom, two stars, year 1975 · ١٩٧٥, beaded rim.
  - Back: laurel wreath, "١ ليرة", "LIVRE", big "1".
- **Logo (original drawing inspired by the coin, not a copy of it):**
  - Primary mark: a round coin badge with a beaded rim; a simplified cedar in **cedar green** in the center; the wordmark **LIVRE** under it in wide serif capitals like the coin lettering, in **gold**.
  - Secondary mark (favicon, packaging, stickers): the "1" framed by a half laurel wreath in gold.
  - Arabic lockup: "ليرة" next to "LIVRE" for Arabic pages.
  - Must work in one color (gold on white, cedar on ivory) and at 32px.
- **Tagline ideas:** "Your story, in a Livre" · "Made in Lebanon, worn with love" **[CONFIRM]**
- **Theme: LIGHT, soft and clean** (like a jewelry boutique, not a dark "tech/AI" site). Warm white background, dark soft text, the jewelry photos are the hero. Gold and cedar green are small accents only.
  - Tokens: `--bg #FFFFFF`, `--surface #FAF7F2` (ivory sections), `--beige #EFE6D8`, `--blush #F6E9E6` (soft girly touch), `--text #2B2622`, `--muted #7A7068`, `--line #E8E1D8`, `--gold #B08D57` (buttons, prices, small details), `--cedar #2F5D3A` (announcement bar, badges, logo cedar).
  - Black only for small text, never as a page or section background.
  - Style rules: lots of white space, thin 1px lines, soft rounded corners (8–12px), big product photos on white/ivory, no neon, no glow, no heavy gradients, no dark glassmorphism.
- **Typography (easy on the eyes):** headings in an elegant thin serif (Cormorant Garamond), body in a clean light sans (Jost). Arabic: headings Noto Naskh Arabic, body IBM Plex Sans Arabic. Body text 16px, line-height 1.6, text color `--text` (not pure black).
- **Languages:** English + Arabic (full RTL support). English default.
- **Mobile first.** Most traffic comes from Instagram on phones.
- **Reference site for UX inspiration:** onecklace.com — take structure and ideas only, never copy its assets, text, or design.

### Signature element: 3D Lebanese Lira coin
- A 3D model of the old **1 Lebanese Lira** coin, built with **React Three Fiber (Three.js)**.
- On page load: an intro animation (~2 seconds) — the coin spins fast left/right and shines (metallic reflection / light sweep).
- While scrolling the homepage: the coin stays in the background and drifts left/right with scroll, slowly rotating.
- Must be lightweight: lazy-load, cap pixel ratio, pause when off-screen, and show a static image fallback on low-end devices and when `prefers-reduced-motion` is on.
- Coin textures (normal/bump map for the relief) are made from the real photo of both faces in `assets/lira-coin-1975.jpg`. Metallic material: silver nickel by default, with a gold variant for the brand version.

---

## 3. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| 3D | React Three Fiber + drei |
| Database / Auth / Storage | Supabase (Postgres, paid plan) |
| Hosting | Vercel (Pro — commercial use) |
| Repo | GitHub |
| Payments | Cash on Delivery + Whish (manual confirmation in v1) |
| i18n | next-intl (en / ar, RTL) |

Frontend + backend both live in the Next.js app on Vercel (API routes / server actions). Database, auth and image storage live on Supabase. **Render is not needed** — don't use it.
Estimated monthly cost: Vercel Pro ~$20 + Supabase Pro ~$25 (+ domain ~$10–15/year). Start Supabase in the Frankfurt region (closest to Lebanon).

---

## 4. Users & roles

| Role | Who | Can do |
|---|---|---|
| `owner` | Nour (1 account) | Everything (max permissions) |
| `staff` | Employees (5 now, more later) | Access to the whole admin by default; the owner can turn off any permission per employee |
| `customer` | Shoppers | Browse, order, see their own orders |

- The owner adds a new employee at any time from the admin panel: name, phone, unique code (e.g. `amal`). No code changes needed.
- **Granular permissions per employee**, toggled by the owner: products (add / edit / delete), orders (view / edit status / cancel), customers (view / export), coupons & promotions, reviews, pages & seasons, sales summary, settings. Managing staff is owner-only.
- Staff log in with **phone number + password/OTP**. No email anywhere in the system.
- Every product, order edit, and coupon stores **who created/changed it** (`created_by`, `updated_by`).

---

## 5. Employee attribution (critical — must not slow down the sale)

Example: customer talks to employee Amal on Instagram → Amal sends her the site link → customer buys → order must count for Amal.

Implement all three layers:
1. **Personal link:** `livrelb.com/r/amal` (or any URL with `?ref=amal`). The ref is stored in a long-lived cookie **and** permanently on the customer record as soon as she enters her phone number. **Attribution never expires**: once a customer is linked to Amal, all her future orders count for Amal. Staff panel has a "copy my link" button and a "share this product" button that generates the product URL with her ref.
2. **Personal code:** every employee has her own code (e.g. `AMAL10`). Using it attributes the order to her.
3. **Fallback at checkout:** optional field "Who helped you?" (dropdown of active employees). Optional, never required.

Rules:
- The customer's first employee is saved forever on `customers.referred_by_staff_id`.
- Each order stores `staff_id` + `attribution_source` (link / code / checkout / customer_history).
- Priority on a single order: code > checkout field > customer's saved employee > ref cookie.
- Only the owner can manually reassign a customer or an order to another employee (logged).

---

## 6. Customer accounts

- Sign up / login with **phone number + name only. Never ask for email** (Lebanese customers forget emails). Verification by OTP (WhatsApp preferred over SMS in Lebanon) **[CONFIRM provider]**.
- Phone number is **required** on every order.
- Checkout must work without a separate sign-up step: phone + name at checkout automatically creates the account.
- **First order = free delivery** (checked by phone number).
- Fields: name, phone (unique, Lebanese format +961), area/city, address, optional birthday, `marketing_opt_in`.

---

## 7. Database (Supabase Postgres)

Design for 500+ products, tens of thousands of customers and orders. Use migrations, UUID keys, `created_at`/`updated_at`, and Row Level Security on every table.

Core tables:
- `staff` — id, name, phone, ref_code (unique), role (owner/staff), is_active
- `categories` — id, name_en, name_ar, slug, parent_id, sort_order, image
- `products` — id, slug, name_en/ar, description_en/ar, base_price, compare_at_price, is_personalizable, is_featured, is_best_seller, is_new, status, created_by
- `product_media` — product_id, url, type (image/video), sort_order (3–7 images + optional video)
- `product_categories` — many-to-many
- `materials` — Silver, Gold, Rose Gold, 14K Gold, 14K White Gold (+ price modifier)
- `fonts` — id, display_name (our own names, e.g. "Tokyo"), font_file, preview_image
- `product_options` — sizes (e.g. 35/40/45/50/55 cm), attachment type (one ring center / two rings sides), with price modifiers
- `customers` — see section 6 + referred_by_staff_id
- `orders` — id, number, customer_id, staff_id (attribution), attribution_source (coupon/checkout/ref), status, subtotal, discount, delivery_fee, total, payment_method, address snapshot, notes
- `order_items` — order_id, product_id, material, font, custom_text, size, attachment, unit_price, qty
- `order_adjustments` — order_id, type (gift, discount_percent, half_off, buy_one_get_one, free_delivery, extra_delivery, other), value, note, created_by
- `coupons` — code, type, value, min_order, starts_at, ends_at, max_uses, staff_id (optional), is_active
- `staff_permissions` — staff_id, permission key, allowed (toggled by owner)
- `promotions` — homepage banners/headlines, code, **starts_at + ends_at** (shown as a live countdown), editable from admin
- `collections` — special pages: Free Delivery, Gifts, and seasons (Valentine's, Mother's Day, Father's Day, Christmas, Ramadan, Eid, ...) with start/end dates, banner, linked products, linked code
- `daily_summaries` / `manual_entries` — see 8.5 (simple sales summary)
- `imported_orders` — old orders imported from the delivery company (CSV/Excel), kept separate from website orders
- `reviews` — product_id, customer name, rating, text, photo, is_approved
- `site_settings` — free shipping threshold (**$50**), first-order free delivery (on), delivery fee, delivery time text, shipping info text, WhatsApp number, announcement bar messages

---

## 8. Pages & sections

### 8.1 Homepage (top to bottom)
1. **Announcement bar** (auto-scrolling marquee, texts from admin): "Design your name necklace" · "Free shipping over $50" · "Excellent ★★★★★ quality — loved by our customers".
2. **Hero**: background video + image carousel sliding left/right. Big headline "25% OFF your first order", sub-line "15% off any order with code ___", and a **countdown timer** (end time set in admin).
   - **Mini name preview** inside the hero: customer types a name → sees it rendered in script, choose Gold / Silver / Rose, and ring style (one ring center or two rings on the sides). Small and simple.
3. **Lira collection section**: the 3D coin + the Lira necklace/bracelet products.
4. **Shop by style** (category cards): Bracelets, Necklaces, Name Necklaces, Rings, Men's Necklaces, Initial Necklaces, Letter Necklaces, Gifts, Charms, Patriotic (Lebanese) Necklaces & Accessories, Women's Earrings, Christmas, New Arrivals.
5. **Best sellers** (product carousel).
6. **How it works**: 01 Personalize it — choose your design and add the names, dates or words that mean the most to you. 02 We craft it — each piece is made to order and checked by hand before it leaves us. 03 Delivered to you — free delivery on your first order and on orders over $50, delivered in 2–7 days.
6b. **Current season banner** (e.g. Valentine's, Mother's Day, Christmas, Ramadan, Eid) linking to its collection page, with its code and countdown — only shown while a season is active.
7. **Loved by customers** (reviews).
8. **New arrivals**.
9. **Why us**: "Why Livre — since 2020": Handcrafted with care · Personalized for your story · Quality materials · Trusted by Lebanese.
10. **Trust bar**: Free shipping · Secure payment · Best price · Sales all the time.
11. **Footer**: page links, WhatsApp, Instagram, policies.

### 8.2 Category page (example: Name Necklaces)
- Colored promo bar under the navbar: "Your story, your jewelry — 15% off with code STORY15" (from admin).
- Top info strip: Free shipping · Handcrafted · Secure payment · Delivery in 2–7 days.
- Breadcrumbs: Home › Necklaces › Name Necklaces.
- Title + filters (font style, material, price, new/sale).
- Product cards: image, name, old/new price. Optional: type a name once on the page and all cards preview it.

### 8.3 Product page
1. Gallery: 3–7 images + optional video.
2. Name, old price (struck through) and current price.
3. **Material** color swatches: Silver, Gold, Rose Gold, 14K Gold, 14K White Gold.
4. **Font** picker (our custom font names).
5. **"Please write your name / word"** input → **live preview** rendered in the selected font and material color.
6. **Attachment**: one ring center or two rings on the sides (necklace or bracelet).
7. **Chain size**: 35 / 40 / 45 / 50 / 55 cm.
8. Add to cart.
9. "Have a question? Talk to us on WhatsApp" button.
10. Description (short, with "Read more").
11. Accordion: Product design · Size · Material · Shipping information (shipping text comes from admin settings).
12. You may also like (similar products).
13. Recently viewed.
14. Customer reviews for this product.

### 8.3b Special collection pages
- `/free-delivery`, `/gifts`, and one page per season (`/valentines`, `/mothers-day`, `/fathers-day`, `/christmas`, `/ramadan`, `/eid`, ...).
- Created and scheduled from the admin: title, banner, products, discount code, start and end time.
- The active code and its **countdown (time left until the end)** show as soon as the visitor enters the site (announcement bar + hero). Codes change often, so nothing is hardcoded.

### 8.4 Cart & checkout
- Name, phone, area, address, notes, coupon code, optional "Who helped you?".
- Payment: Cash on Delivery / Whish.
- Order confirmation page + WhatsApp message link with the order number.

### 8.5 Admin panel (`/admin`)
- **Dashboard (keep it simple):**
  - Top card **"Today"** that starts from 0 every day: number of orders today and total sales today. It does NOT show profit or loss (supplies, supplier stock etc. are not tracked, so a profit number would always look like a loss).
  - Sales this week / month, orders & customers **per employee**.
  - **Manual entry**: a simple form for Nour to add a day's sales/orders that happened outside the website.
  - **Import old orders** from the delivery company (upload CSV/Excel, map columns, preview, then save). Phone scanning of paper receipts can come later.
  - No bonuses, commissions or per-employee pay in the system.
- Products: create/edit, media upload, categories, materials, fonts, options, bulk actions.
- Orders: list, filters (status, employee, date), change status, add adjustments.
- Customers: list, search by phone, order history, source employee.
- Discounts: coupons, homepage headline, countdown timer (start/end time), promo bar texts.
- Collections & seasons: create/schedule the special pages (8.3b).
- Reviews: approve/hide.
- Staff (owner only): add, edit, disable employees, and toggle each employee's permissions.
- Settings (owner only): shipping, WhatsApp number, announcement bar.

### 8.6 Staff panel
Staff use the same admin, plus a "My sales" view and their personal link/coupon with copy and share buttons.

---

## 9. SEO & ads (build in from day one)
- Server-rendered pages, fast on mobile (Lighthouse mobile ≥ 90 target).
- Product structured data (JSON-LD Product/Offer/Review), sitemap.xml, robots.txt, hreflang en/ar, Open Graph images.
- Meta Pixel + Conversions API events (ViewContent, AddToCart, InitiateCheckout, Purchase) and Google Analytics 4.
- Google Merchant Center product feed later.

---

## 10. Build phases (do them in order, stop after each for review)
> Update: the project restarted in the `livrelb` repo (github.com/Moemenakari/livrelb). The storefront look, the live name preview and the real 3D Lira coin are built FIRST (see RESTART_PROMPT.md), before the database. Onecklace.com is the quality/UX reference.

1. **Setup**: Next.js, Tailwind, i18n, Supabase connection, design tokens, base layout (navbar, footer, announcement bar).
2. **Database**: migrations for all tables + RLS + seed data (few categories, 10 sample products).
3. **Catalog**: homepage sections (with static placeholders), category page, product page with live name preview.
4. **Cart & checkout**: phone-based account, orders, attribution logic.
5. **Admin + staff panel**.
6. **3D Lira coin** + hero video/carousel polish.
7. **SEO, analytics, performance**, then deploy to Vercel on the real domain.

---

## 11. Rules for the agent
- Ask before any destructive database change or when a requirement is unclear.
- Every schema change goes through a migration file in the repo.
- Never put secrets in code; use environment variables.
- Small commits with clear messages; one feature per branch.
- Reusable components; no copied code or assets from other stores.
- All UI text goes through i18n (no hardcoded strings), and every page must work in RTL.
- Test on a 375px wide screen before calling a feature done.
