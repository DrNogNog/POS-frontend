"use client";
// -----------------------------------------------------------------------------
// Costing & weighted averages.
// Compares FIFO, LIFO and weighted-average cost on your real purchase and
// sales history, so you can price correctly and decide whether to buy more
// or sell off stock.
//   Tab 1  Averages & prices — every item's costs and its AA–D prices/margins
//   Tab 2  Margins by invoice — what each sale earned, and at which level
//   Tab 3  FIFO vs LIFO vs average, item by item
// -----------------------------------------------------------------------------
import Link from "next/link";
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useApi, useQueryParam } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { usePriceLevels } from "@/lib/privacy";
import { date, isoDay, money, pct, qty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge, Empty, ErrorNote, Field, Input, Loading, PageHeader, Panel, Select, Table, Tabs, Td, Th } from "@/components/ui";
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

interface InvoiceMargin {
  id: number;
  invoiceNo: string;
  issueDate: string;
  customer: { id: number; name: string } | null;
  estimate: { id: number; estimateNo: string } | null;
  priceTierCode: string;
  netSales: number;
  discount: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
  lines: { itemCode: string; description: string; productId: number | null; qty: number; unitPrice: number; unitCost: number; lineTotal: number; costTotal: number; marginPct: number }[];
}
interface InvoiceMargins {
  rows: InvoiceMargin[];
  levels: { level: string; invoices: number; netSales: number; cogs: number; grossProfit: number; marginPct: number }[];
}

/** Margin colour: under 15% is thin, negative is a loss. */
const marginTone = (m: number) => (m < 0 ? "text-late font-semibold" : m < 15 ? "text-late" : m < 30 ? "text-due" : "text-paid");

export default function CostingPage() {
  const productId = useQueryParam("productId");
  const { data, error, loading } = useApi<Report>(`/costing${productId ? `?productId=${productId}` : ""}`);
  const [tab, setTab] = useState<"averages" | "invoices" | "compare">("averages");

  return (
    <>
      <PageHeader
        title="Costing & weighted averages"
        subtitle="What your stock really cost, what each price level earns, and what each sale made."
      />
      <ErrorNote>{error}</ErrorNote>
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {data.totals.map((t) => (
              <div key={t.method} className={`rounded-lux border bg-white px-6 py-5 ${t.method === data.bookMethod ? "border-walnut ring-1 ring-walnut" : "border-hairline"}`}>
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
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "averages", label: "Averages & prices by item" },
                { value: "invoices", label: "Margins by invoice" },
                { value: "compare", label: "FIFO vs LIFO vs average" },
              ]}
            />
            {tab === "averages" && <AveragesTab rows={data.rows} />}
            {tab === "invoices" && <InvoicesTab />}
            {tab === "compare" && (
              <Panel padded={false}>
                {data.rows.length === 0 ? (
                  <Empty>No stock history yet. Receive a purchase order or add stock to start.</Empty>
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
            )}
          </div>
          {productId && <p className="mt-3 text-sm"><Link href="/costing" className="underline">Show all items</Link></p>}
        </>
      )}
    </>
  );
}

// ---- Tab 1: every item with its costs and its own AA–D prices -------------------------------
function AveragesTab({ rows }: { rows: Row[] }) {
  const { settings } = useSession();
  const { show: showLevels } = usePriceLevels();
  const tiers = settings?.priceTiers ?? [];
  if (rows.length === 0) return <Panel><Empty>No stock history yet. Receive a purchase order or add stock to start.</Empty></Panel>;
  return (
    <Panel padded={false}>
      <p className="px-6 pt-4 text-sm text-oak">
        Each item&apos;s level prices come from <b>its own cost</b> (price in) × the level&apos;s markup, unless the item has a fixed
        price. The small percentage under each price is the <b>margin against the weighted average cost</b> of what&apos;s on the shelf —
        <span className="text-paid"> green</span> is healthy, <span className="text-due">amber</span> is under 30%, <span className="text-late">red</span> is under 15%.
      </p>
      {!showLevels && <p className="px-6 pt-2 text-sm font-semibold text-walnut">Price levels are hidden. Click &ldquo;Price levels&rdquo; at the top to see the AA–D prices.</p>}
      <Table className="mt-3">
        <thead>
          <tr>
            <Th>Item</Th>
            <Th className="text-right">On hand</Th>
            <Th className="text-right">Cost</Th>
            <Th className="text-right">Weighted avg</Th>
            <Th className="text-right">Last bought</Th>
            <Th className="text-right">Stock value</Th>
            {showLevels && tiers.map((t) => <Th key={t.code} className="text-right">{t.code}<div className="text-xs font-normal text-oak">+{Number(t.markupPct)}%</div></Th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const avg = r.weightedAverageCost || r.standardCost;
            const drift = r.weightedAverageCost > 0 && Math.abs(r.standardCost - r.weightedAverageCost) / r.weightedAverageCost > 0.02;
            const rising = r.lastCost > avg * 1.02;
            const slow = r.qtyOnHand > 0 && r.methods.FIFO.unitsOut === 0;
            return (
              <tr key={r.productId}>
                <Td className="min-w-60">
                  <ItemCode code={r.itemCode} productId={r.productId} />
                  <Link href={`/products/${r.productId}`} className="mt-0.5 block text-sm hover:underline">{r.name}</Link>
                  <div className="mt-1 max-w-72 space-y-0.5 text-xs">
                    {drift && (
                      <div className="text-due">
                        Prices use cost {money(r.standardCost)} but stock averages {money(r.weightedAverageCost)} —{" "}
                        <Link href={`/products/${r.productId}?edit=1`} className="underline">update the cost</Link>
                      </div>
                    )}
                    {rising && <div className="text-due">Newest stock cost more ({money(r.lastCost)}) than the average — check your prices.</div>}
                    {slow && <div className="text-oak">Nothing sold yet — consider a promotion.</div>}
                  </div>
                </Td>
                <Td className="num">{qty(r.qtyOnHand)}</Td>
                <Td className="num">{money(r.standardCost)}</Td>
                <Td className="num font-medium">{r.weightedAverageCost ? money(r.weightedAverageCost) : "—"}</Td>
                <Td className="num">{money(r.lastCost)}</Td>
                <Td className="num">{money(r.stockValue)}</Td>
                {showLevels &&
                  tiers.map((t) => {
                    const p = r.prices.find((x) => x.tier === t.code);
                    return (
                      <Td key={t.code} className="num">
                        {p ? <>{money(p.price)}<div className={cn("text-xs", marginTone(p.marginOnAvgCost))}>{pct(p.marginOnAvgCost)}</div></> : "—"}
                      </Td>
                    );
                  })}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Panel>
  );
}

// ---- Tab 2: margin of every invoice, and totals per price level ------------------------------
function InvoicesTab() {
  const { settings } = useSession();
  const [from, setFrom] = useState(isoDay(new Date(Date.now() - 90 * 86400000)));
  const [to, setTo] = useState(isoDay());
  const [level, setLevel] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const params = new URLSearchParams({ from, to });
  if (level) params.set("level", level);
  const { data, error, loading } = useApi<InvoiceMargins>(`/costing/invoices?${params}`);
  const levelName = (code: string) => (code ? code : "Not recorded");

  return (
    <div className="space-y-6">
      <Panel padded={false}>
        <div className="grid gap-3 p-4 sm:grid-cols-3 lg:max-w-3xl">
          <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Price level">
            <Select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">All levels</option>
              {settings?.priceTiers.map((t) => <option key={t.code} value={t.code}>{t.code} — {t.name}</option>)}
              <option value="none">Not recorded (older invoices)</option>
            </Select>
          </Field>
        </div>
        <ErrorNote>{error}</ErrorNote>
        {loading && !data && <Loading />}
        {data && data.levels.length > 0 && (
          <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-5">
            {data.levels.map((l) => (
              <div key={l.level || "none"} className="rounded-lux border border-hairline px-4 py-3">
                <div className="text-sm font-semibold text-walnut">Level {levelName(l.level)}</div>
                <div className="text-xs text-oak">{l.invoices} invoice{l.invoices === 1 ? "" : "s"}</div>
                <div className="mt-2 flex justify-between text-sm"><span>Sales</span><span className="num">{money(l.netSales)}</span></div>
                <div className="flex justify-between text-sm"><span>Profit</span><span className="num">{money(l.grossProfit)}</span></div>
                <div className={cn("flex justify-between text-sm", marginTone(l.marginPct))}><span>Margin</span><span className="num">{pct(l.marginPct)}</span></div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {data && (
        <Panel padded={false}>
          {data.rows.length === 0 ? (
            <Empty>No invoices in these dates.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th className="w-8" />
                  <Th>Invoice</Th>
                  <Th>Date</Th>
                  <Th>Customer</Th>
                  <Th>Level</Th>
                  <Th className="text-right">Sales (after discount)</Th>
                  <Th className="text-right">Cost of goods</Th>
                  <Th className="text-right">Profit</Th>
                  <Th className="text-right">Margin</Th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="cursor-pointer" onClick={() => setOpen(open === r.id ? null : r.id)}>
                      <Td>{open === r.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</Td>
                      <Td>
                        <Link href={`/invoices/${r.id}`} className="font-semibold text-walnut underline" onClick={(e) => e.stopPropagation()}>{r.invoiceNo}</Link>
                        {r.estimate && <div className="text-xs text-oak">from {r.estimate.estimateNo}</div>}
                      </Td>
                      <Td>{date(r.issueDate)}</Td>
                      <Td>{r.customer?.name ?? "—"}</Td>
                      <Td>{r.priceTierCode ? <Badge>{r.priceTierCode}</Badge> : <span className="text-oak">—</span>}</Td>
                      <Td className="num">{money(r.netSales)}{r.discount > 0 && <div className="text-xs text-oak">−{money(r.discount)} discount</div>}</Td>
                      <Td className="num">{money(r.cogs)}</Td>
                      <Td className="num font-medium">{money(r.grossProfit)}</Td>
                      <Td className={cn("num", marginTone(r.marginPct))}>{pct(r.marginPct)}</Td>
                    </tr>
                    {open === r.id && (
                      <tr>
                        <td colSpan={9} className="border-b border-hairline bg-linen/40 px-6 py-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-oak">
                                <th className="py-1 font-semibold">Item</th>
                                <th className="py-1 text-right font-semibold">Qty</th>
                                <th className="py-1 text-right font-semibold">Sold at</th>
                                <th className="py-1 text-right font-semibold">Cost each</th>
                                <th className="py-1 text-right font-semibold">Line</th>
                                <th className="py-1 text-right font-semibold">Cost</th>
                                <th className="py-1 text-right font-semibold">Margin</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.lines.map((l, i) => (
                                <tr key={i}>
                                  <td className="py-1">{l.itemCode && <b className="text-walnut">{l.itemCode} </b>}{l.description}</td>
                                  <td className="num py-1">{qty(l.qty)}</td>
                                  <td className="num py-1">{money(l.unitPrice)}</td>
                                  <td className="num py-1">{l.productId ? money(l.unitCost) : "—"}</td>
                                  <td className="num py-1">{money(l.lineTotal)}</td>
                                  <td className="num py-1">{money(l.costTotal)}</td>
                                  <td className={cn("num py-1", l.productId ? marginTone(l.marginPct) : "text-oak")}>{l.productId ? pct(l.marginPct) : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <p className="mt-2 text-xs text-oak">Line margins are before the order discount; the invoice margin above includes it.</p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      )}
    </div>
  );
}
