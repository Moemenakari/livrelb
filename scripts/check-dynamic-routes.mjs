// Fails the build when a page that shows per-person data (or any API route) comes out STATIC.
//
// Why: a build without secret keys (like Cloudflare's) lets server code return early before it reads
// a cookie, and Next then prerenders the page and serves the same frozen HTML to everybody. That is
// how /checkout once showed "Sign in" to people who were signed in. Run after `next build`
// (npm run build does it); `node scripts/check-dynamic-routes.mjs [distDir]` runs it by hand.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const dist = process.argv[2] ?? ".next";
const manifestFile = join(dist, "prerender-manifest.json");
if (!existsSync(manifestFile)) {
  console.error(`check-dynamic-routes: ${manifestFile} not found (run next build first).`);
  process.exit(1);
}

// Per-person routes: never static. (/admin/manifest.webmanifest is a plain PWA file, fine static. /checkout is static ON
// PURPOSE since the free-plan work: the page holds nothing personal, and who she is, her saved details and the
// employees come from /api/checkout-init after it opens, so it is not in this list any more.)
const perPerson = [
  /^\/(en|ar)?\/?(account|track)(\/|$)/,
  /^\/(en|ar)?\/?order(\/|$)/,
  /^\/(en|ar)?\/?auth(\/|$)/,
  /^\/admin(\/|$)(?!manifest\.webmanifest)/,
  /^\/api(\/|$)/,
];
const isPerPerson = (route) => perPerson.some((re) => re.test(route));

const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
const bad = new Set(Object.keys(manifest.routes ?? {}).filter(isPerPerson));

// Also any HTML file Next wrote for such a route.
const appDir = join(dist, "server", "app");
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
for (const file of walk(appDir)) {
  if (!file.endsWith(".html")) continue;
  const route = "/" + relative(appDir, file).replace(/\\/g, "/").replace(/\.html$/, "");
  if (isPerPerson(route)) bad.add(route);
}

if (bad.size > 0) {
  console.error("\ncheck-dynamic-routes: these routes were built STATIC but show per-person data or are APIs:");
  for (const route of [...bad].sort()) console.error(`  - ${route}`);
  console.error('Add `export const dynamic = "force-dynamic";` to the page / route (or read cookies() before anything else).\n');
  process.exit(1);
}
console.log("check-dynamic-routes: OK, no per-person route is static.");
