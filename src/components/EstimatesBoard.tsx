"use client";
// Estimates list with the approve -> invoice workflow. Used by the
// Estimates screen (everything) and the Approvals screen (waiting only).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, openPdf } from "@/lib/api";
import { useApi, useDebounced, useQueryParam, useSort } from "@/lib/hooks";
import { Private } from "@/lib/privacy";
import { date, firstLine, money, n } from "@/lib/format";
import type { Estimate, Invoice } from "@/lib/types";
import { Button, Checkbox, Empty, ErrorNote, Field, Input, Loading, Modal, Panel, Select, Table, Td, Th, useAction } from "./ui";
import { EstimateStatus } from "./status";
import { ItemCode } from "./ItemCode";

export default function EstimatesBoard({ statuses }: { statuses?: Estimate["status"][] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(statuses?.length === 1 ? statuses[0] : "");
  const debounced = useDebounced(q);
  const sort = useSort<"date" | "total" | "estimateNo">("date");
  const { data, error, loading, reload } = useApi<Estimate[]>(
    `/estimates?${sort.query}&q=${encodeURIComponent(debounced)}${status ? `&status=${status}` : ""}`
  );
  const rows = (data ?? []).filter((e) => !statuses || statuses.includes(e.status));
  const { busy, run } = useAction();
  const [detail, setDetail] = useState<Estimate | null>(null);
  const [converting, setConverting] = useState<Estimate | null>(null);
  const [terms, setTerms] = useState(0);
  const [backorder, setBackorder] = useState(false);
  const openParam = useQueryParam("open");

  async function showDetail(id: number) {
    setDetail(await api<Estimate>(`/estimates/${id}`));
  }
  useEffect(() => {
    if (openParam) void showDetail(Number(openParam));
  }, [openParam]);

  async function setEstimateStatus(id: number, s: string) {
    await run(() => api(`/estimates/${id}/status`, { body: { status: s } }), s === "APPROVED" ? "Estimate approved" : "Estimate updated");
    setDetail(null);
    await reload();
  }

  async function startConvert(e: Estimate) {
    const full = await api<Estimate & { customer?: { termsDays: number } | null }>(`/estimates/${e.id}`);
    setTerms(full.customer?.termsDays ?? 0);
    setBackorder(false);
    setConverting(e);
  }

  async function convert() {
    if (!converting) return;
    const inv = await run(
      () => api<Invoice>(`/estimates/${converting.id}/invoice`, { body: { termsDays: terms, allowBackorder: backorder } }),
      "Invoice created"
    );
    if (inv) router.push(`/invoices/${inv.id}`);
  }

  return (
    <>
      <Panel padded={false}>
        <div className="flex flex-wrap gap-3 p-4">
          <Input className="max-w-sm" placeholder="Search estimate # or customer…" value={q} onChange={(e) => setQ(e.target.value)} />
          {!statuses && (
            <Select className="max-w-xs" value={status} onChange={(e) => setStatus(e.target.value as Estimate["status"])}>
              <option value="">All estimates</option>
              <option value="PENDING">Waiting for approval</option>
              <option value="APPROVED">Approved, not invoiced</option>
              <option value="INVOICED">Invoiced</option>
              <option value="REJECTED">Rejected</option>
            </Select>
          )}
        </div>
        <ErrorNote>{error}</ErrorNote>
        {loading && !data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty>No estimates here. <Link className="underline" href="/sell">Create one</Link>.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th sortKey="estimateNo" sort={sort}>Estimate</Th>
                <Th sortKey="date" sort={sort}>Date</Th>
                <Th>Customer</Th>
                <Th sortKey="total" sort={sort} className="text-right">Total</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="hover:bg-linen/60">
                  <Td>
                    <button className="font-semibold text-walnut underline" onClick={() => showDetail(e.id)}>{e.estimateNo}</button>
                  </Td>
                  <Td>{date(e.date)}</Td>
                  <Td>{e.customer?.name ?? firstLine(e.billTo) ?? "—"}</Td>
                  <Td className="num font-medium">{money(e.total)}</Td>
                  <Td>
                    <EstimateStatus status={e.status} />
                    {e.invoice && (
                      <Link href={`/invoices/${e.invoice.id}`} className="ml-2 text-sm underline">{e.invoice.invoiceNo}</Link>
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openPdf(`/estimates/${e.id}/pdf`)}>PDF</Button>
                      {e.status === "PENDING" && (
                        <Button size="sm" variant="success" busy={busy} onClick={() => setEstimateStatus(e.id, "APPROVED")}>Approve</Button>
                      )}
                      {e.status === "APPROVED" && <Button size="sm" onClick={() => startConvert(e)}>Make invoice</Button>}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        wide
        title={detail ? `Estimate ${detail.estimateNo}` : ""}
        footer={
          detail && (
            <>
              <Button variant="ghost" onClick={() => openPdf(`/estimates/${detail.id}/pdf`)}>Open PDF</Button>
              {detail.status !== "INVOICED" && (
                <Link href={`/sell?estimate=${detail.id}`}><Button variant="secondary">Edit</Button></Link>
              )}
              {detail.status === "PENDING" && (
                <>
                  <Button variant="danger" onClick={() => setEstimateStatus(detail.id, "REJECTED")}>Customer said no</Button>
                  <Button variant="success" onClick={() => setEstimateStatus(detail.id, "APPROVED")}>Approve</Button>
                </>
              )}
              {detail.status === "REJECTED" && <Button variant="secondary" onClick={() => setEstimateStatus(detail.id, "PENDING")}>Reopen</Button>}
              {detail.status === "APPROVED" && <Button onClick={() => { const d = detail; setDetail(null); void startConvert(d); }}>Make invoice</Button>}
            </>
          )
        }
      >
        {detail && (
          <div>
            <div className="mb-4 flex flex-wrap gap-6 text-sm">
              <div><div className="text-oak">Date</div>{date(detail.date)}</div>
              <div><div className="text-oak">Status</div><EstimateStatus status={detail.status} /></div>
              <Private><div><div className="text-oak">Price level</div>{detail.priceTierCode}</div></Private>
              <div><div className="text-oak">Fulfillment</div>{detail.fulfillment === "DELIVERY" ? "Delivery" : "Pickup"}</div>
            </div>
            <div className="mb-4 whitespace-pre-line text-sm">{detail.billTo}</div>
            <Table>
              <thead><tr><Th>Code</Th><Th>Description</Th><Th className="text-right">Qty</Th><Th className="text-right">Price</Th><Th className="text-right">Amount</Th></tr></thead>
              <tbody>
                {detail.lines?.map((l, i) => (
                  <tr key={i}>
                    <Td><ItemCode code={l.itemCode} productId={l.productId} /></Td>
                    <Td>{l.description}</Td>
                    <Td className="num">{n(l.qty)}</Td>
                    <Td className="num">{money(l.unitPrice)}</Td>
                    <Td className="num">{money(l.lineTotal)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="ml-auto mt-4 w-64 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="num">{money(detail.subtotal)}</dd></div>
              {n(detail.discountAmount) > 0 && <div className="flex justify-between"><dt>Discount</dt><dd className="num">−{money(detail.discountAmount)}</dd></div>}
              <div className="flex justify-between"><dt>Tax ({n(detail.taxRatePct)}%)</dt><dd className="num">{money(detail.taxAmount)}</dd></div>
              <div className="flex justify-between font-semibold text-walnut"><dt>Total</dt><dd className="num">{money(detail.total)}</dd></div>
            </dl>
          </div>
        )}
      </Modal>

      <Modal
        open={!!converting}
        onClose={() => setConverting(null)}
        title={converting ? `Invoice ${converting.estimateNo}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConverting(null)}>Cancel</Button>
            <Button onClick={convert} busy={busy}>Create invoice</Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-oak">Stock will be taken out of inventory and the amount goes to accounts receivable.</p>
        <Field label="Payment terms">
          <Select value={terms} onChange={(e) => setTerms(Number(e.target.value))}>
            <option value={0}>Due on receipt</option>
            <option value={30}>Net 30</option>
            <option value={60}>Net 60</option>
            <option value={90}>Net 90</option>
          </Select>
        </Field>
        <div className="mt-4"><Checkbox label="Special order — allow selling more than we have in stock" checked={backorder} onChange={setBackorder} /></div>
      </Modal>
    </>
  );
}
