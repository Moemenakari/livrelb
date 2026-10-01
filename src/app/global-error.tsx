"use client";

import "./globals.css";

// Last resort: the whole page (layout included) failed. Plain and in the
// brand colors; English and Arabic together because the language is unknown.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white px-4 text-center">
        <p className="text-6xl text-[#b08d57]">500</p>
        <h1 className="text-3xl">Something went wrong · حدث خطأ ما</h1>
        <p className="max-w-sm text-[#7a7068]">
          Please try again in a moment. · يرجى المحاولة مرة أخرى بعد قليل.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={reset} className="rounded-full bg-[#1f1a17] px-7 py-3.5 text-sm text-white">
            Try again · حاولي مجدداً
          </button>
          {/* A plain link: the whole app failed, so a full page load is the safest way out. */}
          <a href="/" className="rounded-full border border-[#1f1a17] px-7 py-3.5 text-sm">
            LIVRE
          </a>
        </div>
      </body>
    </html>
  );
}
