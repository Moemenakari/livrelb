"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BadgePercent,
  ClipboardList,
  Gem,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  NotebookPen,
  Settings,
  Star,
  Truck,
  Sparkles,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { logout } from "@/lib/admin/session-actions";
import { can, type Permission, type StaffSession } from "@/lib/admin/permissions";
import { AdminLogo } from "./admin-logo";
import { PushToggle, forgetThisPhone } from "./push-toggle";

type Item = { href: string; label: string; icon: typeof Gem; need?: Permission | "owner"; main?: boolean };

const items: Item[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, main: true },
  { href: "/admin/activity", label: "Activity", icon: Activity },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, need: "orders.view", main: true },
  { href: "/admin/products", label: "Products", icon: Gem, main: true },
  { href: "/admin/customers", label: "Customers", icon: Users, need: "customers.view", main: true },
  { href: "/admin/charms", label: "Charms", icon: Star, need: "products.edit" },
  { href: "/admin/home", label: "Home page", icon: House, need: "collections.manage" },
  { href: "/admin/promotions", label: "Promotions", icon: BadgePercent, need: "coupons.manage" },
  { href: "/admin/seasons", label: "Seasons", icon: Sparkles, need: "collections.manage" },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareQuote, need: "reviews.manage" },
  { href: "/admin/sales", label: "Sales tools", icon: NotebookPen, need: "sales.view" },
  { href: "/admin/staff", label: "Staff", icon: UserCog, need: "owner" },
  { href: "/admin/delivery", label: "Delivery & times", icon: Truck, need: "owner" },
  { href: "/admin/settings", label: "Settings", icon: Settings, need: "owner" },
];

function visible(staff: StaffSession) {
  return items.filter((i) => !i.need || (i.need === "owner" ? staff.isOwner : can(staff, i.need)));
}

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

// Sidebar on desktop; a bottom bar with the four main sections and a
// "More" sheet on phones (Nour uses the admin on his phone).
// pushKey: the VAPID public key for "Notify me" (null when push isn't set up).
export function AdminNav({ staff, pushKey }: { staff: StaffSession; pushKey: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const list = visible(staff);
  const main = list.filter((i) => i.main);

  const link = (i: Item, onClick?: () => void) => {
    const Icon = i.icon;
    const active = isActive(pathname, i.href);
    return (
      <Link
        key={i.href}
        href={i.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
          active ? "bg-ink text-white" : "text-foreground hover:bg-surface"
        }`}
      >
        <Icon className="size-4.5 shrink-0" strokeWidth={1.6} aria-hidden />
        {i.label}
      </Link>
    );
  };

  const who = (
    <div className="border-t border-line px-3 pt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{staff.name}</p>
          <p className="text-xs text-muted">{staff.isOwner ? "Admin" : "Employee"}</p>
        </div>
        <form
        action={async () => {
          await forgetThisPhone();
          await logout();
        }}
      >
          <button type="submit" className="flex size-9 items-center justify-center rounded-lg hover:bg-surface" aria-label="Log out" title="Log out">
            <LogOut className="size-4.5" strokeWidth={1.6} />
          </button>
        </form>
      </div>
      <PushToggle publicKey={pushKey} className="mt-3" />
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 print:hidden shrink-0 flex-col gap-1 border-e border-line bg-background p-4 lg:flex">
        <Link href="/admin" className="mb-6 px-3 text-xl">
          <AdminLogo />
        </Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Admin">
          {list.map((i) => link(i))}
        </nav>
        {who}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 print:hidden items-center justify-between border-b border-line bg-background/95 px-4 backdrop-blur lg:hidden">
        <Link href="/admin" className="text-lg">
          <AdminLogo />
        </Link>
        <span className="text-xs text-muted">
          {staff.isOwner ? "Admin" : "Employee"} · {staff.name}
        </span>
      </header>

      <nav
        aria-label="Admin"
        className="fixed inset-x-0 bottom-0 z-30 grid print:hidden grid-cols-5 border-t border-line bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {main.map((i) => {
          const Icon = i.icon;
          const active = isActive(pathname, i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-ink" : "text-muted"}`}
            >
              <Icon className="size-5" strokeWidth={active ? 2 : 1.6} aria-hidden />
              {i.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted">
          <Menu className="size-5" strokeWidth={1.6} aria-hidden />
          More
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-ink/30" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-1 overflow-y-auto rounded-t-2xl bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mb-2 flex items-center justify-between px-3">
              <span className="text-sm font-medium">Menu</span>
              <button type="button" onClick={() => setOpen(false)} className="flex size-9 items-center justify-center rounded-lg hover:bg-surface" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            {list.map((i) => link(i, () => setOpen(false)))}
            <div className="mt-3">{who}</div>
          </div>
        </div>
      )}
    </>
  );
}
