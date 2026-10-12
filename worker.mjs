// Entry of the Worker "shop" (wrangler.jsonc "main"): the OpenNext worker, plus one scheduled check.
//
// The shop's pages are static files built by `next build`. Admin saves only save to the database; a build runs
// every night at 00:00 Beirut time (when something changed) and when a promotion starts or ends. Cloudflare's
// cron is UTC and Beirut changes between UTC+2 and UTC+3, so the check runs every hour (wrangler.jsonc
// "triggers") and the Beirut clock decides: publish-due.mjs. scripts/static-pages.mjs writes
// .open-next/publish-at.mjs (when these pages were built, the next promotion start/end, the database address).
// The Deploy Hook address is the Worker secret DEPLOY_HOOK_URL.
import openNext from "./.open-next/worker.js";
import { builtAt, publishAt, supabaseUrl } from "./.open-next/publish-at.mjs";
import { publishCheck } from "./publish-due.mjs";

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

const worker = {
  fetch: (request, env, ctx) => openNext.fetch(request, env, ctx),
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      publishCheck(env, { builtAt, publishAt, supabaseUrl }).then(
        (result) => console.log("publish check:", result),
        (error) => console.error("publish check failed:", error?.name),
      ),
    );
  },
};

export default worker;
