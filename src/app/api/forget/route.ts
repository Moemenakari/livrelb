import { clearSavedCustomer } from "@/lib/checkout/actions";
import { isJsonRequest } from "@/lib/security/json-request";

// Per-person data: never prerendered or cached. scripts/check-dynamic-routes.mjs fails the build if this
// route ever comes out static (a build without secret keys used to freeze pages like this one).
export const dynamic = "force-dynamic";

// POST /api/forget: "Not you? Clear" on the checkout: forget this browser (and sign out of Google).
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isJsonRequest(request)) return new Response(null, { status: 415, headers });
  await clearSavedCustomer();
  return new Response(null, { status: 204, headers });
}
