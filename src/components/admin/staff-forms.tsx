"use client";

import { siteConfig } from "@/config/site";
import { useState } from "react";
import { Loader2, Plus, Trash2, Undo2 } from "lucide-react";
import { createStaff, deleteStaff, restoreStaff, setPermission, setStaffRole, updateStaff, type NewStaffInput, type StaffUpdate } from "@/lib/admin/staff-actions";
import { permissionLabels, permissions, type Permission } from "@/lib/admin/permissions";
import { CopyButton } from "./copy-button";
import { EditableRow, FormError, useSave } from "./promo-forms";
import { Badge, Field, buttonClass, dangerButtonClass, inputClass, secondaryButtonClass, smallButtonClass } from "./ui";

export type StaffRow = {
  id: string;
  name: string;
  phone: string;
  refCode: string;
  isActive: boolean;
  /** An Admin (an owner of the shop). */
  isOwner: boolean;
  isSelf: boolean;
  deleted: boolean;
  link: string;
  coupons: string[];
  today: { orders: number; sales: string };
  week: { orders: number; sales: string };
  month: { orders: number; sales: string };
  customers: number;
  /** Products added / removed this week. */
  added: number;
  removed: number;
  lastActivity: string | null;
  off: Permission[];
};

function NewStaff({ onDone }: { onDone: () => void }) {
  const [s, setS] = useState<NewStaffInput>({ name: "", phone: "", password: "", refCode: "", couponCode: "", couponPercent: "10" });
  const { pending, error, save } = useSave();
  const set = <K extends keyof NewStaffInput>(k: K, v: NewStaffInput[K]) => setS((p) => ({ ...p, [k]: v }));
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save(() => createStaff(s), onDone);
      }}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Name" htmlFor="ns-name">
          <input
            id="ns-name"
            required
            maxLength={80}
            value={s.name}
            onChange={(e) => {
              const name = e.target.value;
              const first = name.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
              setS((p) => ({ ...p, name, refCode: first, couponCode: first ? `${first.toUpperCase()}10` : "" }));
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Phone (her login)" htmlFor="ns-phone">
          <input id="ns-phone" required type="tel" value={s.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} dir="ltr" />
        </Field>
        <Field label="Password" hint="At least 8 characters. Give it to her privately." htmlFor="ns-pass">
          <input id="ns-pass" required minLength={8} type="text" autoComplete="new-password" value={s.password} onChange={(e) => set("password", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Link code" hint={`${siteConfig.host}/r/${s.refCode || "…"}`} htmlFor="ns-ref">
          <input id="ns-ref" required value={s.refCode} onChange={(e) => set("refCode", e.target.value.toLowerCase())} className={inputClass} dir="ltr" />
        </Field>
        <Field label="Personal code (optional)" htmlFor="ns-code">
          <input id="ns-code" value={s.couponCode} onChange={(e) => set("couponCode", e.target.value.toUpperCase())} className={`${inputClass} uppercase`} />
        </Field>
        <Field label="Code % off" htmlFor="ns-pct">
          <input id="ns-pct" type="number" min={1} max={100} value={s.couponPercent} onChange={(e) => set("couponPercent", e.target.value)} className={inputClass} />
        </Field>
      </div>
      <FormError error={error} />
      <button disabled={pending} className={`${buttonClass} self-start`}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Add employee
      </button>
    </form>
  );
}

function EditStaff({ row, onDone }: { row: StaffRow; onDone: () => void }) {
  const [s, setS] = useState<StaffUpdate>({ id: row.id, name: row.name, phone: row.phone, refCode: row.refCode, isActive: row.isActive, password: "" });
  const [off, setOff] = useState<Set<Permission>>(new Set(row.off));
  const { pending, error, save } = useSave();
  const set = <K extends keyof StaffUpdate>(k: K, v: StaffUpdate[K]) => setS((p) => ({ ...p, [k]: v }));

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save(() => updateStaff(s), onDone);
        }}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Name" htmlFor={`es-name-${row.id}`}>
            <input id={`es-name-${row.id}`} required value={s.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Phone (login)" htmlFor={`es-phone-${row.id}`}>
            <input id={`es-phone-${row.id}`} required type="tel" value={s.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} dir="ltr" />
          </Field>
          <Field label="Link code" htmlFor={`es-ref-${row.id}`}>
            <input id={`es-ref-${row.id}`} required value={s.refCode} onChange={(e) => set("refCode", e.target.value.toLowerCase())} className={inputClass} dir="ltr" />
          </Field>
          <Field label="New password" hint="Empty = unchanged" htmlFor={`es-pass-${row.id}`}>
            <input id={`es-pass-${row.id}`} type="text" autoComplete="new-password" value={s.password} onChange={(e) => set("password", e.target.value)} className={inputClass} />
          </Field>
        </div>
        {!row.isSelf && !row.deleted && (
          <Field label="Status" hint="Suspended = can't log in; her customers and sales stay hers." htmlFor={`es-status-${row.id}`} className="sm:max-w-xs">
            <select id={`es-status-${row.id}`} value={s.isActive ? "active" : "suspended"} onChange={(e) => set("isActive", e.target.value === "active")} className={inputClass}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </Field>
        )}
        <FormError error={error} />
        <button disabled={pending} className={`${buttonClass} self-start`}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Save
        </button>
      </form>

      {!row.isSelf && !row.deleted && (
        <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
          <Field label="Role" hint="An Admin can do everything, including Staff and Settings." htmlFor={`es-role-${row.id}`} className="sm:max-w-xs">
            <select
              id={`es-role-${row.id}`}
              value={row.isOwner ? "owner" : "staff"}
              disabled={pending}
              onChange={(e) => {
                const role = e.target.value as "owner" | "staff";
                if (!confirm(role === "owner" ? `Make ${row.name} an Admin? She will see and change everything.` : `Make ${row.name} an Employee?`)) {
                  e.target.value = row.isOwner ? "owner" : "staff";
                  return;
                }
                save(() => setStaffRole(row.id, role), onDone);
              }}
              className={inputClass}
            >
              <option value="staff">Employee</option>
              <option value="owner">Admin</option>
            </select>
          </Field>
        </div>
      )}

      {!row.isOwner && !row.deleted && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Permissions</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {permissions.map((p) => (
              <label key={p} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-background px-3 py-2 text-sm">
                {permissionLabels[p]}
                <input
                  type="checkbox"
                  role="switch"
                  checked={!off.has(p)}
                  disabled={pending}
                  onChange={(e) => {
                    const allowed = e.target.checked;
                    setOff((prev) => {
                      const next = new Set(prev);
                      if (allowed) next.delete(p);
                      else next.add(p);
                      return next;
                    });
                    save(() => setPermission(row.id, p, allowed));
                  }}
                  className="size-5 accent-[var(--cedar)]"
                />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Saved on each switch. Staff and Settings are always for Admins only.</p>
        </fieldset>
      )}

      {!row.isSelf && !row.isOwner && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          {row.deleted ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => save(() => restoreStaff(row.id), onDone)}
              className={`${secondaryButtonClass} self-start`}
            >
              <Undo2 className="size-4" aria-hidden /> Restore (comes back as Suspended)
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm(`Delete ${row.name}? She can't log in anymore. Her name stays on old orders and customers.`)) save(() => deleteStaff(row.id), onDone);
              }}
              className={`${dangerButtonClass} self-start`}
            >
              <Trash2 className="size-4" aria-hidden /> Delete employee
            </button>
          )}
          <FormError error={error} />
        </div>
      )}
    </div>
  );
}

export function StaffManager({ rows }: { rows: StaffRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));
  const shown = rows.filter((r) => showDeleted || !r.deleted);
  const deletedCount = rows.filter((r) => r.deleted).length;
  return (
    <section className="rounded-xl border border-line bg-background p-4 sm:p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="font-sans text-base font-semibold">Employees</h2>
        <button type="button" onClick={() => toggle("new")} className={smallButtonClass}>
          <Plus className="size-3.5" aria-hidden /> Add employee
        </button>
      </div>
      {open === "new" && (
        <div className="mt-3 rounded-lg bg-surface p-3">
          <NewStaff onDone={() => setOpen(null)} />
        </div>
      )}
      {deletedCount > 0 && (
        <label className="mt-2 flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} className="size-4 accent-[var(--cedar)]" />
          Show deleted ({deletedCount})
        </label>
      )}
      <ul className="divide-y divide-line">
        {shown.map((r) => (
          <EditableRow
            key={r.id}
            open={open === r.id}
            onToggle={() => toggle(r.id)}
            summary={
              <>
                <span className="font-medium">{r.name}</span> <span className="text-muted" dir="ltr">· {r.phone}</span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {r.isOwner ? <Badge tone="gold">Admin</Badge> : <Badge>Employee</Badge>}
                  {r.deleted ? <Badge tone="red">Deleted</Badge> : r.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Suspended</Badge>}
                  {r.coupons.map((c) => (
                    <Badge key={c} tone="violet">
                      {c}
                    </Badge>
                  ))}
                  {r.off.length > 0 && <Badge>{r.off.length} permissions off</Badge>}
                </span>
                <span className="mt-1.5 grid gap-x-4 gap-y-0.5 text-xs text-muted sm:grid-cols-3">
                  <span>
                    Today: <b className="font-medium text-foreground">{r.today.orders}</b> orders · {r.today.sales}
                  </span>
                  <span>
                    This week: <b className="font-medium text-foreground">{r.week.orders}</b> orders · {r.week.sales}
                  </span>
                  <span>
                    This month: <b className="font-medium text-foreground">{r.month.orders}</b> orders · {r.month.sales}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {r.customers} customers (all time) · Products this week: +{r.added} added, −{r.removed} removed · Last activity: {r.lastActivity ?? "none in the last 30 days"}
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  <span dir="ltr">{r.link}</span>
                  <CopyButton text={r.link} />
                </span>
              </>
            }
          >
            <EditStaff row={r} onDone={() => setOpen(null)} />
          </EditableRow>
        ))}
      </ul>
    </section>
  );
}
