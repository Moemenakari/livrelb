"use server";

import { authorize, run, type ActionResult } from "./auth";

export type PointsMessageInput = {
  customerName: string;
  orderNumber: number;
  points: number;
  balance: number;
  couponCode: string;
  couponPercent: number;
  /** ISO date the coupon ends. */
  couponEndsAt: string;
  language: "ar" | "en";
};

const MODEL = "claude-haiku-4-5-20251001";

function dateText(iso: string, language: "ar" | "en"): string {
  return new Date(iso).toLocaleDateString(language === "ar" ? "ar-LB" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Beirut",
  });
}

/** Used when no AI key is set, or the AI is down: the same facts, fixed wording. */
function template(i: PointsMessageInput, until: string): string {
  return i.language === "ar"
    ? `مرحباً ${i.customerName} 🤍\nشكراً لثقتك بـ LIVRE! تمت إضافة ${i.points} نقطة إلى حسابك بعد استلام طلبك #${i.orderNumber}، ورصيدك الآن ${i.balance} نقطة.\nهدية منا: كوبون خصم ${i.couponPercent}% على طلبك القادم\nالكود: ${i.couponCode}\nصالح حتى ${until}.\nبانتظار تصاميمك الجديدة ✨`
    : `Hi ${i.customerName} 🤍\nThank you for choosing LIVRE! ${i.points} points were added to your account after you received order #${i.orderNumber}. Your balance is now ${i.balance} points.\nA gift from us: ${i.couponPercent}% off your next order\nCode: ${i.couponCode}\nValid until ${until}.\nCan't wait to make your next piece ✨`;
}

/**
 * Writes the WhatsApp "you won points" message for staff to send: a warm,
 * short text with the points, the balance and the reward coupon with its
 * end date. Uses Claude when ANTHROPIC_API_KEY is set, else a fixed template.
 * The facts come from the database (the model only words them).
 */
export async function writePointsMessage(input: PointsMessageInput): Promise<ActionResult<{ text: string; ai: boolean }>> {
  return run(async () => {
    await authorize("orders.edit");
    const until = dateText(input.couponEndsAt, input.language);
    const fallback = template(input, until);
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return { text: fallback, ai: false };

    const facts = `Customer first name: ${input.customerName.split(" ")[0]}
Order number: #${input.orderNumber}
Points just added: ${input.points}
New points balance: ${input.balance}
Reward coupon: ${input.couponPercent}% off the next order
Coupon code: ${input.couponCode}
Coupon valid until: ${until}`;
    const prompt = `Write a short WhatsApp message from LIVRE, a Lebanese personalized jewelry brand (gold and silver name necklaces, the 1975 Lira coin), thanking a customer who received their order and telling them they won LIVRE Points and a coupon.
Language: ${input.language === "ar" ? "Arabic, light Lebanese dialect, warm and natural" : "English, warm and natural"}.
Rules: 3 to 5 short lines, at most two emojis, mention the points, the balance, the coupon code on its own line and its end date. Do not invent any other offer, number or date. Do not use gender-specific address if you can avoid it. Output only the message.

${facts}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODEL, max_tokens: 400, messages: [{ role: "user", content: prompt }] }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return { text: fallback, ai: false };
      const body = (await res.json()) as { content?: { type: string; text?: string }[] };
      const text = body.content?.find((c) => c.type === "text")?.text?.trim();
      // Never send a message that lost the code or the points.
      if (!text || !text.includes(input.couponCode) || !text.includes(String(input.points))) return { text: fallback, ai: false };
      return { text, ai: true };
    } catch {
      return { text: fallback, ai: false };
    }
  });
}
