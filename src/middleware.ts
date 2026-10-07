import { createServerClient } from "@supabase/ssr";
// This file is `middleware.ts` (edge), NOT `proxy.ts` (Node): OpenNext adds the OG image library (satori +
// resvg.wasm, +0.9 MiB gzip) to every Node middleware, and the Worker must stay under 3 MiB on the free
// plan (2.1 MiB with this). Next prints a "deprecated" notice for it; that is expected.
// NextResponse comes from its own file: "next/server" (and next-intl's middleware, which imports it) also
// carries the OG image library (satori + resvg.wasm, about 1.4 MB gzip-heavy) into the Worker.
import { NextResponse } from "next/dist/server/web/spec-extension/response";
import type { NextRequest } from "next/dist/server/web/spec-extension/request";
import { REF_CODE, REF_COOKIE, REF_FLAG_COOKIE, REF_MAX_AGE } from "./lib/checkout/cookies";

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

// Sends every page request to its /en address, and remembers
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

  // The Arabic website is gone: /ar/... opens the same page in English.
  if (/^\/ar(\/|$)/.test(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.pathname.replace(/^\/ar/, "/en");
    return NextResponse.redirect(url, 308);
  }

  const personal = request.nextUrl.pathname.match(/^\/r\/([^/]+)\/?$/);
  if (personal) {
    const code = personal[1].toLowerCase();
    const response = NextResponse.redirect(new URL("/", request.url));
    if (REF_CODE.test(code)) {
      response.cookies.set(REF_COOKIE, code, refCookie);
      response.cookies.set(REF_FLAG_COOKIE, "1", { ...refCookie, httpOnly: false });
    }
    return response;
  }

  // English only: /en/... is the website; anything else goes to its /en twin ("/" opens /en).
  const { pathname } = request.nextUrl;
  let response: NextResponse;
  if (/^\/en(\/|$)/.test(pathname)) {
    const headers = new Headers(request.headers);
    headers.set("X-NEXT-INTL-LOCALE", "en");
    response = NextResponse.next({ request: { headers } });
  } else {
    const url = request.nextUrl.clone();
    url.pathname = `/en${pathname === "/" ? "" : pathname}`;
    response = NextResponse.redirect(url);
  }
  const ref = request.nextUrl.searchParams.get("ref")?.toLowerCase();
  if (ref && REF_CODE.test(ref)) {
    response.cookies.set(REF_COOKIE, ref, refCookie);
    response.cookies.set(REF_FLAG_COOKIE, "1", { ...refCookie, httpOnly: false });
  }
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
