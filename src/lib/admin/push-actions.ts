"use server";

import { createAdminClient } from "@/lib/supabase/public";
import { isPushServiceUrl, sendPush, vapidPublicKey } from "@/lib/push/web-push";
import { AdminError, authorize, run, type ActionResult } from "./auth";

// "Notify me": the staff's phones that get a push for new orders, reviews
// and team changes (sent by /api/push/ping).

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
  /** The page re-registers a phone it already knows: no welcome notification. */
  resync?: boolean;
};

// A person's phones, newest first: older ones beyond this are forgotten.
const MAX_PHONES = 5;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Number of bytes a base64url string decodes to, or -1 when it isn't base64url. */
function b64uLength(value: string): number {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) return -1;
  return Math.floor((value.length * 3) / 4);
}

function checkEndpoint(value: unknown): string {
  if (typeof value !== "string" || value.length > 1000) throw new AdminError("This phone's notification address isn't valid.");
  if (isPushServiceUrl(value)) return value;
  throw new AdminError("This phone's notification address isn't valid.");
}

/** Saves this phone for the logged-in staff member and sends a welcome push. */
export async function savePushSubscription(input: PushSubscriptionInput): Promise<ActionResult> {
  const result = await run(async () => {
    const { staff } = await authorize();
    const endpoint = checkEndpoint(input?.endpoint);
    const p256dh = str(input?.p256dh, 200).replace(/=+$/, "");
    const auth = str(input?.auth, 100).replace(/=+$/, "");
    if (b64uLength(p256dh) !== 65 || b64uLength(auth) !== 16) throw new AdminError("This phone's notification keys aren't valid.");

    const admin = createAdminClient();
    if (!admin || !vapidPublicKey()) throw new AdminError("Notifications aren't set up on the server yet.");

    // A phone that switches account moves to the new person.
    const { error } = await admin
      .from("push_subscriptions")
      .upsert({ endpoint, p256dh, auth, staff_id: staff.id, user_agent: str(input?.userAgent, 300) || null }, { onConflict: "endpoint" });
    if (error) throw error;
    if (input?.resync) return "Notifications are on for this phone.";

    // Keep only this person's newest phones.
    const { data: mine } = await admin.from("push_subscriptions").select("id").eq("staff_id", staff.id).order("created_at", { ascending: false });
    const extra = (mine ?? []).slice(MAX_PHONES).map((p) => p.id);
    if (extra.length) await admin.from("push_subscriptions").delete().in("id", extra);

    const sent = await sendPush(
      { endpoint, p256dh, auth },
      { title: "Notifications are on", body: "New orders, reviews and team changes will show up here.", url: "/admin/activity", tag: "welcome" },
    );
    return sent === "ok"
      ? "Notifications are on for this phone."
      : "Notifications are on, but the test notification didn't arrive. Try again later.";
  });
  return result.ok ? { ok: true, message: result.data } : result;
}

/** Stops notifications on this phone (only the staff member's own phones are visible to them). */
export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize();
    if (typeof endpoint !== "string" || !endpoint || endpoint.length > 1000) throw new AdminError("This phone's notification address isn't valid.");
    const { error } = await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw error;
  });
}
