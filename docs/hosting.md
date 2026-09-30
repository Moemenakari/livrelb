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

## Images (R2)

- Create a bucket `livrelb-images` and give it a public address (custom
  domain like `images.livrelb.com`, or the r2.dev URL).
- R2 → Manage API tokens → Object Read & Write on that bucket → put the keys
  in `R2_*` env vars, the public address in `NEXT_PUBLIC_R2_PUBLIC_URL`.
- Bucket → Settings → CORS: allow `PUT` from `https://livrelb.com` (and
  `http://localhost:3000` for development), header `Content-Type`.
- Uploads: `createUploadUrl()` in `src/lib/storage/r2.ts` returns a
  10-minute signed URL; the admin's browser makes photos WebP (max 1800 px)
  and uploads them directly to R2. Until the `R2_*` variables are set, the
  admin shows "Photo storage isn't set up yet" and the shop keeps the
  drawings.

## What behaves differently from Vercel

- **Free plan limits**: the worker must stay under **3 MiB compressed**
  (today: about 2.6 MiB, measured with `npx wrangler deploy --dry-run`) and
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
