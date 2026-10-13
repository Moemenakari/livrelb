import "server-only";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "./index";

// The shop's pages are static files built by `next build`. An admin save ONLY saves to the database: customers
// see it with the next build, which runs every night at 00:00 Beirut time (when something changed) or when
// someone presses "Publish now" in the admin. See src/lib/publish, publish-due.mjs and docs/hosting.md.

/** True when builds can be asked for: the Cloudflare Deploy Hook address is in the Worker secret DEPLOY_HOOK_URL. */
export const publishConfigured = () => Boolean(process.env.DEPLOY_HOOK_URL?.trim());

/**
 * Call after a change customers can see (prices, photos, texts, offers...). It refreshes the data of the few pages
 * the Worker still renders itself (a product created today has no static page until the next build). It does NOT
 * start a build.
 */
export function storefrontChanged(): void {
  revalidateTag(CATALOG_TAG, { expire: 0 });
}
