"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/icons/brand-icons";

// One sign-in dialog for the whole shop. Anything that needs an account (add to bag,
// checkout, place order) calls ensureLogin() / openLogin(): with no session it opens this
// dialog (Google, or a link sent to her email) and brings her back to the same page.

type State = { user: boolean | null; open: boolean };
let state: State = { user: null, open: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let watching = false;
function watch() {
  if (watching) return;
  watching = true;
  const auth = createClient().auth;
  auth.getSession().then(({ data }) => set({ user: Boolean(data.session) }));
  auth.onAuthStateChange((_event, session) => set({ user: Boolean(session) }));
}

export const openLogin = () => set({ open: true });

/** True when she is signed in. Otherwise opens the sign-in dialog and returns false. */
export async function ensureLogin(): Promise<boolean> {
  watch();
  if (state.user === null) set({ user: Boolean((await createClient().auth.getSession()).data.session) });
  if (state.user) return true;
  openLogin();
  return false;
}

/** For links and buttons that must not continue without an account (decided right away). */
export function blockIfSignedOut(event: { preventDefault: () => void }) {
  watch();
  if (state.user === false) {
    event.preventDefault();
    openLogin();
  }
}

/** Where she comes back to after signing in: the page she was on (read by /auth/callback). */
function rememberPage() {
  document.cookie = `livre_next=${encodeURIComponent(window.location.pathname + window.location.search)}; path=/; max-age=900; samesite=lax`;
}

export function LoginDialog() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState(false);
  const open = useSyncExternalStore(
    (l) => {
      watch();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state.open,
    () => false,
  );

  // The native dialog follows the shared state (focus trap, Escape to close).
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const redirectTo = `${typeof window === "undefined" ? "" : window.location.origin}/${locale}/auth/callback`;

  const google = async () => {
    setBusy("google");
    setError(false);
    rememberPage();
    const { error: e } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (e) {
      setBusy(null);
      setError(true);
    }
  };

  const byEmail = async () => {
    setBusy("email");
    setError(false);
    rememberPage();
    const { error: e } = await createClient().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } });
    setBusy(null);
    if (e) setError(true);
    else setSent(true);
  };

  return (
    <dialog
      ref={ref}
      aria-label={t("title")}
      onClose={() => set({ open: false })}
      onClick={(e) => e.target === e.currentTarget && set({ open: false })}
      className="m-auto w-[min(92vw,26rem)] rounded-2xl bg-background p-0 text-foreground backdrop:bg-foreground/30"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl">{t("title")}</h2>
          <button type="button" onClick={() => set({ open: false })} aria-label={t("close")} className="flex size-9 items-center justify-center rounded-full hover:bg-surface">
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>
        <p className="text-sm text-muted">{t("text")}</p>

        <button
          type="button"
          disabled={busy !== null}
          onClick={google}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line text-sm font-medium transition-colors hover:border-muted disabled:opacity-60"
        >
          {busy === "google" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <GoogleIcon className="size-5" />}
          {t("google")}
        </button>

        {sent ? (
          <p className="rounded-lg bg-surface px-4 py-3 text-sm" role="status">
            {t("sent", { email })}
          </p>
        ) : (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void byEmail();
            }}
          >
            <label htmlFor="login-email" className="text-sm font-medium">
              {t("emailLabel")}
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-lg border border-line bg-background px-4 text-base outline-none focus:border-gold"
            />
            <button type="submit" disabled={busy !== null} className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-sm font-medium text-white disabled:opacity-60">
              {busy === "email" && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {t("emailSend")}
            </button>
          </form>
        )}
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {t("error")}
          </p>
        )}
      </div>
    </dialog>
  );
}

/** A button that opens the sign-in dialog. */
export function LoginButton({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" onClick={openLogin} className={className}>
      {label}
    </button>
  );
}
