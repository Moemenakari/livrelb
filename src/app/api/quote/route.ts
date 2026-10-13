import { quoteCart } from "@/lib/checkout/actions";
import { isJsonRequest } from "@/lib/security/json-request";

// Per-person data: never prerendered or cached. scripts/check-dynamic-routes.mjs fails the build if this
// route ever comes out static (a build without secret keys used to freeze pages like this one).
export const dynamic = "force-dynamic";

// POST /api/quote: the bag's prices (nothing is saved). The same function the checkout uses, as a plain route:
// the shop's pages are static files, and a server action would POST to the page's own address, which a file
// cannot answer. Every input is checked and priced again by quoteCart / the database.
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isJsonRequest(request)) return new Response(null, { status: 415, headers });
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object") return new Response(null, { status: 400, headers });
  return Response.json(await quoteCart(input as Parameters<typeof quoteCart>[0]), { headers });
}
