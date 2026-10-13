import { placeOrder } from "@/lib/checkout/actions";
import type { CheckoutInput } from "@/lib/checkout/types";
import { isJsonRequest } from "@/lib/security/json-request";

// Per-person data: never prerendered or cached. scripts/check-dynamic-routes.mjs fails the build if this
// route ever comes out static (a build without secret keys used to freeze pages like this one).
export const dynamic = "force-dynamic";

// POST /api/order: "Place order". The same function as before (checks every input, prices again in the database,
// honeypot, rate limit, login rule), as a plain route because the checkout page is a static file: a server action
// would post to the page's own address, which a file cannot answer. The browser sends the same requestId on every
// retry (src/lib/checkout/client.ts) and place_order returns the first order for it, so a retry never makes two.
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isJsonRequest(request)) return new Response(null, { status: 415, headers });
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object") return new Response(null, { status: 400, headers });
  return Response.json(await placeOrder(input as CheckoutInput), { headers });
}
