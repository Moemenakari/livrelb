// Staff permissions (staff_permissions.permission). Everything is allowed
// by default; the owner switches permissions off per employee. Managing
// staff is owner-only and not a permission. Shared by server and client.

export const permissions = [
  "products.create",
  "products.edit",
  "products.delete",
  "orders.view",
  "orders.edit",
  "orders.cancel",
  "customers.view",
  "customers.export",
  "coupons.manage",
  "reviews.manage",
  "collections.manage",
  "sales.view",
  "settings.manage",
] as const;

export type Permission = (typeof permissions)[number];

export const permissionLabels: Record<Permission, string> = {
  "products.create": "Add products",
  "products.edit": "Edit products",
  "products.delete": "Delete products",
  "orders.view": "See orders",
  "orders.edit": "Edit orders (status, adjustments)",
  "orders.cancel": "Cancel orders",
  "customers.view": "See customers",
  "customers.export": "Export customers",
  "coupons.manage": "Coupons & promotions",
  "reviews.manage": "Reviews",
  "collections.manage": "Seasons & collections",
  "sales.view": "Sales summary",
  "settings.manage": "Shop settings",
};

export function isPermission(value: string): value is Permission {
  return (permissions as readonly string[]).includes(value);
}

/** What a logged-in staff member is allowed to do (sent to the client). */
export type StaffSession = {
  id: string;
  name: string;
  phone: string;
  refCode: string;
  isOwner: boolean;
  allowed: Permission[];
};

export function can(staff: StaffSession, permission: Permission): boolean {
  return staff.isOwner || staff.allowed.includes(permission);
}
