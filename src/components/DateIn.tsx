"use client";
// -----------------------------------------------------------------------------
// "Date in" for items: when the stock came in.
//   • Old inventory (before POS system) — stock we already had, no real date
//   • Pick a date — a calendar for stock that comes in from now on
// -----------------------------------------------------------------------------
import { date, isoDay } from "@/lib/format";
import { Badge, Input, Select } from "./ui";

export interface DateInValue {
  old: boolean;
  /** YYYY-MM-DD, used when old is false */
  day: string;
}

export const todayDateIn = (): DateInValue => ({ old: false, day: isoDay() });

/** From an item's saved fields. */
export function dateInOf(p: { dateIn?: string | null; oldInventory?: boolean } | null | undefined): DateInValue {
  if (!p) return todayDateIn();
  if (p.oldInventory) return { old: true, day: "" };
  return { old: false, day: p.dateIn ? isoDay(p.dateIn) : "" };
}

export function DateInPicker({
  value,
  onChange,
  label = "Date in",
  id = "date-in",
}: {
  value: DateInValue;
  onChange: (v: DateInValue) => void;
  label?: string;
  id?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-walnut">{label}</label>
      <Select
        id={id}
        value={value.old ? "old" : "date"}
        onChange={(e) => onChange(e.target.value === "old" ? { old: true, day: "" } : { old: false, day: value.day || isoDay() })}
      >
        <option value="date">Came in on a date…</option>
        <option value="old">Old inventory (before POS system)</option>
      </Select>
      {!value.old && (
        <Input
          aria-label={`${label}: date`}
          className="mt-2"
          type="date"
          value={value.day}
          max={isoDay(new Date(Date.now() + 366 * 86400000))}
          onChange={(e) => onChange({ old: false, day: e.target.value })}
        />
      )}
      {value.old && <p className="mt-1.5 text-xs text-oak">Stock you already had before using the POS. It&apos;s sold first (FIFO).</p>}
    </div>
  );
}

/** How a date in reads in tables. */
export function DateInLabel({ p }: { p: { dateIn?: string | null; oldInventory?: boolean } }) {
  if (p.oldInventory) return <Badge>Old inventory</Badge>;
  if (p.dateIn) return <span>{date(p.dateIn)}</span>;
  return <span className="text-oak">—</span>;
}
