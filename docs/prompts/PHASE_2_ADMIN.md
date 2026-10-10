You are working on LIVRE (livrelb.com), a REAL online jewelry store for Lebanon that is live with real
customers. Read CLAUDE.md, AGENTS.md, graphify-out/GRAPH_REPORT.md and the Next.js docs in
node_modules/next/dist/docs/ before touching code (this Next.js version has breaking changes).

This prompt is PHASE 2: the admin panel (src/app/admin, src/components/admin, src/lib/admin).
Do ONLY this job, one numbered section (phase) at a time, and stop for review after each one.

==================================================================
HOW WE WORK  (non-negotiable)
==================================================================
- Talk to Moemen (the owner) in Arabic (Lebanese is fine). Code, commits and files stay in English.
- Before each section: write the plan in Arabic in chat (2-10 simple lines), wait for his "موافق", then build.
- Work directly on `main`, small commits, no branches. If commit/push is blocked, give Moemen each
  command on its own line and verify after.
- Lean code: few files, no duplicated logic, reuse src/components/admin/ui.tsx and the existing actions in
  src/lib/admin. Test every page you touch at 375px width and on desktop.
- The website and the admin are English only. (Arabic stays only inside product data.)
- ONE migration file for this whole job (section 0). Additive only: never drop a table/column and never
  delete data. Before anything destructive or anything on the live database, explain in 2-3 Arabic lines
  and ask "موافق؟".
- After each section: stop for review, then run /graphify . --update.

==================================================================
WHO USES THE ADMIN
==================================================================
- Two owners (Moemen, Nour) = "Admin". The rest are employees. Owners also SELL and bring customers, so
  they appear in every sales table next to the employees.
- The admin always shows who is logged in, from the session (cookie/token): "Admin · Moemen",
  "Admin · Nour", "Employee · Amal". Never ask the user to type their name.
- Payment is WhatsApp only. There is no online payment. A WhatsApp message cannot be sent automatically
  (WhatsApp Business API is paid and we are NOT paying for it): wherever a message to a customer is
  needed, send an in-site notification + web push, and give the staff member a ready-made WhatsApp
  button (prefilled text) to tap.

==================================================================
0. THE ONE MIGRATION  (write it first, apply it once)
==================================================================
File: supabase/migrations/20261009120000_admin_redesign.sql. Read the current schema first. It must
contain every database change of sections 1-7, so Moemen applies it ONCE in the Supabase SQL Editor:
- orders: deleted_at, deleted_by (-> staff), delete_reason ('test' | 'error' | 'other'), delete_note.
- customers: last_seen_at, phone_verified_by (-> staff). (phone_verified_at and email already exist.)
- home_sections: sort_order.
- staff: deleted_at (soft delete; is_active already exists).
- order tracking updates: whatever is needed to edit/delete a single update (inspect the table first).
- the points function (sync_order_points): when an order becomes `delivered`, award LIVRE Points
  automatically (idempotent; same formula as before) together with the one-use thank-you coupon
  (orders.reward_coupon_code); reversed on cancel or delete.
- staff_single_owner index dropped (two Admins), is_first_order / daily_sales / storefront_stats ignore deleted orders.
- indexes for every new foreign key; RLS/grants like the neighbouring tables.
Until the file is applied, every page and action keeps working (src/lib/supabase/compat.ts: retry without
the new columns); only the new features say "run the database update". If a later section needs one more column,
add it to this same file before Moemen applies it; if he already applied it, ask him first.

==================================================================
1. CLEANUP, DASHBOARD, SETTINGS
==================================================================
1.1 Remove the "Charm designs" page (/admin/charms), its nav item and its components. Keep the
    charm_requests table and its data untouched.
1.2 "Sales tools": DO NOT TOUCH. Moemen will decide later.
1.3 Dashboard (/admin):
    - Header "Hi <name>" + role label (Admin / Employee).
    - Top: Today, This week, This month (orders + sales). "Today" restarts from 0 every Beirut day.
    - Table per person (owners included): Today / Week / Month orders + sales, and customers brought.
    - Below it: Latest orders only (no other widgets). Sales only, never profit.
1.4 Activity page: keep as is.
1.5 Settings: remove the Delivery card (the "Delivery & times" page owns it; keep the columns);
    move the "Charms page" card (price of one charm, most charms) to the new Charms admin page
    (section 5); keep Contacts, LIVRE Points (Moemen types the values himself), Announcement bar and
    Checkout; move Analytics (Meta Pixel / GA4) to the bottom with a one-line plain explanation.

==================================================================
2. ORDERS
==================================================================
2.1 Orders list: keep all filters/search. A deleted order is NOT removed from the list: it stays as a
    red line with the reason (Test / Error / Other), who deleted it and when. Order numbers are never
    reused. Deleted orders do not count in sales, dashboard or points. Add a "Delete order" action
    (asks for the reason; owner or orders.cancel permission) and a way to restore.
2.2 Order detail: keep Pieces, Totals, Customer, Attribution, Employee (owner only).
2.3 Remove the manual "Add an adjustment" card. Gifts, % discount, free delivery and extra delivery are
    decided by the system (product flags free delivery / free gift box, coupon, points, first-order
    rule, area fee) and shown as READ-ONLY lines in Totals. Keep one internal Note field.
2.4 Tracking (customers look an order up with order number + phone; verify the existing page):
    - Courier, tracking number and "new update" save instantly with no page reload (optimistic UI).
    - Every update is a row with Edit and Delete. The order number itself never changes.
    - Each save offers a ready WhatsApp message to the customer. (In-site notifications for customers do not
      exist yet: they belong to the storefront phase, section 8.)
2.5 LIVRE Points are automatic when the order becomes Delivered (no approval step). The card shows
    "X points added automatically", the thank-you coupon and a ready WhatsApp message (AI wording when
    ANTHROPIC_API_KEY is set). Orders delivered before this change keep a "Give points" button.
    Cancelling/deleting takes the points back.

==================================================================
3. CUSTOMERS
==================================================================
3.1 List columns: name, last visit, signed up, Google email, phone, address, number of orders, points,
    Verified yes/no. Search by name/phone/email.
3.2 Last visit: update customers.last_seen_at when a signed-in customer loads the site (at most once
    per hour per customer; cheap, no extra request when throttled).
3.3 Verify: next to the phone, a WhatsApp button (prefilled greeting). After chatting, staff taps
    "Mark verified" or "Not verified". Store who and when (phone_verified_at / phone_verified_by).
3.4 Customer detail: keep orders, spent, points history; add the same Verified controls.
3.5 Rule (enforced when the storefront phase is built): Cash on delivery only for Verified customers.
    An unverified customer can still place the order; it is shown as "Needs verification" (derived
    from phone_verified_at being empty, no extra column) until staff verify the number.

==================================================================
4. PRODUCTS  (add / edit)
==================================================================
4.1 Keep: name, description, categories (which pages show it), Shown/Hidden, Track stock, New,
    Best seller, Free delivery, Free gift box, prices per material with Old price (Gold, Stainless
    steel, Silver, Double silver steel), personalization, sizes, descriptions. Prices stay in USD.
4.2 Hide "Link" (the slug is generated from the name; keep it editable only in an Advanced section),
    hide "Type of piece", move "Style" into a collapsed Advanced section.
4.3 "Where does it show?": a "Suggest for me" button (and, for a new piece, once when the name is written)
    suggests the shop pages (Men's Jewelry, Gifts, Rings...): Claude Haiku when ANTHROPIC_API_KEY is set,
    keyword rules otherwise. The owner can always change it.
4.4 Photos and video: up to 7 photos + 1 video. Show only the slots that have a file (no empty
    placeholders), with a Add button. Customers can zoom on the product page.

==================================================================
5. CHARMS  (one admin page; the old "Charm photos" page becomes this)
==================================================================
Moemen has ~1000 charm photos on white backgrounds. Each charm has its own price.
5.1 Import by FOLDER: he picks one folder with this layout and the admin reads it:
    <family: charms | turkish>/<metal: gold | silver>/<price in $>/<photo files>
    family, metal and price come from the folders, the code from the file name. Photos may have a white
    background: remove it in the browser (flood-fill from the edges, soft edge), resize to 800x800 PNG
    with a transparent background, then upload. Show every result on a beige background BEFORE saving,
    let him drop the bad ones, then import in batches (reuse importCharmItems / createCharmItemUpload).
    A folder without a price = the standard charm price. Re-importing the same code only replaces the photo.
    FIRST test the cut-out on ~20 real photos (gold, silver, Turkish) that Moemen puts in
    docs/charm-samples and show him the result before building the rest. If silver edges suffer,
    propose a local script instead.
5.2 Fast grid: filter by family/metal/search, select many, "Set price" and "Out of stock" in bulk, per-row
    edit, delete. Pricing already supports a per-charm price (charm_items.price_cents).
5.3 This page also holds the "Price of one charm" and "Most charms on one chain" settings.
5.4 NOT in this section: the customer-facing charm builder (beige background, charms hanging on a
    drawn necklace / bracelet / keychain, price per charm and total). That is a storefront phase.

==================================================================
6. HOME PAGE, PROMOTIONS, SEASONS, REVIEWS
==================================================================
6.1 Home admin = a simple Canva-like schematic (NOT a live iframe: the site sends frame-ancestors 'none'
    and we keep it). A vertical list of cards in the order the website shows them, each with a
    thumbnail. Today's order: Hero, Lira Collection, Shop by style, Best sellers, How it works, Try your
    picture, Reviews (Loved by customers), New arrivals, Why us, Create personal, Trust bar.
    - Hero and Lira Collection are LOCKED (they carry the 3D coin: coin, countdown, hero media).
    - Every other card has an order NUMBER box (e.g. Best sellers 20, New arrivals 4), an eye toggle
      (show/hide) and an Edit button for its texts/products. One Save button.
    - The page src/app/[locale]/page.tsx renders the movable sections from home_sections.sort_order.
      Test every order on screen so the coin never shows over the wrong section (data-coin-cover).
    - Hero photos/videos move here from Promotions.
6.2 Promotions = discount codes + the announcement/promo banner only. Keep it tidy as it is.
6.3 Seasons = a temporary shop page for an occasion (Valentine's, Mother's Day, Ramadan...): title,
    chosen products, start/end dates, optional coupon. Appears and disappears by date. Keep, simplified.
6.4 Reviews: keep as is.

==================================================================
7. STAFF
==================================================================
Owner only. Add a new employee; one page per employee with: orders and sales (today/week/month),
customers brought, products added and removed this week (from the activity log), last activity,
personal link and code. Status: Active / Suspended / Deleted (soft: deleted_at), and who is an
Admin. Permissions as today (everything allowed by default).

==================================================================
8. LATER, STOREFRONT (not in this prompt, do not start)
==================================================================
Sign-in card on "Add to cart" / "Place order" when the visitor is not remembered: semi-transparent
card with an X, "Sign in" / "Sign up", and "Continue with Google"; then ask name, phone and area;
the account is remembered by token + cookie and appears in Admin > Customers. Beige charm builder.
COD only for Verified customers.

==================================================================
ASSUMPTIONS (Moemen did not answer these; use the default and tell him)
==================================================================
- All movable Home sections stay; Seasons stays; Announcement bar stays in Settings.
- "Free delivery with this piece": keep the current meaning (it works on any product).
- If anything is unclear, ask in Arabic before building. Do not guess on money, points or orders.
