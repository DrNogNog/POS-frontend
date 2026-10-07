"use client";
// Dashboard: today at a glance.
import Link from "next/link";
import { useApi } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { dateTime, healthTone, money, pct, qty } from "@/lib/format";
import { Badge, Button, ErrorNote, Loading, PageHeader, Panel, Stat, Table, Td, Th } from "@/components/ui";
import { ItemCode } from "@/components/ItemCode";

interface Dashboard {
  salesToday: number;
  invoicesToday: number;
  salesMonth: number;
  grossProfitMonth: number;
  grossMarginMonthPct: number;
  arTotal: number;
  arOverdue: number;
  arHealth: { level: string; headline: string; dso: number };
  apTotal: number;
  apDueIn7: number;
  apDiscountsAvailable: number;
  inventoryValue: number;
  lowStock: { id: number; itemCode: string; name: string; qtyOnHand: number; reorderPoint: number }[];
  pendingEstimates: number;
  recent: { id: number; summary: string; createdAt: string; userName: string }[];
}


export default function DashboardPage() {
  const { user, can } = useSession();
  const { data, error, loading } = useApi<Dashboard>("/reports/dashboard");

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Good to see you, ${user?.name}.`}
        actions={
          <>
            <Link href="/sell"><Button>New sale or estimate</Button></Link>
            <Link href="/customers"><Button variant="secondary">Find a customer</Button></Link>
          </>
        }
      />
      <ErrorNote>{error}</ErrorNote>
      {loading && !data && <Loading />}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Sales today (before tax)" value={money(data.salesToday)} note={`${data.invoicesToday} invoices`} />
            <Stat label="Sales this month (before tax)" value={money(data.salesMonth)} note={`Gross profit ${money(data.grossProfitMonth)} · margin ${pct(data.grossMarginMonthPct)}`} />
            <Stat label="Customers owe us" value={money(data.arTotal)} tone={data.arOverdue > 0 ? "late" : "ink"} note={`${money(data.arOverdue)} past due`} />
            <Stat label="We owe suppliers" value={money(data.apTotal)} tone={data.apDueIn7 > 0 ? "due" : "ink"} note={`${money(data.apDueIn7)} due in the next 7 days`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel title="Receivables health" className="xl:col-span-1">
              <Badge tone={healthTone(data.arHealth.level)}>
                {data.arHealth.level === "HIGH" ? "Too high" : data.arHealth.level === "LOW" ? "Very low" : data.arHealth.level === "HEALTHY" ? "Healthy" : "Not enough data"}
              </Badge>
              <p className="mt-3 text-ink">{data.arHealth.headline}</p>
              {can("MANAGER", "ACCOUNTANT") && (
                <Link href="/accounts-receivable" className="mt-4 inline-block text-sm font-medium text-walnut underline">Open the receivables board</Link>
              )}
              <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <dt className="text-oak">Inventory value</dt>
                <dd className="num font-medium">{money(data.inventoryValue)}</dd>
                <dt className="text-oak">Estimates waiting</dt>
                <dd className="num font-medium">
                  <Link href="/approvals" className="underline">{data.pendingEstimates}</Link>
                </dd>
                <dt className="text-oak">Supplier discounts to grab</dt>
                <dd className="num font-medium">
                  <Link href="/accounts-payable" className="underline">{data.apDiscountsAvailable}</Link>
                </dd>
              </dl>
            </Panel>

            <Panel title="Running low" padded={false} className="xl:col-span-1">
              {data.lowStock.length === 0 ? (
                <p className="p-5 text-oak">Nothing is below its reorder point.</p>
              ) : (
                <Table>
                  <thead>
                    <tr><Th>Item</Th><Th className="text-right">On hand</Th><Th className="text-right">Reorder at</Th></tr>
                  </thead>
                  <tbody>
                    {data.lowStock.map((p) => (
                      <tr key={p.id}>
                        <Td><ItemCode code={p.itemCode} productId={p.id} /> <span className="ml-1">{p.name}</span></Td>
                        <Td className="num text-late">{qty(p.qtyOnHand)}</Td>
                        <Td className="num">{qty(p.reorderPoint)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {data.lowStock.length > 0 && can("MANAGER", "ACCOUNTANT") && (
                <div className="p-4"><Link href="/purchase-orders?reorder=1"><Button size="sm" variant="secondary">Order these</Button></Link></div>
              )}
            </Panel>

            <Panel title="Latest activity" className="xl:col-span-1">
              <ul className="space-y-3 text-sm">
                {data.recent.map((r) => (
                  <li key={r.id}>
                    <div>{r.summary}</div>
                    <div className="text-xs text-oak">{dateTime(r.createdAt)} · {r.userName}</div>
                  </li>
                ))}
              </ul>
              <Link href="/history" className="mt-4 inline-block text-sm font-medium text-walnut underline">See full history</Link>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
