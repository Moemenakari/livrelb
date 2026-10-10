# LIVRE — handoff for the next session (storefront: account, Google sign-in, verified customers, notifications, charms page)

Read first: CLAUDE.md, AGENTS.md, graphify-out/GRAPH_REPORT.md, docs/prompts/PHASE_2_ADMIN.md (+ _AR.md), and the Next.js docs in
node_modules/next/dist/docs/ (this Next.js version has breaking changes).

## How to work with Moemen (owner)
- Talk to him in Arabic (Lebanese is fine). Code, commits, files in English.
- Plan first in Arabic (short), wait for his "موافق", then build. Lean code, few files. Test every page at 375px.
- Before anything destructive, on the live database, or a push to `main`: explain in 2-3 Arabic lines and ask "موافق؟".
- Only `main`, no branches. If commit/push is blocked, give him each command on its own line.
- ONE migration file for the whole job. He will later create a NEW Supabase project and run all migrations there, so keep the
  migration set consolidated and additive. Code must keep working before a migration is applied (see src/lib/supabase/compat.ts).
- He does NOT want anything changed on the online Supabase (project svpsrmtodfjiposbokxy). `.env.local` points to it, so `npm run dev`
  talks to the live database: never click write actions there, and do not run migrations unless he says so.
  Docker Desktop was off and he declined a local Docker database.

## State of the work (2026-10-10)
Phase 2 (admin) is built and verified: `npx tsc --noEmit`, `npx eslint src`, `npx next build` all pass. NOTHING is committed or pushed
(about 45 modified files + new ones: git status). The migration `supabase/migrations/20261009120000_admin_redesign.sql` is written but
NOT applied. What exists: dashboard per person, soft-deleted orders (red line), instant tracking with edit/delete, automatic LIVRE Points
on Delivered, customers list with Verified + last visit (/api/seen + livre_known cookie), product "Where does it show?" suggestion,
Charms folder import with white-background removal, Home page layout order, Staff roles/status/stats. See PHASE_2_ADMIN.md.
Not done: "Sales tools" (left untouched on purpose), Seasons (unchanged), testing the charm cut-out on his real photos
(he must put ~20 samples in docs/charm-samples).

## This job (Phase 8) — what Moemen asked for
1. **Sign-in card.** When a visitor who is not remembered presses Add to cart / Place order: a slightly transparent card with a quick X
   at the top, "Sign in" / "Sign up", and "Continue with Google". After Google it asks name, phone and area. The account is saved
   right away (token + cookie) and appears in Admin > Customers. Today the customers row is only created by the first order.
2. **Verified customers.** Staff chat with the customer on WhatsApp from Admin > Customers, then press "Mark verified" (done in admin).
   Cash on delivery only for verified customers; an unverified customer can still order and shows "Needs verification".
   Payment is WhatsApp only: the order is saved, then sent to WhatsApp (no online payment, no OTP). No automatic WhatsApp
   messages (Business API is paid): always a ready `wa.me` button.
3. **Customer notifications inside the website** (tracking updates, points added): a table + a bell on the account page.
4. **Charms page.** Beige background; charms hang on the drawn necklace / bracelet (maybe keychain), centered or side by side as the
   customer wants, price per charm and total. The photos are transparent 800x800 WebP made by the admin import.

## Open questions (ask Moemen in Arabic; my recommended default in brackets)
- A phone typed at sign-up already belongs to an old customer who never signed in. Linking by phone alone would let anyone take
  someone else's points. [Show "this number is already registered, write to us on WhatsApp"; staff link it after verifying.]
- Keychain: new product, or only necklace and bracelet? [ask]
- "COD only for verified" has no meaning in the current lean checkout (no payment choice). [Only show "Needs verification" in admin,
  and decide with him if checkout should hide anything for unverified customers.]

## Technical findings (verified in the code)
- `src/components/auth/login-dialog.tsx`: shared state, `ensureLogin()` / `openLogin()` / `blockIfSignedOut()`, a native `<dialog>` with
  Google and an email link. Setting `site_settings.checkout_requires_login` turns it on or off. Return page cookie `livre_next`.
- `src/app/[locale]/auth/callback/route.ts`: exchanges the code for a Supabase session, redirects to `livre_next` or the checkout.
- `src/lib/checkout/customer.ts`: `verifiedCustomer()` = Google session linked via `customers.auth_user_id`, or the signed device cookie
  `livre_customer`. `rememberCustomer()` also sets the readable `livre_known` cookie. Never look a customer up by phone alone.
- `public.place_order` (SQL, latest in 20260930141643_points_and_customer_login.sql) creates the customer and links `p_auth_user_id`
  on first use. `customers.phone` is unique E.164. Phone helpers: `src/lib/phone.ts`, `private.normalize_phone`.
- Customers have `phone_verified_at`, `phone_verified_by` (new), `last_seen_at` (new), `email`, `area_id`, `address`,
  `referred_by_staff_id` (from the ref cookie `livre_ref`).
- Customers get no notifications today. Web push exists for staff only (`src/lib/push`). Tracking events live in `order_events`.
- Charms: `src/components/charms/charm-builder.tsx` (430 lines), `charm-art.tsx`, `src/app/[locale]/charms/page.tsx`,
  `src/lib/charms/data.ts`. Pricing is server-side (`place_order`, `charm_items.price_cents`, `site_settings.charm_price_cents`).
- The website is English only (Arabic stays on product data). Pages are static/ISR (`revalidate = 3600`), so per-visit server code
  does not run on them. The Worker has a CPU limit (checkout once hit Error 1102): keep new server work small.
- Cloudflare Worker bundle is near its limit (2.13 MiB gzip of 3 MiB): avoid heavy dependencies.

## Suggested order
1. Ask the three questions, agree the plan in Arabic.
2. Sign-in card + "complete your account" step + customer row creation (server action, admin client, validated phone/area).
3. Notifications table (append to the SAME migration file) + admin writes them on tracking updates and points + bell on /account.
4. Beige charm builder.
5. Update docs/admin-guide.md, run tsc / eslint / next build, then ask before committing.

## First message to give the new agent
"اقرأ docs/prompts/PHASE_3_STOREFRONT_HANDOFF.md ثم docs/prompts/PHASE_2_ADMIN.md وابدأ بطرح الأسئلة المفتوحة عليّ بالعربي قبل أي بناء."
