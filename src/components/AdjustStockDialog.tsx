"use client";
// -----------------------------------------------------------------------------
// Adjust stock: add or remove units by hand (counts, old inventory, damage).
// Used from the Items & stock list and from an item's own page.
// When units are added you choose when they came in (or old inventory) and
// what happens to the item's cost.
// -----------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money, n, units as unitsLabel } from "@/lib/format";
import type { Money } from "@/lib/types";
import { Button, Field, Input, Modal, useAction } from "./ui";
import { DateInPicker, todayDateIn, type DateInValue } from "./DateIn";

export interface AdjustableItem {
  id: number;
  itemCode: string;
  name: string;
  unit: string;
  unitCost: Money;
  qtyOnHand: Money;
}

type CostUpdate = "average" | "replace" | "keep";

export function AdjustStockDialog({
  item,
  onClose,
  onDone,
}: {
  /** The item to adjust; null = closed */
  item: AdjustableItem | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [reason, setReason] = useState("");
  const [costUpdate, setCostUpdate] = useState<CostUpdate>("average");
  const [dateIn, setDateIn] = useState<DateInValue>(todayDateIn());
  const { busy, run } = useAction();

  useEffect(() => {
    if (!item) return;
    setDirection("add");
    setAmount("");
    setUnitCost("");
    setReason("");
    setCostUpdate("average");
    setDateIn(todayDateIn());
  }, [item]);

  if (!item) return null;
  const units = Math.abs(Number(amount) || 0);
  const change = direction === "add" ? units : -units;
  const onHand = n(item.qtyOnHand);
  const cost = n(item.unitCost);
  const adding = change > 0;

  async function save() {
    const ok = await run(
      () =>
        api(`/products/${item!.id}/adjust`, {
          body: {
            qtyChange: change,
            unitCost: adding && unitCost ? Number(unitCost) : undefined,
            reason,
            costUpdate,
            ...(adding ? (dateIn.old ? { oldInventory: true } : dateIn.day ? { dateIn: dateIn.day } : {}) : {}),
          },
        }),
      "Stock updated"
    );
    if (ok !== undefined) {
      onDone();
      onClose();
    }
  }

  const newCost = (() => {
    const c = unitCost ? Number(unitCost) : cost;
    const have = Math.max(0, onHand);
    return have > 0 && cost > 0 ? (have * cost + units * c) / (have + units) : c;
  })();

  return (
    <Modal
      open
      onClose={onClose}
      title={`Adjust stock — ${item.itemCode}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} busy={busy} disabled={!units || !reason.trim()}>
            {direction === "add" ? "Add" : "Remove"} {units ? unitsLabel(units) : "units"}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-oak">
        <b className="text-walnut">{item.name}</b> · {unitsLabel(onHand)} on hand
        {units > 0 && <> → <b className="text-walnut">{unitsLabel(onHand + change)}</b> after</>}
      </p>
      <div role="radiogroup" aria-label="Add or remove" className="mb-4 grid grid-cols-2 overflow-hidden rounded-lux border border-hairline">
        {(["add", "remove"] as const).map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={direction === d}
            onClick={() => setDirection(d)}
            className={`h-11 font-semibold ${direction === d ? "bg-walnut text-ivory" : "text-walnut hover:bg-linen"}`}
          >
            {d === "add" ? "Add stock" : "Remove stock"}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={direction === "add" ? "How many to add" : "How many to remove"}>
          <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        {direction === "add" ? (
          <Field label="Unit cost" hint={`Leave empty for ${money(cost)}`}>
            <Input type="number" step="0.01" min={0} value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
          </Field>
        ) : (
          <div />
        )}
        <Field label="Reason" className="sm:col-span-2">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={direction === "add" ? "Count, old inventory, delivery…" : "Damaged, count correction, sample…"}
          />
        </Field>
        {direction === "add" && <DateInPicker value={dateIn} onChange={setDateIn} id="adjust-date-in" />}
      </div>
      {direction === "add" && units > 0 && (
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-semibold text-walnut">What happens to the item&apos;s cost ({money(cost)})?</legend>
          <div className="space-y-2 text-sm">
            {(
              [
                ["average", "Average it in", `New cost ${money(newCost)} — weighted average of ${unitsLabel(Math.max(0, onHand))} on hand and ${unitsLabel(units)} added`],
                ["replace", "Use the new unit cost", `New cost ${money(unitCost || cost)}`],
                ["keep", "Keep the cost as it is", `Stays ${money(cost)}`],
              ] as const
            ).map(([value, label, note]) => (
              <label key={value} className="flex cursor-pointer items-start gap-2">
                <input type="radio" name="costUpdate" className="mt-1 accent-walnut" checked={costUpdate === value} onChange={() => setCostUpdate(value)} />
                <span><b className="text-walnut">{label}</b> <span className="text-oak">· {note}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <p className="mt-4 text-xs text-oak">New stock bought from a supplier can also come in through a purchase order.</p>
    </Modal>
  );
}
