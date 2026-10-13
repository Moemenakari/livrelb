"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Rocket } from "lucide-react";
import { publishNow } from "@/lib/admin/publish-actions";
import { buttonClass, secondaryButtonClass } from "./ui";

// "Publish now" with a question first: it asks Cloudflare for a build, which takes about 5 minutes and counts
// toward a limit of 3 a day.
export function PublishNow({ left, disabled }: { left: number; disabled: boolean }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await publishNow();
      setAsking(false);
      setMessage(result.ok ? { ok: true, text: "Started. The shop goes live in about 5 minutes." } : { ok: false, text: result.error });
      router.refresh();
    });

  if (asking) {
    return (
      <div className="flex max-w-sm flex-col gap-2 rounded-lg border border-gold bg-background p-3" role="alertdialog" aria-label="Publish now">
        <p className="text-sm">
          Publish the shop now? It goes live in about 5 minutes. You can do this <strong>{left}</strong> more {left === 1 ? "time" : "times"} today.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={confirm} disabled={pending} className={buttonClass}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Yes, publish
          </button>
          <button type="button" onClick={() => setAsking(false)} disabled={pending} className={secondaryButtonClass}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        onClick={() => {
          setMessage(null);
          setAsking(true);
        }}
        disabled={disabled || left <= 0}
        className={secondaryButtonClass}
      >
        <Rocket className="size-4" aria-hidden />
        Publish now
      </button>
      <span className="text-xs text-muted">{left <= 0 ? "Used 3 of 3 today" : `${left} of 3 left today`}</span>
      {message && (
        <p className={`text-xs ${message.ok ? "text-emerald-700" : "text-red-700"}`} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}
