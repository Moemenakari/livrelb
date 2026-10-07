"use server";

import { cookies } from "next/headers";
import { rateLimit } from "@/lib/security/rate-limit";
import { createUploadUrl, isR2Configured } from "@/lib/storage/r2";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";
import { ORDERS_COOKIE } from "./cookies";

// After she orders by transfer (all of it, or a deposit): she sends the money to
// our number, taps "I sent the transfer" (optionally with a screenshot of the
// receipt) and staff confirm the payment in the admin. Only the browser that
// placed the order can do this (its id is in the httpOnly orders cookie).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RECEIPT = 5 * 1024 * 1024;
const receiptTypes = ["image/jpeg", "image/png", "image/webp"];

export type TransferError = "not_found" | "rate_limited" | "invalid_file" | "unavailable" | "failed";

async function myOrderId(orderNumber: unknown): Promise<{ id: string; db: NonNullable<ReturnType<typeof createAdminClient>> } | null> {
  if (!isSupabaseConfigured() || typeof orderNumber !== "number" || !Number.isInteger(orderNumber)) return null;
  const db = createAdminClient();
  if (!db) return null;
  const mine = ((await cookies()).get(ORDERS_COOKIE)?.value ?? "").split(".").filter((id) => UUID.test(id));
  const { data } = await db.from("orders").select("id, status, payment_method").eq("number", orderNumber).maybeSingle();
  // Only an order paid by transfer or with a deposit (not by card), and not cancelled.
  if (!data || !mine.includes(data.id) || data.status === "cancelled" || data.payment_method === "card") return null;
  return { id: data.id, db };
}

/** A signed link to upload the screenshot of the transfer receipt (a picture, up to 5 MB). */
export async function createReceiptUpload(input: {
  orderNumber: number;
  contentType: string;
  size: number;
}): Promise<{ ok: true; uploadUrl: string; publicUrl: string } | { ok: false; error: TransferError }> {
  if (!isR2Configured()) return { ok: false, error: "unavailable" };
  if (!receiptTypes.includes(input.contentType) || !Number.isFinite(input.size) || input.size <= 0 || input.size > MAX_RECEIPT) {
    return { ok: false, error: "invalid_file" };
  }
  const order = await myOrderId(input.orderNumber);
  if (!order) return { ok: false, error: "not_found" };
  if (!(await rateLimit("receipt", order.id))) return { ok: false, error: "rate_limited" };
  const target = await createUploadUrl({ folder: "receipts", contentType: input.contentType });
  return { ok: true, uploadUrl: target.uploadUrl, publicUrl: target.publicUrl };
}

/** "I sent the transfer": the team is told and checks it (with the receipt, when she added one). */
export async function reportTransfer(input: { orderNumber: number; proofUrl?: string }): Promise<{ ok: true } | { ok: false; error: TransferError }> {
  const order = await myOrderId(input.orderNumber);
  if (!order) return { ok: false, error: "not_found" };
  if (!(await rateLimit("transfer", order.id))) return { ok: false, error: "rate_limited" };

  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
  const proof = typeof input.proofUrl === "string" ? input.proofUrl.trim().slice(0, 500) : "";
  if (proof && (!base || !proof.startsWith(`${base}/receipts/`))) return { ok: false, error: "invalid_file" };

  const { error } = await order.db
    .from("orders")
    .update({ payment_reported_at: new Date().toISOString(), ...(proof ? { payment_proof_url: proof } : {}) })
    .eq("id", order.id)
    .is("payment_confirmed_at", null);
  return error ? { ok: false, error: "failed" } : { ok: true };
}
