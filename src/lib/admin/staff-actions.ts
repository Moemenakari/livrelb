"use server";

import { refresh } from "next/cache";
import { normalizePhone, staffAuthEmail } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/public";
import { AdminError, authorize, run, type ActionResult } from "./auth";
import { isPermission, type Permission } from "./permissions";

// Employees (owner only). Their login lives in Supabase Auth, which only
// the server key can manage; the staff row itself is written as the owner
// (RLS: owner manages staff), so the audit log shows who did it.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REF = /^[a-z0-9-]{2,30}$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function authAdmin() {
  const db = createAdminClient();
  if (!db) throw new AdminError("The server key (SUPABASE_SECRET_KEY) is missing.");
  return db.auth.admin;
}

export type NewStaffInput = { name: string; phone: string; password: string; refCode: string; couponCode: string; couponPercent: string };

export async function createStaff(input: NewStaffInput): Promise<ActionResult> {
  return run(async () => {
    const { db } = await authorize("owner");
    const name = str(input.name, 80);
    const phone = normalizePhone(str(input.phone, 30));
    const refCode = str(input.refCode, 30).toLowerCase();
    const password = typeof input.password === "string" ? input.password : "";
    if (!name) throw new AdminError("Write the employee's name.");
    if (!phone) throw new AdminError("Check the phone number.");
    if (!REF.test(refCode)) throw new AdminError("Link code: 2–30 letters, numbers or dashes (e.g. amal).");
    if (password.length < 8) throw new AdminError("The password needs at least 8 characters.");
    const couponCode = str(input.couponCode, 30).toUpperCase();
    const couponPercent = Math.round(Number(input.couponPercent || 0));
    if (couponCode && (!/^[A-Z0-9-]{3,30}$/.test(couponCode) || couponPercent < 1 || couponPercent > 100)) {
      throw new AdminError("Personal code: 3–30 letters/numbers (e.g. AMAL10) and a percent 1–100.");
    }

    const auth = authAdmin();
    const { data: created, error: authError } = await auth.createUser({
      email: staffAuthEmail(phone),
      password,
      email_confirm: true,
      user_metadata: { name, phone },
    });
    if (authError || !created.user) {
      throw new AdminError(authError?.message.includes("already") ? "This phone already has a login." : "Couldn't create the login.");
    }
    const { data: staff, error } = await db
      .from("staff")
      .insert({ user_id: created.user.id, name, phone, ref_code: refCode, role: "staff" })
      .select("id")
      .single();
    if (error) {
      await auth.deleteUser(created.user.id);
      throw error;
    }
    if (couponCode) {
      const { error: couponError } = await db
        .from("coupons")
        .insert({ code: couponCode, type: "percent", value: couponPercent, staff_id: staff.id, is_active: true });
      if (couponError) throw new AdminError("Employee added, but the personal code is taken. Add another code in Promotions.");
    }
    refresh();
  });
}

export type StaffUpdate = { id: string; name: string; phone: string; refCode: string; isActive: boolean; password: string };

export async function updateStaff(input: StaffUpdate): Promise<ActionResult> {
  return run(async () => {
    const { db, staff: me } = await authorize("owner");
    if (!UUID.test(input.id)) throw new AdminError("Invalid employee.");
    const name = str(input.name, 80);
    const phone = normalizePhone(str(input.phone, 30));
    const refCode = str(input.refCode, 30).toLowerCase();
    if (!name || !phone || !REF.test(refCode)) throw new AdminError("Check the name, phone and link code.");
    if (input.password && input.password.length < 8) throw new AdminError("The new password needs at least 8 characters.");
    if (input.id === me.id && !input.isActive) throw new AdminError("You can't disable your own account.");

    const { data: row } = await db.from("staff").select("user_id, phone, is_active").eq("id", input.id).single();
    if (!row) throw new AdminError("Employee not found.");
    const { error } = await db.from("staff").update({ name, phone, ref_code: refCode, is_active: input.isActive }).eq("id", input.id);
    if (error) throw error;

    if (row.user_id) {
      const auth = authAdmin();
      const changes: Parameters<typeof auth.updateUserById>[1] = {};
      if (phone !== row.phone) changes.email = staffAuthEmail(phone);
      if (input.password) changes.password = input.password;
      // A disabled employee is logged out everywhere and can't log back in.
      if (input.isActive !== row.is_active) changes.ban_duration = input.isActive ? "none" : "876000h";
      if (Object.keys(changes).length) {
        const { error: authError } = await auth.updateUserById(row.user_id, changes);
        if (authError) throw new AdminError("Saved, but the login couldn't be updated. Try again.");
      }
    }
    refresh();
  });
}

/** Switch one permission on or off for an employee (everything is on by default). */
export async function setPermission(staffId: string, permission: Permission, allowed: boolean): Promise<ActionResult> {
  return run(async () => {
    if (!UUID.test(staffId) || !isPermission(permission)) throw new AdminError("Invalid permission.");
    const { db } = await authorize("owner");
    const { error } = await db
      .from("staff_permissions")
      .upsert({ staff_id: staffId, permission, allowed }, { onConflict: "staff_id,permission" });
    if (error) throw error;
    refresh();
  });
}

/** Make someone an Admin (like the owners: everything allowed) or an Employee. Not for yourself. */
export async function setStaffRole(staffId: string, role: "owner" | "staff"): Promise<ActionResult> {
  return run(async () => {
    if (!UUID.test(staffId) || (role !== "owner" && role !== "staff")) throw new AdminError("Invalid value.");
    const { db, staff: me } = await authorize("owner");
    if (staffId === me.id) throw new AdminError("You can't change your own role.");
    const { error } = await db.from("staff").update({ role }).eq("id", staffId);
    if (error) {
      // The database from before the admin redesign allows one owner only.
      if (error.code === "23505") throw new AdminError("The database update 20261009120000_admin_redesign.sql is needed to have more than one Admin.");
      throw error;
    }
    refresh();
  });
}

/**
 * Delete an employee without losing history: they disappear from the lists and
 * can't log in, but their name stays on old orders, customers and the activity log.
 */
export async function deleteStaff(staffId: string): Promise<ActionResult> {
  return run(async () => {
    if (!UUID.test(staffId)) throw new AdminError("Invalid employee.");
    const { db, staff: me } = await authorize("owner");
    if (staffId === me.id) throw new AdminError("You can't delete your own account.");
    const { data: row } = await db.from("staff").select("user_id, role").eq("id", staffId).single();
    if (!row) throw new AdminError("Employee not found.");
    if (row.role === "owner") throw new AdminError("Make her an Employee first, then delete.");
    const { error } = await db.from("staff").update({ is_active: false, deleted_at: new Date().toISOString() }).eq("id", staffId);
    if (error) throw error;
    if (row.user_id) {
      const { error: authError } = await authAdmin().updateUserById(row.user_id, { ban_duration: "876000h" });
      if (authError) throw new AdminError("Deleted, but the login couldn't be blocked. Disable it from Supabase.");
    }
    refresh();
  });
}

/** Bring a deleted employee back as Suspended (switch her to Active when ready). */
export async function restoreStaff(staffId: string): Promise<ActionResult> {
  return run(async () => {
    if (!UUID.test(staffId)) throw new AdminError("Invalid employee.");
    const { db } = await authorize("owner");
    const { error } = await db.from("staff").update({ deleted_at: null }).eq("id", staffId);
    if (error) throw error;
    refresh();
  });
}
