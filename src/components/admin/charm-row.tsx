"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { setCharmStatus } from "@/lib/admin/charm-actions";
import { secondaryButtonClass } from "./ui";

type Props = {
  id: string;
  status: "new" | "contacted" | "done";
  phone: string;
  /** Text to start the WhatsApp chat with. */
  message: string;
};

const next = { new: "contacted", contacted: "done", done: "new" } as const;
const label = { new: "Mark contacted", contacted: "Mark done", done: "Reopen" } as const;

export function CharmActions({ id, status, phone, message }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <a
        href={`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={secondaryButtonClass}
      >
        <MessageCircle className="size-4" aria-hidden /> WhatsApp
      </a>
      <button
        type="button"
        disabled={pending}
        className={secondaryButtonClass}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await setCharmStatus(id, next[status]);
            if (!r.ok) setError(r.error);
          })
        }
      >
        {label[status]}
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  );
}
