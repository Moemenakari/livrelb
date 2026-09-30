"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createStaff, setPermission, updateStaff, type NewStaffInput, type StaffUpdate } from "@/lib/admin/staff-actions";
import { permissionLabels, permissions, type Permission } from "@/lib/admin/permissions";
import { CopyButton } from "./copy-button";
import { EditableRow, FormError, useSave } from "./promo-forms";
import { Badge, Field, buttonClass, inputClass, smallButtonClass } from "./ui";

export type StaffRow = {
  id: string;
  name: string;
  phone: string;
  refCode: string;
  isActive: boolean;
  isOwner: boolean;
  link: string;
  coupons: string[];
  monthOrders: number;
  monthSales: string;
  customers: number;
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
        <Field label="Link code" hint={`livrelb.com/r/${s.refCode || "…"}`} htmlFor="ns-ref">
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
        {!row.isOwner && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.isActive} onChange={(e) => set("isActive", e.target.checked)} className="size-4 accent-[var(--cedar)]" />
            Active (unticked = can&apos;t log in; her customers stay hers)
          </label>
        )}
        <FormError error={error} />
        <button disabled={pending} className={`${buttonClass} self-start`}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Save
        </button>
      </form>

      {!row.isOwner && (
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
          <p className="mt-2 text-xs text-muted">Saved on each switch. Staff and Settings are always owner-only.</p>
        </fieldset>
      )}
    </div>
  );
}

export function StaffManager({ rows }: { rows: StaffRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));
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
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <EditableRow
            key={r.id}
            open={open === r.id}
            onToggle={() => toggle(r.id)}
            summary={
              <>
                <span className="font-medium">{r.name}</span> <span className="text-muted" dir="ltr">· {r.phone}</span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {r.isOwner ? <Badge tone="gold">Owner</Badge> : r.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge>}
                  {r.coupons.map((c) => (
                    <Badge key={c} tone="violet">
                      {c}
                    </Badge>
                  ))}
                  {r.off.length > 0 && <Badge>{r.off.length} permissions off</Badge>}
                </span>
                <span className="mt-1.5 block text-xs text-muted">
                  This month: {r.monthOrders} orders · {r.monthSales} · {r.customers} customers (all time)
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
