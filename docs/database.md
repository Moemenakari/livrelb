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
| Content | `collections` + `collection_products` (seasons, gifts, free delivery), `promotions` (promo bar, hero offer, countdown), `reviews` (website / Instagram / WhatsApp, `is_approved`, `is_sample`), `site_settings` (delivery fee $4, free over $50, first order free, gift box, WhatsApp, announcements), `areas` |
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

Checks: Supabase dashboard → Advisors (security: no warnings).

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
