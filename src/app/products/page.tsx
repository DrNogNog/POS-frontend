"use client";
// Items & stock: every product with price in, price out and quantity on hand.
import Link from "next/link";
import { PackagePlus, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useApi, useDebounced, useSort } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { usePriceLevels } from "@/lib/privacy";
import { money, n, units } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Button, Checkbox, Empty, ErrorNote, Field, Input, Loading, PageHeader, Panel, Select, Table, Td, Th, Pagination } from "@/components/ui";
import { ItemCode } from "@/components/ItemCode";
import { ProductForm } from "@/components/forms";
import { ImportDialog } from "@/components/ImportDialog";
import { DateInLabel } from "@/components/DateIn";
import { AdjustStockDialog } from "@/components/AdjustStockDialog";

export default function ProductsPage() {
  const { settings, can } = useSession();
  const { show: showLevels } = usePriceLevels();
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [inStock, setInStock] = useState(false);
  // Date in filter: "" all | "old" old inventory | "range" came in between two days
  const [dateMode, setDateMode] = useState<"" | "old" | "range">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tier, setTier] = useState("D");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const debounced = useDebounced(q);
  const sort = useSort<"itemCode" | "name" | "qtyOnHand" | "unitCost" | "dateIn" | "supplier" | "price">("itemCode", "asc", [
    "itemCode",
    "name",
    "supplier",
    "price",
    "unitCost",
  ]);
  // A new sort starts again from page 1
  useEffect(() => setPage(1), [sort.sort, sort.dir]);
  const params = new URLSearchParams({ page: String(page), limit: String(limit), sort: sort.sort, dir: sort.dir });
  if (debounced) params.set("q", debounced);
  if (categoryId) params.set("categoryId", categoryId);
  if (lowStock) params.set("lowStock", "true");
  if (inStock) params.set("inStock", "true");
  // Price sorts by the price at the level being shown (or the store's top level when hidden)
  if (sort.sort === "price") params.set("tier", showLevels ? tier : "D");
  if (dateMode === "old") params.set("dateIn", "old");
  if (dateMode === "range") {
    if (dateFrom) params.set("dateInFrom", dateFrom);
    if (dateTo) params.set("dateInTo", dateTo);
  }
  const { data, error, loading, reload } = useApi<{ items: Product[]; total: number }>(`/products?${params}`);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const manager = can("MANAGER");
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
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
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
          <div>
            <Field label="Date in">
              <Select value={dateMode} onChange={(e) => { setDateMode(e.target.value as "" | "old" | "range"); setPage(1); }}>
                <option value="">Any date</option>
                <option value="old">Old inventory (before POS system)</option>
                <option value="range">Came in between…</option>
              </Select>
            </Field>
            {dateMode === "range" && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input type="date" aria-label="Came in from" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
                <Input type="date" aria-label="Came in to" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
              </div>
            )}
          </div>
          <div className="flex flex-col justify-end gap-1 pb-1">
            <Checkbox label="Running low" checked={lowStock} onChange={(v) => { setLowStock(v); setPage(1); }} />
            <Checkbox label="In stock only" checked={inStock} onChange={(v) => { setInStock(v); setPage(1); }} />
          </div>
        </div>
        <ErrorNote>{error}</ErrorNote>
        {loading && !data ? (
          <Loading />
        ) : !data?.items.length ? (
          <Empty>No items found.{manager && " Add one with “New item”, or bring in a whole list with “Import price list”."}</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th sortKey="itemCode" sort={sort}>Code</Th>
                  <Th sortKey="name" sort={sort}>Item</Th>
                  <Th sortKey="supplier" sort={sort}>Supplier</Th>
                  {showLevels && <Th className="text-right">List</Th>}
                  {showLevels && <Th sortKey="unitCost" sort={sort} className="text-right">Price in</Th>}
                  <Th sortKey="price" sort={sort} className="text-right">{showLevels ? `Selling price (${tier})` : "Selling price"}</Th>
                  <Th className="text-right">Fixed selling price</Th>
                  <Th sortKey="qtyOnHand" sort={sort} className="text-right">On hand</Th>
                  <Th sortKey="dateIn" sort={sort}>Date in</Th>
                  {manager && <Th className="text-right">Change</Th>}
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => {
                  const cost = n(p.unitCost);
                  const price = p.sellPriceOverride ? n(p.sellPriceOverride) : cost * (1 + markup / 100);
                  const low = n(p.reorderPoint) > 0 && n(p.qtyOnHand) <= n(p.reorderPoint);
                  return (
                    <tr key={p.id}>
                      <Td><ItemCode code={p.itemCode} productId={p.id} /></Td>
                      <Td>
                        <Link href={`/products/${p.id}`} className="font-medium text-walnut hover:underline">{p.name}</Link>
                        <div className="text-xs text-oak">{[p.category?.name, p.collection].filter(Boolean).join(" · ")}</div>
                      </Td>
                      <Td>{p.supplier?.name ?? "—"}</Td>
                      {showLevels && <Td className="num text-oak">{n(p.listPrice) ? money(p.listPrice) : "—"}</Td>}
                      {showLevels && <Td className="num">{money(cost)}{n(p.supplierDiscountPct) > 0 && <div className="text-xs text-oak">{n(p.supplierDiscountPct)}% off list</div>}</Td>}
                      <Td className="num font-medium">
                        {price > 0 ? money(price) : manager ? (
                          <button type="button" onClick={() => setEditing(p)} className="text-late underline-offset-2 hover:underline" title="No cost or fixed selling price on this item yet">Not set</button>
                        ) : <span className="text-late">Not set</span>}
                      </Td>
                      <Td className="num">{p.sellPriceOverride && n(p.sellPriceOverride) > 0 ? <b className="text-walnut">{money(p.sellPriceOverride)}</b> : <span className="text-oak">—</span>}</Td>
                      <Td className={`num font-medium ${low ? "text-late" : ""}`}>{units(p.qtyOnHand)}</Td>
                      <Td className="whitespace-nowrap"><DateInLabel p={p} /></Td>
                      {manager && (
                        <Td className="whitespace-nowrap text-right">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(p)} aria-label={`Edit ${p.itemCode}`}>
                            <Pencil size={15} /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAdjusting(p)} aria-label={`Adjust stock of ${p.itemCode}`}>
                            <PackagePlus size={15} /> Adjust stock
                          </Button>
                        </Td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} limit={limit} total={data.total} onPage={setPage} onLimit={setLimit} noun="items" />
          </>
        )}
      </Panel>
      <ProductForm open={adding} onClose={() => setAdding(false)} onSaved={() => reload()} />
      <ProductForm open={!!editing} product={editing} onClose={() => setEditing(null)} onSaved={() => reload()} />
      <AdjustStockDialog item={adjusting} onClose={() => setAdjusting(null)} onDone={() => reload()} />
      <ImportDialog open={importing} onClose={() => setImporting(false)} onDone={() => reload()} />
    </>
  );
}
