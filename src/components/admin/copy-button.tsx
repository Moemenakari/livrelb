"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { smallButtonClass } from "./ui";

/** Copies a text (a link, a code); "Share" opens the phone's share sheet when there is one. */
export function CopyButton({ text, label = "Copy", share = false }: { text: string; label?: string; share?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex gap-1.5">
      <button
        type="button"
        className={smallButtonClass}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard blocked: the text stays visible to copy by hand.
          }
        }}
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        {copied ? "Copied" : label}
      </button>
      {share && (
        <button
          type="button"
          className={smallButtonClass}
          onClick={() => {
            if (navigator.share) navigator.share({ url: text }).catch(() => {});
            else navigator.clipboard.writeText(text).catch(() => {});
          }}
        >
          <Share2 className="size-3.5" aria-hidden />
          Share
        </button>
      )}
    </span>
  );
}
