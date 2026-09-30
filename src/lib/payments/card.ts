import "server-only";

// Visa / Mastercard through a bank's Mastercard Payment Gateway (MPGS), the
// system most Lebanese banks use, in its "Hosted Checkout" form: the card is
// typed on the bank's own page, so card numbers never touch our site or
// database (no PCI burden). Hidden until site_settings.card_online_enabled
// is on AND the three CARD_GATEWAY_* variables are set on the server.

const VERSION = "100";

function env() {
  return {
    url: process.env.CARD_GATEWAY_URL?.replace(/\/$/, ""),
    merchantId: process.env.CARD_GATEWAY_MERCHANT_ID,
    password: process.env.CARD_GATEWAY_API_PASSWORD,
  };
}

export function cardConfigured(): boolean {
  const { url, merchantId, password } = env();
  return Boolean(url && merchantId && password);
}

async function call(method: "POST" | "GET", path: string, body?: unknown) {
  const { url, merchantId, password } = env();
  const auth = Buffer.from(`merchant.${merchantId}:${password}`).toString("base64");
  const res = await fetch(`${url}/api/rest/version/${VERSION}/merchant/${merchantId}/${path}`, {
    method,
    headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  return { ok: res.ok, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

export type CardSession = { sessionId: string; scriptUrl: string };

/** Opens a hosted checkout session for one payment attempt (reference = payments.id). */
export async function createCardSession(input: {
  reference: string;
  amountCents: number;
  orderNumber: number;
  returnUrl: string;
}): Promise<CardSession | null> {
  if (!cardConfigured()) return null;
  const { ok, json } = await call("POST", "session", {
    apiOperation: "INITIATE_CHECKOUT",
    interaction: { operation: "PURCHASE", returnUrl: input.returnUrl, merchant: { name: "LIVRE" } },
    order: {
      id: input.reference,
      amount: (input.amountCents / 100).toFixed(2),
      currency: "USD",
      description: `LIVRE order #${input.orderNumber}`,
    },
  });
  const session = json.session as { id?: string } | undefined;
  if (!ok || !session?.id) return null;
  return { sessionId: session.id, scriptUrl: `${env().url}/static/checkout/checkout.min.js` };
}

/**
 * Asks the gateway (not the browser) whether this payment attempt was paid,
 * and for how much. The returned URL parameters are never trusted.
 */
export async function cardPaymentResult(reference: string): Promise<{ paid: boolean; amountCents: number }> {
  if (!cardConfigured()) return { paid: false, amountCents: 0 };
  const { ok, json } = await call("GET", `order/${encodeURIComponent(reference)}`);
  if (!ok) return { paid: false, amountCents: 0 };
  const paid = json.result === "SUCCESS" && (json.status === "CAPTURED" || json.status === "AUTHORIZED");
  return { paid, amountCents: Math.round(Number(json.totalCapturedAmount ?? json.amount ?? 0) * 100) };
}
