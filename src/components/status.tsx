"use client";
// Status labels used across invoices, bills and estimates.
import { CreditCard } from "lucide-react";
import { Badge, Select } from "./ui";
import type { Bill, CardType, Estimate, Invoice } from "@/lib/types";

/** "Credit" / "Debit" label — how the customer is paying. */
export function CardBadge({ type }: { type: CardType | null | undefined }) {
  if (!type) return <span className="text-sm text-oak">—</span>;
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold " +
        (type === "CREDIT" ? "border-walnut/30 bg-walnut/10 text-walnut" : "border-brass/40 bg-brass/10 text-oak")
      }
    >
      <CreditCard size={12} aria-hidden /> {type === "CREDIT" ? "Credit" : "Debit"}
    </span>
  );
}

/** Filter dropdown for lists: all / credit / debit / not recorded. Sends ?cardType=. */
export function CardTypeFilter({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <Select className={className} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Credit or debit">
      <option value="">Credit and debit</option>
      <option value="CREDIT">Credit only</option>
      <option value="DEBIT">Debit only</option>
      <option value="NONE">Not recorded</option>
    </Select>
  );
}

export function InvoiceStatus({ inv }: { inv: Pick<Invoice, "status" | "collectionStatus" | "isOverdue" | "daysPastDue"> }) {
  if (inv.status === "VOID") return <Badge>Void</Badge>;
  if (inv.collectionStatus === "WRITTEN_OFF") return <Badge tone="late">Written off</Badge>;
  if (inv.status === "PAID") return <Badge tone="paid">Paid</Badge>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {inv.isOverdue ? (
        <Badge tone="late">{inv.daysPastDue} days late</Badge>
      ) : (
        <Badge tone="due">{inv.status === "PARTIAL" ? "Partly paid" : "Open"}</Badge>
      )}
      {inv.collectionStatus === "COLLECTIONS" && <Badge tone="info">Collections</Badge>}
      {inv.collectionStatus === "LATE_FEE" && <Badge tone="late">Late fee</Badge>}
    </span>
  );
}

export function BillStatus({ bill }: { bill: Pick<Bill, "status" | "isOverdue" | "daysPastDue" | "earlyDiscountAvailableNow"> }) {
  if (bill.status === "VOID") return <Badge>Void</Badge>;
  if (bill.status === "PAID") return <Badge tone="paid">Paid</Badge>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {bill.isOverdue ? (
        <Badge tone="late">{bill.daysPastDue} days late</Badge>
      ) : (
        <Badge tone="due">{bill.status === "PARTIAL" ? "Partly paid" : "Open"}</Badge>
      )}
      {bill.earlyDiscountAvailableNow && <Badge tone="paid">Discount available</Badge>}
    </span>
  );
}

export function EstimateStatus({ status }: { status: Estimate["status"] }) {
  const map = {
    PENDING: <Badge tone="due">Waiting for approval</Badge>,
    APPROVED: <Badge tone="paid">Approved</Badge>,
    REJECTED: <Badge tone="late">Rejected</Badge>,
    INVOICED: <Badge>Invoiced</Badge>,
  };
  return map[status];
}
