import { restoreBag } from "@/lib/checkout/bag-actions";
import { isJsonRequest } from "@/lib/security/json-request";

// Per-person data: never prerendered or cached. scripts/check-dynamic-routes.mjs fails the build if this
// route ever comes out static (a build without secret keys used to freeze pages like this one).
export const dynamic = "force-dynamic";

// POST /api/bag { param }: a bag that came in the address (?bag=) as real bag lines, each checked against the
// catalog and priced again by the database (restoreBag). A route and not a server action for the same reason
// as /api/quote.
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isJsonRequest(request)) return new Response(null, { status: 415, headers });
  const body = (await request.json().catch(() => null)) as { param?: unknown } | null;
  return Response.json(await restoreBag(typeof body?.param === "string" ? body.param : ""), { headers });
}
