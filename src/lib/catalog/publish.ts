import "server-only";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "./index";

// The shop's pages are static files built by `next build` (scripts/static-pages.mjs), so a saved change
// reaches customers with the next build. Cloudflare "Deploy Hook" = a secret address that starts one:
// Cloudflare dashboard > Workers & Pages > shop > Settings > Builds > Deploy Hooks, then the address goes
// in the Worker secret DEPLOY_HOOK_URL (docs/hosting.md). Cloudflare skips repeated requests that arrive
// before a build starts, so saving ten times in a row costs one or two builds.

/** True when the admin can ask Cloudflare to rebuild the pages (the secret is set). */
export const publishConfigured = () => Boolean(process.env.DEPLOY_HOOK_URL?.trim());

/**
 * Call after a change that customers can see (prices, photos, texts, offers...). Refreshes the data the
 * Worker keeps for the pages it still renders itself and asks Cloudflare to rebuild the static pages.
 * Never throws: the change is already saved, and a failure only shows in the Worker logs.
 */
export async function publishStorefront(): Promise<void> {
  revalidateTag(CATALOG_TAG, { expire: 0 });
  const hook = process.env.DEPLOY_HOOK_URL?.trim();
  if (!hook) return;
  try {
    const response = await fetch(hook, { method: "POST", signal: AbortSignal.timeout(5000) });
    // The address is a secret: log the status only.
    if (!response.ok) console.error("publish: the deploy hook answered", response.status);
  } catch (error) {
    console.error("publish: the deploy hook could not be reached", (error as Error).name);
  }
}
