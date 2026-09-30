// Phone numbers are stored in E.164 (+9613123456). Lebanese numbers typed
// without a country code get +961. Same rules as private.normalize_phone()
// in the database.

const E164 = /^\+[1-9]\d{6,14}$/;

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  let phone: string;
  if (raw.trim().startsWith("+")) phone = `+${digits}`;
  else if (digits.startsWith("00")) phone = `+${digits.slice(2)}`;
  else if (digits.startsWith("961") && digits.length >= 10) phone = `+${digits}`;
  else if (digits.startsWith("0")) phone = `+961${digits.slice(1)}`;
  else phone = `+961${digits}`;
  return E164.test(phone) ? phone : null;
}

/**
 * Staff log in with phone + password. Supabase Auth keeps them under an
 * internal address made from the phone: never shown, never emailed, and no
 * SMS provider needed.
 */
export function staffAuthEmail(phoneE164: string): string {
  return `${phoneE164.replace(/\D/g, "")}@staff.livrelb.local`;
}
