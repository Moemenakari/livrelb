"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { GoogleIcon } from "@/components/icons/brand-icons";
import { CedarMark } from "@/components/icons/cedar-mark";
import { usePathname } from "@/i18n/navigation";
import { isEmbeddedBrowser } from "@/lib/open-in-browser";
import { OpenInBrowserButton } from "@/components/auth/open-in-browser";

// One sign-in dialog for the whole shop. Anything that needs an account (add to bag,
// checkout, place order) calls ensureLogin() / openLogin(): with no session it opens this
// dialog (Google) and brings her back to the same page.
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

// The Supabase browser library (about 70 KB) is only downloaded when it is needed: a browser with no Supabase
// cookie ("sb-...", the same test as the proxy and SeenPing) has no session, so a visitor just looking around
// never loads it. It loads when a cookie is there, or when she taps "Continue with Google".
const hasSessionCookie = () => /(?:^|;\s*)sb-/.test(document.cookie);
const loadClient = () => import("@/lib/supabase/client").then((m) => m.createClient());

let watching = false;
function watch() {
  if (watching) return;
  watching = true;
  if (!hasSessionCookie()) {
    set({ user: false });
    return;
  }
  void loadClient().then((client) => {
    client.auth.getSession().then(({ data }) => set({ user: Boolean(data.session) }));
    client.auth.onAuthStateChange((_event, session) => set({ user: Boolean(session) }));
  });
}

export const openLogin = () => set({ open: true });

/** True when she is signed in. Otherwise opens the sign-in dialog and returns false. */
export async function ensureLogin(): Promise<boolean> {
  if (!state.required) return true;
  // Inside an in-app browser (Instagram...) Google cannot run: she fills the bag here, and signs in, in
  // Safari / Chrome (the bag goes with her), at the checkout. The order itself still needs the account.
  if (isEmbeddedBrowser()) return true;
  watch();
  if (state.user === null) set({ user: hasSessionCookie() ? Boolean((await (await loadClient()).auth.getSession()).data.session) : false });
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

// The one sign-in dialog: the LIVRE mark, one line and one big Google button. Google signs up and
// signs in; she comes back to the page she was on (see /auth/callback).
const noopSubscribe = () => () => {};

export function LoginDialog({ required: needed }: { required: boolean }) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const embedded = useSyncExternalStore(noopSubscribe, isEmbeddedBrowser, () => false);
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
    // Download the library while she reads the dialog, so the Google button answers at once.
    if (open) void loadClient();
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const redirectTo = `${typeof window === "undefined" ? "" : window.location.origin}/${locale}/auth/callback`;

  const google = async () => {
    setBusy(true);
    setError(false);
    rememberPage();
    const { error: e } = await (await loadClient()).auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (e) {
      setBusy(false);
      setError(true);
    }
  };

  return (
    <dialog
      ref={ref}
      aria-label={t("title")}
      onClose={() => set({ open: false })}
      onClick={(e) => e.target === e.currentTarget && set({ open: false })}
      className="m-auto w-[min(92vw,24rem)] rounded-2xl border border-white/40 bg-background/85 p-0 text-foreground shadow-xl backdrop-blur-md backdrop:bg-foreground/30"
    >
      <div className="relative flex flex-col items-center gap-5 px-6 pt-9 pb-8 text-center">
        <button type="button" onClick={() => set({ open: false })} aria-label={t("close")} className="absolute end-3 top-3 flex size-9 items-center justify-center rounded-full hover:bg-surface">
          <X className="size-5" strokeWidth={1.5} />
        </button>
        <div className="flex flex-col items-center gap-[0.15em] font-logo text-2xl leading-none font-semibold">
          <CedarMark className="h-[0.6em] w-auto text-cedar" />
          <span lang="en" className="-me-[0.22em] tracking-[0.22em] text-gold-dark">
            {tCommon("brandName")}
          </span>
        </div>
        <p className="text-base text-muted">{embedded ? t("inApp") : t("line")}</p>

        {embedded ? (
          <>
            <p className="text-xl leading-snug font-bold text-red-600">{t("inAppInstruction")}</p>
            <OpenInBrowserButton className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-white text-sm font-medium text-ink">{t("openInBrowser")}</OpenInBrowserButton>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={google}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-full border border-line bg-white text-base font-medium transition-colors hover:border-muted disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <GoogleIcon className="size-5" />}
            {t("google")}
          </button>
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

// Pages where she types or looks something up: the reminder never floats over them.
const NO_REMINDER = ["/track", "/account", "/checkout"];

/** A small reminder, at most once a day, for a visitor who is not signed in. */
export function LoginReminder() {
  const t = useTranslations("auth");
  const pathname = usePathname();
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

  if (!show || user !== false || NO_REMINDER.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
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
        {t("signIn")}
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
