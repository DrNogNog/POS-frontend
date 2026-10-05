"use client";
// Financial statements built from the books: profit & loss, balance sheet,
// trial balance and the journal.
import { useState } from "react";
import { useApi } from "@/lib/hooks";
import { date, isoDay, money, pct } from "@/lib/format";
import { Badge, Button, ErrorNote, Field, Input, Loading, PageHeader, Panel, Table, Tabs, Td, Th } from "@/components/ui";

interface Acct { code: string; name: string; type: string; debit: number; credit: number; balance: number }
interface PL { revenue: Acct[]; contraRevenue: Acct[]; cogs: Acct[]; expenses: Acct[]; totals: { revenue: number; discounts: number; netRevenue: number; cogs: number; grossProfit: number; grossMarginPct: number; expenses: number; netIncome: number } }
interface BS { assets: Acct[]; liabilities: Acct[]; equity: Acct[]; netIncome: number; totals: { assets: number; currentAssets: number; liabilities: number; currentLiabilities: number; equity: number; liabilitiesAndEquity: number; workingCapital: number; currentRatio: number | null } }
interface TB { rows: Acct[]; totalDebit: number; totalCredit: number; inBalance: boolean }
interface Journal { items: { id: number; date: string; memo: string; sourceRef: string; createdBy: string; lines: { accountCode: string; debit: string; credit: string; account: { name: string } }[] }[]; total: number }

type Tab = "pl" | "bs" | "tb" | "journal";

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("pl");
  const [from, setFrom] = useState(isoDay(new Date(new Date().getFullYear(), 0, 1)));
  const [to, setTo] = useState(isoDay());
  const range = `from=${from}&to=${to}`;
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Built straight from the books. Every sale, payment, bill and payroll run is recorded as a balanced journal entry."
        actions={<Button variant="secondary" onClick={() => window.print()}>Print</Button>}
      />
      <div className="no-print mb-4 flex flex-wrap items-end gap-3">
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "pl", label: "Profit & loss" },
          { value: "bs", label: "Balance sheet" },
          { value: "tb", label: "Trial balance" },
          { value: "journal", label: "Journal" },
        ]}
      />
      {tab === "pl" && <ProfitLoss range={range} />}
      {tab === "bs" && <BalanceSheet to={to} />}
      {tab === "tb" && <TrialBalance to={to} />}
      {tab === "journal" && <JournalView range={range} />}
    </>
  );
}

function Section({ title, rows, total, totalLabel, negative }: { title: string; rows: Acct[]; total?: number; totalLabel?: string; negative?: boolean }) {
  return (
    <>
      <tr><Td colSpan={2} className="bg-linen font-semibold text-walnut">{title}</Td></tr>
      {rows.filter((r) => r.balance !== 0).map((r) => (
        <tr key={r.code}><Td className="pl-6">{r.name}</Td><Td className="num">{negative ? `(${money(r.balance)})` : money(r.balance)}</Td></tr>
      ))}
      {totalLabel !== undefined && <tr><Td className="font-semibold">{totalLabel}</Td><Td className="num font-semibold">{money(total)}</Td></tr>}
    </>
  );
}

function ProfitLoss({ range }: { range: string }) {
  const { data, error } = useApi<PL>(`/reports/income-statement?${range}`);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  const t = data.totals;
  return (
    <Panel padded={false} className="max-w-3xl">
      <Table>
        <tbody>
          <Section title="Income" rows={data.revenue} />
          <Section title="Less: early-payment discounts given" rows={data.contraRevenue} negative />
          <tr><Td className="font-semibold">Net sales</Td><Td className="num font-semibold">{money(t.netRevenue)}</Td></tr>
          <Section title="Cost of goods sold" rows={data.cogs} total={t.cogs} totalLabel="Total cost of goods sold" />
          <tr><Td className="font-semibold text-walnut">Gross profit <span className="text-sm font-normal text-oak">({pct(t.grossMarginPct)} margin)</span></Td><Td className="num font-semibold text-walnut">{money(t.grossProfit)}</Td></tr>
          <Section title="Expenses" rows={data.expenses} total={t.expenses} totalLabel="Total expenses" />
          <tr><Td className="text-lg font-semibold text-walnut">Net income</Td><Td className={`num text-lg font-semibold ${t.netIncome < 0 ? "text-late" : "text-paid"}`}>{money(t.netIncome)}</Td></tr>
        </tbody>
      </Table>
    </Panel>
  );
}

function BalanceSheet({ to }: { to: string }) {
  const { data, error } = useApi<BS>(`/reports/balance-sheet?to=${to}`);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  const t = data.totals;
  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
      <Panel padded={false} title={`Assets as of ${date(to)}`}>
        <Table>
          <tbody>
            <Section title="Current assets" rows={data.assets} total={t.assets} totalLabel="Total assets" />
          </tbody>
        </Table>
      </Panel>
      <Panel padded={false} title="Liabilities & equity">
        <Table>
          <tbody>
            <Section title="Current liabilities" rows={data.liabilities} total={t.liabilities} totalLabel="Total liabilities" />
            <Section title="Equity" rows={data.equity} />
            <tr><Td className="pl-6">Profit to date (not yet closed)</Td><Td className="num">{money(data.netIncome)}</Td></tr>
            <tr><Td className="font-semibold">Total equity</Td><Td className="num font-semibold">{money(t.equity)}</Td></tr>
            <tr><Td className="font-semibold text-walnut">Liabilities + equity</Td><Td className="num font-semibold text-walnut">{money(t.liabilitiesAndEquity)}</Td></tr>
          </tbody>
        </Table>
      </Panel>
      <Panel className="lg:col-span-2">
        <div className="flex flex-wrap gap-8 text-sm">
          <div><div className="text-oak">Working capital</div><div className="num text-left text-lg font-semibold">{money(t.workingCapital)}</div></div>
          <div><div className="text-oak">Current ratio</div><div className="num text-left text-lg font-semibold">{t.currentRatio === null ? "—" : `${t.currentRatio} : 1`}</div></div>
          <div className="self-center">{Math.abs(t.assets - t.liabilitiesAndEquity) < 0.01 ? <Badge tone="paid">Balanced</Badge> : <Badge tone="late">Out of balance</Badge>}</div>
        </div>
      </Panel>
    </div>
  );
}

function TrialBalance({ to }: { to: string }) {
  const { data, error } = useApi<TB>(`/reports/trial-balance?to=${to}`);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  return (
    <Panel padded={false} className="max-w-4xl" title={data.inBalance ? "Debits equal credits" : "Out of balance — contact support"}>
      <Table>
        <thead><tr><Th>Account</Th><Th className="text-right">Debits</Th><Th className="text-right">Credits</Th><Th className="text-right">Balance</Th></tr></thead>
        <tbody>
          {data.rows.filter((r) => r.debit || r.credit).map((r) => (
            <tr key={r.code}><Td>{r.code} {r.name}</Td><Td className="num">{money(r.debit)}</Td><Td className="num">{money(r.credit)}</Td><Td className="num font-medium">{money(r.balance)}</Td></tr>
          ))}
          <tr><Td className="font-semibold">Totals</Td><Td className="num font-semibold">{money(data.totalDebit)}</Td><Td className="num font-semibold">{money(data.totalCredit)}</Td><Td /></tr>
        </tbody>
      </Table>
    </Panel>
  );
}

function JournalView({ range }: { range: string }) {
  const [page, setPage] = useState(1);
  const { data, error } = useApi<Journal>(`/reports/journal?${range}&page=${page}&limit=50`);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  return (
    <Panel padded={false}>
      <Table>
        <thead><tr><Th>Date</Th><Th>Entry</Th><Th>Account</Th><Th className="text-right">Debit</Th><Th className="text-right">Credit</Th></tr></thead>
        <tbody>
          {data.items.map((e) =>
            e.lines.map((l, i) => (
              <tr key={`${e.id}-${i}`} className={i === 0 ? "border-t-2 border-hairline" : ""}>
                <Td>{i === 0 ? date(e.date) : ""}</Td>
                <Td>{i === 0 ? <>{e.memo}<div className="text-xs text-oak">{e.createdBy}</div></> : ""}</Td>
                <Td className={Number(l.credit) > 0 ? "pl-8" : ""}>{l.accountCode} {l.account.name}</Td>
                <Td className="num">{Number(l.debit) ? money(l.debit) : ""}</Td>
                <Td className="num">{Number(l.credit) ? money(l.credit) : ""}</Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      <div className="flex items-center justify-between p-4 text-sm text-oak">
        <span>{data.total} entries</span>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button size="sm" variant="secondary" disabled={page * 50 >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
    </Panel>
  );
}
