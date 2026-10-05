import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/public";
import { processOutbox } from "@/lib/push/notify";

// POST /api/push/ping: called by the database (pg_net, after commit) when a
// new order or an audit_log line was queued in push_outbox. The ping carries
// a secret that only the database and this server know (private.push_config,
// checked with check_push_secret): anyone else gets a plain 404 and the queue
// is left alone. Nothing is returned, so no counts leak. POST handlers are
// never cached or prerendered; other methods get 405.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-push-secret");
  const db = createAdminClient();
  if (!secret || secret.length > 200 || !db) return new NextResponse(null, { status: 404 });
  const { data: ok } = await db.rpc("check_push_secret", { p_secret: secret });
  if (ok !== true) return new NextResponse(null, { status: 404 });
  await processOutbox(db);
  return new NextResponse(null, { status: 204 });
}
