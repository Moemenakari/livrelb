import type { ReactNode } from "react";

// Small building blocks for the admin (English only, phone first). Same
// light brand tokens as the storefront, denser layout.

export const inputClass =
  "h-11 w-full rounded-lg border border-line bg-background px-3 text-[15px] outline-none transition-colors placeholder:text-muted focus:border-gold disabled:bg-surface disabled:text-muted";
export const textareaClass =
  "w-full rounded-lg border border-line bg-background px-3 py-2.5 text-[15px] outline-none transition-colors placeholder:text-muted focus:border-gold";
export const buttonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-background px-4 text-sm font-medium transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50";
export const dangerButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-800 transition-colors hover:bg-red-100 disabled:opacity-50";
export const smallButtonClass =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-line bg-background px-2.5 text-xs font-medium transition-colors hover:border-ink disabled:opacity-50";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ title, actions, children, className = "" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-background p-4 sm:p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-sans text-base font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className = "",
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

const badgeTones = {
  neutral: "bg-surface text-foreground border-line",
  green: "bg-emerald-50 text-emerald-800 border-emerald-200",
  gold: "bg-amber-50 text-amber-900 border-amber-200",
  red: "bg-red-50 text-red-800 border-red-200",
  blue: "bg-sky-50 text-sky-800 border-sky-200",
  violet: "bg-violet-50 text-violet-800 border-violet-200",
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{children}</p>;
}

export function NoAccess() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-sans text-xl font-semibold">No access</h1>
      <p className="mt-2 text-sm text-muted">The owner has switched this section off for your account.</p>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}
