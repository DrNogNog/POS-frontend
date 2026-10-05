"use client";
// Items & stock: every product with price in, price out and quantity on hand.
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { parseCsv } from "@/lib/csv";
import { useApi, useDebounced, useSort } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { usePriceLevels } from "@/lib/privacy";
import { money, n, qty } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Button, Checkbox, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, Panel, Select, Table, Td, Th, useAction } from "@/components/ui";
import { ItemCode } from "@/components/ItemCode";
import { ProductForm } from "@/components/forms";

export default function ProductsPage() {
  const { settings, can } = useSession();
  const { show: showLevels } = usePriceLevels();
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [tier, setTier] = useState("D");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(q);
  const sort = useSort<"itemCode" | "name" | "qtyOnHand" | "unitCost">("itemCode", "asc");
  const params = new URLSearchParams({ page: String(page), limit: "50", sort: sort.sort, dir: sort.dir });
  if (debounced) params.set("q", debounced);
  if (categoryId) params.set("categoryId", categoryId);
  if (lowStock) params.set("lowStock", "true");
  if (inStock) params.set("inStock", "true");
  const { data, error, loading, reload } = useApi<{ items: Product[]; total: number }>(`/products?${params}`);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const markup = n(settings?.priceTiers.find((t) => t.code === tier)?.markupPct);

  return (
    <>
      <PageHeader
        title="Items & stock"
        subtitle="Cabinets, counters, hardware and everything else we sell. Click a code to see what it means."
        actions={
          can("MANAGER") && (
            <>
              <Button variant="secondary" onClick={() => setImporting(true)}>Import price list</Button>
              <Button onClick={() => setAdding(true)}>New item</Button>
            </>
          )
        }
      />
      <Panel padded={false}>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]">
          <Field label="Search"><Input placeholder="Code, name or collection (e.g. W0930, Avalon)" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></Field>
          <Field label="Category">
            <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
              <option value="">All categories</option>
              {settings?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          {showLevels ? <Field label="Show price at level">
            <Select value={tier} onChange={(e) => setTier(e.target.value)}>
              {settings?.priceTiers.map((t) => <option key={t.code} value={t.code}>{t.code} (+{n(t.markupPct)}%)</option>)}
            </Select>
          </Field> : <div />}
          <div className="flex flex-col justify-end gap-1 pb-1">
            <Checkbox label="Running low" checked={lowStock} onChange={(v) => { setLowStock(v); setPage(1); }} />
            <Checkbox label="In stock only" checked={inStock} onChange={(v) => { setInStock(v); setPage(1); }} />
          </div>
        </div>
        <ErrorNote>{error}</ErrorNote>
        {loading && !data ? (
          <Loading />
        ) : !data?.items.length ? (
          <Empty>No items found.{can("MANAGER") && " Add one, or import the price list."}</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th sortKey="itemCode" sort={sort}>Code</Th>
                  <Th sortKey="name" sort={sort}>Item</Th>
                  <Th>Supplier</Th>
                  {showLevels && <Th className="text-right">List</Th>}
                  {showLevels && <Th sortKey="unitCost" sort={sort} className="text-right">Price in</Th>}
                  <Th className="text-right">{showLevels ? `Price out (${tier})` : "Price"}</Th>
                  <Th sortKey="qtyOnHand" sort={sort} className="text-right">On hand</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => {
                  const cost = n(p.unitCost);
                  const price = p.sellPriceOverride ? n(p.sellPriceOverride) : cost * (1 + markup / 100);
                  const low = n(p.reorderPoint) > 0 && n(p.qtyOnHand) <= n(p.reorderPoint);
                  return (
                    <tr key={p.id} className="hover:bg-linen/60">
                      <Td><ItemCode code={p.itemCode} productId={p.id} /></Td>
                      <Td>
                        <Link href={`/products/${p.id}`} className="font-medium text-walnut hover:underline">{p.name}</Link>
                        <div className="text-xs text-oak">{[p.category?.name, p.collection].filter(Boolean).join(" · ")}</div>
                      </Td>
                      <Td>{p.supplier?.name ?? "—"}</Td>
                      {showLevels && <Td className="num text-oak">{n(p.listPrice) ? money(p.listPrice) : "—"}</Td>}
                      {showLevels && <Td className="num">{money(cost)}{n(p.supplierDiscountPct) > 0 && <div className="text-xs text-oak">{n(p.supplierDiscountPct)}% off list</div>}</Td>}
                      <Td className="num font-medium">{money(price)}</Td>
                      <Td className={`num font-medium ${low ? "text-late" : ""}`}>{qty(p.qtyOnHand)} <span className="text-xs text-oak">{p.unit}</span></Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <div className="flex items-center justify-between p-4 text-sm text-oak">
              <span>{data.total.toLocaleString()} items</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button size="sm" variant="secondary" disabled={page * 50 >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Panel>
      <ProductForm open={adding} onClose={() => setAdding(false)} onSaved={() => reload()} />
      <ImportDialog open={importing} onClose={() => setImporting(false)} onDone={() => reload()} />
    </>
  );
}

function ImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [progress, setProgress] = useState("");
  const { busy, run } = useAction();

  async function importRows() {
    let created = 0;
    let updated = 0;
    const ok = await run(async () => {
      for (let i = 0; i < rows.length; i += 1000) {
        setProgress(`Importing ${i + 1}–${Math.min(i + 1000, rows.length)} of ${rows.length}…`);
        const chunk = rows.slice(i, i + 1000).map((r) => ({
          ...r,
          listPrice: r.listPrice || 0,
          supplierDiscountPct: r.supplierDiscountPct || 0,
          unitCost: r.unitCost === "" ? undefined : r.unitCost,
          qtyOnHand: r.qtyOnHand === "" || r.qtyOnHand === undefined ? undefined : r.qtyOnHand,
        }));
        const res = await api<{ created: number; updated: number }>("/products/import", { body: { rows: chunk } });
        created += res.created;
        updated += res.updated;
      }
      return true;
    });
    setProgress(ok ? `Done: ${created} new items, ${updated} updated.` : "");
    if (ok) onDone();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import a price list"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={importRows} busy={busy} disabled={!rows.length}>Import {rows.length.toLocaleString()} items</Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-oak">
        Choose a CSV file with the columns <b>itemCode, name, description, category, collection, supplier, listPrice, supplierDiscountPct</b>{" "}
        (optional: unitCost, unit, qtyOnHand). The 2025 cabinet price list is ready at <b>POS-backend/data/pricelist-2025.csv</b>.
        Existing codes get their prices updated; stock isn&apos;t changed.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          setProgress("");
          setRows(file ? parseCsv(await file.text()).filter((r) => r.itemCode && r.name) : []);
        }}
      />
      {rows.length > 0 && <p className="mt-3 text-sm">{rows.length.toLocaleString()} items found. First: <b>{rows[0].itemCode}</b> {rows[0].name}</p>}
      {progress && <p className="mt-3 text-sm text-walnut">{progress}</p>}
    </Modal>
  );
}
