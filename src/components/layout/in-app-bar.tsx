"use client";

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { OpenInBrowserButton } from "@/components/auth/open-in-browser";
import { createLocalStore } from "@/lib/local-store";
import { isEmbeddedBrowser } from "@/lib/open-in-browser";

const hidden = createLocalStore<boolean>("livre:inapp-bar-hidden", false);
const noopSubscribe = () => () => {};

/** A small bar at the top, from the first visit, inside the in-app browsers only: open the shop in the real browser. */
export function InAppBar() {
  const t = useTranslations("auth");
  const embedded = useSyncExternalStore(noopSubscribe, isEmbeddedBrowser, () => false);
  const dismissed = useSyncExternalStore(hidden.subscribe, hidden.read, hidden.serverSnapshot);
  if (!embedded || dismissed) return null;
  return (
    <div role="region" aria-label={t("inAppBar")} className="relative z-[1] flex items-center gap-2 bg-ink px-3 py-2 text-xs text-white">
      <p className="min-w-0 flex-1 leading-snug">{t("inAppBar")}</p>
      <OpenInBrowserButton className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-medium text-ink">{t("openShort")}</OpenInBrowserButton>
      <button type="button" onClick={() => hidden.write(true)} aria-label={t("close")} className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
        <X className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
