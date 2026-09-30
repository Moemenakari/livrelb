// Columns of an old delivery-company order file (CSV / Excel import).
export const importFields = ["external_ref", "order_date", "customer_name", "phone", "area", "address", "items", "total", "status"] as const;
export type ImportField = (typeof importFields)[number];
export type ImportRow = Partial<Record<ImportField, string>>;
