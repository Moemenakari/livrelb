import { NextResponse, type NextRequest } from "next/server";
import { cardPaymentResult } from "@/lib/payments/card";
import { createAdminClient } from "@/lib/supabase/public";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Where the bank's page sends the customer back. The URL is not trusted:
// the gateway is asked whether the payment attempt was really paid, and for
// the right amount, before the order is marked paid.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const payment = params.get("payment") ?? "";
  const number = (params.get("order") ?? "").replace(/\D/g, "").slice(0, 12);
  const locale = params.get("locale") === "ar" ? "ar" : "en";
  const back = new URL(`/${locale}/order/${number}`, request.nextUrl.origin);

  const db = createAdminClient();
  if (!db || !UUID.test(payment) || !number) return NextResponse.redirect(back);

  const { data: row } = await db
    .from("payments")
    .select("id, status, amount_cents, orders (number)")
    .eq("id", payment)
    .eq("provider", "card")
    .maybeSingle();
  if (!row || row.orders?.number !== Number(number)) return NextResponse.redirect(back);

  if (row.status === "paid") {
    back.searchParams.set("paid", "1");
  } else {
    const result = await cardPaymentResult(row.id);
    if (result.paid && result.amountCents === row.amount_cents) {
      await db.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", row.id);
      back.searchParams.set("paid", "1");
    } else {
      await db.from("payments").update({ status: "failed", error_code: "declined" }).eq("id", row.id);
      back.searchParams.set("paid", "0");
    }
  }
  return NextResponse.redirect(back);
}
