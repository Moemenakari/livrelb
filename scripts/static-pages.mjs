// Publishes the shop's pages as plain files (Cloudflare "static assets"), so a customer opening the home page,
// a product or a category is served straight from Cloudflare's network and the Worker never runs for it.
//
// Why: the free Cloudflare plan gives a Worker 10 ms of CPU per request, and Next.js needs 55-85 ms to serve
// even a cached page (measured with a CPU profile), so those requests ended in error 1102. Static files cost
// no CPU. Cart, checkout, account, order pages, the admin and every API route still run in the Worker.
//
// How it runs: wrangler.jsonc has `build.command`, so `wrangler deploy` (Cloudflare's deploy step) and
// `wrangler dev` run this after `opennextjs-cloudflare build` and before the upload. It copies the HTML that
// `next build` already wrote into .open-next/assets and writes the two files Cloudflare reads there:
//   _headers    the same security headers next.config.ts adds (read back from .next/routes-manifest.json),
//               plus long caching for the hashed files in /_next/static
//   _redirects  "/" opens "/en" (what the proxy did, now without starting the Worker)
// and .open-next/publish-at.mjs, read by worker.mjs (see step 5).
//
// Fresh pages: admin saves only save to the database. A build runs every night at 00:00 Beirut time (when
// something changed), when a promotion starts or ends, and when someone presses "Publish now" in the admin
// (3 a day): src/lib/publish, publish-due.mjs, worker.mjs. All of them ask Cloudflare through the Deploy Hook.
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const NEXT = ".next";
const APP = join(NEXT, "server", "app");
const OUT = join(".open-next", "assets");

function fail(message) {
  console.error(`static-pages: ${message}`);
  process.exit(1);
}

for (const required of [join(NEXT, "prerender-manifest.json"), join(NEXT, "routes-manifest.json"), OUT]) {
  if (!existsSync(required)) fail(`${required} not found. Run "opennextjs-cloudflare build" first.`);
}

const prerender = JSON.parse(readFileSync(join(NEXT, "prerender-manifest.json"), "utf8"));
const routes = JSON.parse(readFileSync(join(NEXT, "routes-manifest.json"), "utf8"));

// Pages that show per-person data must never be published as files (scripts/check-dynamic-routes.mjs
// already fails the build if one is prerendered; this is a second lock).
const perPerson = /^\/(en|ar)?\/?(account|track|order|auth)(\/|$)|^\/(admin|api)(\/|$)/;

function copy(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

// 1. The pages: /en, /en/faq, /en/product/<slug>, ... each prerendered route becomes <route>.html, which
//    Cloudflare serves at <route> (no trailing slash).
const pages = [];
for (const route of Object.keys(prerender.routes ?? {})) {
  if (!/^\/en(\/|$)/.test(route)) continue;
  if (perPerson.test(route)) fail(`${route} shows per-person data but was prerendered.`);
  const html = join(APP, `${route}.html`);
  if (!existsSync(html)) {
    console.warn(`static-pages: no HTML for ${route}, left to the Worker.`);
    continue;
  }
  copy(html, join(OUT, `${route}.html`));
  pages.push(route);
}
if (!pages.includes("/en")) fail("the home page (/en) was not prerendered.");

// 2. Files every page asks for: the app manifest and the icons (one Worker request each, on every page view),
//    plus robots.txt and sitemap.xml for the search engines.
const files = ["manifest.webmanifest", "icon.svg", "apple-icon.png", "robots.txt", "sitemap.xml"];
const types = {};
for (const name of files) {
  const body = join(APP, `${name}.body`);
  if (!existsSync(body)) {
    console.warn(`static-pages: no ${name}, left to the Worker.`);
    continue;
  }
  copy(body, join(OUT, name));
  const meta = join(APP, `${name}.meta`);
  if (existsSync(meta)) types[name] = JSON.parse(readFileSync(meta, "utf8")).headers?.["content-type"];
}

// 3. _headers: Cloudflare adds these to files only (next.config.ts headers() belong to the Worker's answers).
const security = (routes.headers ?? []).find((h) => h.source === "/:path*")?.headers ?? [];
if (!security.some((h) => h.key === "Content-Security-Policy")) fail("no Content-Security-Policy found in routes-manifest.json.");

const rule = (path, headers) => [path, ...headers.map(({ key, value }) => `  ${key}: ${value}`)].join("\n");
const rules = [
  rule("/en", security),
  rule("/en/*", security),
  // Hashed file names (a new build = new names), so they can be kept for a year without asking again.
  rule("/_next/static/*", [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]),
];
for (const [name, type] of Object.entries(types)) {
  if (type) rules.push(rule(`/${name}`, [{ key: "Content-Type", value: type }]));
}
const headersFile = rules.join("\n\n") + "\n";
for (const line of headersFile.split("\n")) if (line.length > 2000) fail("a line in _headers is longer than Cloudflare's 2000 characters.");
if (rules.length > 100) fail("more than 100 rules in _headers.");
writeFileSync(join(OUT, "_headers"), headersFile);

// 4. _redirects: "/" opens "/en" without starting the Worker (the proxy did the same with a 307).
writeFileSync(join(OUT, "_redirects"), "/ /en 307\n");

// 5. What worker.mjs needs to know about these pages (.open-next/publish-at.mjs):
//    builtAt     when this build started (ms): saves made after it are not on the pages yet
//    publishAt   the next time a promotion starts or ends after builtAt (a promotion shows between its start and
//                end time, and `next build` decided which ones were running): the hourly check asks for a new
//                build once it has passed. null = nothing is scheduled.
//    supabaseUrl where the hourly check looks for saves (it uses the Worker's own SUPABASE_SECRET_KEY)
const startedAt = Number(JSON.parse(readFileSync(join(NEXT, "required-server-files.json"), "utf8")).config?.env?.BUILD_STARTED_AT);
const builtAt = Number.isFinite(startedAt) && startedAt > 0 ? startedAt : null;

// A build variable on Cloudflare; on this computer the same two lines of .env.local.
function setting(name) {
  if (process.env[name]) return process.env[name].trim();
  try {
    const line = readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith(`${name}=`));
    return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
}

async function nextPromotionChange(after) {
  const url = setting("NEXT_PUBLIC_SUPABASE_URL");
  const key = setting("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) {
    console.warn("static-pages: no Supabase address in this environment, scheduled promotions will not rebuild the pages.");
    return null;
  }
  try {
    const response = await fetch(`${url}/rest/v1/promotions?select=starts_at,ends_at&is_active=eq.true`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const times = (await response.json()).flatMap((p) => [p.starts_at, p.ends_at]).map((t) => (t ? Date.parse(t) : NaN));
    const future = times.filter((t) => Number.isFinite(t) && t > after);
    return future.length ? Math.min(...future) : null;
  } catch (error) {
    console.warn(`static-pages: could not read the promotions (${error.message}), scheduled promotions will not rebuild the pages.`);
    return null;
  }
}
const publishAt = await nextPromotionChange(builtAt ?? Date.now());
const supabaseUrl = setting("NEXT_PUBLIC_SUPABASE_URL") ?? null;
writeFileSync(
  join(".open-next", "publish-at.mjs"),
  `export const builtAt = ${builtAt};\nexport const publishAt = ${publishAt};\nexport const supabaseUrl = ${JSON.stringify(supabaseUrl)};\n`,
);

const bytes = pages.reduce((sum, route) => sum + statSync(join(OUT, `${route}.html`)).size, 0);
console.log(`static-pages: ${pages.length} pages (${(bytes / 1024).toFixed(0)} KB) + ${Object.keys(types).length} files published as static assets.`);
console.log(`static-pages: built at ${builtAt === null ? "unknown time" : new Date(builtAt).toISOString()}; next promotion start/end: ${publishAt === null ? "none" : new Date(publishAt).toISOString()}.`);
