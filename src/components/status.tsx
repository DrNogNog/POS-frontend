"use client";
// Status labels used across invoices, bills and estimates.
import { Badge } from "./ui";
import type { Bill, Estimate, Invoice } from "@/lib/types";

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
