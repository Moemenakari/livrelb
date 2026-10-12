import "server-only";
import { createAdminClient } from "@/lib/supabase/public";
import { publishConfigured } from "@/lib/catalog/publish";
import { PUBLISH_NOW_PER_DAY, PUBLISH_TABLE, STOREFRONT_TABLES, beirutDayStart } from "./rules.mjs";

export type PublishStatus = {
  /** When the pages now live were built (ISO); null in development. */
  builtAt: string | null;
  /** Saves that show on the pages and are not live yet; null = could not check. */
  pending: number | null;
  /** A build was asked for in the last 20 minutes (a build times out after 20) and is not live yet: when (ISO). */
  startedAt: string | null;
  /** "Publish now" presses left today (Beirut day). */
  left: number;
  /** The Deploy Hook secret is set. */
  connected: boolean;
};

const iso = (ms: number) => new Date(ms).toISOString();

/** What the admin bar shows. `BUILD_STARTED_AT` is inlined by next.config.ts when the pages are built. */
export async function getPublishStatus(): Promise<PublishStatus> {
  const builtMs = Number(process.env.BUILD_STARTED_AT) || null;
  const status: PublishStatus = {
    builtAt: builtMs ? iso(builtMs) : null,
    pending: null,
    startedAt: null,
    left: PUBLISH_NOW_PER_DAY,
    connected: publishConfigured(),
  };
  const db = createAdminClient();
  if (!db) return status;

  const [pending, started, used] = await Promise.all([
    builtMs
      ? db.from("audit_log").select("id", { count: "exact", head: true }).in("table_name", STOREFRONT_TABLES).gt("created_at", iso(builtMs))
      : null,
    builtMs
      ? db.from("audit_log").select("created_at").eq("table_name", PUBLISH_TABLE).gt("created_at", iso(Math.max(builtMs, Date.now() - 20 * 60_000))).order("created_at", { ascending: false }).limit(1)
      : null,
    db.from("audit_log").select("id", { count: "exact", head: true }).eq("table_name", PUBLISH_TABLE).eq("action", "publish_now").gte("created_at", iso(beirutDayStart(Date.now()))),
  ]);
  if (pending && !pending.error) status.pending = pending.count ?? 0;
  if (started && !started.error) status.startedAt = started.data?.[0]?.created_at ?? null;
  if (!used.error) status.left = Math.max(0, PUBLISH_NOW_PER_DAY - (used.count ?? 0));
  return status;
}
