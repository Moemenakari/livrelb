import "server-only";

// Sends the verification code on WhatsApp with Meta's WhatsApp Cloud API: an
// "authentication" template that carries the code (and its copy-code button).
// About $0.011 a code for Lebanon, no monthly fee. Set in the server's
// environment (see .env.example); with any of them missing the phone
// verification is simply off and checkout works as before.
//
//   WHATSAPP_TOKEN            permanent token of a system user (Meta Business)
//   WHATSAPP_PHONE_NUMBER_ID  the sending number's id (WhatsApp Manager)
//   WHATSAPP_OTP_TEMPLATE     the authentication template's name (default livre_verification_code)
//
// Create the template in English (en) and in Arabic (ar); the Arabic one is
// used for visitors on the Arabic site, the English one for the rest.

const API = "https://graph.facebook.com/v21.0";

export function whatsappOtpConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

type Sent = { ok: true } | { ok: false; error: "not_configured" | "send_failed" };

async function post(to: string, code: string, language: string): Promise<{ ok: boolean; template?: boolean }> {
  const res = await fetch(`${API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: process.env.WHATSAPP_OTP_TEMPLATE || "livre_verification_code",
        language: { code: language },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
  });
  if (res.ok) return { ok: true };
  // 132001: no template in this language: the caller tries English.
  const body = (await res.json().catch(() => null)) as { error?: { code?: number } } | null;
  return { ok: false, template: body?.error?.code === 132001 };
}

/** `to`: digits only with the country code (9613123456). */
export async function sendWhatsappCode(to: string, code: string, locale: "en" | "ar"): Promise<Sent> {
  if (!whatsappOtpConfigured()) return { ok: false, error: "not_configured" };
  try {
    const first = await post(to, code, locale);
    if (first.ok) return { ok: true };
    if (locale === "ar" && first.template && (await post(to, code, "en")).ok) return { ok: true };
    return { ok: false, error: "send_failed" };
  } catch {
    return { ok: false, error: "send_failed" };
  }
}
