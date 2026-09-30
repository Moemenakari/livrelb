import "server-only";
import { cache } from "react";
import { siteConfig } from "@/config/site";
import { createAdminClient } from "@/lib/supabase/public";

// Read helpers shared by admin pages. Call them only after requireStaff().

export type StaffName = { id: string; name: string; refCode: string; isActive: boolean; role: "owner" | "staff" };

/**
 * Every employee's name and link code (for "who sold it" columns and
 * filters). Staff can only read their own staff row through RLS, so the
 * names come from the server key; nothing else of the staff table.
 */
export const staffNames = cache(async (): Promise<StaffName[]> => {
  const db = createAdminClient();
  if (!db) return [];
  const { data } = await db.from("staff").select("id, name, ref_code, is_active, role").order("created_at");
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, refCode: s.ref_code, isActive: s.is_active, role: s.role }));
});

export function nameOf(list: StaffName[], id: string | null | undefined): string {
  if (!id) return "—";
  return list.find((s) => s.id === id)?.name ?? "Former employee";
}

/** Personal link of an employee: livrelb.com/r/amal. */
export function personalLink(refCode: string): string {
  return `${siteConfig.url}/r/${refCode}`;
}
