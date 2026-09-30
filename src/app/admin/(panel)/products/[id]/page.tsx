import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { nameOf, staffNames } from "@/lib/admin/data";
import { dateTime } from "@/lib/admin/format";
import { can } from "@/lib/admin/permissions";
import { editorLookups, loadProduct } from "@/lib/admin/product-data";
import { ProductEditor } from "@/components/admin/product-editor";
import { PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [product, lookups, names] = await Promise.all([loadProduct(id), editorLookups(), staffNames()]);
  if (!product) notFound();
  const { meta } = product;

  return (
    <>
      <PageHeader title={product.form.nameEn} subtitle={can(staff, "products.edit") ? "Edit product" : "View only: you can't edit products"} />
      <ProductEditor
        initial={product.form}
        lookups={lookups}
        canSave={can(staff, "products.edit")}
        canDelete={can(staff, "products.delete")}
        meta={`Created by ${nameOf(names, meta.createdBy)} on ${dateTime(meta.createdAt)} · Last edited by ${nameOf(names, meta.updatedBy)} on ${dateTime(meta.updatedAt)}`}
      />
    </>
  );
}
