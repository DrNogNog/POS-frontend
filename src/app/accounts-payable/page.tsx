"use client";
// -----------------------------------------------------------------------------
// Accounts payable: supplier bills waiting to be paid (15/30/45-day terms),
// discounts we can still grab, and current liabilities from the balance sheet.
// -----------------------------------------------------------------------------
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { date, money } from "@/lib/format";
import type { Aging, Bill } from "@/lib/types";
import { Button, Empty, ErrorNote, Loading, PageHeader, Panel, Stat, Table, Td, Th } from "@/components/ui";
import { BillStatus } from "@/components/status";
import AgingBars from "@/components/AgingBars";
import BillDialog, { type BillDetail } from "@/components/BillDialog";

interface Board {
  aging: Aging;
  dueIn7: number;
  dpo: number;
  discountsAvailable: { billId: number; billNo: string; supplier: string; save: number; payBy: string; payAmount: number }[];
  bySupplier: { supplierId: number; name: string; balance: number; overdue: number }[];
  currentLiabilities: { code: string; name: string; balance: number; isCurrent: boolean }[];
  currentLiabilitiesTotal: number;
  currentAssetsTotal: number;
  currentRatio: number | null;
  bills: (Bill & { bucket: string })[];
}

export default function PayablesPage() {
  const { data, error, loading, reload } = useApi<Board>("/payables");
  const [bucket, setBucket] = useState("");
  const [detail, setDetail] = useState<BillDetail | null>(null);
  const show = async (id: number) => setDetail(await api<BillDetail>(`/bills/${id}`));

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (loading && !data) return <Loading />;
  if (!data) return null;
  const list = data.bills.filter((b) => !bucket || b.bucket === bucket);
  const overdue = data.aging.total - data.aging.current;

  return (
    <>
      <PageHeader
        title="Accounts payable"
        subtitle="Supplier bills waiting to be paid. Pay early where there's a discount; avoid late fees."
        actions={<Link href="/billing-orders"><Button variant="secondary">All billing orders</Button></Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="We owe suppliers" value={money(data.aging.total)} />
        <Stat label="Due in the next 7 days" value={money(data.dueIn7)} tone={data.dueIn7 > 0 ? "due" : "ink"} />
        <Stat label="Past due" value={money(overdue)} tone={overdue > 0 ? "late" : "ink"} note={overdue > 0 ? "Late fees may apply" : "All on time"} />
        <Stat label="Days we take to pay (DPO)" value={Math.round(data.dpo)} />
      </div>

      {data.discountsAvailable.length > 0 && (
        <Panel title="Pay early and save" className="mt-6" padded={false}>
          <Table>
            <thead><tr><Th>Supplier</Th><Th>Bill</Th><Th>Pay by</Th><Th className="text-right">Pay</Th><Th className="text-right">You save</Th><Th /></tr></thead>
            <tbody>
              {data.discountsAvailable.map((d) => (
                <tr key={d.billId}>
                  <Td>{d.supplier}</Td>
                  <Td>{d.billNo}</Td>
                  <Td>{date(d.payBy)}</Td>
                  <Td className="num">{money(d.payAmount)}</Td>
                  <Td className="num font-semibold text-paid">{money(d.save)}</Td>
                  <Td className="text-right"><Button size="sm" variant="success" onClick={() => show(d.billId)}>Pay</Button></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel title="How soon is it due?">
          <AgingBars aging={data.aging} selected={bucket} onSelect={setBucket} />
          <h3 className="mb-2 mt-6 text-sm font-semibold text-walnut">By supplier</h3>
          <Table>
            <tbody>
              {data.bySupplier.map((s) => (
                <tr key={s.supplierId}>
                  <Td><Link href={`/suppliers/${s.supplierId}`} className="underline">{s.name}</Link></Td>
                  <Td className="num">{money(s.balance)}</Td>
                  <Td className="num text-late">{s.overdue > 0 ? `${money(s.overdue)} late` : ""}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
        <Panel title="Current liabilities (balance sheet)">
          <Table>
            <tbody>
              {data.currentLiabilities.filter((l) => l.isCurrent).map((l) => (
                <tr key={l.code}><Td>{l.name}</Td><Td className="num">{money(l.balance)}</Td></tr>
              ))}
              <tr><Td className="font-semibold">Total current liabilities</Td><Td className="num font-semibold">{money(data.currentLiabilitiesTotal)}</Td></tr>
              <tr><Td className="text-oak">Current assets (cash, A/R, inventory)</Td><Td className="num text-oak">{money(data.currentAssetsTotal)}</Td></tr>
              <tr>
                <Td className="text-oak">Current ratio</Td>
                <Td className="num text-oak">{data.currentRatio === null ? "—" : `${data.currentRatio} : 1`}</Td>
              </tr>
            </tbody>
          </Table>
          <p className="mt-3 text-xs text-oak">A current ratio above 1.5 : 1 means short-term bills are comfortably covered.</p>
        </Panel>
      </div>

      <Panel title="Unpaid bills" className="mt-6" padded={false} actions={bucket && <Button size="sm" variant="ghost" onClick={() => setBucket("")}>Show all</Button>}>
        {list.length === 0 ? (
          <Empty>Nothing to pay here.</Empty>
        ) : (
          <Table>
            <thead><tr><Th>Supplier</Th><Th>Bill</Th><Th>Date</Th><Th>Due</Th><Th className="text-right">Balance</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id}>
                  <Td>{b.supplier.name}</Td>
                  <Td><button className="font-semibold text-walnut underline" onClick={() => show(b.id)}>{b.billNo}</button></Td>
                  <Td>{date(b.billDate)}</Td>
                  <Td>{date(b.dueDate)}</Td>
                  <Td className="num font-medium">{money(b.balance)}</Td>
                  <Td><BillStatus bill={b} /></Td>
                  <Td className="text-right"><Button size="sm" variant="success" onClick={() => show(b.id)}>Pay</Button></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <BillDialog bill={detail} onClose={() => setDetail(null)} onChanged={async () => { await reload(); if (detail) await show(detail.id); }} />
    </>
  );
}
