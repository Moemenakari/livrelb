import { getSupabaseEnv } from "@/lib/supabase/env";

// GET /api/health: checks that the Supabase env vars are set and that the
// project answers. Useful right after filling in .env.local or on Vercel.
export async function GET() {
  let env;
  try {
    env = getSupabaseEnv();
  } catch {
    return Response.json({ supabase: "not_configured" }, { status: 503 });
  }

  try {
    const res = await fetch(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.publishableKey },
      cache: "no-store",
    });
    return Response.json(
      { supabase: res.ok ? "ok" : `error_${res.status}` },
      { status: res.ok ? 200 : 502 },
    );
  } catch {
    return Response.json({ supabase: "unreachable" }, { status: 502 });
  }
}
