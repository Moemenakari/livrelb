import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ensureAccount } from "@/lib/checkout/customer";
import { getSupabaseEnv } from "@/lib/supabase/env";

// Google (or the link sent to her email) brings the customer back here: swap the code
// for a session (cookies), make her customer account, then back to the page she was on (cookie livre_next).
// The session cookies are written onto the redirect response itself, so the browser always keeps them
// (she stays signed in on every page after this).
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/auth/callback">) {
  const { locale } = await params;
  const code = request.nextUrl.searchParams.get("code");
  // No code (she cancelled, or Google refused) or a code that can't be swapped: she is sent back
  // with ?auth=failed, and the page shows a clear message with "Try again" (<AuthFailed>).
  let failed = !code || request.nextUrl.searchParams.has("error");
  const session: { name: string; value: string; options: CookieOptions }[] = [];
  if (code && !failed) {
    const jar = await cookies();
    const { url, publishableKey } = getSupabaseEnv();
    const supabase = createServerClient(url, publishableKey, {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (list) =>
          list.forEach((cookie) => {
            session.push(cookie);
            // Also in this request's cookie jar, so ensureAccount() below sees the new session.
            try {
              jar.set(cookie.name, cookie.value, cookie.options);
            } catch {
              // Not writable here: the response below carries it anyway.
            }
          }),
      },
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
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
  session.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  response.cookies.delete("livre_next");
  return response;
}
