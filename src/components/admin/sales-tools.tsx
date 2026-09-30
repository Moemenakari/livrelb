"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, Trash2 } from "lucide-react";
import { importFields, type ImportField, type ImportRow } from "@/lib/admin/import-fields";
import { deleteManualEntry, importOrders, saveManualEntry, type ManualEntryInput } from "@/lib/admin/sales-actions";
import { FormError, useSave } from "./promo-forms";
import { Card, Field, buttonClass, inputClass, secondaryButtonClass, smallButtonClass } from "./ui";

const fieldLabels: Record<ImportField, string> = {
  external_ref: "Order / waybill number",
  order_date: "Date",
  customer_name: "Customer name",
  phone: "Phone",
  area: "Area",
  address: "Address",
  items: "Items",
  total: "Total ($)",
  status: "Status",
};

// Guesses which column is which from the header row (English / Arabic).
const guesses: Record<ImportField, RegExp> = {
  external_ref: /ref|waybill|awb|order|no\.?|number|رقم/i,
  order_date: /date|تاريخ/i,
  customer_name: /name|customer|client|اسم|زبون/i,
  phone: /phone|mobile|tel|هاتف|موبايل|رقم الهاتف/i,
  area: /area|city|region|zone|منطقة|مدينة/i,
  address: /address|عنوان/i,
  items: /item|product|description|content|منتج|قطع/i,
  total: /total|amount|price|cod|مبلغ|سعر|المجموع/i,
  status: /status|state|حالة/i,
};

/** Minimal CSV reader (quotes, commas or semicolons). */
function parseCsv(text: string): string[][] {
  const sep = (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const cellText = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v === null || v === undefined ? "" : String(v));

function Importer() {
  const [table, setTable] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState("");
  const [map, setMap] = useState<Partial<Record<ImportField, number>>>({});
  const [reading, setReading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const { pending, error, save } = useSave();
  const file = useRef<HTMLInputElement>(null);

  const load = async (f: File) => {
    setReading(true);
    setResult(null);
    setReadError(null);
    try {
      let rows: string[][];
      if (/\.xlsx$/i.test(f.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        rows = (await readSheet(f)).map((r) => r.map(cellText));
      } else {
        rows = parseCsv(await f.text());
      }
      if (rows.length < 2) throw new Error("The file needs a header row and at least one order.");
      const header = rows[0];
      const guess: Partial<Record<ImportField, number>> = {};
      for (const field of importFields) {
        const idx = header.findIndex((h, i) => guesses[field].test(h) && !Object.values(guess).includes(i));
        if (idx >= 0) guess[field] = idx;
      }
      setMap(guess);
      setTable(rows);
      setFileName(f.name);
    } catch (e) {
      setReadError(e instanceof Error ? e.message : "This file couldn't be read. Use .xlsx or .csv.");
    }
    setReading(false);
  };

  const mapped: ImportRow[] = table
    ? table.slice(1).map((r) => Object.fromEntries(importFields.flatMap((f) => (map[f] !== undefined ? [[f, r[map[f]!] ?? ""]] : []))))
    : [];

  return (
    <Card title="Import old delivery-company orders">
      <p className="mb-3 text-xs text-muted">Excel (.xlsx) or CSV. Steps: 1. choose the file → 2. match the columns → 3. check the preview → 4. save. Imported orders stay apart from website orders; their phones count for “first order”.</p>
      <input ref={file} type="file" accept=".xlsx,.csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
      <button type="button" onClick={() => file.current?.click()} disabled={reading} className={secondaryButtonClass}>
        {reading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileUp className="size-4" aria-hidden />}
        {fileName || "1. Choose a file"}
      </button>
      <FormError error={readError} />

      {table && (
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <h3 className="mb-2 text-sm font-medium">2. Match the columns</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {importFields.map((f) => (
                <Field key={f} label={fieldLabels[f]} htmlFor={`map-${f}`}>
                  <select
                    id={`map-${f}`}
                    value={map[f] ?? ""}
                    onChange={(e) => setMap((m) => ({ ...m, [f]: e.target.value === "" ? undefined : Number(e.target.value) }))}
                    className={inputClass}
                  >
                    <option value="">— not in the file —</option>
                    {table[0].map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">3. Preview ({mapped.length} rows, first 5 shown)</h3>
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-xs">
                <thead className="bg-surface">
                  <tr>
                    {importFields.filter((f) => map[f] !== undefined).map((f) => (
                      <th key={f} className="px-2 py-1.5 text-start font-medium whitespace-nowrap">
                        {fieldLabels[f]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {mapped.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      {importFields.filter((f) => map[f] !== undefined).map((f) => (
                        <td key={f} className="max-w-48 truncate px-2 py-1.5" dir="auto">
                          {r[f]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Field label="Source" hint="e.g. the delivery company's name" htmlFor="imp-src" className="min-w-48 flex-1">
              <input id="imp-src" value={source} maxLength={60} onChange={(e) => setSource(e.target.value)} className={inputClass} />
            </Field>
            <button
              type="button"
              disabled={pending || !source.trim() || (map.phone === undefined && map.customer_name === undefined)}
              onClick={() =>
                save(async () => {
                  const r = await importOrders({ source, rows: mapped });
                  if (r.ok && r.data) {
                    setResult(`Saved ${r.data.saved} orders${r.data.skipped ? `, skipped ${r.data.skipped} (empty or already imported)` : ""}.`);
                    setTable(null);
                    setFileName("");
                  }
                  return r;
                })
              }
              className={buttonClass}
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              4. Save {mapped.length} orders
            </button>
          </div>
          <FormError error={error} />
        </div>
      )}
      {result && <p className="mt-3 text-sm text-emerald-700">{result}</p>}
    </Card>
  );
}

type Entry = { id: string; date: string; orders: number; sales: string; staff: string; note: string | null };

export function SalesTools({ entries, staff, isOwner, importedCount }: { entries: Entry[]; staff: { id: string; name: string }[]; isOwner: boolean; importedCount: number }) {
  const today = new Date().toISOString().slice(0, 10);
  const [e, setE] = useState<ManualEntryInput>({ date: today, orders: "", sales: "", staffId: "", note: "" });
  const { pending, error, save } = useSave();
  const set = <K extends keyof ManualEntryInput>(k: K, v: ManualEntryInput[K]) => setE((p) => ({ ...p, [k]: v }));

  return (
    <div className="flex flex-col gap-4">
      {isOwner && (
        <Card title="Add a day's sales outside the website">
          <form
            className="grid grid-cols-2 gap-3 sm:grid-cols-5"
            onSubmit={(ev) => {
              ev.preventDefault();
              save(() => saveManualEntry(e), () => setE({ date: e.date, orders: "", sales: "", staffId: "", note: "" }));
            }}
          >
            <Field label="Day" htmlFor="me-date">
              <input id="me-date" type="date" required value={e.date} onChange={(x) => set("date", x.target.value)} className={inputClass} />
            </Field>
            <Field label="Orders" htmlFor="me-orders">
              <input id="me-orders" type="number" min={0} required value={e.orders} onChange={(x) => set("orders", x.target.value)} className={inputClass} />
            </Field>
            <Field label="Sales ($)" htmlFor="me-sales">
              <input id="me-sales" type="number" min={0} step="0.01" required value={e.sales} onChange={(x) => set("sales", x.target.value)} className={inputClass} />
            </Field>
            <Field label="Employee" htmlFor="me-staff">
              <select id="me-staff" value={e.staffId} onChange={(x) => set("staffId", x.target.value)} className={inputClass}>
                <option value="">—</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note" htmlFor="me-note">
              <input id="me-note" maxLength={300} value={e.note} onChange={(x) => set("note", x.target.value)} className={inputClass} />
            </Field>
            <div className="col-span-2 sm:col-span-5">
              <FormError error={error} />
              <button disabled={pending} className={`${buttonClass} mt-1`}>
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Add
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Recent manual entries">
        {entries.length === 0 ? (
          <p className="text-sm text-muted">None yet.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {entries.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="font-medium">{x.date}</span> · {x.orders} orders · {x.sales}
                  <span className="block text-xs text-muted">
                    {x.staff}
                    {x.note && ` · ${x.note}`}
                  </span>
                </span>
                {isOwner && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => confirm("Delete this entry?") && save(() => deleteManualEntry(x.id))}
                    className={smallButtonClass}
                    aria-label="Delete entry"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isOwner && <Importer />}
      <p className="text-xs text-muted">{importedCount} old orders imported so far.</p>
    </div>
  );
}
