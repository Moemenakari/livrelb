import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google sends the customer back here: swap the code for a session
// (cookies), then back to the checkout, now prefilled from her account.
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/auth/callback">) {
  const { locale } = await params;
  const code = request.nextUrl.searchParams.get("code");
  if (code) await (await createClient()).auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(`/${locale === "ar" ? "ar" : "en"}/checkout`, request.url));
}
