# Database (Supabase)

Project `livrelb`, Frankfurt, free plan. Postgres 17. Money is in **USD
cents**, phones in **E.164** (`+9613123456`), every table has UUID keys,
`created_at`/`updated_at` and Row Level Security.

Migrations live in `supabase/migrations/` (applied to the project and saved
with the same version numbers). Sample data lives in `supabase/seed.sql`,
generated from `src/lib/catalog/` by `npm run db:seed:generate`.

## Tables

```mermaid
erDiagram
  staff ||--o{ staff_permissions : "can / cannot"
  staff ||--o{ coupons : "personal code (AMAL10)"
  staff ||--o{ customers : "brought (forever)"
  staff ||--o{ orders : "credited with"

  categories ||--o{ categories : parent
  categories ||--o{ product_categories : ""
  products ||--o{ product_categories : ""
  products ||--o{ product_materials : "price per metal"
  materials ||--o{ product_materials : ""
  products ||--o{ product_options : "sizes"
  products ||--o{ product_fonts : ""
  fonts ||--o{ product_fonts : ""
  products ||--o{ product_media : "photos (R2 URLs)"
  products ||--o{ reviews : ""
  collections ||--o{ collection_products : ""
  products ||--o{ collection_products : ""

  customers ||--o{ orders : places
  areas ||--o{ customers : ""
  areas ||--o{ orders : ""
  coupons ||--o{ orders : ""
  orders ||--o{ order_items : ""
  orders ||--o{ order_adjustments : ""
```

| Group | Tables |
| --- | --- |
| Staff | `staff` (owner + employees, login link, ref code), `staff_permissions` (owner switches permissions off) |
| Catalog | `categories`, `products`, `product_materials` (each metal's price), `product_options` (chain / bracelet / ring sizes), `product_fonts`, `product_media`, `product_categories`, `materials`, `fonts` |
| Content | `collections` + `collection_products` (seasons, gifts, free delivery), `promotions` (promo bar, hero offer, countdown), `reviews` (website / Instagram / WhatsApp, `is_approved`, `is_sample`), `site_settings` (delivery fee $4, free over $50, first order free, WhatsApp, Instagram, announcements; an empty WhatsApp / Instagram hides those buttons), `areas` |
| Metals & fonts | `materials`: Silver, Gold, Rose Gold at the product's base price, Double Gold Stainless Steel at 3× (prices stored per product in `product_materials`). `fonts`: 15 Google Fonts named after Lebanese places, `script` latin / arabic; `product_fonts` limits a product's fonts, the first is its default. The gift box is free with every order (no price). |
| Sales | `customers`, `orders`, `order_items`, `order_adjustments`, `coupons`, `manual_entries`, `imported_orders`, `audit_log`, view `daily_sales` |

Attribution (brief §5): `customers.referred_by_staff_id` is set once and kept
forever; each order stores `staff_id` + `attribution_source` (`code`,
`checkout`, `customer_history`, `link`, in that priority).

## Security (Row Level Security)

- **Public** (anyone): active categories, products and their prices, sizes,
  fonts, photos; materials; areas; approved reviews that are not samples;
  active promotions and collections; shop settings.
- **Customer** (once customer login exists): her own profile and orders.
- **Staff**: everything the owner has not switched off in
  `staff_permissions` (products add / edit / delete, orders view / edit /
  cancel, customers view / export, coupons, reviews, collections, sales,
  settings). Only the owner reassigns an order or customer to another
  employee (enforced by a trigger and logged in `audit_log`).
- **Owner**: everything, including staff and permissions.
- **Server only** (secret key): `place_order()` finds or creates the customer
  by phone, recalculates every price from the database, applies the coupon,
  delivery rules and attribution. The browser never sends prices.
- **Server only**: `quote_order()` prices a bag for the cart and checkout
  (same helpers as `place_order`, nothing saved). `place_order` takes a
  `p_request_id`: the same id twice returns the first order (double taps).
  Returning customers are looked up by phone to prefill the checkout.

Checks: Supabase dashboard → Advisors (security: no warnings).

## LIVRE Points

`points_ledger` holds every change (`order`, `review`, `redeem`, `adjust`);
a customer's balance is the sum. Rules live in `site_settings`
(`points_enabled`, `points_per_dollar` = 10, `points_per_review` = 10,
`points_redeem_points` = 100 worth `points_redeem_cents` = $1):

- An order earns its points when it is marked Confirmed (or later); if it is
  cancelled they are removed and any points spent on it come back
  (`private.sync_order_points`, run by a trigger on `orders.status`).
- An approved review with a `customer_id` earns `points_per_review` once.
- At checkout a verified customer can spend her points (whole units of 100).
- A logged-in customer reads only her own rows (RLS); staff add manual
  `adjust` rows from the admin.

## Buy on the website (Phase 4 A)

- `storefront_stats()` (server only): pieces sold per product (orders not
  cancelled) for "🔥 X sold" (shown from 10) and "#1 Best Seller in …", and
  the coupons marked `coupons.is_public` for the product page deals row.
- `products.stock_qty`: null = made to order; a number shows "Only X left".
- `site_settings.delivery_time_en/_ar`: "Estimated delivery" text (empty =
  `delivery_days_min`–`delivery_days_max` days).
- `payments`: one row per online payment attempt (Whish OTP). Cash on
  delivery never creates one. Only the provider reference and the wallet's
  last 4 digits are stored. Hidden until `site_settings.whish_online_enabled`
  is on **and** `WHISH_API_URL`, `WHISH_MERCHANT_ID`, `WHISH_API_KEY` are set.
- `rate_limits` + `hit_rate_limit()` (server only): checkout, track, points
  and payment attempts per IP and per phone, keyed by an HMAC hash (no raw
  IP or phone stored). Old windows are cleaned up automatically.

## Admin panel (Phase 4 B)

`/admin` (English, phone first). Every page checks the login and an active
staff row (`src/lib/admin/auth.ts`); every write is a server function that
checks the permission again, then writes **as the staff member** so Row
Level Security applies too.

- `audit_row()` triggers log every insert / update / delete on the catalog,
  promotions, coupons, reviews, settings, staff, permissions, manual entries,
  order adjustments and points in `audit_log` (who, which row, what changed).
  Imports log one line per batch. Orders and customer reassignments were
  already logged by their guards.
- `admin_save_product(p jsonb)` (security invoker): the product editor saves
  a product with its prices per material, sizes, fonts (first = default),
  categories and photos in one transaction.
- `add_order_adjustment(order, type, value, note)`: gift, % discount, free
  delivery, extra delivery fee or a note; the order total follows.
- `admin_sales(from, to)`: website orders (not cancelled) + manual entries
  per employee, for the dashboard (Beirut days). No profit, by design.
- Staff logins are created, renamed, re-passworded and disabled (banned) by
  the owner through the server key; the staff row is written as the owner.

## Returning customers (no lookup by phone)

Typing a phone number never reveals anything. The checkout is prefilled
only for a customer the server has verified:

- **Remembered device:** after an order, an httpOnly cookie signed with
  `CUSTOMER_COOKIE_SECRET` (1 year). Only set when the order created the
  customer or the browser was already verified as her, so typing someone
  else's phone never gives access to her details or points. "Not you?
  Clear" deletes it.
- **Google login (optional):** Supabase Auth with the Google provider. The
  account is linked to the customer at her next order (same trust rule).
  The button only shows once the provider is switched on in Supabase.

## Staff login

Phone + password through Supabase Auth. The phone is turned into an
internal login address (`9613123456@staff.livrelb.local`) that is never shown
or emailed, so no SMS provider is needed. Create the owner once:

```powershell
npm run db:create-owner
```

Recommended: Supabase → Authentication → Sign In / Providers → turn **off**
"Allow new users to sign up" (staff are created by the owner; customers don't
log in yet).

## Run the migrations and seed on a Supabase project (Windows)

The `livrelb` project already has everything applied. For a new or empty
project (for example a test copy):

1. Open PowerShell in the project folder (`C:\Users\moemen\Desktop\livrelb`).
2. Log in to Supabase (opens the browser once):

   ```powershell
   npx supabase login
   ```

3. Link the project. It asks for the **database password** (Supabase →
   Project Settings → Database → Reset password if you don't have it):

   ```powershell
   npx supabase link --project-ref svpsrmtodfjiposbokxy
   ```

4. Apply the migrations:

   ```powershell
   npx supabase db push
   ```

5. Load the sample data: open `supabase\seed.sql`, copy all of it into
   Supabase → SQL Editor → Run. (Or `npx supabase db push --include-seed`.)
   It is safe to run twice.
6. Check: `npm run dev`, then <http://localhost:3000/api/health> should say
   `"catalog":"supabase"`.

After changing the schema: add a new file in `supabase/migrations/`
(`npx supabase migration new <name>`), `npx supabase db push`, then
regenerate the types:

```powershell
npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

## Database backups

The free plan has no backups, so a GitHub Action
(`.github/workflows/db-backup.yml`) makes one every day at 01:15 UTC and keeps
it 14 days as a workflow artifact, encrypted with a passphrase.

**Set up once** (GitHub → the repo → Settings → Secrets and variables →
Actions → New repository secret):

- `SUPABASE_DB_URL`: Supabase → Connect → Connection string → **Session
  pooler**, with your database password in it.
- `BACKUP_PASSPHRASE`: a long random passphrase. Save it in your password
  manager: without it a backup cannot be opened.

Test it: Actions → Database backup → Run workflow.

**Restore** (for example into a new Supabase project):

1. GitHub → Actions → Database backup → pick a run → download the artifact
   (a zip containing `livrelb-db-YYYY-MM-DD.tar.gz.gpg`). Unzip it.
2. In **Git Bash** (comes with Git for Windows, includes `gpg` and `tar`):

   ```bash
   gpg --decrypt livrelb-db-2026-10-01.tar.gz.gpg > backup.tar.gz   # asks for the passphrase
   mkdir restore && tar -xzf backup.tar.gz -C restore
   ```

3. Load it into the target database with `psql` (install "PostgreSQL command
   line tools" from postgresql.org, or run it from WSL). Use the target
   project's Session pooler connection string:

   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file restore/roles.sql \
     --file restore/schema.sql \
     --command 'SET session_replication_role = replica' \
     --file restore/data.sql \
     --dbname "postgresql://postgres.xxxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
   ```

4. Point `.env.local` / the host's env vars at the restored project.

## Moving to paid plans later

Everything reads its location from env vars: moving to Supabase Pro is the
same project (no change); moving the site to Vercel means setting the same
env vars there and using `npm run build`.
