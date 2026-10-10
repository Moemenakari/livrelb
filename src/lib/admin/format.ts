// Formatting helpers for the admin. The shop runs on Beirut time.

export const TIME_ZONE = "Asia/Beirut";

/** "$12.50" from cents. */
export function money(cents: number | null | undefined): string {
  const value = (cents ?? 0) / 100;
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(Number.isInteger(value) ? 0 : 2)}`;
}

/** YYYY-MM-DD of a moment, in Beirut. */
export function beirutDay(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Days added to a YYYY-MM-DD date. */
export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week and first day of the month of a YYYY-MM-DD date. */
export function weekStart(day: string): string {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, -((weekday + 6) % 7));
}
export function monthStart(day: string): string {
  return `${day.slice(0, 8)}01`;
}

/** Start of a Beirut day as an ISO timestamp (for created_at filters). */
export function beirutDayStart(day: string): string {
  // Beirut is UTC+2 or UTC+3: find the offset at noon that day.
  const noon = new Date(`${day}T12:00:00Z`);
  const local = new Date(noon.toLocaleString("en-US", { timeZone: TIME_ZONE }));
  const offsetMs = local.getTime() - new Date(noon.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(new Date(`${day}T00:00:00Z`).getTime() - offsetMs).toISOString();
}

export function dateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function dateOnly(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso),
  );
}

/** <input type="datetime-local"> value (Beirut) from an ISO timestamp. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** ISO timestamp from a datetime-local value typed in Beirut time; null if empty. */
export function fromLocalInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const [day, time] = value.split("T");
  const start = new Date(beirutDayStart(day)).getTime();
  const [h, m] = time.split(":").map(Number);
  return new Date(start + (h * 60 + m) * 60_000).toISOString();
}

export const orderStatuses = ["pending", "confirmed", "in_production", "shipped", "delivered", "cancelled"] as const;
export type AdminOrderStatus = (typeof orderStatuses)[number];

export const statusLabels: Record<AdminOrderStatus, string> = {
  pending: "New",
  confirmed: "Confirmed",
  in_production: "In production",
  shipped: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const statusTones = {
  pending: "gold",
  confirmed: "blue",
  in_production: "violet",
  shipped: "blue",
  delivered: "green",
  cancelled: "red",
} as const;

/** "+961 3 123 456" style, for reading. */
export function prettyPhone(e164: string | null): string {
  if (!e164) return "No phone yet";
  if (e164.startsWith("+961")) {
    const n = e164.slice(4);
    return `+961 ${n.length === 7 ? `${n.slice(0, 1)} ${n.slice(1, 4)} ${n.slice(4)}` : `${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`}`;
  }
  return e164;
}

/** Running right now: switched on and between its start and end. */
export function isLive(active: boolean, startsAt: string | null, endsAt: string | null): boolean {
  const now = Date.now();
  return active && (!startsAt || Date.parse(startsAt) <= now) && (!endsAt || Date.parse(endsAt) > now);
}
