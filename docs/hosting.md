# Hosting on Cloudflare (free tier)

The site is prepared for **Cloudflare Workers** with
[OpenNext](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`).
Product photos go to **Cloudflare R2**. Not deployed yet.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run preview` | Builds for Cloudflare and runs it locally in the Workers runtime |
| `npm run deploy` | Builds and deploys to Cloudflare (needs `npx wrangler login` first) |
| `npm run cf-typegen` | Generates types for the Cloudflare bindings |

## Before the first deploy

1. `npx wrangler login`
2. Create the cache storage used by `wrangler.jsonc`:

   ```powershell
   npx wrangler r2 bucket create livrelb-opennext-cache
   npx wrangler d1 create livrelb-tag-cache
   ```

   Paste the D1 `database_id` into `wrangler.jsonc`.
3. Add the env vars as Worker secrets (Cloudflare dashboard → Workers →
   livrelb → Settings → Variables), same names as `.env.example`. The
   `NEXT_PUBLIC_*` ones must also be present at build time.
4. `npm run deploy`, then add the `livrelb.com` domain in the dashboard.

## Static pages and publishing (free plan)

The free Cloudflare plan gives the Worker **10 ms of CPU per request**. Next.js needs 55-85 ms to serve even a
cached page, so pages served by the Worker ended in **error 1102** as soon as several customers came at once.
So the pages customers browse are **plain files** that Cloudflare serves without starting the Worker:

- `scripts/static-pages.mjs` runs before every `wrangler deploy` / `wrangler dev` (`build.command` in
  `wrangler.jsonc`). It copies the HTML `next build` wrote (home, categories, products, Charms, FAQ, About,
  Contact, Size guide, policies, the cart page) into the assets folder, with `manifest.webmanifest`, the icons,
  `robots.txt` and `sitemap.xml`. It also writes `_headers` (the security headers of `next.config.ts`, read back
  from `.next/routes-manifest.json`, plus a one-year cache for the hashed files in `/_next/static`) and
  `_redirects` (`/` opens `/en`).
- The Worker still runs for everything personal: checkout, account, track, order pages, the admin, `/api/*`,
  `/auth/callback`, `/r/<code>`, and any product or category created after the last build.
- Links never prefetch and open pages with a normal browser navigation (`src/components/ui/site-link.tsx`).
- `?ref=amal` on any page is handled in the browser (`src/components/layout/ref-capture.tsx` asks `/r/amal`),
  because no server code sees a page that is a file.

**Publishing: once a night.** The files are only as new as the last build. Admin saves ONLY save to the database
(`storefrontChanged()` in `src/lib/catalog/publish.ts` does not start a build). A build starts:

- **Every night at 00:00 Beirut time**, if something that shows on the pages was saved since the last build. Cloudflare's
  cron is UTC and Beirut is UTC+2 in winter and UTC+3 in summer, so `wrangler.jsonc` wakes the Worker **every hour**
  (`0 * * * *`) and `publish-due.mjs` asks the Beirut clock (`Intl`, with the daylight-saving rules) whether it is the night
  window (00:00-03:59, so a missed run is retried), whether the pages were already built today, and whether anything was
  saved: it looks in `audit_log` for lines of the storefront tables (`STOREFRONT_TABLES` in
  `src/lib/publish/rules.mjs`) newer than the build start. Nothing saved = no build, no minutes used.
- **When a promotion starts or ends** (the hourly check, no extra setup): see below.
- **"Publish now"** in the admin (the bar at the top of every page): asks the Deploy Hook right away, at most **3 a day**
  (Beirut day), only when something is waiting. Each press and each automatic start is written in `audit_log`
  (`table_name = 'publish'`, action `publish_now` / `publish_auto`): that is what counts the 3 and shows
  "publishing started". No database migration was needed.

`next.config.ts` stamps the build start (`BUILD_STARTED_AT`); the admin bar shows it as "Last published", and
`scripts/static-pages.mjs` copies it into `.open-next/publish-at.mjs` for the Worker.

Set up once (Moemen, in the Cloudflare dashboard):

1. Workers & Pages > `shop` > Settings > Builds > **Deploy Hooks** > create one (name `admin-publish`, branch
   `main`) and copy its address.
2. Workers & Pages > `shop` > Settings > **Variables and Secrets** > Add > type **Secret**, name
   `DEPLOY_HOOK_URL`, value = that address > Deploy. It is a *runtime* secret, not a build variable.

The address does not expire. It stops working only if the hook is deleted or re-created in the dashboard; then saves
still work but nothing is published (the Worker logs `publish check: ... the deploy hook answered 404`). Until the secret
exists the admin shows an amber "Publishing is not connected yet" note.

**Build minutes.** Workers Builds on the free plan: **3,000 minutes a month**, 1 build at a time, 20 minutes at most. A build
takes about 4-5 minutes (the push of 2026-10-11 went live in about 4). Nightly-only is at most ~30 builds (150 min); with
promotions (2 builds each) and the worst case of 3 "Publish now" a day it stays under ~700 minutes. Each push to GitHub
also builds (previews too). Deploy Hooks skip repeats that arrive before a build starts.

**Promotions that start or end by the clock.** Which promotions run is decided at build time, so
`scripts/static-pages.mjs` writes the next start/end time (after the build start) into `.open-next/publish-at.mjs` and the
hourly check asks for a build once it has passed (a lag of up to an hour plus the build). Note that such a build also
publishes everything else that was saved by then.

**Checkout.** `/en/checkout` is a static file too. Who she is, her saved details and the employees come from
`GET /api/checkout-init`; prices from `POST /api/quote`; Place order is `POST /api/order` and "Not you?" `POST /api/forget`
(`src/lib/checkout/client.ts`: two retries on 503 / 1102 / network errors, the same `requestId` each time; `place_order`
returns the first order for a repeated `orders.request_id`, so a retry never makes a second order; if it still fails the
form keeps the bag and everything typed and shows "We couldn't reach the shop just now").

**Known limits.** The "X sold" label, the "#1 Best Seller" badge and the public coupons on product pages come from
`storefront_stats()`, which needs `SUPABASE_SECRET_KEY`; Cloudflare's build has no secret keys, so the static pages
do not show them (today nothing is lost: the best seller has 7 sales, the label starts at 10, and there are no
public coupons). Prices, photos, texts and offers are not affected, and checkout always prices from the database.

## Phone notifications (Web Push)

- Staff press **Notify me** in the admin (on iPhone: from the "LIVRE Admin"
  home-screen app, iOS 16.4+) and get new orders, order cancellations,
  reviews and every change by the team (prices, titles, product details...)
  on their phone. Orders and reviews only reach staff who may see them;
  changes by the team reach every staff member except the one who made them.
  Signing out takes that phone off the list.
- Keys: `node scripts/vapid-keys.mjs` → `VAPID_PUBLIC_KEY` and
  `VAPID_PRIVATE_KEY` in `.env.local`, then the same two as Worker secrets
  (`npx wrangler secret put VAPID_PUBLIC_KEY --name shop`, same for the
  private one). The private one never goes in a `NEXT_PUBLIC_*` variable.
- The database sends the signal: `private.push_enqueue()` (migration
  `20261004130000_delivery_activity_push.sql`) queues each event in
  `push_outbox` and calls `https://shop.livrelb.workers.dev/api/push/ping`
  through `pg_net`, with a secret the migration makes by itself
  (`private.push_config`; the shop checks it with `check_push_secret()`, so
  there is nothing to copy). Without the right secret the address answers 404.
  When the shop moves to its own domain, update that URL in the function
  (Supabase → SQL Editor).
- Only the browsers' own push services are accepted as a phone's address
  (Google, Mozilla, Apple, Windows); see `isPushServiceUrl()`.

## Images (R2)

- Bucket `livrelb-media` (created, public r2.dev address on). Public address (custom
  domain like `images.livrelb.com`, or the r2.dev URL).
- R2 → Manage API tokens → Object Read & Write on that bucket → put the keys
  in `R2_*` env vars, the public address in `NEXT_PUBLIC_R2_PUBLIC_URL`.
- Bucket → Settings → CORS: allow `PUT` from `https://livrelb.com` (and
  `http://localhost:3000` for development), header `Content-Type`.
- Uploads: `createUploadUrl()` in `src/lib/storage/r2.ts` returns a
  10-minute signed URL (and a second one for the card size); the admin's browser makes every product photo in TWO WebP
  sizes (1200 px for the product page, 600 px for the grids, `src/lib/media.ts`) and uploads them directly to R2. The shop
  serves them straight from R2: `images.unoptimized` in `next.config.ts` means no photo goes through `/_next/image` or the
  Worker.
- Free tier (Standard storage): 10 GB-month, 1 million Class A (writes) and 10 million Class B (reads) a month, egress free.
  100 products with 7 photos is about 100-150 MB and ~1,400 writes.
- **The `r2.dev` address is for development**: Cloudflare says it is rate-limited, has no caching and no WAF, and should not
  carry production traffic. A custom domain on Cloudflare (e.g. `images.livrelb.com`, then change
  `NEXT_PUBLIC_R2_PUBLIC_URL`) is the production answer, and it is free to add once the domain is on Cloudflare. Until the `R2_*` variables are set, the
  admin shows "Photo storage isn't set up yet" and the shop keeps the
  drawings.

## What behaves differently from Vercel

- **Free plan limits**: the worker must stay under **3 MiB compressed**
  (today: about 2.1 MiB, measured with `npx wrangler deploy --dry-run`; keep the
  middleware as `src/middleware.ts` (edge): a Node `proxy.ts` adds about 0.9 MiB) and
  gets **10 ms of CPU per request**. Cached pages are cheap, but rendering a
  page on a cache miss can exceed 10 ms. If you see "exceeded CPU" errors, or
  the bundle grows past 3 MiB with checkout and admin, Workers Paid ($5/month)
  raises both limits.
- **Caching / revalidation** needs the R2 bucket, D1 database and Durable
  Object in `wrangler.jsonc` (Vercel does this for you). `revalidateTag`
  works through them.
- **Middleware**: Next 16's `proxy.ts` runs in the Node.js runtime, which
  OpenNext marks as *experimental* on Cloudflare (it builds and works in
  preview). If it causes trouble, the fix is moving the locale redirect to
  an edge-runtime `middleware.ts`.
- **next/image** resizing uses Cloudflare Images (5,000 free transformations
  a month, then paid). Photos can also be pre-sized and served with
  `unoptimized`.
- **No local file system at runtime**: files go to R2, data to Supabase.
- **Building on Windows**: it works here, but OpenNext only officially
  supports macOS / Linux. If a build fails on Windows, run it in WSL or let
  a GitHub Action build and deploy.
- **Edge runtime** (`export const runtime = "edge"`) is not supported; this
  project doesn't use it.

## Moving to Vercel later

Nothing in the app depends on Cloudflare: set the same env vars on Vercel and
use `npm run build`. `wrangler.jsonc` and `open-next.config.ts` are then
unused.
