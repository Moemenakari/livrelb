# LIVRE — livrelb.com

Online store for personalized name jewelry and the Lebanese Lira collection.
English + Arabic (RTL), mobile first. The full spec is in
[PROJECT_BRIEF.md](PROJECT_BRIEF.md).

Stack: Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · next-intl ·
Supabase · Vercel.

## Run it locally

Requirements: **Node.js 20.9 or newer** and npm.

```bash
npm install
cp .env.example .env.local      # PowerShell: Copy-Item .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. It redirects to `/en`; the Arabic site is at
`/ar`.

The site runs without Supabase keys (nothing reads the database yet). To
connect Supabase, fill in `.env.local` from the Supabase dashboard
(Project Settings → API Keys), restart `npm run dev`, and open
<http://localhost:3000/api/health>. You should see `{"supabase":"ok"}`.

## Scripts

| Command              | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Dev server on port 3000                                   |
| `npm run build`      | Production build                                          |
| `npm start`          | Serve the production build                                |
| `npm run lint`       | ESLint (also blocks hardcoded text in JSX)                |
| `npm run typecheck`  | TypeScript check                                          |
| `npm run i18n:check` | Fails if `en.json` and `ar.json` don't have the same keys |

## Where things live

```text
messages/en.json, ar.json    All UI text (English, Arabic)
src/app/[locale]/            Pages; layout.tsx sets lang + dir (rtl for ar)
src/app/globals.css          Brand color tokens, fonts, animations
src/app/fonts.ts             Cormorant Garamond + Jost; Arabic: Noto Naskh + IBM Plex Sans Arabic
src/components/layout/       Announcement bar, navbar, mobile menu, footer
src/config/                  Announcement texts, nav links, contact links
src/i18n/                    Locales and locale-aware Link / redirect
src/lib/supabase/            Supabase clients (browser + server)
src/proxy.ts                 Adds the /en or /ar prefix to every URL
assets/                      Brand source files (1975 Lira coin photo)
public/brand/                Brand files served by the site
```

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
  `bg-cedar`, `font-display`, `font-logo`. No black or dark sections. Small
  gold text uses `text-gold-dark` (`text-gold` is too light to read on white).
- **Secrets** only in `.env.local` / Vercel settings, never in code.
- Check every screen at **375px wide in English and Arabic** before calling
  it done.
