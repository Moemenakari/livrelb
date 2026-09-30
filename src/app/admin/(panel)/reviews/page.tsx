import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { ReviewsManager } from "@/components/admin/review-forms";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const staff = await requireStaff();
  if (!can(staff, "reviews.manage")) return <NoAccess />;
  const db = await createClient();
  const [{ data: reviews }, { data: products }, { data: settings }] = await Promise.all([
    db
      .from("reviews")
      .select("id, customer_name, city, rating, text, source, review_date, is_approved, is_sample, photo_url, customer_id, products (name_en)")
      .order("is_approved")
      .order("created_at", { ascending: false })
      .limit(300),
    db.from("products").select("id, name_en").neq("status", "archived").order("sort_order"),
    db.from("site_settings").select("points_per_review").eq("id", 1).maybeSingle(),
  ]);
  const waiting = (reviews ?? []).filter((r) => !r.is_approved).length;

  return (
    <>
      <PageHeader title="Reviews" subtitle={waiting ? `${waiting} waiting for approval` : "Approving a customer's review gives her LIVRE Points."} />
      <ReviewsManager
        pointsPerReview={settings?.points_per_review ?? 10}
        products={(products ?? []).map((p) => ({ id: p.id, name: p.name_en }))}
        reviews={(reviews ?? []).map((r) => ({
          id: r.id,
          name: r.customer_name,
          city: r.city,
          rating: r.rating,
          text: r.text,
          source: r.source,
          date: r.review_date,
          approved: r.is_approved,
          isSample: r.is_sample,
          product: r.products?.name_en ?? null,
          photoUrl: r.photo_url,
          hasCustomer: Boolean(r.customer_id),
        }))}
      />
    </>
  );
}
