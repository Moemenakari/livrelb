// When the shop's pages are rebuilt, and the Beirut clock behind it. Plain JavaScript (no imports) so that the
// Worker's scheduled check (worker.mjs / publish-due.mjs) and the admin (src/lib/publish/status.ts) share ONE copy.
//
// The pages customers browse are static files built by `next build`. Admin saves only save to the database;
// one build runs every night at 00:00 Beirut time and publishes everything saved since the last build ("Publish
// now" in the admin is the only other way). Cloudflare's cron runs in UTC, and Beirut is UTC+2 in winter and UTC+3
// in summer, so the Worker is woken at 21:00, 22:00 and 23:00 UTC (wrangler.jsonc): one of them is Beirut's midnight
// in either season and the others are retries. Each time it asks the Beirut clock (Intl knows the daylight saving
// rules) whether it is the night window.

export const TIME_ZONE = "Asia/Beirut";

/** The night window: Beirut hours 0 to 3 (the three daily wake-ups reach at most two of them, so one retry). */
export const NIGHT_HOURS = 4;

/** "Publish now" can be used this many times per Beirut day. */
export const PUBLISH_NOW_PER_DAY = 3;

/**
 * audit_log.table_name of the tables whose changes show on the shop's pages. A save in one of them is an
 * "unpublished change" until the next build. (Orders, customers, coupons, points and staff never appear on the
 * static pages, so they do not count.)
 */
export const STOREFRONT_TABLES = [
  "areas",
  "categories",
  "charm_items",
  "collection_products",
  "collections",
  "fonts",
  "home_section_items",
  "home_section_products",
  "home_sections",
  "materials",
  "product_categories",
  "product_fonts",
  "product_materials",
  "product_media",
  "product_options",
  "products",
  "promotions",
  "reviews",
  "site_settings",
];

/** audit_log.table_name of the lines written when a build is asked for (action "publish_now" or "publish_auto"). */
export const PUBLISH_TABLE = "publish";

const clock = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

function beirutParts(ms) {
  const out = {};
  for (const { type, value } of clock.formatToParts(ms)) out[type] = value;
  return out;
}

/** "2026-10-12": the Beirut calendar day of a moment (ms since 1970). */
export function beirutDay(ms) {
  const p = beirutParts(ms);
  return `${p.year}-${p.month}-${p.day}`;
}

/** 0 to 23: the hour on the Beirut clock. */
export function beirutHour(ms) {
  return Number(beirutParts(ms).hour);
}

/**
 * The first moment (ms) of the Beirut day that `ms` falls in. Found by searching, not by adding an offset:
 * Lebanon changes its clock at midnight, so some days start at 01:00 and some are 23 or 25 hours long.
 */
export function beirutDayStart(ms) {
  const day = beirutDay(ms);
  let low = ms - 26 * 3600_000; // certainly the day before
  let high = ms; // certainly inside the day
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (beirutDay(mid) === day) high = mid;
    else low = mid;
  }
  return high;
}

/**
 * Should the nightly build start now? `builtAt` is when the pages now live were built (ms, null if unknown) and
 * `hasChanges` says whether anything saved after that shows on the pages (null = could not check: assume yes).
 * Promotions that start or end by the clock do NOT start builds: their discount codes are checked by the database
 * at checkout, and the promo bar changes with the next publish.
 */
export function decidePublish({ now, builtAt, hasChanges }) {
  if (beirutHour(now) >= NIGHT_HOURS) return { build: false, reason: "not the night window" };
  if (typeof builtAt === "number" && beirutDay(builtAt) === beirutDay(now)) return { build: false, reason: "already published today" };
  if (hasChanges === false) return { build: false, reason: "nothing changed" };
  return { build: true, reason: "nightly" };
}
