"use client";

import { whatsappUrl } from "@/config/site";
import { useWhatsappNumber } from "@/lib/use-whatsapp";
import { WhatsAppIcon } from "@/components/icons/brand-icons";

// The floating button: the shop's WhatsApp, or the employee's own when the visitor
// came by that employee's link (see useWhatsappNumber).
export function WhatsAppFloatLink({ number, label }: { number: string; label: string }) {
  const target = useWhatsappNumber(number);
  return (
    <a
      href={whatsappUrl(target)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="fixed end-4 bottom-4 z-30 flex size-14 items-center justify-center rounded-full bg-cedar text-white shadow-[0_8px_24px_rgba(31,26,23,0.22)] transition-transform hover:scale-105 lg:end-6 lg:bottom-6"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
