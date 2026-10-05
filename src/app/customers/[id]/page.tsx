"use client";
// One customer: saved details and their invoice history, sortable by date.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useApi, useSort } from "@/lib/hooks";
import { Private } from "@/lib/privacy";
import { date, money, termsLabel } from "@/lib/format";
import type { Customer, Estimate, Invoice } from "@/lib/types";
import { Badge, Button, Empty, ErrorNote, Loading, PageHeader, Panel, Stat, Table, Td, Th } from "@/components/ui";
import { EstimateStatus, InvoiceStatus } from "@/components/status";
import { CustomerForm } from "@/components/forms";

interface Detail extends Customer {
  invoices: Invoice[];
  estimates: Estimate[];
  stats: { lifetimeSales: number; openBalance: number; overdueBalance: number; invoiceCount: number; avgDaysToPay: number | null; availableCredit: number | null };
}

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const sort = useSort<"issueDate" | "dueDate" | "total" | "invoiceNo">("issueDate");
  const { data: c, error, reload } = useApi<Detail>(`/customers/${id}?${sort.query}`);
  const [editing, setEditing] = useState(false);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!c) return <Loading />;

  return (
    <>
      <PageHeader
        title={c.name}
        subtitle={[c.company, c.phone, c.email].filter(Boolean).join(" · ")}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}>Edit details</Button>
            <Link href={`/sell?customer=${c.id}`}><Button>New sale</Button></Link>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Owes now" value={money(c.stats.openBalance)} tone={c.stats.overdueBalance > 0 ? "late" : "ink"} note={c.stats.overdueBalance > 0 ? `${money(c.stats.overdueBalance)} past due` : "Nothing past due"} />
        <Stat label="Lifetime sales" value={money(c.stats.lifetimeSales)} note={`${c.stats.invoiceCount} invoices`} />
        <Stat label="Usually pays in" value={c.stats.avgDaysToPay === null ? "—" : `${c.stats.avgDaysToPay} days`} note={termsLabel(c.termsDays)} />
        <Stat label="Credit left" value={c.stats.availableCredit === null ? "No limit" : money(c.stats.availableCredit)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[340px_1fr]">
        <Panel title="On file">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-oak">Billing address</dt><dd className="whitespace-pre-line">{c.billingAddress || "—"}</dd></div>
            <div><dt className="text-oak">Delivery address</dt><dd className="whitespace-pre-line">{c.shippingAddress || "Same as billing"}</dd></div>
            <div><dt className="text-oak">Usually</dt><dd>{c.fulfillment === "DELIVERY" ? "Gets delivery" : "Picks up"}{c.deliveryNotes && ` — ${c.deliveryNotes}`}</dd></div>
            <Private><div><dt className="text-oak">Price level</dt><dd><Badge>{c.priceTierCode}</Badge></dd></div></Private>
            <div>
              <dt className="text-oak">Card on file</dt>
              <dd>{c.cardLast4 ? `${c.cardBrand || "Card"} ending ${c.cardLast4}, exp ${c.cardExp || "?"}${c.cardToken ? " (token saved)" : ""}` : "None"}</dd>
            </div>
            <div><dt className="text-oak">Sales tax</dt><dd>{c.taxExempt ? `Exempt ${c.taxExemptId}` : "Taxable"}</dd></div>
            {c.notes && <div><dt className="text-oak">Notes</dt><dd className="whitespace-pre-line">{c.notes}</dd></div>}
          </dl>
        </Panel>

        <div className="space-y-6">
          <Panel title="Invoices" padded={false}>
            {c.invoices.length === 0 ? (
              <Empty>No invoices yet.</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th sortKey="invoiceNo" sort={sort}>Invoice</Th>
                    <Th sortKey="issueDate" sort={sort}>Date</Th>
                    <Th sortKey="dueDate" sort={sort}>Due</Th>
                    <Th sortKey="total" sort={sort} className="text-right">Total</Th>
                    <Th className="text-right">Balance</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {c.invoices.map((i) => (
                    <tr key={i.id}>
                      <Td><Link href={`/invoices/${i.id}`} className="font-semibold text-walnut underline">{i.invoiceNo}</Link></Td>
                      <Td>{date(i.issueDate)}</Td>
                      <Td>{i.termsDays ? date(i.dueDate) : "On receipt"}</Td>
                      <Td className="num">{money(i.total)}</Td>
                      <Td className="num font-medium">{money(i.balance)}</Td>
                      <Td><InvoiceStatus inv={i} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
          {c.estimates.length > 0 && (
            <Panel title="Estimates" padded={false}>
              <Table>
                <tbody>
                  {c.estimates.map((e) => (
                    <tr key={e.id}>
                      <Td><Link href={`/estimates?open=${e.id}`} className="font-semibold text-walnut underline">{e.estimateNo}</Link></Td>
                      <Td>{date(e.date)}</Td>
                      <Td className="num">{money(e.total)}</Td>
                      <Td><EstimateStatus status={e.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          )}
        </div>
      </div>
      <CustomerForm open={editing} onClose={() => setEditing(false)} customer={c} onSaved={() => reload()} />
    </>
  );
}
