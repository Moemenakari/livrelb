"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share } from "lucide-react";
import { useTranslations } from "next-intl";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const noSubscription = () => () => {};

/** Registers the service worker (app files cached on the phone, offline page). Production only. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

/**
 * "Save LIVRE on your phone": a button for Android / desktop Chrome (the
 * browser's own install box) and a short how-to for iPhone Safari. Hidden once
 * the site already runs as an app.
 */
export function InstallApp({ className = "" }: { className?: string }) {
  const t = useTranslations("install");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [showHint, setShowHint] = useState(false);
  const standalone = useSyncExternalStore(
    noSubscription,
    () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => true,
  );
  const ios = useSyncExternalStore(noSubscription, () => /iphone|ipad|ipod/i.test(navigator.userAgent), () => false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone || (!prompt && !ios)) return null;

  return (
    <div className={`flex flex-col items-start gap-2 ${className}`}>
      <button
        type="button"
        onClick={async () => {
          if (prompt) {
            await prompt.prompt();
            await prompt.userChoice;
            setPrompt(null);
          } else {
            setShowHint((v) => !v);
          }
        }}
        className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-colors hover:border-gold hover:text-gold"
      >
        <Download className="size-4" aria-hidden />
        {t("cta")}
      </button>
      {showHint && (
        <p className="flex max-w-xs items-start gap-2 text-sm text-white/70" role="note">
          <Share className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("iosHint")}
        </p>
      )}
    </div>
  );
}
