import { getCatalog } from "@/lib/catalog";
import { getSupabaseEnv } from "@/lib/supabase/env";

// GET /api/health: are the Supabase env vars set, does the project answer,
// and where does the storefront catalog come from (supabase or static)?
export async function GET() {
  let env;
  try {
    env = getSupabaseEnv();
  } catch {
    return Response.json({ supabase: "not_configured", catalog: "static" }, { status: 503 });
  }

  try {
    const res = await fetch(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.publishableKey },
      cache: "no-store",
    });
    if (!res.ok) {
      return Response.json({ supabase: `error_${res.status}` }, { status: 502 });
    }
    const catalog = await getCatalog();
    return Response.json({
      supabase: "ok",
      catalog: catalog.source,
      products: catalog.products.length,
      categories: catalog.categories.length,
    });
  } catch (error) {
    return Response.json(
      { supabase: "error", message: error instanceof Error ? error.message : "unknown" },
      { status: 502 },
    );
  }
}
