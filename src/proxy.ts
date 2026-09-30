import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { REF_CODE, REF_COOKIE, REF_MAX_AGE } from "./lib/checkout/cookies";

const intl = createMiddleware(routing);

const refCookie = {
  maxAge: REF_MAX_AGE,
  path: "/",
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

// Adds the locale prefix (/en, /ar) to every page request, and remembers
// an employee's ref link (brief §5): livrelb.com/r/amal opens the home page,
// any URL with ?ref=amal opens as usual; both save the code in a cookie that
// the checkout sends with the order. Browsers signed in with Google get
// their Supabase session refreshed; everyone else skips that.
export default async function proxy(request: NextRequest) {
  const personal = request.nextUrl.pathname.match(/^\/r\/([^/]+)\/?$/);
  if (personal) {
    const code = personal[1].toLowerCase();
    const response = NextResponse.redirect(new URL("/", request.url));
    if (REF_CODE.test(code)) response.cookies.set(REF_COOKIE, code, refCookie);
    return response;
  }

  const response = intl(request);
  const ref = request.nextUrl.searchParams.get("ref")?.toLowerCase();
  if (ref && REF_CODE.test(ref)) response.cookies.set(REF_COOKIE, ref, refCookie);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key && request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }),
      },
    });
    await supabase.auth.getUser();
  }
  return response;
}

export const config = {
  // Skip API routes, Next.js/Vercel internals and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
