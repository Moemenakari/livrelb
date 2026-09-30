import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { can, permissions, type Permission, type StaffSession } from "./permissions";

// Who is using the admin: a Supabase Auth login (phone + password) linked
// to an active staff row. Every page and every server function checks it
// here, and the database checks it again (RLS + staff_permissions).

/** The logged-in, active staff member, or null. Once per request. */
export const getStaff = cache(async (): Promise<StaffSession | null> => {
  if (!isSupabaseConfigured()) return null;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;

  const { data: staff } = await db
    .from("staff")
    .select("id, name, phone, ref_code, role, is_active, staff_permissions!staff_permissions_staff_id_fkey (permission, allowed)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!staff || !staff.is_active) return null;

  const off = new Set(staff.staff_permissions.filter((p) => !p.allowed).map((p) => p.permission));
  return {
    id: staff.id,
    name: staff.name,
    phone: staff.phone,
    refCode: staff.ref_code,
    isOwner: staff.role === "owner",
    allowed: permissions.filter((p) => staff.role === "owner" || !off.has(p)),
  };
});

/** For pages: the staff member, or off to the login page. */
export async function requireStaff(): Promise<StaffSession> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}

export class AdminError extends Error {}

/**
 * For server functions: the staff member and a database client that acts
 * as them (RLS applies). Throws when not logged in or not allowed.
 */
export async function authorize(permission?: Permission | "owner") {
  const staff = await getStaff();
  if (!staff) throw new AdminError("Please log in again.");
  if (permission === "owner" ? !staff.isOwner : permission && !can(staff, permission)) {
    throw new AdminError("You don't have permission to do this.");
  }
  return { staff, db: await createClient() };
}

const dbMessages: Record<string, string> = {
  materials_required: "Add at least one material with a price.",
  too_many_media: "A product can have up to 7 photos and 1 video.",
  order_not_found: "This order doesn't exist anymore.",
  order_cancelled: "This order is cancelled.",
  invalid: "Please check the values and try again.",
};

export type ActionResult<T = void> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

/** Runs a server function body and turns errors into a message for the form. */
export async function run<T>(body: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await body() };
  } catch (error) {
    if (error instanceof AdminError) return { ok: false, error: error.message };
    const e = error as { message?: string; code?: string };
    // Unexpected: log the code only (never customer data).
    console.error("admin action failed", e.code ?? "", e.message?.slice(0, 120) ?? "");
    if (e.code === "42501") return { ok: false, error: "You don't have permission to do this." };
    if (e.code === "23505") return { ok: false, error: "This already exists (duplicate slug, code or phone)." };
    if (e.code === "22023" || e.code === "23514") {
      return { ok: false, error: dbMessages[e.message ?? ""] ?? "Please check the values and try again." };
    }
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
