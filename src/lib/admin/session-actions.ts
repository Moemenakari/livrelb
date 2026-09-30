"use server";

import { redirect } from "next/navigation";
import { normalizePhone, staffAuthEmail } from "@/lib/phone";
import { rateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type LoginState = { error?: string; phone?: string };

/** Staff login: phone + password (Supabase Auth under an internal address). */
export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const rawPhone = String(form.get("phone") ?? "").slice(0, 30);
  const password = String(form.get("password") ?? "").slice(0, 200);
  const phone = normalizePhone(rawPhone);
  if (!isSupabaseConfigured()) return { error: "The database is not configured.", phone: rawPhone };
  if (!phone || !password) return { error: "Please enter your phone number and password.", phone: rawPhone };
  if (!(await rateLimit("login", phone))) {
    return { error: "Too many attempts. Please wait a few minutes and try again.", phone: rawPhone };
  }

  const db = await createClient();
  const { data, error } = await db.auth.signInWithPassword({ email: staffAuthEmail(phone), password });
  if (error || !data.user) return { error: "Wrong phone number or password.", phone: rawPhone };

  // A login without an active staff row (disabled employee, a customer's
  // Google account) doesn't get in.
  const { data: staff } = await db.from("staff").select("is_active").eq("user_id", data.user.id).maybeSingle();
  if (!staff?.is_active) {
    await db.auth.signOut();
    return { error: "This account is disabled. Please ask the owner.", phone: rawPhone };
  }
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/admin/login");
}
