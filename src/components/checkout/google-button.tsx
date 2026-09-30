"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/icons/brand-icons";

// Optional "Continue with Google" (Supabase Auth). Her details are saved to
// the account at her next order, so the checkout is prefilled on any device.
// The email Google shares stays in Supabase Auth: never shown, never used.
export function GoogleButton({ locale }: { locale: string }) {
  const t = useTranslations("checkout");
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { error } = await createClient().auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/${locale}/auth/callback` },
        });
        if (error) setBusy(false);
      }}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-background text-sm font-medium transition-colors hover:border-muted disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <GoogleIcon className="size-5" />}
      {t("google")}
    </button>
  );
}
