"use client";

import { useState, useTransition } from "react";
import { adjustPoints, reassignCustomer } from "@/lib/admin/customer-actions";
import { Card, Field, inputClass, secondaryButtonClass } from "./ui";

type Props = {
  customerId: string;
  staffId: string | null;
  staffName: string;
  since: string | null;
  isOwner: boolean;
  canAdjustPoints: boolean;
  staffOptions: { id: string; name: string }[];
};

export function CustomerControls({ customerId, staffId, staffName, since, isOwner, canAdjustPoints, staffOptions }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
      else after?.();
    });

  return (
    <>
      <Card title="Source employee">
        <p className="text-sm">
          <span className="font-medium">{staffName}</span>
          {since && <span className="block text-xs text-muted">Since {since}. All her future orders count for this employee.</span>}
        </p>
        {isOwner && (
          <select
            aria-label="Reassign to"
            className={`${inputClass} mt-3`}
            defaultValue={staffId ?? ""}
            disabled={pending}
            onChange={(e) => {
              if (!confirm("Move this customer to another employee? This is logged.")) {
                e.target.value = staffId ?? "";
                return;
              }
              act(() => reassignCustomer(customerId, e.target.value || null));
            }}
          >
            <option value="">No employee</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </Card>

      {canAdjustPoints && (
        <Card title="Add or remove points">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              act(
                () => adjustPoints(customerId, Number(delta), note),
                () => {
                  setDelta("");
                  setNote("");
                },
              );
            }}
          >
            <Field label="Points" hint="Use − to remove points." htmlFor="pts">
              <input id="pts" type="number" step="1" inputMode="numeric" value={delta} onChange={(e) => setDelta(e.target.value)} className={inputClass} required />
            </Field>
            <Field label="Why" htmlFor="pts-note">
              <input id="pts-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className={inputClass} required />
            </Field>
            <button disabled={pending} className={secondaryButtonClass}>
              Save
            </button>
          </form>
        </Card>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
