"use client";

import { useState } from "react";

type Props = {
  /** Shown on the chip (and copied unless `value` is given). */
  code: string;
  /** What is copied, when the chip shows a label such as "Copy". */
  value?: string;
  copyLabel: string;
  copiedLabel: string;
  className?: string;
};

// A promo code chip that copies itself on tap.
export function CopyCode({ code, value, copyLabel, copiedLabel, className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label={copyLabel}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value ?? code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // Clipboard blocked: the code is still visible to type.
        }
      }}
      className={`rounded-md border border-dashed border-current px-2 py-0.5 font-semibold tracking-wider transition-colors hover:bg-white/10 ${className}`}
    >
      <span lang="en" aria-live="polite">
        {copied ? copiedLabel : code}
      </span>
    </button>
  );
}
