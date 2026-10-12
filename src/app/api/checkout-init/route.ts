import { savedCustomer } from "@/lib/checkout/customer";
import { getHelpers } from "@/lib/checkout/options";

// Per-person data: never prerendered or cached. scripts/check-dynamic-routes.mjs fails the build if this
// route ever comes out static (a build without secret keys used to freeze pages like this one).
export const dynamic = "force-dynamic";

// GET /api/checkout-init: what the static checkout page cannot know: who this browser is (signed in with
// Google, or remembered: her saved details prefill the form) and the employees for "Who helped you?" (read with
// the secret key, so staff names never go through the public API).
export async function GET() {
  const [saved, helpers] = await Promise.all([savedCustomer(), getHelpers()]);
  return Response.json({ saved, helpers }, { headers: { "Cache-Control": "private, no-store" } });
}
