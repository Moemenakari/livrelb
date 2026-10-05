import { requireStaff } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { vapidPublicKey } from "@/lib/push/web-push";

// Every admin page: logged-in, active staff only (per request, never cached).
export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const staff = await requireStaff();
  return (
    <div className="lg:flex">
      <AdminNav staff={staff} pushKey={vapidPublicKey()} />
      <main className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
