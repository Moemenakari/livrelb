import "server-only";
import type { createAdminClient } from "@/lib/supabase/public";
import { canSee, describe, loadNames, orderEvent, type ActivityEvent } from "@/lib/admin/activity";
import { permissions, type Permission } from "@/lib/admin/permissions";
import { sendPush, vapidPublicKey, type PushMessage, type PushTarget } from "./web-push";

// Phone notifications for the staff: takes the waiting events out of
// push_outbox (new orders, audit_log lines), turns them into short messages
// and sends each phone what its owner is allowed to see. Called by
// /api/push/ping after every transaction that queued something.

type AdminDb = NonNullable<ReturnType<typeof createAdminClient>>;

/** One subscribed phone and what its staff member may see. */
export type Recipient = {
  subscriptionId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  staffId: string;
  isOwner: boolean;
  allowed: Set<Permission>;
};

export type Notification = { target: PushTarget & { subscriptionId: string }; message: PushMessage };

export type OutboxResult = { events: number; sent: number; removed: number };

// Events older than this are stale (the endpoint was down): not sent.
const MAX_AGE_MS = 6 * 3600_000;
// Keeps the "id in (...)" lists short; a bigger batch becomes a summary anyway.
const MAX_ROWS = 200;
// More messages than this for one phone in one batch: one summary instead.
const MAX_MESSAGES = 4;

/**
 * Does this phone get this event? Never about the staff member's own
 * change. Changes by the team (price, title, product details...) go to every
 * staff member; orders and reviews to those who may see them.
 */
function wants(r: Recipient, e: ActivityEvent): boolean {
  if (e.actorId && e.actorId === r.staffId) return false;
  return canSee(e.kind, r.allowed);
}

function messageFor(e: ActivityEvent): PushMessage {
  return e.kind === "team"
    ? { title: "Team update", body: `${e.title} ${e.detail}`, url: e.href, tag: e.key }
    : { title: e.title, body: e.detail, url: e.href, tag: e.key };
}

/** What to send to each phone (events newest first). Pure, for testing. */
export function buildNotifications(events: ActivityEvent[], recipients: Recipient[]): Notification[] {
  const out: Notification[] = [];
  for (const r of recipients) {
    const target = { subscriptionId: r.subscriptionId, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth };
    const messages = events.filter((e) => wants(r, e)).map(messageFor);
    if (messages.length > MAX_MESSAGES) {
      out.push({
        target,
        message: {
          title: `${messages.length} new updates`,
          body: messages.slice(0, 3).map((m) => `${m.title}: ${m.body}`).join("\n"),
          url: "/admin/activity",
          tag: "summary",
        },
      });
    } else {
      for (const message of messages) out.push({ target, message });
    }
  }
  return out;
}

/** Phones of active staff, with permissions worked out like getStaff(). */
async function loadRecipients(db: AdminDb): Promise<Recipient[]> {
  const { data, error } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, staff_id, staff (role, is_active, staff_permissions!staff_permissions_staff_id_fkey (permission, allowed))");
  if (error) throw error;
  return (data ?? []).flatMap((s) => {
    if (!s.staff?.is_active) return [];
    const isOwner = s.staff.role === "owner";
    const off = new Set(s.staff.staff_permissions.filter((p) => !p.allowed).map((p) => p.permission));
    return [
      {
        subscriptionId: s.id,
        endpoint: s.endpoint,
        p256dh: s.p256dh,
        auth: s.auth,
        staffId: s.staff_id,
        isOwner,
        allowed: new Set(permissions.filter((p) => isOwner || !off.has(p))),
      },
    ];
  });
}

/**
 * Sends what is waiting in push_outbox. The queue is claimed with one
 * delete ... returning, so two pings at once never send twice. Never
 * throws: logs a short error and returns what was done.
 */
export async function processOutbox(db: AdminDb): Promise<OutboxResult> {
  const result: OutboxResult = { events: 0, sent: 0, removed: 0 };
  try {
    // Push isn't set up: nothing can be sent, so don't let the queue grow.
    if (!vapidPublicKey()) {
      const { error } = await db.from("push_outbox").delete().gt("id", 0);
      if (error) console.error("push: outbox clear failed", error.code);
      return result;
    }

    const { data: queued, error } = await db.from("push_outbox").delete().gt("id", 0).select("audit_id, order_id, created_at");
    if (error) throw error;
    const since = Date.now() - MAX_AGE_MS;
    const fresh = (queued ?? [])
      .filter((q) => new Date(q.created_at).getTime() >= since)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const auditIds = fresh.flatMap((q) => (q.audit_id === null ? [] : [q.audit_id])).slice(0, MAX_ROWS);
    const orderIds = fresh.flatMap((q) => (q.order_id === null ? [] : [q.order_id])).slice(0, MAX_ROWS);
    if (!auditIds.length && !orderIds.length) return result;

    const [audit, orders, recipients] = await Promise.all([
      auditIds.length
        ? db.from("audit_log").select("id, actor_staff_id, table_name, row_id, action, changes, created_at").in("id", auditIds)
        : Promise.resolve({ data: [], error: null }),
      orderIds.length
        ? db.from("orders").select("id, number, customer_name, total_cents, created_at").in("id", orderIds)
        : Promise.resolve({ data: [], error: null }),
      loadRecipients(db),
    ]);
    if (audit.error) throw audit.error;
    if (orders.error) throw orders.error;
    if (!recipients.length) return result;

    const auditRows = audit.data ?? [];
    const events = [...describe(auditRows, await loadNames(db, auditRows)), ...(orders.data ?? []).map(orderEvent)].sort((a, b) =>
      b.at.localeCompare(a.at),
    );
    if (!events.length) return result;
    result.events = events.length;

    const notifications = buildNotifications(events, recipients);
    const answers = await Promise.allSettled(notifications.map((n) => sendPush(n.target, n.message)));
    const gone = new Set<string>();
    answers.forEach((a, i) => {
      if (a.status !== "fulfilled") return;
      if (a.value === "ok") result.sent++;
      if (a.value === "gone") gone.add(notifications[i].target.subscriptionId);
    });

    // Phones that unsubscribed (or were reset): forget them.
    if (gone.size) {
      const { error: removeError } = await db.from("push_subscriptions").delete().in("id", [...gone]);
      if (removeError) throw removeError;
      result.removed = gone.size;
    }
    return result;
  } catch (error) {
    const e = error as { code?: string; message?: string };
    console.error("push: sending failed", e.code ?? "", e.message?.slice(0, 120) ?? "");
    return result;
  }
}
