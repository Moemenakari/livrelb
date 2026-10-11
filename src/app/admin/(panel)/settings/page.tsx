import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/settings-form";
import { parseHeroCards } from "@/lib/hero-cards";
import en from "../../../../../messages/en.json";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const staff = await requireStaff();
  if (!staff.isOwner) return <NoAccess />;
  const db = await createClient();
  const [{ data: s }, { data: approved }] = await Promise.all([
    db.from("site_settings").select("*").eq("id", 1).single(),
    db.from("reviews").select("id, customer_name, city, rating, text").eq("is_approved", true).eq("is_sample", false).order("review_date", { ascending: false }).limit(100),
  ]);
  if (!s) return <p className="text-sm text-muted">Settings couldn&apos;t be loaded.</p>;
  const d = (cents: number) => String(cents / 100);
  const announcements = Array.isArray(s.announcements)
    ? (s.announcements as { en?: string; ar?: string }[]).map((a) => ({ en: a?.en ?? "", ar: a?.ar ?? "" }))
    : [];

  return (
    <>
      <PageHeader title="Settings" subtitle="Admins only. Delivery is in Delivery & times, charm prices are in Charms." />
      <SettingsForm
        initial={{
          whatsapp: s.whatsapp_number,
          instagram: s.instagram_url,
          pointsEnabled: s.points_enabled,
          pointsPerStep: String(s.points_per_step),
          pointsStepDollars: d(s.points_step_cents),
          rewardPercent: String(s.reward_coupon_percent),
          rewardDays: String(s.reward_coupon_days),
          pointsPerReview: String(s.points_per_review),
          redeemPoints: String(s.points_redeem_points),
          redeemDollars: d(s.points_redeem_cents),
          announcements,
          heroCards: parseHeroCards((s as { hero_cards?: unknown }).hero_cards),
          requireLogin: s.checkout_requires_login,
          metaPixelId: s.meta_pixel_id,
          ga4Id: s.ga4_id,
        }}
        reviews={(approved ?? []).map((r) => ({ id: r.id, rating: r.rating, text: r.text, author: r.customer_name, city: r.city ?? "" }))}
        heroLabels={en.adminHeroCards}
      />
    </>
  );
}
