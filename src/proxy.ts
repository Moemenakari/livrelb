import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Adds the locale prefix (/en, /ar) to every page request.
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next.js/Vercel internals and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
