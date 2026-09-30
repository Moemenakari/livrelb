import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";
import { editorLookups, emptyProduct } from "@/lib/admin/product-data";
import { ProductEditor } from "@/components/admin/product-editor";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const staff = await requireStaff();
  if (!can(staff, "products.create")) return <NoAccess />;
  return (
    <>
      <PageHeader title="New product" subtitle="Saved as Hidden until you set it to Visible." />
      <ProductEditor initial={emptyProduct()} lookups={await editorLookups()} canSave canDelete={false} />
    </>
  );
}
