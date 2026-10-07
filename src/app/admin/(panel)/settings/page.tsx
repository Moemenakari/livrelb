import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/settings-form";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const staff = await requireStaff();
  if (!staff.isOwner) return <NoAccess />;
  const db = await createClient();
  const { data: s } = await db.from("site_settings").select("*").eq("id", 1).single();
  if (!s) return <p className="text-sm text-muted">Settings couldn&apos;t be loaded.</p>;
  const d = (cents: number) => String(cents / 100);
  const announcements = Array.isArray(s.announcements)
    ? (s.announcements as { en?: string; ar?: string }[]).map((a) => ({ en: a?.en ?? "", ar: a?.ar ?? "" }))
    : [];

  return (
    <>
      <PageHeader title="Settings" subtitle="Owner only." />
      <SettingsForm
        initial={{
          deliveryFee: d(s.delivery_fee_cents),
          freeShippingOver: d(s.free_shipping_threshold_cents),
          firstOrderFree: s.first_order_free_delivery,
          daysMin: String(s.delivery_days_min),
          daysMax: String(s.delivery_days_max),
          deliveryTimeEn: s.delivery_time_en,
          deliveryTimeAr: s.delivery_time_ar,
          shippingInfoEn: s.shipping_info_en,
          shippingInfoAr: s.shipping_info_ar,
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
          charmPrice: d(s.charm_price_cents),
          requireLogin: s.checkout_requires_login,
          charmMax: String(s.charm_max),
          metaPixelId: s.meta_pixel_id,
          ga4Id: s.ga4_id,
        }}
      />
    </>
  );
}
