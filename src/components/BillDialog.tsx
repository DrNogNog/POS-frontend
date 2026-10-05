"use client";
// A supplier bill with its lines, payments and actions (pay, late fee, PDF).
import Link from "next/link";
import { useState } from "react";
import { api, openPdf } from "@/lib/api";
import { date, money, n, qty } from "@/lib/format";
import type { Bill, Supplier } from "@/lib/types";
import { Button, Field, Input, Modal, Table, Td, Th, useAction } from "./ui";
import { BillStatus } from "./status";
import { PaymentDialog } from "./forms";
import { ItemCode } from "./ItemCode";

export interface BillDetail extends Bill {
  supplier: Supplier;
  lines: { id: number; productId: number | null; itemCode: string; description: string; qty: string; listPrice: string; discountPct: string; unitCost: string; lineTotal: string }[];
  adjustments: { id: number; type: string; amount: string; note: string; createdAt: string }[];
}

export default function BillDialog({ bill, onClose, onChanged }: { bill: BillDetail | null; onClose: () => void; onChanged: () => void }) {
  const [paying, setPaying] = useState(false);
  const [fee, setFee] = useState(false);
  const [feeAmount, setFeeAmount] = useState("");
  const { busy, run } = useAction();
  if (!bill) return null;
  const open = bill.status !== "PAID" && bill.status !== "VOID";
  return (
    <>
      <Modal
        open={!paying && !fee}
        onClose={onClose}
        wide
        title={`${bill.supplier.name} — bill ${bill.billNo}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => openPdf(`/bills/${bill.id}/pdf`)}>Open PDF</Button>
            {open && <Button variant="secondary" onClick={() => setFee(true)}>Supplier charged a late fee</Button>}
            {open && <Button variant="success" onClick={() => setPaying(true)}>Pay this bill</Button>}
          </>
        }
      >
        <div className="mb-4 flex flex-wrap gap-6 text-sm">
          <div><div className="text-oak">Bill date</div>{date(bill.billDate)}</div>
          <div><div className="text-oak">Due</div>{date(bill.dueDate)} (net {bill.termsDays})</div>
          <div><div className="text-oak">Status</div><BillStatus bill={bill} /></div>
          {bill.purchaseOrder && <div><div className="text-oak">From</div><Link className="underline" href={`/purchase-orders?open=${bill.purchaseOrder.id}`}>PO {bill.purchaseOrder.poNo}</Link></div>}
        </div>
        {bill.lines.length > 0 && (
          <Table>
            <thead><tr><Th>Code</Th><Th>Item</Th><Th className="text-right">Qty</Th><Th className="text-right">List</Th><Th className="text-right">Disc.</Th><Th className="text-right">Price in</Th><Th className="text-right">Amount</Th></tr></thead>
            <tbody>
              {bill.lines.map((l) => (
                <tr key={l.id}>
                  <Td><ItemCode code={l.itemCode} productId={l.productId} /></Td>
                  <Td>{l.description}</Td>
                  <Td className="num">{qty(l.qty)}</Td>
                  <Td className="num">{money(l.listPrice)}</Td>
                  <Td className="num">{n(l.discountPct)}%</Td>
                  <Td className="num">{money(l.unitCost)}</Td>
                  <Td className="num">{money(l.lineTotal)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <dl className="ml-auto mt-4 w-72 space-y-1 text-sm">
          {n(bill.tradeDiscount) > 0 && <div className="flex justify-between text-paid"><dt>Saved off list</dt><dd className="num">{money(bill.tradeDiscount)}</dd></div>}
          <div className="flex justify-between"><dt>Goods / amount</dt><dd className="num">{money(bill.subtotal)}</dd></div>
          {n(bill.freight) > 0 && <div className="flex justify-between"><dt>Freight</dt><dd className="num">{money(bill.freight)}</dd></div>}
          {n(bill.taxAmount) > 0 && <div className="flex justify-between"><dt>Tax</dt><dd className="num">{money(bill.taxAmount)}</dd></div>}
          <div className="flex justify-between font-semibold"><dt>Total</dt><dd className="num">{money(bill.total)}</dd></div>
          {n(bill.lateFees) > 0 && <div className="flex justify-between text-late"><dt>Late fees</dt><dd className="num">{money(bill.lateFees)}</dd></div>}
          {n(bill.amountPaid) > 0 && <div className="flex justify-between"><dt>Paid</dt><dd className="num">−{money(bill.amountPaid)}</dd></div>}
          {n(bill.discountsTaken) > 0 && <div className="flex justify-between text-paid"><dt>Early-pay discount</dt><dd className="num">−{money(bill.discountsTaken)}</dd></div>}
          <div className="flex justify-between text-base font-semibold text-walnut"><dt>Balance</dt><dd className="num">{money(bill.balance)}</dd></div>
        </dl>
        {bill.earlyDiscountAvailableNow && (
          <p className="mt-3 rounded-lux bg-paid/10 px-4 py-3 text-sm text-paid">
            Pay {money(bill.balance - bill.earlyDiscountAmount)} by {date(bill.earlyDiscountDeadline)} and save {money(bill.earlyDiscountAmount)}.
          </p>
        )}
        {!!bill.payments?.length && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-walnut">Payments</h3>
            <Table>
              <tbody>
                {bill.payments.map((p) => (
                  <tr key={p.id}><Td>{date(p.date)}</Td><Td>{p.method.toLowerCase()} {p.reference}</Td><Td className="num">{money(p.amount)}</Td></tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Modal>
      <PaymentDialog
        open={paying}
        onClose={() => setPaying(false)}
        title={`Pay ${bill.supplier.name} — ${bill.billNo}`}
        balance={bill.balance}
        discount={bill.earlyDiscountAvailableNow ? bill.earlyDiscountAmount : 0}
        discountDeadline={bill.earlyDiscountDeadline}
        endpoint={`/bills/${bill.id}/payments`}
        onDone={onChanged}
      />
      <Modal
        open={fee}
        onClose={() => setFee(false)}
        title="Supplier late fee"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFee(false)}>Cancel</Button>
            <Button busy={busy} onClick={async () => {
              if (await run(() => api(`/bills/${bill.id}/late-fee`, { body: { amount: feeAmount ? Number(feeAmount) : null } }), "Late fee recorded")) {
                setFee(false);
                setFeeAmount("");
                onChanged();
              }
            }}>Record late fee</Button>
          </>
        }
      >
        <Field label="Amount" hint="Leave empty to use the late fee in this supplier's contract.">
          <Input type="number" step="0.01" min={0} value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}

