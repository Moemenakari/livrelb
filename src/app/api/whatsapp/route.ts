import { cookies } from "next/headers";
import { REF_CODE, REF_COOKIE } from "@/lib/checkout/cookies";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";

// GET /api/whatsapp: the WhatsApp number a visitor should write to. A visitor
// who came by an employee's link (the ref cookie) writes to that employee;
// everyone else (and a link that no longer matches) writes to the shop. Digits
// only, e.g. 9613123456; null = use the shop's number from Settings.
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const ref = (await cookies()).get(REF_COOKIE)?.value;
  if (!ref || !REF_CODE.test(ref) || !isSupabaseConfigured()) return Response.json({ number: null }, { headers });
  const db = createAdminClient();
  if (!db) return Response.json({ number: null }, { headers });

  const { data } = await db.from("staff").select("phone").eq("ref_code", ref).eq("is_active", true).maybeSingle();
  const number = data?.phone ? data.phone.replace(/\D/g, "") : null;
  return Response.json({ number }, { headers });
}
