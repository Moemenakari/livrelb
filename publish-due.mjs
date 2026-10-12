// The scheduled check of worker.mjs, apart so that it can be tested without Cloudflare.

/**
 * Starts a Cloudflare build when a promotion's start or end time has passed.
 * `at` is the time (ms) written by scripts/static-pages.mjs, or null when nothing is scheduled.
 * Returns what it did, for the Worker logs.
 */
export async function publishWhenDue(env, at, now = Date.now(), fetchFn = fetch) {
  if (at === null || now < at) return "nothing due";
  const hook = env.DEPLOY_HOOK_URL?.trim();
  if (!hook) return "due, but DEPLOY_HOOK_URL is not set";
  const response = await fetchFn(hook, { method: "POST", signal: AbortSignal.timeout(5000) });
  // The address is a secret: only the status goes to the logs.
  return `due, deploy hook answered ${response.status}`;
}
