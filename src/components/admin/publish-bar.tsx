import Link from "@/components/ui/plain-link";
import { getPublishStatus } from "@/lib/publish/status";
import { can, type StaffSession } from "@/lib/admin/permissions";
import { dateTime } from "@/lib/admin/format";
import { PublishNow } from "./publish-now";

// On every admin page: when the shop's pages go live, when they last did, and whether something saved is still
// waiting. Admin saves only save to the database; customers see them after the nightly publish (12:00 AM Beirut).
export async function PublishBar({ staff }: { staff: StaffSession }) {
  const s = await getPublishStatus();
  const waiting = s.pending === null ? null : s.pending > 0;

  let headline = "Changes go live tonight at 12:00 AM.";
  if (s.startedAt) headline = `Publishing now (started ${dateTime(s.startedAt)}). It goes live in a few minutes.`;
  else if (waiting === false) headline = "Everything you saved is live.";

  return (
    <section aria-label="Publishing" className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-medium">{headline}</p>
        <p className="text-muted">
          Last published: {s.builtAt ? dateTime(s.builtAt) : "unknown"}
          {" · "}
          {waiting === null ? (
            "Unpublished changes: could not check."
          ) : waiting ? (
            <>
              <strong className="text-foreground">Unpublished changes: yes</strong>{" "}
              <Link href="/admin/activity" className="underline underline-offset-2">
                see what changed
              </Link>
            </>
          ) : (
            "Unpublished changes: none."
          )}
        </p>
      </div>
      {can(staff, "settings.manage") && s.connected && <PublishNow left={s.left} disabled={waiting === false || Boolean(s.startedAt)} />}
    </section>
  );
}
