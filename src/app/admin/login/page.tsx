import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/admin/auth";
import { AdminLogo } from "@/components/admin/admin-logo";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const expired = (await searchParams).expired === "1";
  if (await getStaff()) redirect("/admin");
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-background p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <AdminLogo className="text-3xl" />
          <p className="text-sm text-muted">Staff login</p>
        </div>
        {expired && (
          <p role="status" className="mb-4 rounded-lg bg-surface px-3 py-2 text-sm">
            You were signed out after a while without activity. Please log in again.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
