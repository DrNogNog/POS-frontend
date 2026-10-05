"use client";
// -----------------------------------------------------------------------------
// Accounts receivable board: what customers owe us, how late it is, and
// whether A/R is too high (slow collections) or too low (terms too rigid).
// -----------------------------------------------------------------------------
import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/lib/hooks";
import { date, firstLine, healthTone, money, pct } from "@/lib/format";
import type { Aging, Invoice } from "@/lib/types";
import { Badge, Button, Empty, ErrorNote, Loading, PageHeader, Panel, Stat, Table, Td, Th } from "@/components/ui";
import { InvoiceStatus } from "@/components/status";
import AgingBars from "@/components/AgingBars";
import { PaymentDialog } from "@/components/forms";

interface Board {
  aging: Aging;
  health: { dso: number; overduePct: number; creditSalesPct: number; turnover: number; level: string; headline: string; advice: string[] };
  salesInPeriod: number;
  periodDays: number;
  collectedThisMonth: number;
  discountsGivenThisMonth: number;
  needsCollections: number;
  topCustomers: { customerId: number | null; name: string; balance: number; overdue: number }[];
  invoices: (Invoice & { bucket: string })[];
}

const LEVEL_LABEL: Record<string, string> = { HIGH: "Too high", LOW: "Very low", HEALTHY: "Healthy", NO_DATA: "Not enough data" };

export default function ReceivablesPage() {
  const { data, error, loading, reload } = useApi<Board>("/receivables");
  const [bucket, setBucket] = useState("");
  const [paying, setPaying] = useState<Invoice | null>(null);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (loading && !data) return <Loading />;
  if (!data) return null;
  const list = data.invoices.filter((i) => !bucket || i.bucket === bucket);

  return (
    <>
      <PageHeader
        title="Accounts receivable"
        subtitle="Money customers owe us. Invoices on 30, 60 or 90-day terms land here until they're paid."
        actions={<Link href="/invoices?status=UNPAID"><Button variant="secondary">All unpaid invoices</Button></Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Customers owe us" value={money(data.aging.total)} />
        <Stat label="Past due" value={money(data.aging.total - data.aging.current)} tone={data.aging.total - data.aging.current > 0 ? "late" : "ink"} note={`${pct(data.health.overduePct, 0)} of receivables`} />
        <Stat label="Collected this month" value={money(data.collectedThisMonth)} tone="paid" note={data.discountsGivenThisMonth > 0 ? `${money(data.discountsGivenThisMonth)} given as early-pay discounts` : undefined} />
        <Stat label="Days to get paid (DSO)" value={Math.round(data.health.dso)} note={`Last ${data.periodDays} days · A/R turns over ${data.health.turnover}× a year`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel title="Is A/R too high or too low?">
          <Badge tone={healthTone(data.health.level)}>{LEVEL_LABEL[data.health.level]}</Badge>
          <p className="mt-3 text-lg text-walnut">{data.health.headline}</p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
            {data.health.advice.map((a) => <li key={a}>{a}</li>)}
          </ul>
          <dl className="mt-5 grid grid-cols-2 gap-2 border-t border-hairline pt-4 text-sm">
            <dt className="text-oak">Sales on account (last {data.periodDays} days)</dt>
            <dd className="num">{pct(data.health.creditSalesPct, 0)}</dd>
            <dt className="text-oak">Ready for collections</dt>
            <dd className="num">{data.needsCollections} invoices</dd>
          </dl>
          <p className="mt-4 text-xs text-oak">The too-high / too-low thresholds are set on the Settings screen.</p>
        </Panel>
        <Panel title="How late is the money?">
          <AgingBars aging={data.aging} selected={bucket} onSelect={setBucket} />
          <h3 className="mb-2 mt-6 text-sm font-semibold text-walnut">Who owes the most</h3>
          <Table>
            <tbody>
              {data.topCustomers.slice(0, 6).map((c) => (
                <tr key={c.name}>
                  <Td>{c.customerId ? <Link href={`/customers/${c.customerId}`} className="underline">{c.name}</Link> : c.name}</Td>
                  <Td className="num">{money(c.balance)}</Td>
                  <Td className="num text-late">{c.overdue > 0 ? `${money(c.overdue)} late` : ""}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>

      <Panel
        className="mt-6"
        padded={false}
        title={bucket ? `Open invoices — ${bucket === "current" ? "not due yet" : `${bucket} days late`}` : "Open invoices"}
        actions={bucket && <Button size="sm" variant="ghost" onClick={() => setBucket("")}>Show all</Button>}
      >
        {list.length === 0 ? (
          <Empty>Nothing owed here.</Empty>
        ) : (
          <Table>
            <thead>
              <tr><Th>Invoice</Th><Th>Customer</Th><Th>Issued</Th><Th>Due</Th><Th className="text-right">Balance</Th><Th>Status</Th><Th /></tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id}>
                  <Td><Link href={`/invoices/${i.id}`} className="font-semibold text-walnut underline">{i.invoiceNo}</Link></Td>
                  <Td>{i.customer?.name ?? firstLine(i.billTo)}{i.customer?.phone && <div className="text-xs text-oak">{i.customer.phone}</div>}</Td>
                  <Td>{date(i.issueDate)}</Td>
                  <Td>{date(i.dueDate)}</Td>
                  <Td className="num font-medium">{money(i.balance)}</Td>
                  <Td><InvoiceStatus inv={i} /></Td>
                  <Td className="text-right"><Button size="sm" variant="success" onClick={() => setPaying(i)}>Payment</Button></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <PaymentDialog
        open={!!paying}
        onClose={() => setPaying(null)}
        title={paying ? `Payment on ${paying.invoiceNo}` : ""}
        balance={paying?.balance ?? 0}
        discount={paying?.earlyDiscountAvailableNow ? paying.earlyDiscountAmount : 0}
        discountDeadline={paying?.earlyDiscountDeadline}
        endpoint={`/invoices/${paying?.id}/payments`}
        onDone={reload}
      />
    </>
  );
}
