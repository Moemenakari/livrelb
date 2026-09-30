import "server-only";
import { unstable_cache } from "next/cache";
import type { Locale } from "@/i18n/routing";
import { sampleAreas } from "@/lib/catalog/areas";
import { CATALOG_TAG } from "@/lib/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient, createPublicClient } from "@/lib/supabase/public";
import type { AreaOption, HelperOption } from "./types";

// Lists for the checkout form, loaded on the server: delivery areas, and
// the active employees for "Who helped you?" (read with the secret key, so
// staff names never go through the public API).
const load = unstable_cache(
  async () => {
    const [areas, helpers] = await Promise.all([
      createPublicClient().from("areas").select("slug, name_en, name_ar").eq("is_active", true).order("sort_order"),
      createAdminClient()?.rpc("list_helpers"),
    ]);
    return {
      areas: (areas.data ?? []).map((a) => ({ slug: a.slug, name: { en: a.name_en, ar: a.name_ar } })),
      helpers: (helpers?.data ?? []) as HelperOption[],
    };
  },
  ["checkout-options-v1"],
  { tags: [CATALOG_TAG], revalidate: 300 },
);

export async function getCheckoutOptions(
  locale: Locale,
): Promise<{ areas: AreaOption[]; helpers: HelperOption[]; available: boolean }> {
  if (!isSupabaseConfigured()) {
    return {
      areas: sampleAreas.map((a) => ({ slug: a.slug, name: a.name[locale] })),
      helpers: [],
      available: false,
    };
  }
  const { areas, helpers } = await load();
  return {
    areas: (areas.length > 0 ? areas : sampleAreas).map((a) => ({ slug: a.slug, name: a.name[locale] })),
    helpers,
    available: true,
  };
}
