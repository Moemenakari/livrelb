import { NextResponse, type NextRequest } from "next/server";
import { ensureAccount } from "@/lib/checkout/customer";
import { createClient } from "@/lib/supabase/server";

// Google (or the link sent to her email) brings the customer back here: swap the code
// for a session (cookies), make her customer account, then back to the page she was on (cookie livre_next).
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/auth/callback">) {
  const { locale } = await params;
  const code = request.nextUrl.searchParams.get("code");
  // No code (she cancelled, or Google refused) or a code that can't be swapped: she is sent back
  // with ?auth=failed, and the page shows a clear message with "Try again" (<AuthFailed>).
  let failed = !code || request.nextUrl.searchParams.has("error");
  if (code && !failed) {
    const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
    if (error) failed = true;
    // Her account exists from this moment, so staff see her in Admin > Customers.
    else await ensureAccount();
  }
  const next = request.cookies.get("livre_next")?.value;
  // Only a page of this site.
  const back = next && /^\/(en|ar)(\/[A-Za-z0-9\-_/%.?=&]*)?$/.test(next) ? next : `/${locale === "ar" ? "ar" : "en"}/checkout`;
  const target = new URL(back, request.url);
  if (failed) target.searchParams.set("auth", "failed");
  const response = NextResponse.redirect(target);
  response.cookies.delete("livre_next");
  return response;
}
