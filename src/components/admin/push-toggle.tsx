"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Bell } from "lucide-react";
import { removePushSubscription, savePushSubscription } from "@/lib/admin/push-actions";
import { smallButtonClass } from "./ui";

// "Notify me" in the admin nav: puts this phone on the list for new orders,
// reviews and team changes (Web Push, sent by /api/push/ping). On iPhone it
// only works from the "LIVRE Admin" home-screen app (iOS 16.4+).

const noSubscription = () => () => {};

/** What this browser can do: "push", "denied", "ios-hint" (open from the home screen) or "none". */
function readSupport(): string {
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) {
    return Notification.permission === "denied" ? "denied" : "push";
  }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone ? "ios-hint" : "none";
}

function fromB64u(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Takes this phone off the list (before signing out), so a lost or shared
 * phone stops showing orders and team changes. Never throws.
 */
export async function forgetThisPhone(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator)) return;
    const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
    if (!sub) return;
    await removePushSubscription(sub.endpoint);
    await sub.unsubscribe();
  } catch {
    // Signing out must always work.
  }
}

export function PushToggle({ publicKey, className = "" }: { publicKey: string | null; className?: string }) {
  const support = useSyncExternalStore(noSubscription, readSupport, () => "none");
  const [denied, setDenied] = useState(false);
  const [on, setOn] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Is this phone already on the list? A subscription made with another key
  // (new VAPID keys) is dropped; one the browser still has is saved on the
  // server again, in case the server forgot it (or the phone has a new owner).
  useEffect(() => {
    if (!publicKey || support !== "push") return;
    let live = true;
    (async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) return live && setOn(false);
      const key = sub.options.applicationServerKey;
      const current = fromB64u(publicKey);
      if (!key || key.byteLength !== current.length || new Uint8Array(key).some((b, i) => b !== current[i])) {
        await sub.unsubscribe();
        return live && setOn(false);
      }
      const json = sub.toJSON();
      const saved = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
        resync: true,
      });
      if (live) setOn(saved.ok);
    })().catch(() => live && setOn(false));
    return () => {
      live = false;
    };
  }, [publicKey, support]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const say = (text: string) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), 6000);
  };

  if (!publicKey) return null;
  if (support === "ios-hint") {
    return (
      <p className={`text-xs leading-relaxed text-muted ${className}`}>
        For notifications on iPhone: Share, Add to Home Screen, then open LIVRE Admin from the home screen.
      </p>
    );
  }
  if (support === "denied" || denied) {
    return <p className={`text-xs text-muted ${className}`}>Notifications are blocked in this phone&apos;s settings.</p>;
  }
  if (support !== "push") return null;

  const turnOn = () => {
    // iOS Safari: the permission prompt must come straight from the tap.
    const asking = Notification.requestPermission();
    start(async () => {
      try {
        const permission = await asking;
        if (permission === "denied") {
          setDenied(true);
          return;
        }
        if (permission !== "granted") {
          say("Allow notifications to turn them on.");
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        // An old subscription may use another key: start fresh.
        await (await reg.pushManager.getSubscription())?.unsubscribe();
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u(publicKey) });
        const json = sub.toJSON();
        const result = await savePushSubscription({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          userAgent: navigator.userAgent,
        });
        if (!result.ok) {
          await sub.unsubscribe().catch(() => {});
          say(result.error);
          return;
        }
        setOn(true);
        say(result.message ?? "Notifications are on.");
      } catch {
        say("Couldn't turn on notifications. Please try again.");
      }
    });
  };

  const turnOff = () =>
    start(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        const endpoint = sub?.endpoint;
        await sub?.unsubscribe();
        setOn(false);
        const result = endpoint ? await removePushSubscription(endpoint) : null;
        say(result && !result.ok ? result.error : "Notifications are off on this phone.");
      } catch {
        say("Couldn't turn off notifications. Please try again.");
      }
    });

  return (
    <div className={className}>
      {on ? (
        <button type="button" onClick={turnOff} disabled={pending} className={smallButtonClass} aria-label="Notifications on. Turn off" title="Turn off notifications">
          <Bell className="size-3.5" strokeWidth={1.8} aria-hidden />
          Notifications on
        </button>
      ) : (
        <button type="button" onClick={turnOn} disabled={pending || on === null} className={smallButtonClass} aria-label="Notify me on this phone">
          <Bell className="size-3.5" strokeWidth={1.8} aria-hidden />
          Notify me
        </button>
      )}
      <p role="status" aria-live="polite" className="mt-1.5 text-xs text-muted empty:hidden">
        {message}
      </p>
    </div>
  );
}
