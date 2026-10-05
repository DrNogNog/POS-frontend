"use client";
// One item: what the code means, price in/out at every level, cost layers
// (for FIFO/LIFO), weighted average cost and every stock movement.
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api, imageUrl } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { Private, usePriceLevels } from "@/lib/privacy";
import { date, dateTime, money, n, pct, qty } from "@/lib/format";
import type { Product, Supplier } from "@/lib/types";
import { Button, ErrorNote, Field, Input, Loading, Modal, PageHeader, Panel, Stat, Table, Td, Th, useAction } from "@/components/ui";
import { CodeExplanation } from "@/components/ItemCode";
import { ProductForm } from "@/components/forms";

interface Detail extends Product {
  supplier: Supplier | null;
  weightedAverageCost: number;
  stockValue: number;
  prices: { tier: string; name: string; markupPct: number; price: number; marginPct: number }[];
  lots: { id: number; receivedAt: string; qtyReceived: string; qtyRemaining: string; unitCost: string; source: string; sourceRef: string }[];
  movements: { id: number; type: string; qty: string; unitCost: string; totalCost: string; reference: string; note: string; createdAt: string }[];
}

const MOVE_LABEL: Record<string, string> = {
  RECEIVE: "Received from supplier",
  SALE: "Sold",
  ADJUST_IN: "Added (count / opening)",
  ADJUST_OUT: "Removed (damage / count)",
  RETURN_IN: "Returned / void",
};

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useSession();
  const { show: showLevels } = usePriceLevels();
  const { data: p, error, reload } = useApi<Detail>(`/products/${id}`);
  const [editing, setEditing] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [adj, setAdj] = useState({ qtyChange: "", unitCost: "", reason: "" });
  const { busy, run } = useAction();

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!p) return <Loading />;

  async function adjust() {
    const ok = await run(
      () =>
        api(`/products/${id}/adjust`, {
          body: { qtyChange: Number(adj.qtyChange), unitCost: adj.unitCost ? Number(adj.unitCost) : undefined, reason: adj.reason },
        }),
      "Stock updated"
    );
    if (ok) {
      setAdjusting(false);
      setAdj({ qtyChange: "", unitCost: "", reason: "" });
      await reload();
    }
  }

  return (
    <>
      <PageHeader
        title={`${p.itemCode} — ${p.name}`}
        subtitle={[p.category?.name, p.collection, p.supplier && `from ${p.supplier.name}`].filter(Boolean).join(" · ")}
        actions={
          can("MANAGER") && (
            <>
              <Button variant="secondary" onClick={() => setAdjusting(true)}>Adjust stock</Button>
              <Button onClick={() => setEditing(true)}>Edit item</Button>
            </>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="On hand" value={`${qty(p.qtyOnHand)} ${p.unit}`} tone={n(p.reorderPoint) > 0 && n(p.qtyOnHand) <= n(p.reorderPoint) ? "late" : "ink"} note={n(p.reorderPoint) ? `Reorder at ${qty(p.reorderPoint)}` : undefined} />
        {showLevels ? (
          <>
            <Stat label="Price in (standard cost)" value={money(p.unitCost)} note={n(p.listPrice) ? `List ${money(p.listPrice)} less ${n(p.supplierDiscountPct)}%` : undefined} />
            <Stat label="Weighted average cost" value={money(p.weightedAverageCost)} note="Of the units on hand" />
            <Stat label="Stock value" value={money(p.stockValue)} />
          </>
        ) : (
          <Stat label="Price" value={money(p.prices[p.prices.length - 1]?.price)} note="Costs and price levels are hidden" />
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="What this code means"><CodeExplanation code={p.itemCode} />{p.description && <p className="mt-4 text-sm text-oak">{p.description}</p>}</Panel>
        <Private>
        <Panel title="Price out by level" padded={false}>
          <Table>
            <thead><tr><Th>Level</Th><Th className="text-right">Markup</Th><Th className="text-right">Price</Th><Th className="text-right">Margin</Th></tr></thead>
            <tbody>
              {p.prices.map((x) => (
                <tr key={x.tier}>
                  <Td><b>{x.tier}</b> <span className="text-oak">{x.name}</span></Td>
                  <Td className="num">{p.sellPriceOverride ? "fixed" : pct(x.markupPct, 0)}</Td>
                  <Td className="num font-medium">{money(x.price)}</Td>
                  <Td className="num">{pct(x.marginPct)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="p-4 text-xs text-oak">Change level markups on the Settings screen. A fixed selling price on the item overrides them.</p>
        </Panel>
        </Private>
      </div>

      {p.images.length > 0 && (
        <Panel title="Photos" className="mt-6">
          <div className="flex flex-wrap gap-3">
            {p.images.map((img) => (
              <a key={img} href={imageUrl(img)} target="_blank" rel="noreferrer">
                <Image src={imageUrl(img)} alt={p.name} width={160} height={160} unoptimized className="h-40 w-40 rounded-md border border-hairline object-cover" />
              </a>
            ))}
          </div>
        </Panel>
      )}

      <Private>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Cost layers on hand" padded={false}>
          {p.lots.length === 0 ? (
            <p className="p-5 text-oak">No stock on hand.</p>
          ) : (
            <Table>
              <thead><tr><Th>Received</Th><Th>From</Th><Th className="text-right">Left</Th><Th className="text-right">Unit cost</Th><Th className="text-right">Value</Th></tr></thead>
              <tbody>
                {p.lots.map((l) => (
                  <tr key={l.id}>
                    <Td>{date(l.receivedAt)}</Td>
                    <Td>{l.sourceRef || l.source.toLowerCase()}</Td>
                    <Td className="num">{qty(l.qtyRemaining)} / {qty(l.qtyReceived)}</Td>
                    <Td className="num">{money(l.unitCost)}</Td>
                    <Td className="num">{money(n(l.qtyRemaining) * n(l.unitCost))}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <p className="p-4 text-xs text-oak">
            FIFO sells the oldest layer first, LIFO the newest. Compare both on the <Link className="underline" href={`/costing?productId=${p.id}`}>costing screen</Link>.
          </p>
        </Panel>
        <Panel title="Stock movements" padded={false}>
          <Table>
            <thead><tr><Th>When</Th><Th>What</Th><Th className="text-right">Qty</Th><Th className="text-right">Cost</Th></tr></thead>
            <tbody>
              {p.movements.map((m) => (
                <tr key={m.id}>
                  <Td>{dateTime(m.createdAt)}</Td>
                  <Td>{MOVE_LABEL[m.type] ?? m.type} <span className="text-oak">{m.reference}</span>{m.note && <div className="text-xs text-oak">{m.note}</div>}</Td>
                  <Td className={`num ${["SALE", "ADJUST_OUT"].includes(m.type) ? "text-late" : "text-paid"}`}>
                    {["SALE", "ADJUST_OUT"].includes(m.type) ? "−" : "+"}{qty(m.qty)}
                  </Td>
                  <Td className="num">{money(m.totalCost)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>

      </Private>

      <ProductForm open={editing} onClose={() => setEditing(false)} product={p} onSaved={() => reload()} />
      <Modal
        open={adjusting}
        onClose={() => setAdjusting(false)}
        title={`Adjust stock — ${p.itemCode}`}
        footer={<><Button variant="secondary" onClick={() => setAdjusting(false)}>Cancel</Button><Button onClick={adjust} busy={busy} disabled={!Number(adj.qtyChange) || !adj.reason.trim()}>Save adjustment</Button></>}
      >
        <p className="mb-4 text-sm text-oak">
          Use this for counts, opening stock, or damaged goods. New stock bought from a supplier should come in through a purchase order.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Change in quantity" hint="Positive adds, negative removes (e.g. -2)"><Input type="number" step="any" value={adj.qtyChange} onChange={(e) => setAdj({ ...adj, qtyChange: e.target.value })} /></Field>
          <Field label="Unit cost (when adding)" hint={`Default ${money(p.unitCost)}`}><Input type="number" step="0.01" min={0} value={adj.unitCost} onChange={(e) => setAdj({ ...adj, unitCost: e.target.value })} /></Field>
          <Field label="Reason" className="sm:col-span-2"><Input value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} placeholder="Opening count, damaged in delivery…" /></Field>
        </div>
      </Modal>
    </>
  );
}
