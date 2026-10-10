"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { openLogin } from "@/components/auth/login-dialog";

/**
 * Shown when Google (or the email link) sent her back with ?auth=failed (see /auth/callback):
 * a clear message and "Try again", on whatever page she was on, the checkout included.
 * The flag is removed from the address so a refresh does not show it again.
 */
export function AuthFailed() {
  const t = useTranslations("auth");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (new URL(window.location.href).searchParams.get("auth") !== "failed") return;
    // The flag is removed only when the message is shown (the effect may run twice in development).
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("auth");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      setShow(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!show) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-red-900 shadow-lg"
    >
      <p className="flex-1 text-sm">{t("failed")}</p>
      <button
        type="button"
        onClick={() => {
          setShow(false);
          openLogin();
        }}
        className="h-10 shrink-0 rounded-full bg-ink px-4 text-sm font-medium text-white"
      >
        {t("retry")}
      </button>
      <button type="button" onClick={() => setShow(false)} aria-label={t("close")} className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-red-100">
        <X className="size-5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
