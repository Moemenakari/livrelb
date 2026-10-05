import type { Metadata } from "next";
import Link from "next/link";
import { canSee, describe, loadNames, orderEvent, type AuditRow } from "@/lib/admin/activity";
import { requireStaff } from "@/lib/admin/auth";
import { addDays, beirutDay, beirutDayStart, dateTime, money } from "@/lib/admin/format";
import { createAdminClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { Card, Empty, PageHeader, Stat } from "@/components/admin/ui";
import { ActivityFeed } from "@/components/admin/activity-feed";

export const metadata: Metadata = { title: "Activity" };

type View = { day: string; path: string; product_slug: string | null; views: number; visitors: number };

/** Biggest first, the first `n` of a name -> count map. */
const top = (counts: Map<string, number>, n: number) => [...counts].sort((a, b) => b[1] - a[1]).slice(0, n);

const add = (counts: Map<string, number>, key: string, value: number) => counts.set(key, (counts.get(key) ?? 0) + value);

/** "Mon 5" for a YYYY-MM-DD day. */
const dayLabel = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric" }).format(new Date(`${day}T12:00:00Z`));

// Activity (every staff member): page views counted by the shop, orders and
// reviews of the last 7 Beirut days, and one feed of everything that happened
// (new orders, cancellations, reviews, every change by the team). The audit
// log and page views are readable by the owner only, so the page reads them
// with the server key, after the login check above, and shows each staff
// member only what their permissions allow (orders, reviews); changes by the
// team are for everyone.
export default async function ActivityPage() {
  const staff = await requireStaff();
  const allowed = new Set(staff.allowed);
  const seeOrders = canSee("order", allowed);
  const seeReviews = canSee("review", allowed);

  const db = createAdminClient() ?? (await createClient());
  const today = beirutDay();
  const weekFrom = addDays(today, -6);
  const since = beirutDayStart(weekFrom);
  const todayStart = Date.parse(beirutDayStart(today));

  const [viewsRes, ordersRes, reviewsRes, auditRes, latestRes] = await Promise.all([
    db.from("page_views").select("day, path, product_slug, views, visitors").gte("day", weekFrom),
    seeOrders
      ? db.from("orders").select("id, number, customer_name, total_cents, status, created_at").gte("created_at", since).limit(1000)
      : Promise.resolve({ data: [] }),
    seeReviews ? db.from("reviews").select("id, rating, created_at").gte("created_at", since).limit(1000) : Promise.resolve({ data: [] }),
    db
      .from("audit_log")
      .select("id, actor_staff_id, table_name, row_id, action, changes, created_at")
      .order("id", { ascending: false })
      .limit(300),
    seeOrders
      ? db.from("orders").select("id, number, customer_name, total_cents, created_at").order("created_at", { ascending: false }).limit(40)
      : Promise.resolve({ data: [] }),
  ]);

  // Before the database update the page_views table doesn't exist yet.
  const viewsReady = !viewsRes.error;
  const views: View[] = viewsRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const reviews = reviewsRes.data ?? [];

  const sum = (rows: View[], key: "views" | "visitors") => rows.reduce((t, r) => t + Number(r[key]), 0);
  const todayViews = views.filter((v) => v.day === today);
  const sales = (rows: typeof orders) => rows.filter((o) => o.status !== "cancelled").reduce((t, o) => t + o.total_cents, 0);
  const todayOrders = orders.filter((o) => Date.parse(o.created_at) >= todayStart);
  const periods = [
    {
      label: "Today",
      views: sum(todayViews, "views"),
      visitors: sum(todayViews, "visitors"),
      orders: todayOrders.length,
      cents: sales(todayOrders),
      reviews: reviews.filter((r) => Date.parse(r.created_at) >= todayStart).length,
    },
    {
      label: "Last 7 days",
      views: sum(views, "views"),
      visitors: sum(views, "visitors"),
      orders: orders.length,
      cents: sales(orders),
      reviews: reviews.length,
    },
  ];

  // Views per day, oldest first, days without views included.
  const perDay = new Map<string, number>();
  for (let i = 0; i < 7; i++) perDay.set(addDays(weekFrom, i), 0);
  const byPath = new Map<string, number>();
  const bySlug = new Map<string, number>();
  for (const v of views) {
    if (perDay.has(v.day)) add(perDay, v.day, Number(v.views));
    add(byPath, v.path, Number(v.views));
    if (v.product_slug) add(bySlug, v.product_slug, Number(v.views));
  }
  const maxDay = Math.max(1, ...perDay.values());
  const topPaths = top(byPath, 8);
  const topSlugs = top(bySlug, 8);

  const auditRows: AuditRow[] = auditRes.data ?? [];
  const [names, productsRes] = await Promise.all([
    loadNames(db, auditRows),
    topSlugs.length
      ? db.from("products").select("id, slug, name_en").in("slug", topSlugs.map(([slug]) => slug))
      : Promise.resolve({ data: [] }),
  ]);
  const products = new Map((productsRes.data ?? []).map((p) => [p.slug, p]));

  const events = [...describe(auditRows, names), ...(latestRes.data ?? []).map(orderEvent)]
    .filter((e) => canSee(e.kind, allowed))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 150)
    .map((e) => ({ ...e, time: dateTime(e.at) }));

  return (
    <>
      <PageHeader title="Activity" subtitle="Views, orders, reviews and every change by the team." />

      {!viewsReady && <p className="mb-4 text-sm text-muted">Views start counting after the latest database update.</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {periods.map((p) => (
          <Card key={p.label} title={p.label}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Views" value={p.views} />
              <Stat label="Visitors" value={p.visitors} />
              {seeOrders && <Stat label="Orders" value={p.orders} sub={money(p.cents)} />}
              {seeReviews && <Stat label="Reviews" value={p.reviews} />}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Views per day">
          <ul className="flex flex-col gap-2">
            {[...perDay].map(([day, count]) => (
              <li key={day} className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-2 text-sm">
                <span className={day === today ? "font-medium" : "text-muted"}>{dayLabel(day)}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-surface" aria-hidden>
                  <span className="block h-full rounded-full bg-gold" style={{ width: `${(count / maxDay) * 100}%` }} />
                </span>
                <span className="text-end tabular-nums">
                  {count}
                  <span className="sr-only"> views</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Most viewed pieces (7 days)">
          {topSlugs.length === 0 ? (
            <Empty>No product views yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {topSlugs.map(([slug, count]) => {
                const product = products.get(slug);
                return (
                  <li key={slug} className="flex items-center justify-between gap-3 py-2 text-sm">
                    {product ? (
                      <Link href={`/admin/products/${product.id}`} className="min-w-0 truncate underline-offset-4 hover:underline">
                        {product.name_en}
                      </Link>
                    ) : (
                      <span className="min-w-0 truncate text-muted" dir="ltr">
                        {slug}
                      </span>
                    )}
                    <span className="shrink-0 tabular-nums">{count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Top pages (7 days)">
          {topPaths.length === 0 ? (
            <Empty>No page views yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {topPaths.map(([path, count]) => (
                <li key={path} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate" dir="ltr">
                    {path === "/" ? "Home" : path}
                  </span>
                  <span className="shrink-0 tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Latest activity" className="mt-4">
        <ActivityFeed events={events} />
      </Card>
    </>
  );
}
