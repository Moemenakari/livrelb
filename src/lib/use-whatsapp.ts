"use client";

import { useEffect, useState } from "react";

// The WhatsApp number to write to: the shop's, or the employee's own when the
// visitor came by that employee's link (see /api/whatsapp). Starts with the
// shop's number so the button works at once, then switches if needed.
let request: Promise<string | null> | null = null;

function employeeNumber(): Promise<string | null> {
  request ??= fetch("/api/whatsapp", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { number: null }))
    .then((d: { number: string | null }) => d.number)
    .catch(() => null);
  return request;
}

export function useWhatsappNumber(shopNumber: string): string {
  const [employee, setEmployee] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    // A shop without a WhatsApp number hides its buttons: never show an
    // employee's number in that case either.
    // Only visitors who came by an employee's link have the flag cookie (the ref cookie itself is httpOnly).
    const cameByLink = document.cookie.split("; ").includes("livre_ref_on=1");
    if (shopNumber && cameByLink) employeeNumber().then((n) => alive && setEmployee(n));
    return () => {
      alive = false;
    };
  }, [shopNumber]);
  return employee ?? shopNumber;
}
