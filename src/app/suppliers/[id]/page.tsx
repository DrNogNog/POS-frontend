"use client";
// One supplier: contract, relationship stats, bills, orders and items.
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { date, money, n, qty } from "@/lib/format";
import type { Bill, Supplier } from "@/lib/types";
import { Button, Empty, ErrorNote, Loading, PageHeader, Panel, Stat, Table, Tabs, Td, Th } from "@/components/ui";
import { BillStatus } from "@/components/status";
import { SupplierForm } from "@/components/forms";
import { ItemCode } from "@/components/ItemCode";

interface Detail extends Supplier {
  bills: Bill[];
  purchaseOrders: { id: number; poNo: string; orderDate: string; status: string; subtotal: string }[];
  products: { id: number; itemCode: string; name: string; listPrice: string; unitCost: string; qtyOnHand: string }[];
  stats: { totalPurchased: number; discountsSaved: number; lateFeesPaid: number; openBalance: number; billsPaid: number };
}

export default function SupplierPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useSession();
  const { data: s, error, reload } = useApi<Detail>(`/suppliers/${id}`);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"bills" | "orders" | "items">("bills");
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!s) return <Loading />;

  return (
    <>
      <PageHeader
        title={s.name}
        back={{ label: "Back to suppliers", onClick: () => (window.history.length > 1 ? router.back() : router.push("/suppliers")) }}
        subtitle={[s.contactName, s.phone, s.email].filter(Boolean).join(" · ")}
        actions={
          can("MANAGER", "ACCOUNTANT") && (
            <>
              <Button variant="secondary" onClick={() => setEditing(true)}>Edit supplier</Button>
              <Link href={`/purchase-orders?supplier=${s.id}`}><Button>New purchase order</Button></Link>
            </>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="We owe them" value={money(s.stats.openBalance)} tone={s.stats.openBalance > 0 ? "due" : "ink"} />
        <Stat label="Bought from them" value={money(s.stats.totalPurchased)} />
        <Stat label="Saved with discounts" value={money(s.stats.discountsSaved)} tone="paid" note="Discount off list + early-pay" />
        <Stat label="Late fees paid" value={money(s.stats.lateFeesPaid)} tone={s.stats.lateFeesPaid > 0 ? "late" : "ink"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[340px_1fr]">
        <Panel title="Contract">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-oak">Pay within</dt><dd>{s.paymentTermsDays} days</dd></div>
            <div><dt className="text-oak">Discount off list</dt><dd>{n(s.tradeDiscountPct)}%</dd></div>
            <div><dt className="text-oak">Early-payment discount</dt><dd>{n(s.earlyPayDiscountPct) > 0 ? `${n(s.earlyPayDiscountPct)}% if paid within ${s.earlyPayDiscountDays} days` : "None"}</dd></div>
            <div><dt className="text-oak">Late fee</dt><dd>{n(s.lateFeePct) || n(s.lateFeeFlat) ? `${n(s.lateFeePct)}% of balance + ${money(s.lateFeeFlat)}` : "None"}</dd></div>
            <div><dt className="text-oak">Contract dates</dt><dd>{s.contractStart ? `${date(s.contractStart)} – ${date(s.contractEnd)}` : "—"}</dd></div>
            {s.contractNotes && <div><dt className="text-oak">Contract notes</dt><dd className="whitespace-pre-line">{s.contractNotes}</dd></div>}
            <div><dt className="text-oak">Our account #</dt><dd>{s.accountNumber || "—"}</dd></div>
            <div><dt className="text-oak">Address</dt><dd className="whitespace-pre-line">{s.address || "—"}</dd></div>
            <div><dt className="text-oak">Rating</dt><dd>{s.rating ? `${s.rating} / 5` : "—"}</dd></div>
            {s.notes && <div><dt className="text-oak">Notes</dt><dd className="whitespace-pre-line">{s.notes}</dd></div>}
          </dl>
        </Panel>
        <div>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "bills", label: `Bills (${s.bills.length})` },
              { value: "orders", label: `Purchase orders (${s.purchaseOrders.length})` },
              { value: "items", label: `Items (${s.products.length})` },
            ]}
          />
          <Panel padded={false}>
            {tab === "bills" &&
              (s.bills.length === 0 ? <Empty>No bills yet.</Empty> : (
                <Table>
                  <thead><tr><Th>Bill #</Th><Th>Date</Th><Th>Due</Th><Th className="text-right">Total</Th><Th className="text-right">Balance</Th><Th>Status</Th></tr></thead>
                  <tbody>
                    {s.bills.map((b) => (
                      <tr key={b.id}>
                        <Td><Link className="font-semibold text-walnut underline" href={`/billing-orders?open=${b.id}`}>{b.billNo}</Link></Td>
                        <Td>{date(b.billDate)}</Td>
                        <Td>{date(b.dueDate)}</Td>
                        <Td className="num">{money(b.total)}</Td>
                        <Td className="num font-medium">{money(b.balance)}</Td>
                        <Td><BillStatus bill={b} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ))}
            {tab === "orders" &&
              (s.purchaseOrders.length === 0 ? <Empty>No purchase orders yet.</Empty> : (
                <Table>
                  <thead><tr><Th>PO</Th><Th>Date</Th><Th>Status</Th><Th className="text-right">Amount</Th></tr></thead>
                  <tbody>
                    {s.purchaseOrders.map((po) => (
                      <tr key={po.id}>
                        <Td><Link className="font-semibold text-walnut underline" href={`/purchase-orders?open=${po.id}`}>{po.poNo}</Link></Td>
                        <Td>{date(po.orderDate)}</Td>
                        <Td>{po.status.toLowerCase()}</Td>
                        <Td className="num">{money(po.subtotal)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ))}
            {tab === "items" &&
              (s.products.length === 0 ? <Empty>No items linked to this supplier.</Empty> : (
                <Table>
                  <thead><tr><Th>Code</Th><Th>Item</Th><Th className="text-right">List</Th><Th className="text-right">Our cost</Th><Th className="text-right">On hand</Th></tr></thead>
                  <tbody>
                    {s.products.map((p) => (
                      <tr key={p.id}>
                        <Td><ItemCode code={p.itemCode} productId={p.id} /></Td>
                        <Td><Link href={`/products/${p.id}`} className="hover:underline">{p.name}</Link></Td>
                        <Td className="num">{money(p.listPrice)}</Td>
                        <Td className="num">{money(p.unitCost)}</Td>
                        <Td className="num">{qty(p.qtyOnHand)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ))}
          </Panel>
        </div>
      </div>
      <SupplierForm open={editing} onClose={() => setEditing(false)} supplier={s} onSaved={() => reload()} />
    </>
  );
}
