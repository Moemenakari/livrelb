import { NextResponse, type NextRequest } from "next/server";
import { ensureAccount } from "@/lib/checkout/customer";
import { createClient } from "@/lib/supabase/server";

// Google (or the link sent to her email) brings the customer back here: swap the code
// for a session (cookies), make her customer account, then back to the page she was on (cookie livre_next).
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/auth/callback">) {
  const { locale } = await params;
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
    // Her account exists from this moment, so staff see her in Admin > Customers.
    if (!error) await ensureAccount();
  }
  const next = request.cookies.get("livre_next")?.value;
  // Only a page of this site.
  const back = next && /^\/(en|ar)(\/[A-Za-z0-9\-_/%.?=&]*)?$/.test(next) ? next : `/${locale === "ar" ? "ar" : "en"}/checkout`;
  const response = NextResponse.redirect(new URL(back, request.url));
  response.cookies.delete("livre_next");
  return response;
}
