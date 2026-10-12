// The scheduled check of worker.mjs, apart so that it can be tested without Cloudflare. It runs every hour (the
// Beirut night depends on summer/winter time, so the Beirut clock decides: see src/lib/publish/rules.mjs) and
// asks Cloudflare for a build when:
//   - it is the night window (00:00-03:59 Beirut), the pages were not built yet today, and something that shows
//     on the pages was saved since the last build (audit_log), or
//   - a promotion started or ended since the last build.
import { PUBLISH_TABLE, STOREFRONT_TABLES, decidePublish } from "./src/lib/publish/rules.mjs";

/** How many saves that show on the shop's pages happened after `builtAt` (only 0 or 1 is looked up). */
async function savedSince({ supabaseUrl, key, builtAt, fetchFn }) {
  const since = encodeURIComponent(new Date(builtAt).toISOString());
  const url = `${supabaseUrl}/rest/v1/audit_log?select=id&limit=1&created_at=gt.${since}&table_name=in.(${STOREFRONT_TABLES.join(",")})`;
  const response = await fetchFn(url, { headers: { apikey: key }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()).length;
}

/** Writes "publish_auto" in the audit log: the admin shows it as "publishing started". Best effort. */
async function logRequest({ supabaseUrl, key, reason, fetchFn }) {
  await fetchFn(`${supabaseUrl}/rest/v1/audit_log`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ table_name: PUBLISH_TABLE, action: "publish_auto", changes: { reason } }),
    signal: AbortSignal.timeout(5000),
  });
}

/**
 * `data` is what scripts/static-pages.mjs wrote into .open-next/publish-at.mjs: builtAt (when the pages now live
 * were built), publishAt (next promotion start/end) and supabaseUrl. Returns what it did, for the Worker logs;
 * never throws about the audit log.
 */
export async function publishCheck(env, data, { now = Date.now(), fetchFn = fetch } = {}) {
  const { builtAt = null, publishAt = null, supabaseUrl = null } = data;
  const key = env.SUPABASE_SECRET_KEY?.trim();

  let decision = decidePublish({ now, builtAt, hasChanges: null, promoAt: publishAt });
  if (!decision.build) return decision.reason;

  // A night with nothing saved since the last build costs nothing: no build.
  if (decision.reason === "nightly" && supabaseUrl && key && typeof builtAt === "number") {
    let hasChanges = null;
    try {
      hasChanges = (await savedSince({ supabaseUrl, key, builtAt, fetchFn })) > 0;
    } catch (error) {
      console.error("publish check: could not look for saved changes:", error.message);
    }
    decision = decidePublish({ now, builtAt, hasChanges, promoAt: publishAt });
    if (!decision.build) return decision.reason;
  }

  const hook = env.DEPLOY_HOOK_URL?.trim();
  if (!hook) return `build due (${decision.reason}), but DEPLOY_HOOK_URL is not set`;
  const response = await fetchFn(hook, { method: "POST", signal: AbortSignal.timeout(5000) });
  // The address is a secret: only the status goes to the logs.
  if (!response.ok) return `build due (${decision.reason}), the deploy hook answered ${response.status}`;
  if (supabaseUrl && key) await logRequest({ supabaseUrl, key, reason: decision.reason, fetchFn }).catch(() => {});
  return `build started (${decision.reason})`;
}
