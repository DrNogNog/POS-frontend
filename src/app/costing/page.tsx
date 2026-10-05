"use client";
// -----------------------------------------------------------------------------
// Costing & weighted averages.
// Compares FIFO, LIFO and weighted-average cost on your real purchase and
// sales history, so you can price correctly and decide whether to buy more
// or sell off stock.
// -----------------------------------------------------------------------------
import Link from "next/link";
import { useState } from "react";
import { useApi, useQueryParam } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { money, pct, qty } from "@/lib/format";
import { Badge, Empty, ErrorNote, Loading, PageHeader, Panel, Select, Table, Tabs, Td, Th } from "@/components/ui";
import { ItemCode } from "@/components/ItemCode";

type Method = "FIFO" | "LIFO" | "WAC";
interface Sim { cogs: number; revenue: number; grossProfit: number; grossMarginPct: number; endingQty: number; endingValue: number; endingUnitCost: number; unitsIn: number; unitsOut: number }
interface Row {
  productId: number;
  itemCode: string;
  name: string;
  category: string;
  supplier: string;
  qtyOnHand: number;
  standardCost: number;
  lastCost: number;
  weightedAverageCost: number;
  stockValue: number;
  methods: Record<Method, Sim>;
  prices: { tier: string; price: number; marginOnAvgCost: number }[];
}
interface Report { bookMethod: Method; totals: { method: Method; cogs: number; revenue: number; grossProfit: number; endingValue: number }[]; rows: Row[] }

const METHOD_NAME: Record<Method, string> = { FIFO: "FIFO — first in, first out", LIFO: "LIFO — last in, first out", WAC: "Weighted average" };

export default function CostingPage() {
  const { settings } = useSession();
  const productId = useQueryParam("productId");
  const { data, error, loading } = useApi<Report>(`/costing${productId ? `?productId=${productId}` : ""}`);
  const [tab, setTab] = useState<"compare" | "averages">("averages");
  const [tier, setTier] = useState("D");

  return (
    <>
      <PageHeader
        title="Costing & weighted averages"
        subtitle="What your stock really cost, three ways. Your books use the method chosen in Settings; the others are shown for comparison."
      />
      <ErrorNote>{error}</ErrorNote>
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {data.totals.map((t) => (
              <div key={t.method} className={`rounded-lux border bg-white px-10 py-7 ${t.method === data.bookMethod ? "border-walnut ring-1 ring-walnut" : "border-hairline"}`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-walnut">{METHOD_NAME[t.method]}</h2>
                  {t.method === data.bookMethod && <Badge tone="info">Used in your books</Badge>}
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><dt>Cost of goods sold</dt><dd className="num">{money(t.cogs)}</dd></div>
                  <div className="flex justify-between"><dt>Gross profit</dt><dd className="num">{money(t.grossProfit)}</dd></div>
                  <div className="flex justify-between"><dt>Stock left is worth</dt><dd className="num">{money(t.endingValue)}</dd></div>
                </dl>
              </div>
            ))}
          </div>
          <p className="mt-3 max-w-4xl text-sm text-oak">
            When prices rise, FIFO shows higher profit and higher stock value; LIFO shows lower profit (and lower taxable income).
            Weighted average sits in between. Pick one method for your books and keep it — talk to your accountant before switching,
            because the IRS requires LIFO for your books if you use it for taxes.
          </p>

          <div className="mt-6">
            <Tabs value={tab} onChange={setTab} tabs={[{ value: "averages", label: "Weighted averages & pricing" }, { value: "compare", label: "FIFO vs LIFO vs average by item" }]} />
            <Panel padded={false}>
              {data.rows.length === 0 ? (
                <Empty>No stock history yet. Receive a purchase order to start.</Empty>
              ) : tab === "averages" ? (
                <>
                  <div className="flex items-center gap-3 p-4 text-sm">
                    <span>Check margins at price level</span>
                    <Select className="w-32" value={tier} onChange={(e) => setTier(e.target.value)}>
                      {settings?.priceTiers.map((t) => <option key={t.code} value={t.code}>{t.code}</option>)}
                    </Select>
                  </div>
                  <Table>
                    <thead>
                      <tr><Th>Item</Th><Th className="text-right">On hand</Th><Th className="text-right">Last cost</Th><Th className="text-right">Weighted avg cost</Th><Th className="text-right">Stock value</Th><Th className="text-right">Price ({tier})</Th><Th className="text-right">Margin on avg</Th><Th>Suggestion</Th></tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r) => {
                        const p = r.prices.find((x) => x.tier === tier);
                        const rising = r.lastCost > r.weightedAverageCost * 1.02;
                        const thin = p && p.marginOnAvgCost < 20;
                        const slow = r.qtyOnHand > 0 && r.methods.FIFO.unitsOut === 0;
                        return (
                          <tr key={r.productId}>
                            <Td><ItemCode code={r.itemCode} productId={r.productId} /> <Link href={`/products/${r.productId}`} className="ml-1 hover:underline">{r.name}</Link></Td>
                            <Td className="num">{qty(r.qtyOnHand)}</Td>
                            <Td className="num">{money(r.lastCost)}</Td>
                            <Td className="num font-medium">{money(r.weightedAverageCost)}</Td>
                            <Td className="num">{money(r.stockValue)}</Td>
                            <Td className="num">{p ? money(p.price) : "—"}</Td>
                            <Td className={`num ${thin ? "text-late" : ""}`}>{p ? pct(p.marginOnAvgCost) : "—"}</Td>
                            <Td className="text-xs">
                              {thin && <div className="text-late">Margin is thin — raise the price.</div>}
                              {rising && <div className="text-due">Cost is rising — newest stock costs more than average.</div>}
                              {slow && <div className="text-oak">No sales yet — consider a promotion to sell off.</div>}
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Item</Th>
                      <Th className="text-right">Bought / sold</Th>
                      {(["FIFO", "LIFO", "WAC"] as Method[]).map((m) => <Th key={m} className="text-right">{m === "WAC" ? "Average" : m} COGS</Th>)}
                      {(["FIFO", "LIFO", "WAC"] as Method[]).map((m) => <Th key={m + "v"} className="text-right">{m === "WAC" ? "Average" : m} stock value</Th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={r.productId}>
                        <Td><ItemCode code={r.itemCode} productId={r.productId} /></Td>
                        <Td className="num">{qty(r.methods.FIFO.unitsIn)} / {qty(r.methods.FIFO.unitsOut)}</Td>
                        {(["FIFO", "LIFO", "WAC"] as Method[]).map((m) => <Td key={m} className={`num ${m === data.bookMethod ? "font-semibold" : ""}`}>{money(r.methods[m].cogs)}</Td>)}
                        {(["FIFO", "LIFO", "WAC"] as Method[]).map((m) => <Td key={m + "v"} className={`num ${m === data.bookMethod ? "font-semibold" : ""}`}>{money(r.methods[m].endingValue)}</Td>)}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>
          </div>
          {productId && <p className="mt-3 text-sm"><Link href="/costing" className="underline">Show all items</Link></p>}
        </>
      )}
    </>
  );
}
