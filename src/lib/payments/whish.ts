import "server-only";
import type { PaymentProvider } from "./provider";

// Whish Money online payment. PLACEHOLDER until Whish gives us a merchant
// account, API keys and docs: every call answers "not_configured", so the
// storefront keeps Whish manual. To connect it, fill start() and confirm()
// from Whish's API docs and set WHISH_API_URL, WHISH_MERCHANT_ID and
// WHISH_API_KEY (test keys first) in the host's environment.

function env() {
  return {
    url: process.env.WHISH_API_URL,
    merchantId: process.env.WHISH_MERCHANT_ID,
    apiKey: process.env.WHISH_API_KEY,
  };
}

export const whish: PaymentProvider = {
  key: "whish",

  isConfigured() {
    const { url, merchantId, apiKey } = env();
    return Boolean(url && merchantId && apiKey);
  },

  async start() {
    if (!this.isConfigured()) return { ok: false, error: "not_configured" };
    // TODO(whish): call the "request payment / send OTP" endpoint.
    return { ok: false, error: "not_configured" };
  },

  async confirm() {
    if (!this.isConfigured()) return { ok: false, error: "not_configured" };
    // TODO(whish): call the "confirm with OTP" endpoint.
    return { ok: false, error: "not_configured" };
  },
};
