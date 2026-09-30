// OpenNext adapter for Cloudflare Workers (npm run preview / npm run deploy).
// Caches: rendered pages in R2, revalidateTag timestamps in D1, background
// revalidation through a Durable Object queue. Bindings: wrangler.jsonc.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: doQueue,
});
