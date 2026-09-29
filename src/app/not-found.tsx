import Link from "next/link";
import { routing } from "@/i18n/routing";
import messages from "../../messages/en.json";
import "./globals.css";

// Only reached for URLs the i18n proxy skips (e.g. a missing /file.png).
// Everything else gets the localized app/[locale]/not-found.tsx.
export default function RootNotFound() {
  const t = messages.notFound;

  return (
    <html lang={routing.defaultLocale} dir="ltr">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl">{t.title}</h1>
        <p>{t.description}</p>
        <Link href={`/${routing.defaultLocale}`} className="underline">
          {t.backHome}
        </Link>
      </body>
    </html>
  );
}
