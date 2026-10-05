"use client";
// One invoice: lines, payments, fees, and every action on it.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api, openPdf } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { usePriceLevels } from "@/lib/privacy";
import { date, dateTime, isoDay, money, n, qty, termsLabel } from "@/lib/format";
import type { Invoice } from "@/lib/types";
import { Button, ErrorNote, Field, Input, Loading, Modal, PageHeader, Panel, Table, Td, Th, Textarea, useAction } from "@/components/ui";
import { InvoiceStatus } from "@/components/status";
import { PaymentDialog } from "@/components/forms";
import { ItemCode } from "@/components/ItemCode";

type Dialog = null | "pay" | "fee" | "collections" | "writeoff" | "void" | "due";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useSession();
  const { data: inv, error, reload } = useApi<Invoice>(`/invoices/${id}`);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const { busy, run } = useAction();
  const { show: showLevels } = usePriceLevels();
  // Costs and profit only for bookkeepers, and only while price levels are shown
  const showCost = can("MANAGER", "ACCOUNTANT") && showLevels;
  const books = can("MANAGER", "ACCOUNTANT");

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!inv) return <Loading />;

  const open = inv.status !== "PAID" && inv.status !== "VOID";
  const close = () => {
    setDialog(null);
    setText("");
    setAmount("");
  };
  const act = async (path: string, body: unknown, msg: string) => {
    const ok = await run(() => api(path, { method: path.endsWith("due-date") ? "PUT" : "POST", body }), msg);
    if (ok) {
      close();
      await reload();
    }
  };
  const profit = n(inv.subtotal) - n(inv.discountAmount) - n(inv.cogsTotal);

  return (
    <>
      <PageHeader
        title={`Invoice ${inv.invoiceNo}`}
        subtitle={
          <>
            {date(inv.issueDate)} · {termsLabel(inv.termsDays)}
            {inv.termsDays > 0 && ` · due ${date(inv.dueDate)}`}
            {inv.estimate && <> · from estimate {inv.estimate.estimateNo}</>}
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => openPdf(`/invoices/${inv.id}/pdf`)}>Open PDF</Button>
            {open && <Button variant="success" onClick={() => setDialog("pay")}>Record payment</Button>}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel title="Customer">
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <div className="text-oak">Bill to</div>
                {inv.customer && (
                  <Link href={`/customers/${inv.customer.id}`} className="font-semibold text-walnut underline">{inv.customer.name}</Link>
                )}
                <div className="whitespace-pre-line">{inv.billTo}</div>
              </div>
              <div>
                <div className="text-oak">{inv.fulfillment === "DELIVERY" ? "Deliver to" : "Pickup"}</div>
                <div className="whitespace-pre-line">{inv.fulfillment === "DELIVERY" ? inv.shipTo || inv.billTo : inv.shipTo || "Customer picks up"}</div>
              </div>
              <div>
                <div className="text-oak">Salesperson</div>
                {inv.salesperson}
              </div>
            </div>
          </Panel>

          <Panel title="Items" padded={false}>
            <Table>
              <thead>
                <tr>
                  <Th>Code</Th>
                  <Th>Description</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Price</Th>
                  <Th className="text-right">Amount</Th>
                  {showCost && <Th className="text-right">Cost</Th>}
                </tr>
              </thead>
              <tbody>
                {inv.lines?.map((l, i) => (
                  <tr key={i}>
                    <Td><ItemCode code={l.itemCode} productId={l.productId} /></Td>
                    <Td>{l.description}</Td>
                    <Td className="num">{qty(l.qty)}</Td>
                    <Td className="num">{money(l.unitPrice)}</Td>
                    <Td className="num font-medium">{money(l.lineTotal)}</Td>
                    {showCost && <Td className="num text-oak">{money(n(l.unitCost) * n(l.qty))}</Td>}
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>

          <Panel title="Payments and adjustments" padded={false}>
            {!inv.payments?.length && !inv.adjustments?.length ? (
              <p className="p-5 text-oak">No payments yet.</p>
            ) : (
              <Table>
                <thead><tr><Th>Date</Th><Th>What</Th><Th>Reference</Th><Th className="text-right">Amount</Th></tr></thead>
                <tbody>
                  {inv.payments?.map((p) => (
                    <tr key={`p${p.id}`}>
                      <Td>{date(p.date)}</Td>
                      <Td>Payment — {p.method.toLowerCase()}{n(p.discountTaken) > 0 && ` (+ ${money(p.discountTaken)} early-pay discount)`}</Td>
                      <Td>{p.reference}</Td>
                      <Td className="num text-paid">{money(p.amount)}</Td>
                    </tr>
                  ))}
                  {inv.adjustments?.map((a) => (
                    <tr key={`a${a.id}`}>
                      <Td>{dateTime(a.createdAt)}</Td>
                      <Td>{a.type === "LATE_FEE" ? "Late fee" : "Written off as bad debt"}</Td>
                      <Td>{a.note}</Td>
                      <Td className="num text-late">{money(a.amount)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Summary">
            <div className="mb-3"><InvoiceStatus inv={inv} /></div>
            <dl className="space-y-1 text-sm">
              <Row label="Subtotal" value={money(inv.subtotal)} />
              {n(inv.discountAmount) > 0 && <Row label="Discount" value={`−${money(inv.discountAmount)}`} />}
              <Row label={`Tax (${n(inv.taxRatePct)}%)`} value={money(inv.taxAmount)} />
              <Row label="Total" value={money(inv.total)} strong />
              {n(inv.lateFees) > 0 && <Row label="Late fees" value={money(inv.lateFees)} />}
              {n(inv.amountPaid) > 0 && <Row label="Paid" value={`−${money(inv.amountPaid)}`} />}
              {n(inv.discountsTaken) > 0 && <Row label="Early-pay discount" value={`−${money(inv.discountsTaken)}`} />}
              {n(inv.writtenOff) > 0 && <Row label="Written off" value={`−${money(inv.writtenOff)}`} />}
              <Row label="Balance due" value={money(inv.balance)} strong />
            </dl>
            {inv.earlyDiscountAvailableNow && (
              <p className="mt-3 rounded-lux bg-paid/10 px-6 py-3 text-sm text-paid">
                Pays by {date(inv.earlyDiscountDeadline)} → takes {n(inv.earlyPayDiscountPct)}% off ({money(inv.earlyDiscountAmount)}).
              </p>
            )}
            {showCost && (
              <dl className="mt-4 space-y-1 border-t border-hairline pt-3 text-sm text-oak">
                <Row label="Cost of goods" value={money(inv.cogsTotal)} />
                <Row label="Gross profit" value={money(profit)} />
              </dl>
            )}
          </Panel>

          {books && inv.status !== "VOID" && (
            <Panel title="Late or problem account">
              <div className="flex flex-col gap-2">
                {open && <Button variant="secondary" onClick={() => setDialog("fee")}>Charge a late fee</Button>}
                {open && inv.collectionStatus !== "COLLECTIONS" && (
                  <Button variant="secondary" onClick={() => setDialog("collections")}>Send to collections agency</Button>
                )}
                {open && <Button variant="danger" onClick={() => setDialog("writeoff")}>Write off as bad debt</Button>}
                {open && <Button variant="ghost" onClick={() => { setText(isoDay(inv.dueDate)); setDialog("due"); }}>Change due date</Button>}
                {can("MANAGER") && !inv.payments?.length && !inv.adjustments?.length && (
                  <Button variant="ghost" onClick={() => setDialog("void")}>Void invoice</Button>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>

      <PaymentDialog
        open={dialog === "pay"}
        onClose={close}
        title={`Payment on ${inv.invoiceNo}`}
        balance={inv.balance}
        discount={inv.earlyDiscountAvailableNow ? inv.earlyDiscountAmount : 0}
        discountDeadline={inv.earlyDiscountDeadline}
        endpoint={`/invoices/${inv.id}/payments`}
        onDone={reload}
      />

      <Modal
        open={dialog === "fee"}
        onClose={close}
        title="Charge a late fee"
        footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button busy={busy} onClick={() => act(`/invoices/${inv.id}/late-fee`, { amount: amount ? Number(amount) : null, note: text }, "Late fee added")}>Add late fee</Button></>}
      >
        <Field label="Amount" hint="Leave empty to use the store's late fee (Settings)."><Input type="number" step="0.01" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Note" className="mt-3"><Input value={text} onChange={(e) => setText(e.target.value)} /></Field>
      </Modal>

      <Modal
        open={dialog === "collections"}
        onClose={close}
        title="Send to collections"
        footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button busy={busy} onClick={() => act(`/invoices/${inv.id}/collections`, { note: text }, "Marked for collections")}>Mark for collections</Button></>}
      >
        <p className="mb-3 text-sm text-oak">The balance stays on the books until it&apos;s paid or written off.</p>
        <Field label="Agency / note"><Textarea value={text} onChange={(e) => setText(e.target.value)} /></Field>
      </Modal>

      <Modal
        open={dialog === "writeoff"}
        onClose={close}
        title="Write off as bad debt"
        footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button variant="danger" busy={busy} onClick={() => act(`/invoices/${inv.id}/write-off`, { note: text }, "Written off")}>Write off {money(inv.balance)}</Button></>}
      >
        <p className="mb-3 text-sm text-oak">Moves the remaining {money(inv.balance)} out of receivables into Bad Debt Expense.</p>
        <Field label="Reason"><Textarea value={text} onChange={(e) => setText(e.target.value)} /></Field>
      </Modal>

      <Modal
        open={dialog === "void"}
        onClose={close}
        title="Void invoice"
        footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button variant="danger" busy={busy} disabled={!text.trim()} onClick={() => act(`/invoices/${inv.id}/void`, { reason: text }, "Invoice voided")}>Void invoice</Button></>}
      >
        <p className="mb-3 text-sm text-oak">Items go back into stock and the sale is reversed in the books.</p>
        <Field label="Reason"><Input value={text} onChange={(e) => setText(e.target.value)} /></Field>
      </Modal>

      <Modal
        open={dialog === "due"}
        onClose={close}
        title="Change due date"
        footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button busy={busy} onClick={() => act(`/invoices/${inv.id}/due-date`, { dueDate: text }, "Due date changed")}>Save</Button></>}
      >
        <Field label="New due date"><Input type="date" value={text} onChange={(e) => setText(e.target.value)} /></Field>
      </Modal>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "pt-1 text-base font-semibold text-walnut" : ""}`}>
      <dt>{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}
