import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { REF_CODE, REF_COOKIE, REF_MAX_AGE } from "./lib/checkout/cookies";

const intl = createMiddleware(routing);

// Admin session timeout: after this long without opening an admin page the
// staff member is signed out and must log in again (phones get lost).
const ADMIN_SEEN = "livre_admin_seen";
const ADMIN_IDLE_MS = 2 * 60 * 60 * 1000;
// "Keep me signed in on this phone" (cookie set at login): 30 days.
const ADMIN_KEEP = "livre_admin_keep";
const ADMIN_KEEP_IDLE_MS = 30 * 24 * 60 * 60 * 1000;

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
  // The admin (/admin) is English only, outside the locale routes. Its
  // pages check the login themselves; here the session is only refreshed.
  if (/^\/admin(\/|$)/.test(request.nextUrl.pathname)) {
    let response = NextResponse.next({ request });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const secure = process.env.NODE_ENV === "production";
    const seen = Number(request.cookies.get(ADMIN_SEEN)?.value);
    const loggedIn = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));

    // Idle too long: sign out here and send to the login page.
    if (url && key && loggedIn && seen && Date.now() - seen > (request.cookies.get(ADMIN_KEEP)?.value === "1" ? ADMIN_KEEP_IDLE_MS : ADMIN_IDLE_MS)) {
      const out = NextResponse.redirect(new URL("/admin/login?expired=1", request.url));
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (list) => list.forEach(({ name, value, options }) => out.cookies.set(name, value, options)),
        },
      });
      await supabase.auth.signOut();
      out.cookies.set(ADMIN_SEEN, "", { path: "/admin", maxAge: 0 });
      out.headers.set("X-Robots-Tag", "noindex, nofollow");
      return out;
    }

    if (url && key) {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (list) => {
            // The refreshed login goes to the page (request) and the browser.
            list.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      });
      await supabase.auth.getUser();
    }
    if (loggedIn) {
      response.cookies.set(ADMIN_SEEN, String(Date.now()), { path: "/admin", httpOnly: true, sameSite: "lax", secure });
    }
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

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
  return refreshSession(request, response);
}

/** Refreshes the Supabase login (Google customers, staff) when there is one. */
async function refreshSession(request: NextRequest, response: NextResponse) {
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
