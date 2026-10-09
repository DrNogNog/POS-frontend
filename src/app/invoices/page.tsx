"use client";
// All invoices, sortable by date, with filters.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi, useDebounced, useQueryParam, useSort } from "@/lib/hooks";
import { date, firstLine, money } from "@/lib/format";
import type { Invoice } from "@/lib/types";
import { Badge, Button, Empty, ErrorNote, Field, Input, Loading, PageHeader, Panel, Select, Table, Td, Th } from "@/components/ui";
import { CardBadge, CardTypeFilter, InvoiceStatus } from "@/components/status";

export default function InvoicesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const statusParam = useQueryParam("status");
  useEffect(() => {
    if (statusParam) setStatus(statusParam);
  }, [statusParam]);
  const [approval, setApproval] = useState(""); // "" | needed | none
  const [cardType, setCardType] = useState(""); // "" | CREDIT | DEBIT | NONE
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const sort = useSort<"issueDate" | "dueDate" | "total" | "invoiceNo">("issueDate");
  const debounced = useDebounced(q);
  const params = new URLSearchParams({ page: String(page), limit: "100", sort: sort.sort, dir: sort.dir });
  if (debounced) params.set("q", debounced);
  if (status === "OVERDUE") {
    params.set("status", "UNPAID");
    params.set("overdue", "true");
  } else if (status) params.set("status", status);
  if (approval) params.set("approval", approval);
  if (cardType) params.set("cardType", cardType);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const { data, error, loading } = useApi<{ items: Invoice[]; total: number }>(`/invoices?${params}`);

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Every sale. Click a column title to sort; newest first by default."
        actions={<Link href="/sell"><Button>New sale</Button></Link>}
      />
      <Panel padded={false}>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          <Field label="Search"><Input placeholder="Invoice # or customer" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></Field>
          <Field label="Show">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All invoices</option>
              <option value="UNPAID">Not fully paid</option>
              <option value="OVERDUE">Past due</option>
              <option value="PAID">Paid</option>
              <option value="VOID">Void</option>
            </Select>
          </Field>
          <Field label="Approval">
            <Select value={approval} onChange={(e) => { setApproval(e.target.value); setPage(1); }}>
              <option value="">With or without</option>
              <option value="needed">Needed approval (from an estimate)</option>
              <option value="none">No approval (direct sale)</option>
            </Select>
          </Field>
          <Field label="Paying by">
            <CardTypeFilter value={cardType} onChange={(v) => { setCardType(v); setPage(1); }} />
          </Field>
          <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <ErrorNote>{error}</ErrorNote>
        {loading && !data ? (
          <Loading />
        ) : !data?.items.length ? (
          <Empty>No invoices match.</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th sortKey="invoiceNo" sort={sort}>Invoice</Th>
                  <Th sortKey="issueDate" sort={sort}>Date</Th>
                  <Th>Customer</Th>
                  <Th>Approval</Th>
                  <Th>Paying by</Th>
                  <Th sortKey="dueDate" sort={sort}>Due</Th>
                  <Th sortKey="total" sort={sort} className="text-right">Total</Th>
                  <Th className="text-right">Balance</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((inv) => (
                  <tr key={inv.id} className="hover:bg-linen/60">
                    <Td><Link href={`/invoices/${inv.id}`} className="font-semibold text-walnut underline">{inv.invoiceNo}</Link></Td>
                    <Td>{date(inv.issueDate)}</Td>
                    <Td>
                      {inv.customer ? <Link className="hover:underline" href={`/customers/${inv.customer.id}`}>{inv.customer.name}</Link> : firstLine(inv.billTo) || "—"}
                    </Td>
                    <Td>
                      {inv.estimate ? (
                        <Badge tone="paid" title={inv.estimate.approvedAt ? `Approved ${date(inv.estimate.approvedAt)}` : undefined}>
                          Approved · {inv.estimate.estimateNo}
                        </Badge>
                      ) : (
                        <Badge>Not needed</Badge>
                      )}
                    </Td>
                    <Td><CardBadge type={inv.cardType} /></Td>
                    <Td>{inv.termsDays === 0 ? "On receipt" : date(inv.dueDate)}</Td>
                    <Td className="num">{money(inv.total)}</Td>
                    <Td className="num font-medium">{money(inv.balance)}</Td>
                    <Td><InvoiceStatus inv={inv} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex items-center justify-between p-4 text-sm text-oak">
              <span>{data.total} invoices</span>
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
