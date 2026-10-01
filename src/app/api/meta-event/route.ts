import { NextResponse, type NextRequest } from "next/server";
import { sendMetaEvent, type MetaEventInput } from "@/lib/analytics/capi";

const EVENTS = ["ViewContent", "AddToCart", "InitiateCheckout", "Purchase"] as const;

// Receives a shopping event from the browser (only sent after the visitor
// accepted cookies) and forwards it to Meta's Conversions API.
export async function POST(request: NextRequest) {
  if (request.cookies.get("livre_consent")?.value !== "granted") return new NextResponse(null, { status: 204 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return new NextResponse(null, { status: 400 });

  const event = EVENTS.find((e) => e === body.event);
  const value = Number(body.value);
  const eventId = typeof body.eventId === "string" ? body.eventId.slice(0, 80) : "";
  if (!event || !eventId || !Number.isFinite(value) || value < 0 || value > 100000) return new NextResponse(null, { status: 400 });

  const input: MetaEventInput = {
    event,
    eventId,
    value,
    productId: typeof body.id === "string" ? body.id.slice(0, 80) : undefined,
    quantity: Math.min(100, Math.max(1, Math.round(Number(body.quantity) || 1))),
    phone: typeof body.phone === "string" ? body.phone.slice(0, 30) : undefined,
    url: typeof body.url === "string" && body.url.startsWith("http") ? body.url.slice(0, 500) : undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
    ip: request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    fbp: request.cookies.get("_fbp")?.value,
    fbc: request.cookies.get("_fbc")?.value,
  };
  await sendMetaEvent(input);
  return new NextResponse(null, { status: 204 });
}
