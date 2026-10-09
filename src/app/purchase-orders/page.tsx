"use client";
// -----------------------------------------------------------------------------
// Purchase orders: order from a supplier, then receive the goods together
// with the supplier's invoice. Receiving adds the stock (with freight spread
// into the cost) and puts the bill into Accounts Payable.
// -----------------------------------------------------------------------------
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { api, openPdf } from "@/lib/api";
import { useApi, useQueryParam } from "@/lib/hooks";
import { date, isoDay, money, n, qty } from "@/lib/format";
import type { Product, Supplier } from "@/lib/types";
import { Badge, Button, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, Panel, Select, Table, Td, Textarea, Th, useAction } from "@/components/ui";
import { ProductSearch } from "@/components/pickers";
import { ItemCode } from "@/components/ItemCode";

interface PoLine {
  id: number;
  productId: number;
  product: { id: number; itemCode: string; name: string; unit: string };
  qty: string;
  listPrice: string;
  discountPct: string;
  unitCost: string;
  lineTotal: string;
  qtyReceived: string;
}
interface Po {
  id: number;
  poNo: string;
  supplierId: number;
  supplier: Supplier;
  orderDate: string;
  expectedDate: string | null;
  status: "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";
  subtotal: string;
  notes: string;
  lines?: PoLine[];
  bills?: { id: number; billNo: string }[];
  _count?: { lines: number };
}

const STATUS: Record<Po["status"], { label: string; tone: "neutral" | "due" | "paid" | "late" }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  ORDERED: { label: "Ordered", tone: "due" },
  RECEIVED: { label: "Received", tone: "paid" },
  CANCELLED: { label: "Cancelled", tone: "late" },
};

interface Draft {
  key: number;
  productId: number;
  itemCode: string;
  name: string;
  qty: string;
  listPrice: string;
  discountPct: string;
}
let seq = 1;

export default function PurchaseOrdersPage() {
  const [status, setStatus] = useState("");
  const { data, error, loading, reload } = useApi<Po[]>(`/purchase-orders${status ? `?status=${status}` : ""}`);
  const { data: suppliers } = useApi<Supplier[]>("/suppliers");
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Po | null>(null);
  const openParam = useQueryParam("open");
  const supplierParam = useQueryParam("supplier");
  const reorderParam = useQueryParam("reorder");

  const showDetail = async (id: number) => setDetail(await api<Po>(`/purchase-orders/${id}`));
  useEffect(() => {
    if (openParam) void showDetail(Number(openParam));
  }, [openParam]);
  useEffect(() => {
    if (supplierParam || reorderParam) setCreating(true);
  }, [supplierParam, reorderParam]);

  return (
    <>
      <PageHeader
        title="Purchase orders"
        subtitle="Order stock from suppliers. When it arrives, receive it with the supplier's invoice."
        actions={<Button onClick={() => setCreating(true)}>New purchase order</Button>}
      />
      <Panel padded={false}>
        <div className="p-4">
          <Select className="max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All purchase orders</option>
            <option value="DRAFT">Drafts</option>
            <option value="ORDERED">Ordered — waiting for delivery</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
        <ErrorNote>{error}</ErrorNote>
        {loading && !data ? (
          <Loading />
        ) : !data?.length ? (
          <Empty>No purchase orders yet.</Empty>
        ) : (
          <Table>
            <thead><tr><Th>PO</Th><Th>Date</Th><Th>Supplier</Th><Th className="text-right">Lines</Th><Th className="text-right">Amount</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {data.map((po) => (
                <tr key={po.id}>
                  <Td><button className="font-semibold text-walnut underline" onClick={() => showDetail(po.id)}>{po.poNo}</button></Td>
                  <Td>{date(po.orderDate)}</Td>
                  <Td><Link href={`/suppliers/${po.supplierId}`} className="hover:underline">{po.supplier.name}</Link></Td>
                  <Td className="num">{po._count?.lines}</Td>
                  <Td className="num font-medium">{money(po.subtotal)}</Td>
                  <Td><Badge tone={STATUS[po.status].tone}>{STATUS[po.status].label}</Badge></Td>
                  <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => openPdf(`/purchase-orders/${po.id}/pdf`)}>PDF</Button></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <NewPoDialog
        open={creating}
        onClose={() => setCreating(false)}
        suppliers={suppliers ?? []}
        initialSupplierId={supplierParam}
        loadReorder={Boolean(reorderParam)}
        onSaved={async (po) => {
          await reload();
          await showDetail(po.id);
        }}
      />
      <PoDetail po={detail} onClose={() => setDetail(null)} onChanged={async () => { await reload(); if (detail) await showDetail(detail.id); }} />
    </>
  );
}

function NewPoDialog({
  open,
  onClose,
  suppliers,
  initialSupplierId,
  loadReorder,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  initialSupplierId: string;
  loadReorder: boolean;
  onSaved: (po: Po) => void;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [expected, setExpected] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Draft[]>([]);
  const { busy, run } = useAction();
  const supplier = suppliers.find((s) => String(s.id) === supplierId);

  useEffect(() => {
    if (!open) return;
    setSupplierId(initialSupplierId || "");
    setLines([]);
    setNotes("");
    setExpected("");
  }, [open, initialSupplierId]);

  const toDraft = (p: Product, q = 1): Draft => ({
    key: seq++,
    productId: p.id,
    itemCode: p.itemCode,
    name: p.name,
    qty: String(q),
    listPrice: n(p.listPrice) ? String(n(p.listPrice)) : String(n(p.unitCost)),
    discountPct: String(n(p.supplierDiscountPct) || (n(p.listPrice) ? n(supplier?.tradeDiscountPct) : 0)),
  });

  async function addReorderItems() {
    const items = await api<(Product & { suggestedQty: number })[]>("/products/reorder");
    const mine = items.filter((p) => !supplierId || String(p.supplierId) === supplierId);
    setLines((ls) => [...ls, ...mine.filter((p) => !ls.some((l) => l.productId === p.id)).map((p) => toDraft(p, p.suggestedQty))]);
  }
  useEffect(() => {
    if (open && loadReorder) void addReorderItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loadReorder]);

  const net = (l: Draft) => n(l.listPrice) * (1 - n(l.discountPct) / 100);
  const total = useMemo(() => lines.reduce((s, l) => s + n(l.qty) * net(l), 0), [lines]);
  const savings = useMemo(() => lines.reduce((s, l) => s + n(l.qty) * (n(l.listPrice) - net(l)), 0), [lines]);
  const update = (key: number, patch: Partial<Draft>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  async function save() {
    const po = await run(
      () =>
        api<Po>("/purchase-orders", {
          body: {
            supplierId: Number(supplierId),
            expectedDate: expected || null,
            notes,
            lines: lines.map((l) => ({ productId: l.productId, qty: n(l.qty), listPrice: n(l.listPrice), discountPct: n(l.discountPct) })),
          },
        }),
      "Purchase order saved"
    );
    if (po) {
      onClose();
      onSaved(po);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="New purchase order"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} busy={busy} disabled={!supplierId || !lines.length}>Save purchase order</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Supplier">
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Choose…</option>
            {suppliers.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Expected delivery"><Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} /></Field>
        <div className="flex items-end"><Button variant="secondary" onClick={addReorderItems}>Add items running low</Button></div>
      </div>
      {supplier && (
        <p className="mt-2 text-sm text-oak">
          Terms: net {supplier.paymentTermsDays} · {n(supplier.tradeDiscountPct)}% off list
          {n(supplier.earlyPayDiscountPct) > 0 && ` · ${n(supplier.earlyPayDiscountPct)}% off if paid in ${supplier.earlyPayDiscountDays} days`}
        </p>
      )}
      <div className="mt-4"><ProductSearch onPick={(p) => setLines((ls) => [...ls, toDraft(p)])} /></div>
      <div className="mt-3">
        <Table>
          <thead><tr><Th>Item</Th><Th className="w-20 text-right">Qty</Th><Th className="w-28 text-right">List price</Th><Th className="w-24 text-right">Discount %</Th><Th className="text-right">Net each</Th><Th className="text-right">Amount</Th><Th /></tr></thead>
          <tbody>
            {lines.length === 0 && <tr><Td colSpan={7} className="py-6 text-center text-oak">Search to add items.</Td></tr>}
            {lines.map((l) => (
              <tr key={l.key}>
                <Td><span className="font-semibold text-walnut">{l.itemCode}</span> {l.name}</Td>
                <Td><Input className="num h-9" type="number" min={0} step="any" value={l.qty} onChange={(e) => update(l.key, { qty: e.target.value })} /></Td>
                <Td><Input className="num h-9" type="number" min={0} step="0.01" value={l.listPrice} onChange={(e) => update(l.key, { listPrice: e.target.value })} /></Td>
                <Td><Input className="num h-9" type="number" min={0} max={100} step="0.01" value={l.discountPct} onChange={(e) => update(l.key, { discountPct: e.target.value })} /></Td>
                <Td className="num pt-4">{money(net(l))}</Td>
                <Td className="num pt-4 font-medium">{money(n(l.qty) * net(l))}</Td>
                <Td><button aria-label="Remove" className="p-2 text-oak hover:text-late" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}><Trash2 size={16} /></button></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-6 text-sm">
        {savings > 0 && <span className="text-paid">Supplier discount saves {money(savings)}</span>}
        <span className="font-semibold text-walnut">Total {money(total)}</span>
      </div>
      <Field label="Notes for the supplier" className="mt-3"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </Modal>
  );
}

function PoDetail({ po, onClose, onChanged }: { po: Po | null; onClose: () => void; onChanged: () => void }) {
  const { busy, run } = useAction();
  const [receiving, setReceiving] = useState(false);
  const [bill, setBill] = useState({ billNo: "", billDate: isoDay(), freight: "", taxAmount: "", notes: "" });
  const [recv, setRecv] = useState<Record<number, { qty: string; cost: string }>>({});

  useEffect(() => {
    if (!po?.lines) return;
    setRecv(
      Object.fromEntries(
        po.lines.map((l) => [l.id, { qty: String(Math.max(0, n(l.qty) - n(l.qtyReceived))), cost: String(n(l.unitCost)) }])
      )
    );
    setBill({ billNo: "", billDate: isoDay(), freight: "", taxAmount: "", notes: "" });
  }, [po]);

  if (!po) return null;
  const act = async (path: string, msg: string) => {
    if (await run(() => api(path, { body: {} }), msg)) onChanged();
  };

  async function receive() {
    const ok = await run(
      () =>
        api(`/purchase-orders/${po!.id}/receive`, {
          body: {
            billNo: bill.billNo,
            billDate: bill.billDate,
            freight: n(bill.freight),
            taxAmount: n(bill.taxAmount),
            notes: bill.notes,
            lines: po!.lines!.map((l) => ({ lineId: l.id, qtyReceived: n(recv[l.id]?.qty), unitCost: n(recv[l.id]?.cost) })),
          },
        }),
      "Received — stock added and bill sent to accounts payable"
    );
    if (ok) {
      setReceiving(false);
      onChanged();
    }
  }

  return (
    <>
      <Modal
        open={!receiving}
        onClose={onClose}
        wide
        title={`Purchase order ${po.poNo}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => openPdf(`/purchase-orders/${po.id}/pdf`)}>Open PDF</Button>
            {po.status === "DRAFT" && <Button variant="secondary" busy={busy} onClick={() => act(`/purchase-orders/${po.id}/ordered`, "Marked as ordered")}>Mark as sent to supplier</Button>}
            {(po.status === "DRAFT" || po.status === "ORDERED") && (
              <>
                <Button variant="danger" busy={busy} onClick={() => act(`/purchase-orders/${po.id}/cancel`, "Purchase order cancelled")}>Cancel PO</Button>
                <Button onClick={() => setReceiving(true)}>Receive goods &amp; bill</Button>
              </>
            )}
          </>
        }
      >
        <div className="mb-4 flex flex-wrap gap-6 text-sm">
          <div><div className="text-oak">Supplier</div>{po.supplier.name}</div>
          <div><div className="text-oak">Ordered</div>{date(po.orderDate)}</div>
          <div><div className="text-oak">Expected</div>{date(po.expectedDate)}</div>
          <div><div className="text-oak">Status</div><Badge tone={STATUS[po.status].tone}>{STATUS[po.status].label}</Badge></div>
          {po.bills?.map((b) => (
            <div key={b.id}><div className="text-oak">Bill</div><Link className="underline" href={`/billing-orders?open=${b.id}`}>{b.billNo}</Link></div>
          ))}
        </div>
        <Table>
          <thead><tr><Th>Code</Th><Th>Item</Th><Th className="text-right">Ordered</Th><Th className="text-right">Received</Th><Th className="text-right">List</Th><Th className="text-right">Disc.</Th><Th className="text-right">Net each</Th><Th className="text-right">Amount</Th></tr></thead>
          <tbody>
            {po.lines?.map((l) => (
              <tr key={l.id}>
                <Td><ItemCode code={l.product.itemCode} productId={l.productId} /></Td>
                <Td>{l.product.name}</Td>
                <Td className="num">{qty(l.qty)}</Td>
                <Td className="num">{qty(l.qtyReceived)}</Td>
                <Td className="num">{money(l.listPrice)}</Td>
                <Td className="num">{n(l.discountPct)}%</Td>
                <Td className="num">{money(l.unitCost)}</Td>
                <Td className="num font-medium">{money(l.lineTotal)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <p className="mt-3 text-right font-semibold text-walnut">Total {money(po.subtotal)}</p>
        {po.notes && <p className="mt-2 text-sm text-oak">{po.notes}</p>}
      </Modal>

      <Modal
        open={receiving}
        onClose={() => setReceiving(false)}
        wide
        title={`Receive ${po.poNo}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReceiving(false)}>Back</Button>
            <Button onClick={receive} busy={busy} disabled={!bill.billNo.trim()}>Receive and add bill</Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-oak">Enter what actually arrived and the supplier&apos;s invoice. Freight and tax are spread into each item&apos;s cost.</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Supplier invoice #"><Input value={bill.billNo} onChange={(e) => setBill({ ...bill, billNo: e.target.value })} /></Field>
          <Field label="Invoice date"><Input type="date" value={bill.billDate} onChange={(e) => setBill({ ...bill, billDate: e.target.value })} /></Field>
          <Field label="Freight"><Input type="number" step="0.01" min={0} value={bill.freight} onChange={(e) => setBill({ ...bill, freight: e.target.value })} /></Field>
          <Field label="Tax on invoice"><Input type="number" step="0.01" min={0} value={bill.taxAmount} onChange={(e) => setBill({ ...bill, taxAmount: e.target.value })} /></Field>
        </div>
        <div className="mt-4">
          <Table>
            <thead><tr><Th>Item</Th><Th className="text-right">Still to come</Th><Th className="w-28 text-right">Received now</Th><Th className="w-32 text-right">Cost each</Th></tr></thead>
            <tbody>
              {po.lines?.map((l) => (
                <tr key={l.id}>
                  <Td><b className="text-walnut">{l.product.itemCode}</b> {l.product.name}</Td>
                  <Td className="num">{qty(n(l.qty) - n(l.qtyReceived))}</Td>
                  <Td><Input className="num h-9" type="number" min={0} step="any" value={recv[l.id]?.qty ?? ""} onChange={(e) => setRecv({ ...recv, [l.id]: { ...recv[l.id], qty: e.target.value } })} /></Td>
                  <Td><Input className="num h-9" type="number" min={0} step="0.01" value={recv[l.id]?.cost ?? ""} onChange={(e) => setRecv({ ...recv, [l.id]: { ...recv[l.id], cost: e.target.value } })} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <Field label="Notes" className="mt-3"><Input value={bill.notes} onChange={(e) => setBill({ ...bill, notes: e.target.value })} /></Field>
      </Modal>
    </>
  );
}
