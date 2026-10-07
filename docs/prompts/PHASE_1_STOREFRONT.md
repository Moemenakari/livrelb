# LIVRE — Phase 1 prompt (storefront)

Copy everything below into Claude (Antigravity).

```
You are working on LIVRE (livrelb.com), a REAL online jewelry store for Lebanon that is live with real
customers. Read CLAUDE.md, AGENTS.md, PROJECT_BRIEF.md and the Next.js docs in node_modules/next/dist/docs/
before touching code (this Next.js version has breaking changes). Write careful, production-quality
code: small focused components, clear folders, no duplicated logic, every UI string through next-intl
(en + ar, RTL), every price/number/text the owner may change comes from the database/admin — NEVER
hardcoded. Test every screen at 375px width and in Arabic. Ask me before any destructive DB change.
Every schema change = a new migration file. Work on a branch, small commits.

The work has 3 phases. Do ONLY PHASE 1 now, and stop for review after each numbered section.
- PHASE 1: storefront (what the customer sees) — this prompt.
- PHASE 2: admin panel — I will send details later. But in Phase 1, every new thing you build must
  already read from the DB so Phase 2 only adds the editing screens. Where I say "(admin)", create the
  table/column/setting now with good defaults, and add a minimal admin form if it's quick.
- PHASE 3: cleanup (later): remove dead code/files without breaking anything.

General feel: the customer must feel calm and comfortable ("easy on the eyes"): light theme, lots of
white space, soft colors (see PROJECT_BRIEF §2), no clutter, big tap targets on mobile.

==================================================================
1. HOME PAGE  (src/app/[locale]/page.tsx — split it into components under src/components/home/)
==================================================================
The page is too long in one file. Move each section into its own component
(home/lira-section.tsx, home/shop-by-style.tsx, home/best-sellers.tsx, ...).

1.1 LIRA COLLECTION section (after the hero)
- Today it shows products in the "lira-collection" category. Make it fully controlled from admin:
  new table `home_sections` (key, title_en/ar, subtitle_en/ar, is_visible, sort_order, product_ids
  ordered array or a link table `home_section_products(section_key, product_id, sort_order)`).
- Lira section = title, short text, CTA button + up to 8 products picked BY HAND in the admin, in the
  order chosen. Fallback when nothing is picked: products of the lira-collection category.
- Write in docs/admin-guide.md (Arabic + English) how the owner picks these products.

1.2 SHOP BY STYLE (the mosaic is hardcoded in page.tsx — move it to the DB)
- Categories get `show_on_home boolean`, `home_sort int`, `home_image` (admin).
- Order of tiles: Name Necklaces, Lira Collection, **1500 & 250 Lira Collection (NEW category,
  the other coins — add it right BEFORE Bracelets)**, Bracelets, Rings, Earrings, Gifts, Men's Jewelry.
- A tile shows the uploaded category photo; the drawn art is only the fallback.

1.3 BEST SELLERS — keep. Products with is_best_seller = true (admin toggle), ordered by a new
  `best_seller_sort` (admin). Keep the existing bestsellers(...) helper in src/lib/catalog/index.ts.

1.4 HOW IT WORKS (01/02/03) — keep, texts from admin (site content).

1.5 NEW ARRIVALS — keep. is_new flag (admin) + newest first.

1.6 "TRY YOUR PICTURE" section (new, next to the "try your name" mini preview idea)
- Customer uploads a photo → it is shown inside a pendant: round, square or heart (3 buttons),
  photo cropped and centered inside the shape, with a gold/silver metallic rim (reuse
  src/components/preview/metal.tsx gradients). Allow drag to move + pinch/slider to zoom.
- Done 100% in the browser (canvas/SVG clipPath), the photo is NOT uploaded until she orders.
- CTA "Order this photo pendant" → product page of the photo pendant product (admin price).

1.7 "CREATE SOMETHING PERSONAL" section — keep the idea, but replace the payment chips:
  "Pay the way you like": **Whish / OMT / Suyool transfer** and **50% deposit, rest on delivery**,
  plus "Order on WhatsApp". No more plain "Cash on delivery" (see section 6).

==================================================================
2. HEADER + MOBILE MENU (src/components/layout/navbar.tsx, mobile-menu.tsx)
==================================================================
- Header icons on the end side: search, **account (person icon, always visible on mobile too)**, cart.
- Hamburger drawer: ALL menu links must fit on ONE phone screen without scrolling, even on small
  phones (iPhone SE 375x667). Make link text smaller (text-sm, py-2.5 instead of py-4), tighter
  dividers; keep tap targets ≥ 40px. Bottom block (account/WhatsApp/language) stays compact.
- Menu order: Name Necklaces, Charms, Necklaces, Lira Collection, 1500 & 250 Lira, Bracelets,
  Men's Jewelry, Rings, Earrings, Gifts, Best Sellers, New. (Order from DB `nav_sort`, admin.)

==================================================================
3. CHARMS PAGE (src/app/[locale]/charms, src/components/charms/charm-builder.tsx)
==================================================================
Current problems: tapping charms keeps adding without clear feedback, the photo tab is confusing,
prices are wrong.
3.1 Products & filters: two families — "Charms" and "Turkish Charms"; metal filter Silver / Gold.
  Filters as chips at the top.
3.2 Behaviour: tapping a charm adds it to the chain preview; tapping it again on the chain removes it;
  a small "×1 / ×2" counter on each charm tile when picked more than once. "Clear all" button in RED
  so it's obvious it deletes everything. Show a max (from settings).
3.3 Pricing (ALL from admin settings, these are defaults):
  - Base chain (necklace/bracelet) = $14.
  - Each charm = +$9.50 (one price per charm by default, a charm can override it).
  - Delivery is NOT inside the charm price; it's added at the end of the invoice (section 6).
  - Show a live breakdown: Chain $14 + 3 charms × $9.50 = $42.50 (+ delivery at checkout).
3.4 Remove the photo-upload tab from this page. Personalised photo charms go to the new
  "Try your picture" flow (1.6) and the photo pendant product.
3.5 Name / initial / number / zodiac charms: also offered here as charms (type a letter or a name,
  pick the font), rendered with the existing NamePreview.
3.6 Ordering: the charm design goes to the CART like any product (not a separate WhatsApp form),
  so it follows the same login + checkout + payment flow (sections 5–6). Keep a secondary
  "Ask on WhatsApp" link that sends the summary to the main WhatsApp number (or to the employee's
  number if the visitor came by an employee link — reuse the ref/attribution logic).
3.7 Charm photos: I have ~1000 real charm photos. Build an admin bulk upload (Phase 2 can polish
  the UI, but build the import now):
  - Expected file: transparent PNG (background removed), square 800×800, charm centered, filename =
    `family_metal_code.png` (e.g. `turkish_gold_heart-01.png`).
  - The importer reads the filename → creates/updates the charm item (family, metal, code), uploads
    to R2 (src/lib/storage/r2.ts), name and price editable after.
  - On the chain, draw the PNG with its real shape (no square box, no clipping to a square): use
    the alpha channel, keep aspect ratio, `preserveAspectRatio="xMidYMid meet"`.

==================================================================
4. CATEGORY PAGES (necklaces, name necklaces, bracelets, rings, earrings, gifts, ...)
   src/app/[locale]/category/[slug]/page.tsx, src/components/category/category-browser.tsx
==================================================================
4.1 Layout: the title is small and at the very top, the products start IMMEDIATELY below (no big
  hero/description above the grid on mobile — move the description to the bottom). Filters as a
  sticky compact bar at the top (font style, material, price, new/sale).
4.2 Name products shown ONCE PER FONT: in name categories, a personalizable product is shown as one
  card per allowed font (we have 15 fonts in src/components/preview/script-fonts.ts):
  "Arabic Name Necklace — Italic", "— Bold", "— French", ... Each card previews the name in that font,
  links to the product page with that font preselected (?font=key). Name per font comes from the
  font's display name (admin). A product can disable some fonts (already supported: allowed fonts).
4.3 Name preview bug on phones: in the name preview the gold outline/rim shows but the inside of the
  letters is transparent. Check src/components/preview/name-preview.tsx, metal.tsx, use-bevel.ts on iOS
  Safari + Android Chrome (gradient ids must be unique per instance, check `fill="url(#id)"` inside
  <defs> on Safari, check clipPath/mask). Fix so the letters are solid metal on every phone.
4.4 Personalisation types on the product page: name, single letter (initial), single number,
  zodiac sign. The customer picks the type, then types/chooses. The letter/name preview must use the
  chosen font. Also put 3–4 of these products inside Necklaces, Rings, Bracelets categories.
4.5 Prices per material: Silver / Gold / Double Gold (and the other materials) from product_materials
  (admin). Per product toggle "free delivery" (exists: free_delivery column) shown as a badge.
4.6 Savings shown in RED so the customer feels she won: "You save $7", "-16%", "+20 LIVRE points".
  On product card, product page, cart and checkout.

==================================================================
5. ACCOUNT, LOGIN & VERIFICATION
==================================================================
5.1 Adding to cart is open to everyone, but CHECKOUT requires an account.
5.2 Sign in / sign up = "Continue with Google" (already exists: src/components/checkout/google-button.tsx).
  We keep her email (to know the real person) — update the brief rule "no email".
5.3 Then she must verify her PHONE (the important one in Lebanon) by WhatsApp OTP. Before coding,
  research and propose the provider for Lebanon (WhatsApp Cloud API with an authentication template,
  Twilio Verify WhatsApp, or similar) with monthly cost, and wait for my OK. Verified phone is stored
  on the customer; she never verifies again on this device/account.
  Reward: verifying the phone gives 100 LIVRE points ($1 off) — amount from admin.
  At least ONE of (email via Google, phone) must be verified to order; phone is preferred.
5.4 After login, checkout is prefilled: name, phone, area, address from her account.
5.5 "My account" page (today /account just redirects to /track — replace it): three tabs/segments
  at the top she can swipe between: **Last order** · **My points** · **Track my orders**.
5.6 Order tracking: after "Thank you", show a "Track my order" button that opens tracking by ORDER
  NUMBER only (she is logged in) — don't ask her phone again.

==================================================================
6. CHECKOUT, DELIVERY & PAYMENT  (src/components/checkout/*, src/lib/checkout/*, src/lib/payments/*)
==================================================================
Context: in Lebanon card payments need a registered company. We lost ~16 orders with cash on
delivery (fake orders). So:
6.1 REMOVE plain "Cash on delivery".
6.2 Payment methods (on/off + numbers from admin settings):
  a) Full payment by Whish / OMT / Suyool transfer to our number.
  b) "Cash on delivery with 50% deposit": she pays 50% now (Whish/OMT/Suyool), the rest at the door.
     Deposit percent from admin (default 50).
  c) "Order on WhatsApp" (sends the full order summary).
  The order is created with status "awaiting payment"; after she taps "I sent the transfer" (optional
  receipt screenshot upload), staff confirm the payment in the admin → status "confirmed".
  Keep the existing Whish provider interface (src/lib/payments/provider.ts) so Whish Pay online can
  be plugged later when we have a company. Card stays off.
6.3 Delivery fee from admin per area (already exists in the Delivery admin page / areas table):
  defaults Tripoli $2, rest of Lebanon $5. ALWAYS added at the end of the invoice, unless a free
  delivery rule applies (product free_delivery, first order, threshold, coupon).
6.4 "Send to us" / WhatsApp buttons: the WhatsApp number is the main shop number, or the employee's
  own number if the visitor came by an employee link (ref).
6.5 Clear invoice: items, savings in red, points, delivery, deposit due now, rest on delivery.

==================================================================
7. RULES / DONE CRITERIA
==================================================================
- Reuse what exists (catalog helpers in src/lib/catalog, NamePreview, metal gradients, cart,
  attribution/ref logic, points ledger, R2 upload) — don't rebuild.
- Migrations: new files only, never edit old ones; regenerate src/lib/supabase/database.types.ts.
- Run `npm run lint`, `npx tsc --noEmit`, `node scripts/check-messages.mjs` (en/ar keys) and a
  production build before each commit.
- Test at 375px, in Arabic RTL, on iOS Safari if possible.
- At the end of Phase 1 write docs/admin-guide.md: for each home section, where in the admin it is
  controlled and how. Then stop and give me a summary + list of what's left for Phase 2.
```
