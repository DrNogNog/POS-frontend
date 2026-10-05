"use client";
// Billing orders: every bill suppliers have sent us (stock deliveries and
// other expenses like rent). Unpaid ones are our accounts payable.
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApi, useQueryParam, useSort } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { date, isoDay, money } from "@/lib/format";
import type { Bill, Supplier } from "@/lib/types";
import { Button, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, Panel, Select, Table, Td, Textarea, Th, useAction } from "@/components/ui";
import { BillStatus } from "@/components/status";
import BillDialog, { type BillDetail } from "@/components/BillDialog";


export default function BillingOrdersPage() {
  const [status, setStatus] = useState("");
  const sort = useSort<"billDate" | "dueDate" | "total">("billDate");
  const { data, error, loading, reload } = useApi<Bill[]>(`/bills?${sort.query}${status ? `&status=${status}` : ""}`);
  const [detail, setDetail] = useState<BillDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const openParam = useQueryParam("open");
  const show = async (id: number) => setDetail(await api<BillDetail>(`/bills/${id}`));
  useEffect(() => {
    if (openParam) void show(Number(openParam));
  }, [openParam]);

  return (
    <>
      <PageHeader
        title="Billing orders"
        subtitle="Bills from suppliers. Stock deliveries arrive here from purchase orders; add other bills (rent, utilities, delivery) yourself."
        actions={<Button onClick={() => setCreating(true)}>Add other bill</Button>}
      />
      <Panel padded={false}>
        <div className="p-4">
          <Select className="max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All bills</option>
            <option value="UNPAID">Not fully paid</option>
            <option value="PAID">Paid</option>
          </Select>
        </div>
        <ErrorNote>{error}</ErrorNote>
        {loading && !data ? (
          <Loading />
        ) : !data?.length ? (
          <Empty>No bills yet. They appear when you receive a purchase order.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Bill #</Th>
                <Th>Supplier</Th>
                <Th sortKey="billDate" sort={sort}>Date</Th>
                <Th sortKey="dueDate" sort={sort}>Due</Th>
                <Th>For</Th>
                <Th sortKey="total" sort={sort} className="text-right">Total</Th>
                <Th className="text-right">Balance</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.id} className="hover:bg-linen/60">
                  <Td><button className="font-semibold text-walnut underline" onClick={() => show(b.id)}>{b.billNo}</button></Td>
                  <Td><Link href={`/suppliers/${b.supplierId}`} className="hover:underline">{b.supplier.name}</Link></Td>
                  <Td>{date(b.billDate)}</Td>
                  <Td>{date(b.dueDate)}</Td>
                  <Td>{b.purchaseOrder ? `PO ${b.purchaseOrder.poNo}` : "Expense"}</Td>
                  <Td className="num">{money(b.total)}</Td>
                  <Td className="num font-medium">{money(b.balance)}</Td>
                  <Td><BillStatus bill={b} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <BillDialog bill={detail} onClose={() => setDetail(null)} onChanged={async () => { await reload(); if (detail) await show(detail.id); }} />
      <ExpenseBillDialog open={creating} onClose={() => setCreating(false)} onSaved={reload} />
    </>
  );
}

function ExpenseBillDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSession();
  const { data: suppliers } = useApi<Supplier[]>(open ? "/suppliers" : null);
  const [f, setF] = useState({ supplierId: "", billNo: "", billDate: isoDay(), expenseAccountCode: "6300", amount: "", notes: "" });
  const { busy, run } = useAction();
  const accounts = settings?.accounts.filter((a) => a.type === "EXPENSE") ?? [];
  async function save() {
    const ok = await run(() => api("/bills", { body: { ...f, supplierId: Number(f.supplierId), amount: Number(f.amount) } }), "Bill added to accounts payable");
    if (ok) {
      onSaved();
      onClose();
      setF({ ...f, billNo: "", amount: "", notes: "" });
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a bill (not stock)"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} busy={busy} disabled={!f.supplierId || !f.billNo || !(Number(f.amount) > 0)}>Add bill</Button></>}
    >
      <p className="mb-4 text-sm text-oak">For stock you bought, receive the purchase order instead — that adds the items to inventory.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Supplier / vendor">
          <Select value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}>
            <option value="">Choose…</option>
            {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Their bill #"><Input value={f.billNo} onChange={(e) => setF({ ...f, billNo: e.target.value })} /></Field>
        <Field label="Bill date"><Input type="date" value={f.billDate} onChange={(e) => setF({ ...f, billDate: e.target.value })} /></Field>
        <Field label="Amount"><Input type="number" step="0.01" min={0} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="What it's for" className="sm:col-span-2">
          <Select value={f.expenseAccountCode} onChange={(e) => setF({ ...f, expenseAccountCode: e.target.value })}>
            {accounts.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
