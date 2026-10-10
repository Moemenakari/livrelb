"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/icons/brand-icons";

// One sign-in dialog for the whole shop. Anything that needs an account (add to bag,
// checkout, place order) calls ensureLogin() / openLogin(): with no session it opens this
// dialog (Google, or a link sent to her email) and brings her back to the same page.
// There is no password and she is asked nothing here: her account is made the moment she
// signs in (see ensureAccount). Her name, phone and area are asked once, at her first order.

// `required`: Settings → "Checkout needs an account"; off = nobody is asked to sign in (set by <LoginDialog>).
type State = { user: boolean | null; open: boolean; required: boolean };
let state: State = { user: null, open: false, required: true };
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
  if (!state.required) return true;
  watch();
  if (state.user === null) set({ user: Boolean((await createClient().auth.getSession()).data.session) });
  if (state.user) return true;
  openLogin();
  return false;
}

/** For links and buttons that must not continue without an account (decided right away). */
export function blockIfSignedOut(event: { preventDefault: () => void }) {
  if (!state.required) return;
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

export function LoginDialog({ required: needed }: { required: boolean }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => set({ required: needed }), [needed]);
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
      className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-white/40 bg-background/85 p-0 text-foreground shadow-xl backdrop-blur-md backdrop:bg-foreground/30"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div role="tablist" aria-label={t("title")} className="flex gap-1 rounded-full bg-surface p-1">
            {(["in", "up"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${mode === m ? "bg-ink text-white" : "text-muted"}`}
              >
                {t(m === "in" ? "tabIn" : "tabUp")}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => set({ open: false })} aria-label={t("close")} className="flex size-9 items-center justify-center rounded-full hover:bg-surface">
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>
        <p className="text-sm text-muted">{t(mode === "in" ? "textIn" : "textUp")}</p>

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
              placeholder={t("emailPlaceholder")}
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

const NUDGE_KEY = "livre-login-nudge";
const NUDGE_EVERY = 24 * 60 * 60 * 1000;

/** A small reminder, at most once a day, for a visitor who is not signed in. */
export function LoginReminder() {
  const t = useTranslations("auth");
  const user = useSyncExternalStore(
    (l) => {
      watch();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state.user,
    () => null,
  );
  const required = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state.required,
    () => false,
  );
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (user !== false || !required) return;
    try {
      if (Date.now() - Number(localStorage.getItem(NUDGE_KEY) ?? 0) < NUDGE_EVERY) return;
    } catch {
      // Storage blocked: ask at most once per visit.
    }
    const timer = window.setTimeout(() => setShow(true), 20000);
    return () => window.clearTimeout(timer);
  }, [user, required]);

  const hide = () => {
    setShow(false);
    try {
      localStorage.setItem(NUDGE_KEY, String(Date.now()));
    } catch {
      // Not saved: it only comes back on the next visit.
    }
  };

  if (!show || user !== false) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-24 z-30 flex items-center gap-3 rounded-2xl border border-white/40 bg-background/85 p-3 shadow-lg backdrop-blur-md sm:start-6 sm:end-auto sm:w-96">
      <p className="flex-1 text-sm">{t("nudge")}</p>
      <button
        type="button"
        onClick={() => {
          hide();
          openLogin();
        }}
        className="h-10 shrink-0 rounded-full bg-ink px-4 text-sm font-medium text-white"
      >
        {t("tabIn")}
      </button>
      <button type="button" onClick={hide} aria-label={t("close")} className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-surface">
        <X className="size-5" strokeWidth={1.5} />
      </button>
    </div>
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
