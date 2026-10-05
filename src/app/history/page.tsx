"use client";
// History: every change made in this store — sales, payments, stock, prices,
// settings — newest first, with who did it.
import { useState } from "react";
import { useApi, useDebounced } from "@/lib/hooks";
import { dateTime, money } from "@/lib/format";
import { Button, Empty, ErrorNote, Field, Input, Loading, PageHeader, Panel, Select, Table, Td, Th } from "@/components/ui";

interface Entry { id: number; entityType: string; entityRef: string; action: string; summary: string; amount: string | null; userName: string; createdAt: string; details: unknown }

const TYPE_LABEL: Record<string, string> = {
  Invoice: "Invoices",
  Estimate: "Estimates",
  Bill: "Supplier bills",
  PurchaseOrder: "Purchase orders",
  Product: "Items & stock",
  Customer: "Customers",
  Supplier: "Suppliers",
  Payroll: "Payroll",
  Employee: "Employees",
  Settings: "Settings",
  User: "Users",
};

export default function HistoryPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dir, setDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(q);
  const params = new URLSearchParams({ page: String(page), limit: "100", dir });
  if (debounced) params.set("q", debounced);
  if (type) params.set("entityType", type);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const { data, error, loading } = useApi<{ items: Entry[]; total: number; types: string[] }>(`/history?${params}`);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <PageHeader title="History" subtitle="Everything that has happened in this store, and who did it." />
      <Panel padded={false}>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Search"><Input placeholder="Invoice #, item code, name…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></Field>
          <Field label="Area">
            <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              <option value="">Everything</option>
              {data?.types.map((t) => <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>)}
            </Select>
          </Field>
          <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Order">
            <Select value={dir} onChange={(e) => setDir(e.target.value as "asc" | "desc")}>
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </Select>
          </Field>
        </div>
        <ErrorNote>{error}</ErrorNote>
        {loading && !data ? <Loading /> : !data?.items.length ? <Empty>Nothing recorded yet.</Empty> : (
          <>
            <Table>
              <thead><tr><Th>When</Th><Th>Area</Th><Th>What happened</Th><Th className="text-right">Amount</Th><Th>By</Th></tr></thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id} className="hover:bg-linen/60">
                    <Td className="whitespace-nowrap">{dateTime(e.createdAt)}</Td>
                    <Td>{TYPE_LABEL[e.entityType] ?? e.entityType}</Td>
                    <Td>
                      {e.summary}
                      {e.details != null && (
                        <button className="ml-2 text-xs text-oak underline" onClick={() => setOpen(open === e.id ? null : e.id)}>
                          {open === e.id ? "hide details" : "details"}
                        </button>
                      )}
                      {open === e.id && <pre className="mt-2 overflow-x-auto rounded bg-linen p-2 text-xs">{JSON.stringify(e.details, null, 2)}</pre>}
                    </Td>
                    <Td className="num">{e.amount != null ? money(e.amount) : ""}</Td>
                    <Td>{e.userName}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex items-center justify-between p-4 text-sm text-oak">
              <span>{data.total.toLocaleString()} entries</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button size="sm" variant="secondary" disabled={page * 100 >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
