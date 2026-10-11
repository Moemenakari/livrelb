"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { encodeBag } from "@/lib/bag-transfer";
import { readBag } from "@/lib/cart";
import { browserHandoffUrl } from "@/lib/open-in-browser";

/**
 * Opens this page in the phone's real browser (Safari / Chrome), with the bag in the address so it is
 * still there. For the in-app browsers only (Instagram, Facebook, TikTok...).
 */
export function OpenInBrowserButton({ className, children }: { className: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = browserHandoffUrl(window.location, navigator.userAgent, encodeBag(readBag()));
      }}
      className={className}
    >
      <ExternalLink className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
      {children}
    </button>
  );
}
