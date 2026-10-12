// Entry of the Worker "shop" (wrangler.jsonc "main"): the OpenNext worker, plus one scheduled check.
//
// The shop's pages are static files built by `next build`, so a promotion that starts or ends by its own
// clock only shows after the next build. scripts/static-pages.mjs writes the time of the next start/end into
// .open-next/publish-at.mjs; every 15 minutes (wrangler.jsonc "triggers") this asks Cloudflare for a new
// build once that time has passed. The Deploy Hook address is the Worker secret DEPLOY_HOOK_URL.
import openNext from "./.open-next/worker.js";
import { publishAt } from "./.open-next/publish-at.mjs";
import { publishWhenDue } from "./publish-due.mjs";

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

const worker = {
  fetch: (request, env, ctx) => openNext.fetch(request, env, ctx),
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      publishWhenDue(env, publishAt).then(
        (result) => console.log("publish check:", result),
        (error) => console.error("publish check failed:", error?.name),
      ),
    );
  },
};

export default worker;
