import { requireStaff } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { publishConfigured } from "@/lib/catalog/publish";
import { vapidPublicKey } from "@/lib/push/web-push";

// Per-person data: never prerendered or cached. scripts/check-dynamic-routes.mjs fails the build if this
// route ever comes out static (a build without secret keys used to freeze pages like this one).
export const dynamic = "force-dynamic";

// Every admin page: logged-in, active staff only (per request, never cached).
export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const staff = await requireStaff();
  return (
    <div className="lg:flex">
      <AdminNav staff={staff} pushKey={vapidPublicKey()} />
      <main className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
        <div className="mx-auto max-w-6xl">
          {process.env.NODE_ENV === "production" && !publishConfigured() && (
            <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Publishing is not connected yet: changes you save will not reach customers until the site is updated by hand. Tell the developer.
            </p>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
