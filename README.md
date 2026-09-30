# LIVRE — livrelb.com

Online store for personalized name jewelry and the Lebanese Lira collection.
English + Arabic (RTL), mobile first. The full spec is in
[PROJECT_BRIEF.md](PROJECT_BRIEF.md).

Stack: Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · next-intl ·
Supabase (Postgres) · Cloudflare Workers via OpenNext · Cloudflare R2 for
images. Details: [docs/database.md](docs/database.md),
[docs/hosting.md](docs/hosting.md).

## Run it locally

Requirements: **Node.js 20.9 or newer** and npm.

```bash
npm install
cp .env.example .env.local      # PowerShell: Copy-Item .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. It redirects to `/en`; the Arabic site is at
`/ar`.

The storefront reads the catalog from Supabase when
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set
in `.env.local` (Supabase → Project Settings → API Keys). Without them it
falls back to the sample files in `src/lib/catalog/`, so it always runs.
<http://localhost:3000/api/health> shows which one is used
(`"catalog":"supabase"` or `"static"`).

## Scripts

| Command                    | What it does                                                   |
| -------------------------- | -------------------------------------------------------------- |
| `npm run dev`              | Dev server on port 3000                                        |
| `npm run build`            | Production build                                               |
| `npm start`                | Serve the production build                                     |
| `npm run lint`             | ESLint (also blocks hardcoded text in JSX)                     |
| `npm run typecheck`        | TypeScript check                                               |
| `npm run i18n:check`       | Fails if `en.json` and `ar.json` don't have the same keys      |
| `npm run db:seed:generate` | Rewrites `supabase/seed.sql` from the sample catalog           |
| `npm run db:create-owner`  | Creates the owner's login (needs `SUPABASE_SECRET_KEY`)        |
| `npm run preview`          | Cloudflare build, run locally in the Workers runtime           |
| `npm run deploy`           | Cloudflare build and deploy (see [docs/hosting.md](docs/hosting.md)) |

## Where things live

```text
messages/en.json, ar.json    All UI text (English, Arabic)
src/app/[locale]/            Pages; layout.tsx sets lang + dir (rtl for ar)
src/app/globals.css          Brand color tokens, fonts, animations
src/app/fonts.ts             Cormorant Garamond + Jost; Arabic: Noto Naskh + IBM Plex Sans Arabic
src/app/[locale]/category/   Category page  (/en/category/name-necklaces)
src/app/[locale]/product/    Product page   (/en/product/cursive-name-necklace)
src/components/layout/       Announcement line, navbar, promo bar, footer, WhatsApp button
src/components/preview/      <NamePreview> live name preview, metal look, script fonts
src/components/product/      Product card, drawn product art, gallery, configurator
src/components/coin/         3D Lira coin (React Three Fiber) and its scroll path
src/components/home/         Homepage pieces (countdown, hero mini preview)
src/config/                  Navigation order, site URL, WhatsApp link helper
src/lib/catalog/             getCatalog() (Supabase or sample files) and read helpers
src/lib/supabase/            Supabase clients and generated database types
src/lib/storage/r2.ts        Signed uploads to Cloudflare R2 (admin, next phase)
src/lib/phone.ts             Phone numbers to E.164 (+961 by default)
src/i18n/                    Locales and locale-aware Link / redirect
src/proxy.ts                 Adds the /en or /ar prefix to every URL
supabase/migrations/         Database schema, RLS, order function
supabase/seed.sql            Sample data (generated, see below)
scripts/                     Seed generator, owner account, coin textures
.github/workflows/           Daily encrypted database backup
assets/                      Brand source files (1975 Lira coin photo)
public/brand/                Brand files served by the site
public/coin/                 Coin textures (built by scripts/build-coin-textures.mjs)
```

## Data, sample data and photos

The storefront reads everything (products, prices per metal, categories,
reviews, promo code, countdown, delivery rules, WhatsApp number,
announcements) from Supabase through `getCatalog()`, cached and refreshed
hourly (and by `revalidateTag("catalog")` once the admin exists). See
[docs/database.md](docs/database.md) for tables, security and backups.

`src/lib/catalog/` also holds the **sample catalog**: it seeds the database
(`npm run db:seed:generate` writes `supabase/seed.sql`) and is the fallback
without Supabase. Sample reviews (`is_sample`) only show in development.

Until a product has photos, its images are drawn (the name necklace in the
chosen metal, the coin, the cedar...). Real photos go to Cloudflare R2 and
their URLs into `product_media`; the first photo gets the live name preview
drawn over it. Empty "Model photo" style slots mark where more photos go.

The coin textures come from `assets/lira-coin-1975.jpg`. After replacing
the photo, run `node scripts/build-coin-textures.mjs`.

## Rules of the codebase

- **No hardcoded text.** Every string goes in both `messages/en.json` and
  `messages/ar.json`. `npm run lint` and `npm run i18n:check` catch misses.
- **RTL.** Use logical Tailwind classes (`ms-*`, `me-*`, `ps-*`, `pe-*`,
  `start-*`, `end-*`, `text-start`) and the `rtl:` variant, not
  left/right. For letter-spaced labels use `tracking-caps`, which switches
  itself off for Arabic (spacing breaks Arabic letter joining).
- **Light boutique theme** (brief §2). Colors and fonts come from the tokens in
  `globals.css`: `bg-background` (white), `bg-surface` (ivory), `bg-beige`,
  `bg-blush`, `text-foreground`, `text-muted`, `border-line`, `bg-gold`,
  `bg-cedar`, `bg-ink`, `font-display`, `font-logo`. Ink (near-black) is
  only for small badges, primary buttons and the footer; no other dark
  sections. Small gold text uses `text-gold-dark` (`text-gold` is too light
  to read on white).
- **The homepage coin** is drawn in a fixed layer behind the page. Homepage
  section content must be `relative z-[1]` (above the coin); a section that
  should hide the coin is itself `relative z-[1]` with a background and
  `data-coin-cover` (lets the coin pause while hidden).
- **Secrets** only in `.env.local` / Vercel settings, never in code.
- Check every screen at **375px wide in English and Arabic** before calling
  it done.
