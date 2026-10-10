// Before the admin redesign database update (20261009120000_admin_redesign.sql)
// the new columns don't exist. The shop and the admin must keep working until it
// is applied, so a query that uses them asks again without them when the database
// says the column is missing.

/** PostgREST / Postgres error for a column or relation the database doesn't have (yet). */
export function isMissingColumn(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42703" || error?.code === "PGRST204" || error?.code === "PGRST200";
}
