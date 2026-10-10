"use client";

import { useState } from "react";
import { BadgeCheck, MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/config/site";
import { setPhoneVerified } from "@/lib/admin/customer-actions";
import { smallButtonClass } from "./ui";

type Props = {
  customerId: string;
  name: string;
  /** null = signed in but no phone yet (she gives it at her first order). */
  phone: string | null;
  verified: boolean;
  /** Can this person mark customers verified? */
  canEdit: boolean;
};

// Verify a customer's number: chat with her on WhatsApp, then mark her
// Verified (or Not verified). The change shows at once and is saved in the background.
export function VerifyControls({ customerId, name, phone, verified, canEdit }: Props) {
  const [ok, setOk] = useState(verified);
  const [error, setError] = useState<string | null>(null);
  const first = name.split(/\s+/)[0];

  const toggle = () => {
    const next = !ok;
    setError(null);
    setOk(next);
    void setPhoneVerified(customerId, next).then((r) => {
      if (!r.ok) {
        setOk(!next);
        setError(r.error);
      }
    });
  };

  if (!phone) return <span className="text-xs text-muted">No phone yet: she gives it at her first order.</span>;

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <a
        href={whatsappUrl(phone, `Hi ${first}, this is LIVRE 🤍 We're confirming your number for your account. Is this you?`)}
        target="_blank"
        rel="noopener noreferrer"
        className={smallButtonClass}
        aria-label={`WhatsApp ${name}`}
      >
        <MessageCircle className="size-3.5" aria-hidden /> WhatsApp
      </a>
      {canEdit ? (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={ok}
          className={`${smallButtonClass} ${ok ? "border-emerald-300 bg-emerald-50 text-emerald-800" : ""}`}
        >
          <BadgeCheck className="size-3.5" aria-hidden /> {ok ? "Verified" : "Mark verified"}
        </button>
      ) : (
        <span className={`text-xs ${ok ? "text-emerald-700" : "text-muted"}`}>{ok ? "Verified" : "Not verified"}</span>
      )}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
