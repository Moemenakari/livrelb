// Creates the owner account (Nour): a Supabase Auth login (phone + password)
// and the matching staff row with role "owner". Run once:
//
//   npm run db:create-owner
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.
// The password is typed in the terminal and never stored in the repo.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { normalizePhone, staffAuthEmail } from "../src/lib/phone";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
    process.exit(1);
  }

  const db = createClient<Database>(url, secret, { auth: { persistSession: false } });
  const rl = createInterface({ input: stdin, output: stdout });

  const { data: existing, error: readError } = await db
    .from("staff")
    .select("name")
    .eq("role", "owner")
    .maybeSingle();
  if (readError) throw readError;
  if (existing) {
    console.log(`An owner already exists (${existing.name}). Nothing to do.`);
    process.exit(0);
  }

  const name = (await rl.question("Owner name (e.g. Nour): ")).trim();
  const phone = normalizePhone(await rl.question("Owner phone (e.g. 03 123 456): "));
  const refCode = (await rl.question("Personal link code (livrelb.com/r/...), e.g. nour: "))
    .trim()
    .toLowerCase();
  const password = await rl.question("Password (at least 10 characters): ");
  rl.close();

  if (!name || !phone || !/^[a-z0-9-]{2,30}$/.test(refCode) || password.length < 10) {
    console.error("Invalid input: check the name, phone, link code and password length.");
    process.exit(1);
  }

  const { data: created, error: authError } = await db.auth.admin.createUser({
    email: staffAuthEmail(phone),
    password,
    email_confirm: true,
    user_metadata: { name, phone },
  });
  if (authError) throw authError;

  const { error: staffError } = await db.from("staff").insert({
    user_id: created.user.id,
    name,
    phone,
    ref_code: refCode,
    role: "owner",
  });
  if (staffError) {
    // Don't leave a login without a staff row behind.
    await db.auth.admin.deleteUser(created.user.id);
    throw staffError;
  }

  console.log(`Owner ${name} (${phone}) created. She logs in with her phone and password.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
