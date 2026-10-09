"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { money, n } from "@/lib/format";
import type { Supplier } from "@/lib/types";
import { Badge, Button, Empty, ErrorNote, Loading, PageHeader, Panel, Table, Td, Th } from "@/components/ui";
import { SupplierForm } from "@/components/forms";

export default function SuppliersPage() {
  const router = useRouter();
  const { can } = useSession();
  const { data, error, loading, reload } = useApi<Supplier[]>("/suppliers");
  const [adding, setAdding] = useState(false);
  return (
    <>
      <PageHeader
        title="Suppliers"
        back={{ label: "Back", onClick: () => (window.history.length > 1 ? router.back() : router.push("/")) }}
        subtitle="Who we buy from, our contract terms with them, and what we owe."
        actions={can("MANAGER", "ACCOUNTANT") && <Button onClick={() => setAdding(true)}>New supplier</Button>}
      />
      <Panel padded={false}>
        <ErrorNote>{error}</ErrorNote>
        {loading && !data ? (
          <Loading />
        ) : !data?.length ? (
          <Empty>No suppliers yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr><Th>Supplier</Th><Th>Contact</Th><Th>Terms</Th><Th className="text-right">Discount off list</Th><Th>Early pay</Th><Th>Late fee</Th><Th className="text-right">Items</Th><Th className="text-right">We owe</Th></tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <Link href={`/suppliers/${s.id}`} className="font-semibold text-walnut underline">{s.name}</Link>
                    {!s.active && <Badge>Inactive</Badge>}
                  </Td>
                  <Td>{s.contactName}<div className="text-xs text-oak">{s.phone}</div></Td>
                  <Td>Net {s.paymentTermsDays}</Td>
                  <Td className="num">{n(s.tradeDiscountPct)}%</Td>
                  <Td>{n(s.earlyPayDiscountPct) > 0 ? `${n(s.earlyPayDiscountPct)}% in ${s.earlyPayDiscountDays} days` : "—"}</Td>
                  <Td>{n(s.lateFeePct) > 0 || n(s.lateFeeFlat) > 0 ? [n(s.lateFeePct) && `${n(s.lateFeePct)}%`, n(s.lateFeeFlat) && money(s.lateFeeFlat)].filter(Boolean).join(" + ") : "—"}</Td>
                  <Td className="num">{s.productCount}</Td>
                  <Td className={`num font-medium ${(s.overdue ?? 0) > 0 ? "text-late" : ""}`}>{money(s.balance)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <SupplierForm open={adding} onClose={() => setAdding(false)} onSaved={() => reload()} />
    </>
  );
}
