"use client";

import "./globals.css";
import messages from "../../messages/en.json";
import messagesAr from "../../messages/ar.json";

// Last resort: the whole page (layout included) failed. Plain and in the
// brand colors; English and Arabic together because the language is unknown.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const en = messages.serverError;
  const ar = messagesAr.serverError;
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white px-4 text-center">
        <p className="text-6xl text-[#7a5c30]">{"500"}</p>
        <h1 className="text-3xl">{`${en.title} · ${ar.title}`}</h1>
        <p className="max-w-sm text-[#7a7068]">{`${en.description} · ${ar.description}`}</p>
        <div className="flex gap-3">
          <button type="button" onClick={reset} className="rounded-full bg-[#1f1a17] px-7 py-3.5 text-sm text-white">
            {`${en.retry} · ${ar.retry}`}
          </button>
          {/* A plain link: the whole app failed, so a full page load is the safest way out. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="rounded-full border border-[#1f1a17] px-7 py-3.5 text-sm">
            {en.backHome}
          </a>
        </div>
      </body>
    </html>
  );
}
