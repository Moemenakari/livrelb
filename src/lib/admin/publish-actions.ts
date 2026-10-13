"use server";

import { refresh } from "next/cache";
import { createAdminClient } from "@/lib/supabase/public";
import { PUBLISH_TABLE } from "@/lib/publish/rules.mjs";
import { getPublishStatus } from "@/lib/publish/status";
import { AdminError, authorize, run, type ActionResult } from "./auth";

/**
 * "Publish now": asks Cloudflare for a build right away (it goes live in about 5 minutes) instead of waiting for
 * tonight's. At most 3 a day (Beirut day), and only when something saved is waiting. The press is written in the
 * audit log (action "publish_now"), which is also what counts the 3 and shows "publishing started".
 */
export async function publishNow(): Promise<ActionResult<{ startedAt: string }>> {
  return run(async () => {
    const { staff } = await authorize("settings.manage");
    const hook = process.env.DEPLOY_HOOK_URL?.trim();
    if (!hook) throw new AdminError("Publishing is not connected yet. Tell the developer.");
    const db = createAdminClient();
    if (!db) throw new AdminError("The database is not connected.");

    const status = await getPublishStatus();
    if (status.left <= 0) throw new AdminError("You already used Publish now 3 times today. The shop goes live tonight at 12:00 AM.");
    if (status.pending === 0) throw new AdminError("Everything is already live: nothing is waiting to be published.");
    if (status.startedAt) throw new AdminError("A publish is already on its way. It goes live in a few minutes.");

    let answered = 0;
    try {
      answered = (await fetch(hook, { method: "POST", signal: AbortSignal.timeout(8000) })).status;
    } catch {
      answered = 0;
    }
    // The address is a secret: only the status goes to the logs.
    if (answered < 200 || answered > 299) {
      console.error("publish now: the deploy hook answered", answered);
      throw new AdminError("Cloudflare did not accept the request. Please try again in a minute.");
    }
    const startedAt = new Date().toISOString();
    await db.from("audit_log").insert({ actor_staff_id: staff.id, table_name: PUBLISH_TABLE, action: "publish_now", changes: {} });
    refresh();
    return { startedAt };
  });
}
