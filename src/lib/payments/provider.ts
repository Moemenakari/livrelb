import "server-only";

// Online payment providers. Cash on delivery needs none. Whish online
// payment (wallet phone + OTP from Whish) plugs in here once we have the
// merchant account and API docs; until then Whish stays manual.

export type StartPaymentInput = {
  /** Our payments.id, sent to the provider as the merchant reference. */
  reference: string;
  amountCents: number;
  currency: "USD";
  /** The customer's Whish wallet phone, E.164. Never stored in full. */
  walletPhone: string;
  orderNumber: number;
};

export type StartPaymentResult =
  | { ok: true; providerRef: string }
  | { ok: false; error: "not_configured" | "wallet_invalid" | "provider_error" };

export type ConfirmPaymentResult =
  | { ok: true; status: "paid" }
  | { ok: false; error: "otp_invalid" | "otp_expired" | "not_configured" | "provider_error" };

export interface PaymentProvider {
  readonly key: "whish";
  /** True once API keys are set for this environment. */
  isConfigured(): boolean;
  /** Asks the provider to send the OTP to the wallet phone. */
  start(input: StartPaymentInput): Promise<StartPaymentResult>;
  /** Confirms the payment with the OTP the customer received. */
  confirm(providerRef: string, otp: string): Promise<ConfirmPaymentResult>;
}
