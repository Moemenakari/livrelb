"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag, Star, UserCog, XCircle, type LucideIcon } from "lucide-react";
import type { ActivityEvent, ActivityKind } from "@/lib/admin/activity";
import { Empty } from "./ui";

// The "Latest activity" list of the admin Activity page, with filter tabs.
// Times come formatted from the server (Beirut time).

export type FeedEvent = ActivityEvent & { time: string };

const icons: Record<ActivityKind, [LucideIcon, string]> = {
  order: [ShoppingBag, "bg-emerald-50 text-emerald-800"],
  cancel: [XCircle, "bg-red-50 text-red-800"],
  review: [Star, "bg-amber-50 text-amber-900"],
  team: [UserCog, "bg-surface text-foreground"],
};

const tabs = [
  { id: "all", label: "All", kinds: null, empty: "Nothing yet." },
  { id: "orders", label: "Orders", kinds: ["order", "cancel"], empty: "No orders yet." },
  { id: "reviews", label: "Reviews", kinds: ["review"], empty: "No reviews yet." },
  { id: "team", label: "Team", kinds: ["team"], empty: "No changes by the team yet." },
] as const satisfies { id: string; label: string; kinds: readonly ActivityKind[] | null; empty: string }[];

export function ActivityFeed({ events }: { events: FeedEvent[] }) {
  const [tabId, setTabId] = useState<(typeof tabs)[number]["id"]>("all");
  const tab = tabs.find((t) => t.id === tabId) ?? tabs[0];
  const kinds: readonly ActivityKind[] | null = tab.kinds;
  const shown = kinds ? events.filter((e) => kinds.includes(e.kind)) : events;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTabId(t.id)}
            aria-pressed={t.id === tabId}
            className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors ${
              t.id === tabId ? "border-ink bg-ink text-white" : "border-line bg-background hover:border-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Empty>{tab.empty}</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((e) => {
            const [Icon, tone] = icons[e.kind];
            return (
              <li key={e.key}>
                <Link href={e.href} className="flex items-start gap-3 py-2.5 text-sm hover:bg-surface">
                  <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
                    <Icon className="size-4" strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-medium">{e.title}</span>
                      <time dateTime={e.at} className="text-xs text-muted tabular-nums">
                        {e.time}
                      </time>
                    </span>
                    <span className="block break-words text-muted">{e.detail}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
